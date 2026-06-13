import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StakeholderCard } from '@/components/StakeholderCard';
import { BlindSpotAlert } from '@/components/BlindSpotAlert';
import { VoicePlayer } from '@/components/VoicePlayer';
import { MOCK_SIMULATIONS, SimulationRecord, Stakeholder } from '@/constants/mockData';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const theme = useTheme();

  // App states
  const [proposalText, setProposalText] = useState('');
  const [currentSimulation, setCurrentSimulation] = useState<SimulationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);

  // Animation values for the bottom sheet
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // AI Mock analysis steps
  const loadingMessages = [
    'Echo discovering direct and indirect stakeholders...',
    'Analyzing structural conflict areas...',
    'Detecting hidden decision blind spots...',
    'Generating regional narration voices via ElevenLabs & Sarvam AI...',
  ];

  // Run the mock AI loader sequence
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isLoading) {
      if (loadingStep < loadingMessages.length) {
        timer = setTimeout(() => {
          setLoadingStep((prev) => prev + 1);
        }, 1200);
      } else {
        // Complete loading
        setIsLoading(false);
        setLoadingStep(0);
        // Process text and assign a simulation
        const text = proposalText.toLowerCase();
        let matchedSim = MOCK_SIMULATIONS[0]; // default to attendance

        if (text.includes('cash') || text.includes('card') || text.includes('pay') || text.includes('wallet')) {
          matchedSim = MOCK_SIMULATIONS[1];
        } else if (text.includes('work') || text.includes('office') || text.includes('hybrid') || text.includes('remote')) {
          matchedSim = MOCK_SIMULATIONS[2];
        } else if (proposalText.trim().length > 0) {
          // Generate a custom simulated record for other inputs
          matchedSim = {
            id: 'sim-custom',
            decisionTitle: proposalText,
            description: 'Proposed decision entered by the user.',
            timestamp: new Date().toISOString(),
            stakeholders: [
              {
                id: 'sh-c1',
                name: 'Commuters & Travel Staff',
                role: 'Individuals relying on regional transportation networks',
                impact: 'negative',
                isOverlooked: true,
                description: 'Changes in scheduling or structure will lead to longer transit wait times and scheduling conflicts.',
                voiceQuote: 'I have to travel through multiple zones daily. Without a buffer in the schedule, a minor delay ruins my entire plan.',
              },
              {
                id: 'sh-c2',
                name: 'Support & Facilities Staff',
                role: 'Contractual cleaning, security, and administrative workers',
                impact: 'negative',
                isOverlooked: true,
                description: 'Typically excluded from administrative design. Face unexpected workload adjustments or shift revisions.',
                voiceQuote: 'We keep the campus running, but are rarely told when rules change. We have to adjust our shifts without prior notice.',
              },
              {
                id: 'sh-c3',
                name: 'Primary Beneficiaries',
                role: 'General students or managers',
                impact: 'positive',
                isOverlooked: false,
                description: 'Expect improved consistency and higher organizational performance.',
                voiceQuote: 'This proposal provides structure and long-term benefits. Having clear expectations helps us collaborate more effectively.',
              },
              {
                id: 'sh-c4',
                name: 'Financial Officers',
                role: 'Budget and accounting departments',
                impact: 'mixed',
                isOverlooked: false,
                description: 'Experience administrative efficiency and budget optimization, balanced against initial transition friction.',
                voiceQuote: 'Financially, this project is positive. However, managing the onboarding process creates substantial work for our team.',
              },
            ],
          };
        }
        setCurrentSimulation(matchedSim);
      }
    }
    return () => clearTimeout(timer);
  }, [isLoading, loadingStep]);

  // Bottom sheet show/hide
  const openStakeholderDetail = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    Animated.timing(bottomSheetAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeStakeholderDetail = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedStakeholder(null);
    });
  };

  const handleAnalyze = () => {
    if (proposalText.trim().length === 0) return;
    Keyboard.dismiss();
    setIsLoading(true);
    setLoadingStep(0);
    setCurrentSimulation(null);
  };

  const loadTemplate = (title: string) => {
    setProposalText(title);
    Keyboard.dismiss();
    setIsLoading(true);
    setLoadingStep(0);
    setCurrentSimulation(null);
  };

  const handleReset = () => {
    setCurrentSimulation(null);
    setProposalText('');
  };

  // Bottom sheet vertical slide interpolation
  const translateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Background overlay opacity interpolation
  const overlayOpacity = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const overlookedStakeholders = currentSimulation
    ? currentSimulation.stakeholders.filter((s) => s.isOverlooked).map((s) => s.name)
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: theme.primaryContainer }]}>
              <SymbolView
                name={{ ios: 'waveform.and.mic', android: 'record_voice_over', web: 'record_voice_over' }}
                tintColor={theme.primary}
                size={22}
              />
            </View>
            <View>
              <ThemedText type="smallBold" style={styles.appName}>
                Echo
              </ThemedText>
              <ThemedText type="code" themeColor="textSecondary" style={styles.appTagline}>
                DECISION BLIND SPOT DETECTOR
              </ThemedText>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Main Dashboard Panel */}
          {!currentSimulation && !isLoading && (
            <View style={styles.dashboardCard}>
              <ThemedText type="subtitle" style={styles.welcomeTitle}>
                Examine Proposed Decisions
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.welcomeDesc}>
                Enter your proposed regulation, policy change, or organizational decision below. Echo discovers affected stakeholders, maps conflicts, and surfaces forgotten perspectives.
              </ThemedText>

              {/* Input Box */}
              <View style={[styles.inputContainer, { borderColor: theme.outline, backgroundColor: theme.inputBackground }]}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="e.g. Mandatory 85% attendance requirement for all courses, excluding internships..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={proposalText}
                  onChangeText={setProposalText}
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleAnalyze}
                disabled={proposalText.trim().length === 0}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: proposalText.trim().length === 0 ? theme.outline : theme.primary,
                  },
                  pressed && { opacity: 0.9 },
                ]}>
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  tintColor={proposalText.trim().length === 0 ? theme.textSecondary : theme.surface}
                  size={16}
                />
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.primaryButtonText,
                    { color: proposalText.trim().length === 0 ? theme.textSecondary : theme.surface },
                  ]}>
                  Analyze Decision
                </ThemedText>
              </Pressable>

              {/* Quick Start Templates */}
              <ThemedText type="code" themeColor="textSecondary" style={styles.templateSectionTitle}>
                OR TRY A RECENT HACKATHON EXAMPLE:
              </ThemedText>

              <View style={styles.templateContainer}>
                <Pressable
                  onPress={() => loadTemplate('Mandatory 85% attendance policy for all courses')}
                  style={({ pressed }) => [
                    styles.templateButton,
                    { borderColor: theme.outline, backgroundColor: theme.surface },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <SymbolView name={{ ios: 'graduationcap.fill', android: 'school', web: 'school' }} tintColor={theme.primary} size={16} />
                  <ThemedText type="small" style={styles.templateButtonText}>
                    Mandatory 85% Attendance
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => loadTemplate('Transitioning to a 100% cashless campus')}
                  style={({ pressed }) => [
                    styles.templateButton,
                    { borderColor: theme.outline, backgroundColor: theme.surface },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <SymbolView name={{ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' }} tintColor={theme.primary} size={16} />
                  <ThemedText type="small" style={styles.templateButtonText}>
                    100% Cashless Campus
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => loadTemplate('Mandatory return-to-office 5 days a week')}
                  style={({ pressed }) => [
                    styles.templateButton,
                    { borderColor: theme.outline, backgroundColor: theme.surface },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <SymbolView name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} tintColor={theme.primary} size={16} />
                  <ThemedText type="small" style={styles.templateButtonText}>
                    Mandatory Return-to-Office
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Loader Sequence */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="smallBold" style={styles.loadingTitle}>
                Echo Simulator Running
              </ThemedText>
              <View style={[styles.loadingProgressBox, { backgroundColor: theme.backgroundElement }]}>
                {loadingMessages.map((msg, index) => {
                  const isActive = index === loadingStep;
                  const isCompleted = index < loadingStep;
                  return (
                    <View key={index} style={styles.loadingStepRow}>
                      <SymbolView
                        name={{
                          ios: isCompleted ? 'checkmark.circle.fill' : isActive ? 'arrow.triangle.2.circlepath' : 'circle',
                          android: isCompleted ? 'check_circle' : isActive ? 'sync' : 'radio_button_unchecked',
                          web: isCompleted ? 'check_circle' : isActive ? 'sync' : 'radio_button_unchecked',
                        }}
                        tintColor={isCompleted ? theme.success : isActive ? theme.primary : theme.textSecondary}
                        size={16}
                      />
                      <ThemedText
                        type="small"
                        themeColor={isActive ? 'text' : 'textSecondary'}
                        style={[
                          styles.loadingStepText,
                          isCompleted && { textDecorationLine: 'line-through' },
                          isActive && { fontWeight: '700' },
                        ]}>
                        {msg}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Simulation Results View */}
          {currentSimulation && !isLoading && (
            <View style={styles.resultsContainer}>
              {/* Proposal Banner */}
              <View style={[styles.proposalBanner, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                <View style={styles.bannerHeader}>
                  <ThemedText type="code" themeColor="primary" style={styles.bannerLabel}>
                    PROPOSAL UNDER ANALYSIS
                  </ThemedText>
                  <Pressable
                    onPress={handleReset}
                    style={({ pressed }) => [
                      styles.resetButton,
                      { backgroundColor: theme.backgroundElement },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <SymbolView name={{ ios: 'arrow.counterclockwise', android: 'refresh', web: 'refresh' }} tintColor={theme.text} size={12} />
                    <ThemedText type="code" style={styles.resetButtonText}>
                      Reset
                    </ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="smallBold" style={styles.bannerTitle}>
                  {currentSimulation.decisionTitle}
                </ThemedText>
              </View>

              {/* Blind Spot Alert */}
              <BlindSpotAlert stakeholderNames={overlookedStakeholders} />

              {/* Stakeholder Directory */}
              <View style={styles.directoryHeader}>
                <ThemedText type="smallBold" style={styles.directoryTitle}>
                  Stakeholder Impact Directory
                </ThemedText>
                <ThemedText type="code" themeColor="textSecondary">
                  {currentSimulation.stakeholders.length} DIRECT & INDIRECT GROUPS
                </ThemedText>
              </View>

              {currentSimulation.stakeholders.map((stakeholder) => (
                <StakeholderCard
                  key={stakeholder.id}
                  name={stakeholder.name}
                  role={stakeholder.role}
                  impact={stakeholder.impact}
                  isOverlooked={stakeholder.isOverlooked}
                  description={stakeholder.description}
                  onPress={() => openStakeholderDetail(stakeholder)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Sheet Modal Overlay */}
      {selectedStakeholder && (
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: '#000000',
              opacity: overlayOpacity,
            },
          ]}>
          <Pressable style={styles.overlayPressable} onPress={closeStakeholderDetail} />
        </Animated.View>
      )}

      {selectedStakeholder && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
              transform: [{ translateY }],
            },
          ]}>
          {/* Handle */}
          <View style={styles.sheetHandleContainer}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.outline }]} />
          </View>

          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <View style={styles.sheetNameRow}>
                  <ThemedText type="subtitle" style={styles.sheetName}>
                    {selectedStakeholder.name}
                  </ThemedText>
                  {selectedStakeholder.isOverlooked && (
                    <View style={[styles.sheetBadge, { backgroundColor: theme.warningContainer }]}>
                      <ThemedText type="code" style={{ color: theme.warning, fontSize: 10, fontWeight: '700' }}>
                        OVERLOOKED BLIND SPOT
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sheetRole}>
                  {selectedStakeholder.role}
                </ThemedText>
              </View>

              <Pressable
                onPress={closeStakeholderDetail}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundElement },
                  pressed && { opacity: 0.8 },
                ]}>
                <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={theme.text} size={16} />
              </Pressable>
            </View>

            {/* Content Cards */}
            <View style={styles.section}>
              <ThemedText type="code" themeColor="textSecondary" style={styles.sectionTitle}>
                POTENTIAL STRUCTURAL IMPACT:
              </ThemedText>
              <ThemedText type="small" style={styles.sheetDesc}>
                {selectedStakeholder.description}
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="code" themeColor="textSecondary" style={styles.sectionTitle}>
                GENERATED PERSPECTIVE NARRATIVE:
              </ThemedText>
              <View style={[styles.quoteContainer, { backgroundColor: theme.background, borderColor: theme.outline }]}>
                <SymbolView
                  name={{ ios: 'quote.bubble.fill', android: 'format_quote', web: 'format_quote' }}
                  tintColor={theme.primary + '33'}
                  size={24}
                  style={styles.quoteIcon}
                />
                <ThemedText type="small" style={[styles.quoteText, { fontStyle: 'italic' }]}>
                  &ldquo;{selectedStakeholder.voiceQuote}&rdquo;
                </ThemedText>
              </View>
            </View>

            {/* Audio Voice Player Component */}
            <View style={styles.voiceSection}>
              <VoicePlayer speakerName={selectedStakeholder.name} />
            </View>

            {/* Indian Language Note */}
            <ThemedText type="code" themeColor="textSecondary" style={styles.sarvamNote}>
              * Voices generated using ElevenLabs high-fidelity cloning. Dynamic translation and speech synthesis is powered by Sarvam AI for multilingual compatibility.
            </ThemedText>

            <View style={{ height: BottomTabInset + Spacing.five }} />
          </ScrollView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  appTagline: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.five,
    alignItems: 'center',
    width: '100%',
  },
  dashboardCard: {
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textInput: {
    height: 100,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 28,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  templateSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: Spacing.four,
    letterSpacing: 0.5,
  },
  templateContainer: {
    gap: Spacing.two,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.three,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    alignItems: 'center',
    gap: Spacing.four,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingProgressBox: {
    alignSelf: 'stretch',
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
  },
  loadingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingStepText: {
    fontSize: 13,
  },
  resultsContainer: {
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    alignItems: 'stretch',
  },
  proposalBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  directoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  directoryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  overlayPressable: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    zIndex: 100,
    maxHeight: '85%',
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.two,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: Spacing.four,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 2,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sheetName: {
    fontSize: 22,
    fontWeight: '700',
  },
  sheetBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sheetRole: {
    fontSize: 13,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sheetDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  quoteContainer: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  quoteIcon: {
    marginTop: -2,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  voiceSection: {
    marginBottom: Spacing.three,
  },
  sarvamNote: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
