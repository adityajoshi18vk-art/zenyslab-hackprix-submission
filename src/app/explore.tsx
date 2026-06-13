import React, { useState, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
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

export default function HistoryScreen() {
  const theme = useTheme();

  // Selected item states
  const [expandedSimId, setExpandedSimId] = useState<string | null>('sim-1'); // expand first one by default
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);

  // Bottom sheet animation values
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // Bottom sheet open/close
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

  const toggleExpandSimulation = (id: string) => {
    setExpandedSimId((prev) => (prev === id ? null : id));
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Vertical slide interpolation for sheet
  const translateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Background overlay opacity interpolation
  const overlayOpacity = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: theme.primaryContainer }]}>
              <SymbolView
                name={{ ios: 'folder', android: 'history', web: 'history' } as any}
                tintColor={theme.primary}
                size={20}
              />
            </View>
            <View>
              <ThemedText type="smallBold" style={styles.appName}>
                Simulation History
              </ThemedText>
              <ThemedText type="code" themeColor="textSecondary" style={styles.appTagline}>
                PREVIOUS DECISION EVALUATIONS
              </ThemedText>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          <View style={styles.contentWrapper}>
            <ThemedText type="subtitle" style={styles.title}>
              History Log
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              Explore details of previous decision evaluations. Expanding a record allows you to review the mapped stakeholders and listen to their local perspectives.
            </ThemedText>

            {/* List of Previous Simulations */}
            {MOCK_SIMULATIONS.map((sim) => {
              const isExpanded = expandedSimId === sim.id;
              const blindSpotCount = sim.stakeholders.filter((s) => s.isOverlooked).length;
              const overlookedNames = sim.stakeholders.filter((s) => s.isOverlooked).map((s) => s.name);

              return (
                <View
                  key={sim.id}
                  style={[
                    styles.simCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isExpanded ? theme.primary : theme.outline,
                      borderWidth: isExpanded ? 1.5 : 1,
                    },
                  ]}>
                  {/* Collapsible Header */}
                  <Pressable
                    onPress={() => toggleExpandSimulation(sim.id)}
                    style={styles.simCardHeader}>
                    <View style={styles.simMeta}>
                      <ThemedText type="code" themeColor="textSecondary" style={styles.simDate}>
                        {formatDate(sim.timestamp)}
                      </ThemedText>
                      <ThemedText type="smallBold" style={styles.simTitle}>
                        {sim.decisionTitle}
                      </ThemedText>

                      {/* Info Chips */}
                      <View style={styles.metaBadgeRow}>
                        <View style={[styles.metaBadge, { backgroundColor: theme.backgroundElement }]}>
                          <SymbolView
                            name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
                            tintColor={theme.textSecondary}
                            size={12}
                          />
                          <ThemedText type="code" themeColor="textSecondary" style={styles.badgeText}>
                            {sim.stakeholders.length} Stakeholders
                          </ThemedText>
                        </View>

                        {blindSpotCount > 0 && (
                          <View style={[styles.metaBadge, { backgroundColor: theme.warningContainer }]}>
                            <SymbolView
                              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                              tintColor={theme.warning}
                              size={12}
                            />
                            <ThemedText type="code" style={[styles.badgeText, { color: theme.warning }]}>
                              {blindSpotCount} Blind Spots
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>

                    <SymbolView
                      name={{
                        ios: isExpanded ? 'chevron.up' : 'chevron.down',
                        android: isExpanded ? 'expand_less' : 'expand_more',
                        web: isExpanded ? 'expand_less' : 'expand_more',
                      }}
                      tintColor={theme.text}
                      size={20}
                    />
                  </Pressable>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: theme.outline }]}>
                      <ThemedText type="code" themeColor="textSecondary" style={styles.sectionLabel}>
                        DECISION DESCRIPTION:
                      </ThemedText>
                      <ThemedText type="small" style={styles.simDescription}>
                        {sim.description}
                      </ThemedText>

                      {/* Blind Spot Alert */}
                      <BlindSpotAlert stakeholderNames={overlookedNames} />

                      {/* Stakeholder List */}
                      <ThemedText type="code" themeColor="textSecondary" style={[styles.sectionLabel, { marginBottom: Spacing.two }]}>
                        STAKEHOLDER EVALUATIONS:
                      </ThemedText>

                      {sim.stakeholders.map((sh) => (
                        <StakeholderCard
                          key={sh.id}
                          name={sh.name}
                          role={sh.role}
                          impact={sh.impact}
                          isOverlooked={sh.isOverlooked}
                          description={sh.description}
                          onPress={() => openStakeholderDetail(sh)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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
  contentWrapper: {
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  simCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  simCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  simMeta: {
    flex: 1,
    gap: 2,
  },
  simDate: {
    fontSize: 10,
    fontWeight: '700',
  },
  simTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: Spacing.three,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  simDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.three,
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
