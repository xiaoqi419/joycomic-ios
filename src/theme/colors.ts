// 主题色板 — Material 3 珊瑚橙（Coral Orange）配色方案
// 基于 M3 TonalSpot 变体生成，源色 #E85D3A
// 提供 Light / Dark 两套完整颜色令牌
// @author Jason

export interface ColorTokens {
  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Background / Surface
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Scrim
  scrim: string;

  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Surface Dim / Bright
  surfaceDim: string;
  surfaceBright: string;

  // Surface Container levels
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
}

export interface ColorFamily {
  color: string;
  onColor: string;
  colorContainer: string;
  onColorContainer: string;
}

export interface ExtendedColorTokens {
  contentTag: ColorFamily;
  roleTag: ColorFamily;
  workTag: ColorFamily;
}

export interface ThemeColors {
  colors: ColorTokens;
  extended: ExtendedColorTokens;
}

/** 向后兼容：旧版 Colors 属性名 + 新 M3 名 */
export type LegacyColors = ColorTokens & {
  primaryLight: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  border: string;
  divider: string;
  surfaceLight: string;
  success: string;
  text: string;
};

export function buildLegacyColors(c: ColorTokens): LegacyColors {
  return {
    ...c,
    primaryLight: c.primaryContainer,
    textPrimary: c.onSurface,
    textSecondary: c.onSurfaceVariant,
    textTertiary: c.outline,
    textOnPrimary: c.onPrimary,
    border: c.outlineVariant,
    divider: c.outlineVariant,
    surfaceLight: c.surfaceContainerHigh,
    success: '#4CAF50',
    text: c.onSurface,
  };
}

// ============ Light Scheme ============

export const lightColors: ColorTokens = {
  primary: '#C14A26',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBD1',
  onPrimaryContainer: '#360D00',
  secondary: '#77574B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FFDAD1',
  onSecondaryContainer: '#2D150D',
  tertiary: '#006B68',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#6FF7F3',
  onTertiaryContainer: '#002020',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FFF8F5',
  onBackground: '#231917',
  surface: '#FFF8F5',
  onSurface: '#231917',
  surfaceVariant: '#F0DBD4',
  onSurfaceVariant: '#53433E',
  outline: '#85736D',
  outlineVariant: '#D8C2BB',
  scrim: '#000000',
  inverseSurface: '#392F2D',
  inverseOnSurface: '#FFEDE8',
  inversePrimary: '#FFB59F',
  surfaceDim: '#E5D6D0',
  surfaceBright: '#FFF8F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F9F1ED',
  surfaceContainer: '#F3EBE7',
  surfaceContainerHigh: '#EDE5E1',
  surfaceContainerHighest: '#E7DFDB',
};

export const lightExtended: ExtendedColorTokens = {
  contentTag: {
    color: '#C14A26',
    onColor: '#FFFFFF',
    colorContainer: '#FFDBD1',
    onColorContainer: '#360D00',
  },
  roleTag: {
    color: '#006B68',
    onColor: '#FFFFFF',
    colorContainer: '#6FF7F3',
    onColorContainer: '#002020',
  },
  workTag: {
    color: '#7A5265',
    onColor: '#FFFFFF',
    colorContainer: '#FFD8E7',
    onColorContainer: '#30111F',
  },
};

// ============ Dark Scheme ============

export const darkColors: ColorTokens = {
  primary: '#FFB59F',
  onPrimary: '#561E00',
  primaryContainer: '#7E3112',
  onPrimaryContainer: '#FFDBD1',
  secondary: '#D0C0B8',
  onSecondary: '#3A2A22',
  secondaryContainer: '#534037',
  onSecondaryContainer: '#FFDAD1',
  tertiary: '#4EDAD6',
  onTertiary: '#003736',
  tertiaryContainer: '#00504E',
  onTertiaryContainer: '#6FF7F3',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#1A1210',
  onBackground: '#F0DED9',
  surface: '#1A1210',
  onSurface: '#F0DED9',
  surfaceVariant: '#53433E',
  onSurfaceVariant: '#D8C2BB',
  outline: '#A08D87',
  outlineVariant: '#53433E',
  scrim: '#000000',
  inverseSurface: '#F0DED9',
  inverseOnSurface: '#392F2D',
  inversePrimary: '#C14A26',
  surfaceDim: '#1A1210',
  surfaceBright: '#423733',
  surfaceContainerLowest: '#140D0B',
  surfaceContainerLow: '#221A18',
  surfaceContainer: '#2D2422',
  surfaceContainerHigh: '#382E2C',
  surfaceContainerHighest: '#433937',
};

export const darkExtended: ExtendedColorTokens = {
  contentTag: {
    color: '#FFB59F',
    onColor: '#561E00',
    colorContainer: '#7E3112',
    onColorContainer: '#FFDBD1',
  },
  roleTag: {
    color: '#4EDAD6',
    onColor: '#003736',
    colorContainer: '#00504E',
    onColorContainer: '#6FF7F3',
  },
  workTag: {
    color: '#E9B9CF',
    onColor: '#472638',
    colorContainer: '#603C4D',
    onColorContainer: '#FFD8E7',
  },
};
