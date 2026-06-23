// JMComic iOS - 设计主题 (Cybernetic Sakura Bloom 樱花绯红)
// 基于 Stitch AI 生成设计提取
// @author Jason

export const Colors = {
  // 主色 - 绯红
  primary: '#B51536',
  primaryLight: '#D8334C',
  primaryDark: '#920026',
  primaryContainer: '#FFFBFF',
  primaryFixed: '#FFDADA',
  primaryFixedDim: '#FFB3B5',

  // 强调
  accent: '#C25200',       // 暖橙
  accentLight: '#FFB692',

  // 背景
  background: '#FFF8F7',   // 暖白
  surface: '#FFF8F7',
  surfaceContainer: '#FFE9E9',
  surfaceContainerLow: '#FFF0F0',
  surfaceContainerHigh: '#FEE2E2',
  surfaceDim: '#EFD4D4',
  surfaceLowest: '#FFFFFF',

  // 文字
  textPrimary: '#271818',
  textSecondary: '#5A4041',
  textTertiary: '#8E6F70',
  textOnPrimary: '#FFFFFF',

  // 次要色 - 粉紫
  secondary: '#993295',
  secondaryContainer: '#FC8AF1',

  // 状态
  error: '#BA1A1A',
  success: '#2E7D32',

  // 边框/分隔
  divider: '#F0D6D6',
  border: '#E2BEBE',
  outline: '#8E6F70',
  outlineVariant: '#E2BEBE',

  // Tab 栏
  tabActive: '#B51536',
  tabInactive: '#C9A7A8',
  tabBar: '#FFFFFF',
  tabBarBorder: '#F0D6D6',

  shadow: '#271818',
} as const;

export const Radius = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, full: 9999,
  card: 12, button: 20, chip: 20,
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
  gutter: 12, marginEdge: 16,
} as const;

export const FontSize = {
  caption: 11, label: 12, body: 14, bodyLarge: 16,
  headline: 18, title: 20, largeTitle: 24, display: 30,
} as const;

export const Shadow = {
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
