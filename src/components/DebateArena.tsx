/**
 * DebateArena
 *
 * A self-contained debate panel where two conflicting stakeholder groups argue
 * continuously using AI-generated text and ElevenLabs TTS voices.
 *
 * Debate loop per turn:
 *   1. Call generateDebateTurn → get 2-3 sentence rebuttal text
 *   2. Call generateVoice with the speaker's voice archetype → base64 MP3
 *   3. Play audio via HTMLAudioElement (web)
 *   4. On audio end → append to transcript → flip speaker → trigger next turn
 *
 * The loop runs until the user taps Stop or the component unmounts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, Fonts, Spacing } from '@/constants/theme';
import { ConflictPair, Stakeholder, VoiceArchetype } from '@/constants/mockData';
import { DebateTurnHistoryEntry } from '@/services/gemini';
import { generateVoice } from '@/services/elevenlabs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebateArenaProps {
  conflict: ConflictPair;
  decisionContext: string;
  /** Full stakeholder list from the simulation, used to look up voice archetypes */
  stakeholders: Stakeholder[];
  onClose: () => void;
}

interface TranscriptEntry {
  id: string;
  speaker: 'groupA' | 'groupB';
  speakerName: string;
  text: string;
  /** True while this turn is currently being spoken */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the best-matching voice archetype for a stakeholder group name */
function resolveArchetype(groupName: string, stakeholders: Stakeholder[]): VoiceArchetype {
  const match = stakeholders.find(
    (s) => s.name.toLowerCase().trim() === groupName.toLowerCase().trim()
  );
  return match?.voiceArchetype ?? 'default';
}

/** Play a base64 MP3 string via HTMLAudioElement on web, resolves when done */
function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const AudioCtor = (typeof window !== 'undefined' ? window.Audio : null) as
      | (new (src?: string) => HTMLAudioElement)
      | null;
    if (!AudioCtor) {
      reject(new Error('Audio not supported on this platform'));
      return;
    }
    const audio = new AudioCtor(`data:audio/mpeg;base64,${base64}`);
    audio.addEventListener('ended', () => resolve());
    audio.addEventListener('error', (e) => reject(e));
    audio.play().catch(reject);
  });
}

/**
 * Calls Groq directly from the client to generate one debate turn.
 * Bypasses the server proxy — the API key is already EXPO_PUBLIC so
 * it is visible to the browser bundle regardless.
 */
