import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export type StakeholderImpact = 'positive' | 'negative' | 'mixed';

export interface StakeholderCardProps {
  name: string;
  role: string;
  impact: StakeholderImpact;
  isOverlooked?: boolean;
  description: string;
  onPress: () => void;
}

export function StakeholderCard({
  name,
  role,
  impact,
  isOverlooked = false,
  description,
  onPress,
}: StakeholderCardProps) {
  const theme = useTheme();

  // Define flat color styling for different impact states
  const getImpactStyle = () => {
    switch (impact) {
      case 'positive':
        return {
          bg: theme.success + '1A', // 10% opacity
          text: theme.success,
          label: 'Positive Impact',
          icon: 'check-circle',
        };
      case 'negative':
        return {
          bg: theme.error + '1A',
          text: theme.error,
          label: 'Negative Impact',
          icon: 'cancel',
        };
      case 'mixed':
        return {
          bg: theme.warning + '1A',
          text: theme.warning,
          label: 'Mixed Impact',
          icon: 'help-circle',
        };
    }
  };

  const impactStyle = getImpactStyle();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isOverlooked ? theme.warning : theme.outline,
          borderWidth: isOverlooked ? 1.5 : 1,
        },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <View style={styles.nameRow}>
            <ThemedText type="smallBold" style={styles.nameText}>
              {name}
            </ThemedText>
            {isOverlooked && (
              <View style={[styles.badge, { backgroundColor: theme.warningContainer }]}>
                <ThemedText
                  type="code"
                  style={[styles.badgeText, { color: theme.warning, fontSize: 10 }]}>
                  OVERLOOKED
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.roleText}>
            {role}
          </ThemedText>
        </View>

        <View style={[styles.impactBadge, { backgroundColor: impactStyle.bg }]}>
          <SymbolView
            name={{
              ios: impact === 'positive' ? 'checkmark.circle.fill' : impact === 'negative' ? 'xmark.circle.fill' : 'questionmark.circle.fill',
              android: impactStyle.icon,
              web: impactStyle.icon,
            } as any}
            tintColor={impactStyle.text}
            size={14}
          />
          <ThemedText
            type="code"
            style={[styles.impactText, { color: impactStyle.text }]}>
            {impactStyle.label}
          </ThemedText>
        </View>
      </View>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={2}
        style={styles.description}>
        {description}
      </ThemedText>

      <View style={styles.cardFooter}>
        <ThemedText type="linkPrimary" style={styles.listenText}>
          Hear perspective
        </ThemedText>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={theme.primary}
          size={16}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    alignSelf: 'stretch',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  nameText: {
    fontSize: 16,
  },
  roleText: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: '700',
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one / 2,
    borderRadius: 20,
    gap: 4,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  listenText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
