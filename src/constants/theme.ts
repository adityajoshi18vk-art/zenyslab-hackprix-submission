/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1F1F',
    background: '#F8F9FA',
    backgroundElement: '#EDF2FA',
    backgroundSelected: '#D3E3FD',
    textSecondary: '#5F6368',
    primary: '#0B57D0',
    primaryContainer: '#D3E3FD',
    outline: '#DADCE0',
    surface: '#FFFFFF',
    error: '#B3261E',
    success: '#146C36',
    warning: '#B06000',
    warningContainer: '#FFEAC2',
    inputBackground: '#FFFFFF',
    border: '#E0E0E0',
  },
  dark: {
    text: '#E3E3E3',
    background: '#131314',
    backgroundElement: '#1E1F20',
    backgroundSelected: '#0842A0',
    textSecondary: '#C4C7C5',
    primary: '#A8C7FA',
    primaryContainer: '#0842A0',
    outline: '#444746',
    surface: '#1E1F20',
    error: '#F2B8B5',
    success: '#37BE5F',
    warning: '#FFB85F',
    warningContainer: '#4B3000',
    inputBackground: '#1E1F20',
    border: '#3C4043',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