async function callGroqForDebateTurn(params: {
  groupA: string;
  groupB: string;
  decisionContext: string;
  conflictReason: string;
  currentSpeaker: 'groupA' | 'groupB';
  history: DebateTurnHistoryEntry[];
}): Promise<string> {
  const { groupA, groupB, decisionContext, conflictReason, currentSpeaker, history } = params;
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? (process.env as any).GROQ_API_KEY ?? '';

  if (!apiKey) {
    throw new Error('No Groq API key found. Set EXPO_PUBLIC_GROQ_API_KEY in your .env file.');
  }

  const speakerName = currentSpeaker === 'groupA' ? groupA : groupB;
  const opponentName = currentSpeaker === 'groupA' ? groupB : groupA;

  const historyText = history
    .slice(-6)
    .map((t) => `${t.speaker}: "${t.text}"`)
    .join('\n');

  const systemPrompt = `You are ${speakerName} in a heated public debate about a real policy decision.

Your core conflict: ${conflictReason}

Rules:
- Speak ONLY as ${speakerName}. Never break character.
- Be passionate, urgent, and specific to this EXACT decision.
- Directly rebut what ${opponentName} just said if there is history.
- Use "I", "we", or "our community" — first-person only.
- Keep it to 2-3 sentences MAX. Spoken audio, not an essay.
- No filler phrases — jump straight into your argument.
- Reference concrete, real consequences for your group.
- End on a strong, punchy note.`;

  const userPrompt = `Decision being debated: "${decisionContext}"

${historyText ? `Debate so far:\n${historyText}\n\n` : ''}Now speak as ${speakerName} (2-3 sentences, passionate and direct):`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq debate error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned empty debate turn.');
  return text;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DebateArena({ conflict, decisionContext, stakeholders, onClose }: DebateArenaProps) {
  const theme = useTheme();

  // Debate state
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<'groupA' | 'groupB'>('groupA');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  // Refs — avoid stale closures in the async debate loop
  const isRunningRef = useRef(false);
  const historyRef = useRef<DebateTurnHistoryEntry[]>([]);
  const currentSpeakerRef = useRef<'groupA' | 'groupB'>('groupA');
  const scrollRef = useRef<ScrollView>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Pulsing animation for the active speaker indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isGenerating || isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isGenerating, isRunning, pulseAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Debate loop
  // ---------------------------------------------------------------------------

  const runDebateTurn = useCallback(async () => {
    if (!isRunningRef.current) return;

    const speaker = currentSpeakerRef.current;
    const speakerName = speaker === 'groupA' ? conflict.groupA : conflict.groupB;
    const archetype = resolveArchetype(speakerName, stakeholders);

    setIsGenerating(true);
    setCurrentSpeaker(speaker);

    try {
      // 1. Generate the spoken argument text
      const text = await callGroqForDebateTurn({
        groupA: conflict.groupA,
        groupB: conflict.groupB,
        decisionContext,
        conflictReason: conflict.reason,
        currentSpeaker: speaker,
        history: historyRef.current,
      });

      if (!isRunningRef.current) return; // Stopped while generating

      // 2. Add to transcript (marked active while speaking)
      const entryId = `turn-${Date.now()}-${Math.random()}`;
      const newEntry: TranscriptEntry = {
        id: entryId,
        speaker,
        speakerName,
        text,
        isActive: true,
      };

      setTranscript((prev) => [
        ...prev.map((e) => ({ ...e, isActive: false })), // deactivate previous
        newEntry,
      ]);

      // Update history ref for next turn's context
      historyRef.current = [
        ...historyRef.current,
        { speaker: speakerName, text },
      ].slice(-10); // Keep last 10 entries to bound memory

      setTurnCount((c) => c + 1);

      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      setIsGenerating(false);

      // 3. Generate and play voice audio
      if (isRunningRef.current) {
        try {
          const base64Audio = await generateVoice(text, archetype, {
            stability: 0.45,        // Slightly lower stability = more passionate delivery
            similarityBoost: 0.80,
            style: 0.30,            // Some style exaggeration for debate energy
          });

          if (!isRunningRef.current) return;

          await playBase64Audio(base64Audio);
        } catch (audioErr) {
          // Audio failure is non-fatal — skip to next turn
          console.warn('[DebateArena] Audio error, skipping turn:', audioErr);
        }
      }

      if (!isRunningRef.current) return;

      // 4. Mark entry as no longer active
      setTranscript((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, isActive: false } : e))
      );

      // 5. Flip speaker and schedule next turn
      const nextSpeaker = speaker === 'groupA' ? 'groupB' : 'groupA';
      currentSpeakerRef.current = nextSpeaker;
      setCurrentSpeaker(nextSpeaker);

      // Brief pause between turns for natural rhythm
      await new Promise((r) => setTimeout(r, 400));

      if (isRunningRef.current) {
        runDebateTurn();
      }
    } catch (err: any) {
      console.error('[DebateArena] Turn error:', err);
      setIsGenerating(false);
      if (isRunningRef.current) {
        setErrorMessage(err.message || 'Failed to generate debate turn.');
        setIsRunning(false);
        isRunningRef.current = false;
      }
    }
  }, [conflict, decisionContext, stakeholders]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  const handleStart = useCallback(() => {
    setErrorMessage(null);
    setTranscript([]);
    historyRef.current = [];
    currentSpeakerRef.current = 'groupA';
    setCurrentSpeaker('groupA');
    setTurnCount(0);
    isRunningRef.current = true;
    setIsRunning(true);
    runDebateTurn();
  }, [runDebateTurn]);

  const handleStop = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    setIsGenerating(false);
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    // Mark all entries as inactive
    setTranscript((prev) => prev.map((e) => ({ ...e, isActive: false })));
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const activeIsA = isRunning && currentSpeaker === 'groupA';
  const activeIsB = isRunning && currentSpeaker === 'groupB';

  const FighterCard = ({
    name,
    side,
    isActive: active,
  }: {
    name: string;
    side: 'A' | 'B';
    isActive: boolean;
  }) => (
    <View
      style={[
        styles.fighterCard,
        side === 'A'
          ? { borderColor: active ? theme.conflict : theme.outline, alignItems: 'flex-start' }
          : { borderColor: active ? theme.primary : theme.outline, alignItems: 'flex-end' },
        active && {
          backgroundColor: side === 'A' ? theme.conflictContainer : theme.primaryContainer,
        },
      ]}
    >
      <View style={styles.fighterSideRow}>
        {side === 'B' && (
          <ThemedText type="code" style={[styles.fighterSideLabel, { color: theme.primary }]}>
            {side}
          </ThemedText>
        )}
        <View
          style={[
            styles.fighterSideBadge,
            { backgroundColor: side === 'A' ? theme.conflict : theme.primary },
          ]}
        >
          <ThemedText type="code" style={[styles.fighterSideLetter, { color: theme.surface }]}>
            {side}
          </ThemedText>
        </View>
        {side === 'A' && (
          <ThemedText type="code" style={[styles.fighterSideLabel, { color: theme.conflict }]}>
            {side}
          </ThemedText>
        )}
      </View>
      <ThemedText
        type="smallBold"
        numberOfLines={2}
        style={[
          styles.fighterName,
          { color: active ? (side === 'A' ? theme.conflict : theme.primary) : theme.text },
        ]}
      >
        {name}
      </ThemedText>
      {active && (isGenerating || isRunning) && (
        <Animated.View style={[styles.speakingDot, { transform: [{ scale: pulseAnim }] }]}>
          <View
            style={[
              styles.speakingDotInner,
              { backgroundColor: side === 'A' ? theme.conflict : theme.primary },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.outline }]}>
        <View style={styles.headerLeft}>
          <SymbolView
            name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
            tintColor={theme.conflict}
            size={16}
          />
          <ThemedText type="code" style={[styles.headerTitle, { color: theme.conflict }]}>
            LIVE DEBATE
          </ThemedText>
          {turnCount > 0 && (
            <View style={[styles.turnBadge, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="code" style={[styles.turnBadgeText, { color: theme.textSecondary }]}>
                {turnCount} TURNS
              </ThemedText>
            </View>
          )}
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: theme.backgroundElement },
            pressed && { opacity: 0.7 },
          ]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            tintColor={theme.text}
            size={14}
          />
        </Pressable>
      </View>

      {/* ── Conflict context ── */}
      <View style={[styles.conflictBanner, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="code" style={[styles.conflictLabel, { color: theme.textSecondary }]}>
          CONFLICT:
        </ThemedText>
        <ThemedText type="small" style={[styles.conflictReason, { color: theme.text }]} numberOfLines={2}>
          {conflict.reason}
        </ThemedText>
      </View>

      {/* ── Fighter cards ── */}
      <View style={styles.fightersRow}>
        <FighterCard name={conflict.groupA} side="A" isActive={activeIsA} />
        <View style={styles.vsContainer}>
          <View style={[styles.vsDivider, { backgroundColor: theme.outline }]} />
          <View style={[styles.vsCircle, { backgroundColor: theme.conflict, borderColor: theme.surface }]}>
            <ThemedText type="code" style={[styles.vsText, { color: theme.surface }]}>
              VS
            </ThemedText>
          </View>
          <View style={[styles.vsDivider, { backgroundColor: theme.outline }]} />
        </View>
        <FighterCard name={conflict.groupB} side="B" isActive={activeIsB} />
      </View>

      {/* ── Transcript ── */}
      <ScrollView
        ref={scrollRef}
        style={[styles.transcriptScroll, { borderColor: theme.outline }]}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
      >
        {transcript.length === 0 && !isRunning && (
          <View style={styles.emptyTranscript}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Tap Start Debate to hear these groups clash head-to-head with real voices.
            </ThemedText>
          </View>
        )}

        {transcript.map((entry) => {
          const isA = entry.speaker === 'groupA';
          return (
            <View
              key={entry.id}
              style={[
                styles.bubbleRow,
                isA ? styles.bubbleRowLeft : styles.bubbleRowRight,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isA
                    ? { backgroundColor: theme.conflictContainer, borderColor: theme.conflict + '55' }
                    : { backgroundColor: theme.primaryContainer, borderColor: theme.primary + '55' },
                  entry.isActive && styles.bubbleActive,
                ]}
              >
                <ThemedText
                  type="code"
                  style={[
                    styles.bubbleSpeaker,
                    { color: isA ? theme.conflict : theme.primary },
                  ]}
                >
                  {entry.speakerName}
                </ThemedText>
                <ThemedText type="small" style={[styles.bubbleText, { color: theme.text }]}>
                  {entry.text}
                </ThemedText>
              </View>
            </View>
          );
        })}

        {/* Generating indicator */}
        {isGenerating && (
          <View
            style={[
              styles.generatingRow,
              currentSpeaker === 'groupA' ? styles.bubbleRowLeft : styles.bubbleRowRight,
            ]}
          >
            <View
              style={[
                styles.generatingBubble,
                currentSpeaker === 'groupA'
                  ? { backgroundColor: theme.conflictContainer, borderColor: theme.conflict + '55' }
                  : { backgroundColor: theme.primaryContainer, borderColor: theme.primary + '55' },
              ]}
            >
              <ThemedText
                type="code"
                style={[
                  styles.bubbleSpeaker,
                  { color: currentSpeaker === 'groupA' ? theme.conflict : theme.primary },
                ]}
              >
                {currentSpeaker === 'groupA' ? conflict.groupA : conflict.groupB}
              </ThemedText>
              <View style={styles.typingIndicator}>
                <ActivityIndicator
                  size="small"
                  color={currentSpeaker === 'groupA' ? theme.conflict : theme.primary}
                />
                <ThemedText type="code" style={[styles.typingText, { color: theme.textSecondary }]}>
                  formulating rebuttal...
                </ThemedText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Error ── */}
      {errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorContainer }]}>
          <ThemedText type="code" style={[styles.errorText, { color: theme.error }]}>
            {errorMessage}
          </ThemedText>
        </View>
      )}

      {/* ── Controls ── */}
      <View style={[styles.controls, { borderTopColor: theme.outline }]}>
        {!isRunning ? (
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: theme.conflict },
              pressed && { opacity: 0.88 },
            ]}
          >
            <SymbolView
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              tintColor={theme.surface}
              size={16}
            />
            <ThemedText type="smallBold" style={[styles.btnText, { color: theme.surface }]}>
              {transcript.length > 0 ? 'Restart Debate' : 'Start Debate'}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [
              styles.stopBtn,
              { backgroundColor: theme.backgroundElement, borderColor: theme.outline },
              pressed && { opacity: 0.8 },
            ]}
          >
            <SymbolView
              name={{ ios: 'stop.fill', android: 'stop', web: 'stop' }}
              tintColor={theme.error}
              size={16}
            />
            <ThemedText type="smallBold" style={[styles.btnText, { color: theme.error }]}>
              Stop Debate
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Note */}
      <ThemedText type="code" themeColor="textSecondary" style={styles.note}>
        Voices by ElevenLabs · Arguments by AI · Debate runs until stopped
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  turnBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  turnBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Conflict banner
  conflictBanner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  conflictLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  conflictReason: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.85,
  },
  // Fighters
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 0,
  },
  fighterCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.two,
    gap: Spacing.one,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  fighterSideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fighterSideBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fighterSideLetter: {
    fontSize: 9,
    fontWeight: '900',
  },
  fighterSideLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fighterName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    fontFamily: undefined,
  },
  speakingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    flexShrink: 0,
  },
  vsDivider: {
    flex: 1,
    width: 1.5,
  },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  vsText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Transcript
  transcriptScroll: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.two,
    maxHeight: 280,
  },
  transcriptContent: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  emptyTranscript: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
    paddingRight: '20%',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
    paddingLeft: '20%',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.two,
    gap: 4,
    maxWidth: '100%',
  },
  bubbleActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleSpeaker: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  generatingRow: {
    flexDirection: 'row',
  },
  generatingBubble: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.two,
    gap: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  // Error
  errorBanner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    fontSize: 11,
  },
  // Controls
  controls: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    gap: Spacing.two,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    gap: Spacing.two,
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    fontSize: 9,
    textAlign: 'center',
    paddingBottom: Spacing.three,
    letterSpacing: 0.3,
  },
});
