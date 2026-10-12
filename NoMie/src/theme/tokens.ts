/** Design tokens ported from DESIGN.md — reference that file, don't restate rationale here. */
export const colors = {
  primary: '#477566',
  primaryBright: '#5a8e7d',
  primaryDeep: '#355c4f',
  primarySoft: '#eaf2ef',
  onPrimary: '#ffffff',
  onPrimaryMute: 'rgba(255,255,255,0.72)',
  canvas: '#fcf7f8',
  surface: '#ffffff',
  surfaceSoft: '#f6eef0',
  surfaceSunken: '#efe5e8',
  scrim: 'rgba(36,31,33,0.32)',
  ink: '#241f21',
  body: '#3b3538',
  mute: '#675f63',
  ash: '#766e72',
  faint: '#ddd3d7',
  hairline: '#efe4e7',
  hairlineStrong: '#dacfd3',
  statusPointe: '#477566',
  statusPointeSoft: '#eaf2ef',
  statusNonPointe: '#8a6422',
  statusNonPointeSoft: '#f7ecdc',
  statusPrevision: '#6f5f8c',
  statusPrevisionSoft: '#efe9f5',
  statusFlux: '#6f696c',
  statusFluxSoft: '#f0ebed',
  amountPositive: '#477566',
  amountNegative: '#8a5a46',
  advance: '#6f5f8c',
  budgetOk: '#477566',
  budgetWatch: '#c79a56',
  link: '#355c4f',
  chart1: '#6f9486',
  chart2: '#c2a06a',
  chart3: '#9a8db4',
  chart4: '#c29478',
  chart5: '#8499b3',
  chart6: '#7ba8a1',
  chart7: '#c0939a',
  chart8: '#99a57a',
  chart9: '#c6b26f',
  chartAutres: '#b3aaae',
  chartSansCategorie: '#dacfd3',
  chartSousZero: '#f8f1f3',
  chartCompte1: '#477566',
  chartCompte2: '#8499b3',
  chartCompte3: '#9a8db4',
  chartCompte4: '#c2a06a',
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

/**
 * Soft lifts that replace borders on cards and grouped lists (DESIGN.md `shadow-*`).
 * The CSS shadows are two layers; RN takes one, so the wide soft layer is kept.
 */
export const shadows = {
  card: {
    shadowColor: '#241f21',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1,
  },
  sheet: {
    shadowColor: '#241f21',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 16,
  },
  fab: {
    shadowColor: '#355c4f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

/** fontFamily left undefined until Manrope loads (falls back to system font); see useAppFonts. */
export const typography = {
  displayLg: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.8 },
  displayMd: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.5 },
  headingLg: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.4 },
  headingMd: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.2 },
  headingSm: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.1 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  bodyMdMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.1 },
  button: { fontSize: 15, fontWeight: '700' as const, lineHeight: 20, letterSpacing: -0.1 },
  amountLg: { fontSize: 20, fontWeight: '800' as const, lineHeight: 24, letterSpacing: -0.3 },
  amountSm: { fontSize: 14, fontWeight: '700' as const, lineHeight: 18, letterSpacing: -0.1 },
} as const;

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export function fontFamilyForWeight(weight: '400' | '500' | '600' | '700' | '800'): string {
  switch (weight) {
    case '800':
      return fontFamilies.extraBold;
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
 * Maps a typography token to a RN Text style. Each Manrope weight is loaded
 * as its own font family, so `fontFamily` replaces `fontWeight` here —
 * setting both makes RN try to synthesize a weight on top of a file that
 * already is that weight.
 */
export function textStyle(token: keyof typeof typography) {
  const { fontWeight, ...rest } = typography[token];
  return { ...rest, fontFamily: fontFamilyForWeight(fontWeight) };
}
