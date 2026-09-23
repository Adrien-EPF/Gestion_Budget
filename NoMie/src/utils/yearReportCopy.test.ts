import {
  describeBelowZero,
  describeMonthlySpread,
  expensePeriodNote,
  forecastLegend,
  formatShare,
} from './yearReportCopy';
import { formatAmount } from './formatAmount';

const months = (entries: Record<number, number>) => {
  const values = Array<number>(12).fill(0);
  for (const [month, value] of Object.entries(entries)) values[Number(month)] = value;
  return values;
};

describe('yearReportCopy — dépenses par catégorie', () => {
  it('states the period counted: up to the current month this year, the whole year otherwise', () => {
    expect(expensePeriodNote(8)).toBe('De janvier à septembre · les prévisions ne sont pas comptées.');
    expect(expensePeriodNote(0)).toBe('En janvier · les prévisions ne sont pas comptées.');
    expect(expensePeriodNote(11)).toBe('De janvier à décembre.');
  });

  it('averages a category over the months gone by only, and names its highest month', () => {
    // January to September: 9 months gone by.
    const spread = describeMonthlySpread(months({ 0: 90, 3: 300, 7: 201.3, 8: 183 }), 8);

    expect(spread).toBe(`Moyenne ${formatAmount(86.03)} par mois · le plus haut en avril (${formatAmount(300)}).`);
  });

  it('shows a share under one percent as « <1 % »', () => {
    expect(formatShare(0.004)).toBe('<1 %');
    expect(formatShare(0.006)).toBe('<1 %');
    expect(formatShare(0.426)).toBe('43 %');
  });
});

describe('yearReportCopy — évolution du solde', () => {
  it('names the months drawn as forecasts', () => {
    expect(forecastLegend(8)).toBe('Trait plus clair : prévisions d’octobre à décembre');
    expect(forecastLegend(10)).toBe('Trait plus clair : prévisions de décembre');
    expect(forecastLegend(null)).toBe('Trait plus clair : prévisions de janvier à décembre');
  });

  it('tells when an account went below zero and when it came back, never as an alarm', () => {
    const real = [640, 420, 510, 300, 180, 390, 120, -240, 85, 60, 210, 690];

    expect(describeBelowZero([{ name: 'Compte courant', real }], 11)).toBe(
      `Le Compte courant est passé sous zéro fin août (${formatAmount(-240)}), puis il est remonté fin septembre.`
    );
  });

  it('warns gently when a forecast goes below zero', () => {
    const real = [640, 420, 510, 300, 180, 390, 120, 90, 85, -60, 210, 690];

    expect(describeBelowZero([{ name: 'Livret', real: [100, ...real.slice(1).map(() => 100)] }, { name: 'Compte courant', real }], 8)).toBe(
      'D’après les prévisions, le Compte courant repasserait sous zéro fin octobre — une récurrence peut être décalée si besoin.'
    );
  });

  it('says nothing while every balance stays above zero', () => {
    expect(describeBelowZero([{ name: 'Livret', real: Array<number>(12).fill(0) }], 11)).toBeNull();
  });
});
