/** Design tokens ported from DESIGN.md — reference that file, don't restate rationale here. */
export const colors = {
  primary: '#4C7A6C',
  primaryBright: '#5C8F7F',
  primaryDeep: '#3A5F54',
  primarySoft: '#E3ECE8',
  onPrimary: '#ffffff',
  canvas: '#FAF8F5',
  surface: '#ffffff',
  surfaceSoft: '#F1EEE9',
  surfaceSunken: '#EBE7E0',
  ink: '#232323',
  body: '#3A3A3A',
  mute: '#6B6B66',
  ash: '#8C8C86',
  faint: '#D8D5CE',
  onPrimaryMute: 'rgba(255,255,255,0.72)',
  hairline: '#E7E3DC',
  hairlineStrong: '#CFCAC0',
  statusPointe: '#4C7A6C',
  statusPointeSoft: '#E3ECE8',
  statusNonPointe: '#C79A56',
  statusNonPointeSoft: '#F5ECDB',
  statusPrevision: '#8B7CA6',
  statusPrevisionSoft: '#ECE7F2',
  statusFlux: '#9A958C',
  statusFluxSoft: '#EDEBE7',
  amountPositive: '#4C7A6C',
  amountNegative: '#8A5A46',
  advance: '#8B7CA6',
  budgetOk: '#4C7A6C',
  budgetWatch: '#C79A56',
  link: '#3A5F54',
  chart1: '#6F9486',
  chart2: '#C2A06A',
  chart3: '#9A8DB4',
  chart4: '#C29478',
  chart5: '#8499B3',
  chart6: '#7BA8A1',
  chart7: '#C0939A',
  chart8: '#99A57A',
  chart9: '#C6B26F',
  chartAutres: '#ADA69A',
  chartSansCategorie: '#CFCAC0',
  chartSousZero: '#F6F3EE',
  chartCompte1: '#4C7A6C',
  chartCompte2: '#8499B3',
  chartCompte3: '#9A8DB4',
  chartCompte4: '#C2A06A',
} as const;

/** Bilan annuel palette (handoff §6.7): handed out by rank of amount, not fixed per category. */
export const CHART_CATEGORY_COLORS: readonly string[] = [
  colors.chart1,
  colors.chart2,
  colors.chart3,
  colors.chart4,
  colors.chart5,
  colors.chart6,
  colors.chart7,
  colors.chart8,
  colors.chart9,
];

/** One colour per account on the balance chart, in the user's account order (§6.7). */
export const CHART_ACCOUNT_COLORS: readonly string[] = [
  colors.chartCompte1,
  colors.chartCompte2,
  colors.chartCompte3,
  colors.chartCompte4,
];

/** Past the end of a chart palette, colours come round again. */
export const chartColor = (palette: readonly string[], rank: number) => palette[rank % palette.length];

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const rounded = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** fontFamily left undefined until Inter loads (falls back to system font); see useAppFonts. */
export const typography = {
  displayLg: { fontSize: 34, fontWeight: '700' as const, lineHeight: 39, letterSpacing: -0.3 },
  displayMd: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34, letterSpacing: -0.2 },
  headingLg: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28, letterSpacing: 0 },
  headingMd: { fontSize: 18, fontWeight: '600' as const, lineHeight: 23, letterSpacing: 0 },
  headingSm: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22, letterSpacing: 0 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  bodyMdMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.1 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0 },
  amountLg: { fontSize: 20, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.1 },
  amountSm: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18, letterSpacing: 0 },
} as const;

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export function fontFamilyForWeight(weight: '400' | '500' | '600' | '700'): string {
  switch (weight) {
    case '700':
      return fontFamilies.bold;
    case '600':
      return fontFamilies.semiBold;
    case '500':
      return fontFamilies.medium;
    default:
      return fontFamilies.regular;
  }
}

/**
 * Maps a typography token to a RN Text style. Each Inter weight is loaded
 * as its own font family, so `fontFamily` replaces `fontWeight` here —
 * setting both makes RN try to synthesize a weight on top of a file that
 * already is that weight.
 */
export function textStyle(token: keyof typeof typography) {
  const { fontWeight, ...rest } = typography[token];
  return { ...rest, fontFamily: fontFamilyForWeight(fontWeight) };
}
