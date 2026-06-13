import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface VoicePlayerProps {
  speakerName: string;
  languages?: string[];
  initialLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

export function VoicePlayer({
  speakerName,
  languages = ['English', 'Hindi (हिंदी)', 'Tamil (தமிழ்)', 'Bengali (বাংলা)'],
  initialLanguage = 'English',
  onLanguageChange,
}: VoicePlayerProps) {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [selectedLang, setSelectedLang] = useState(initialLanguage);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5; // increment progress
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const selectLanguage = (lang: string) => {
    setSelectedLang(lang);
    setProgress(0);
    setIsPlaying(false);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  // Format progress seconds
  const currentSeconds = Math.floor((progress / 100) * 15);
  const formatTime = (sec: number) => `0:${sec < 10 ? '0' : ''}${sec}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <View style={styles.voiceInfo}>
          <SymbolView
            name={{ ios: 'waveform.circle.fill', android: 'record_voice_over', web: 'record_voice_over' }}
            tintColor={theme.primary}
            size={18}
          />
          <ThemedText type="smallBold" style={styles.speakerText}>
            {speakerName}&apos;s Voice
          </ThemedText>
        </View>
        <View style={styles.brandBadge}>
          <ThemedText type="code" style={[styles.brandText, { color: theme.primary }]}>
            Sarvam AI & ElevenLabs
          </ThemedText>
        </View>
      </View>

      {/* Language Selector */}
      <ThemedText type="code" themeColor="textSecondary" style={styles.sectionLabel}>
        SELECT NARRATION LANGUAGE:
      </ThemedText>
      <View style={styles.langList}>
        {languages.map((lang) => {
          const isSelected = selectedLang === lang;
          return (
            <Pressable
              key={lang}
              onPress={() => selectLanguage(lang)}
              style={[
                styles.langChip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.outline,
                },
              ]}>
              <ThemedText
                type="code"
                style={[
                  styles.langChipText,
                  { color: isSelected ? theme.surface : theme.text },
                ]}>
                {lang.split(' ')[0]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Audio Controls */}
      <View style={styles.playerRow}>
        <Pressable
          onPress={handlePlayPause}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.9 },
          ]}>
          <SymbolView
            name={{
              ios: isPlaying ? 'pause.fill' : 'play.fill',
              android: isPlaying ? 'pause' : 'play_arrow',
              web: isPlaying ? 'pause' : 'play_arrow',
            }}
            tintColor={theme.surface}
            size={20}
          />
        </Pressable>

        <View style={styles.progressSection}>
          <View style={[styles.progressBarBg, { backgroundColor: theme.outline }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: theme.primary, width: `${progress}%` },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <ThemedText type="code" themeColor="textSecondary" style={styles.timeText}>
              {formatTime(currentSeconds)}
            </ThemedText>
            <ThemedText type="code" themeColor="textSecondary" style={styles.timeText}>
              0:15
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: 16,
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  speakerText: {
    fontSize: 14,
  },
  brandBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
  langList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  langChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    flex: 1,
    gap: Spacing.one,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
  },
});
