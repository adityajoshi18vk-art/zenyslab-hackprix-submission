import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface BlindSpotAlertProps {
  stakeholderNames: string[];
}

export function BlindSpotAlert({ stakeholderNames }: BlindSpotAlertProps) {
  const theme = useTheme();

  if (stakeholderNames.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.warningContainer,
          borderColor: theme.warning + '33', // 20% opacity border
        },
      ]}>
      <View style={styles.header}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
          tintColor={theme.warning}
          size={20}
        />
        <ThemedText type="smallBold" style={[styles.title, { color: theme.warning }]}>
          Decision Blind Spots Detected
        </ThemedText>
      </View>

      <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
        Echo simulated potential impacts and discovered {stakeholderNames.length} affected stakeholder groups not identified in your proposal.
      </ThemedText>

      <View style={styles.chipContainer}>
        {stakeholderNames.map((name, index) => (
          <View
            key={index}
            style={[
              styles.chip,
              {
                backgroundColor: theme.surface,
                borderColor: theme.warning + '40',
              },
            ]}>
            <SymbolView
              name={{ ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' }}
              tintColor={theme.warning}
              size={12}
            />
            <ThemedText type="code" style={[styles.chipText, { color: theme.text }]}>
              {name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.one,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
