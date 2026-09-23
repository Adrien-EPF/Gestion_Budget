import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { plain } from '../../test-utils/renderWithApp';
import { groupExpenses } from './chartGeometry';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';

const months = (entries: Record<number, number>) => {
  const values = Array<number>(12).fill(0);
  for (const [month, value] of Object.entries(entries)) values[Number(month)] = value;
  return values;
};
const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

function renderChart(series: { name: string | null; byMonth: Record<number, number> }[], topN?: number) {
  const groups = groupExpenses(
    series.map(({ name, byMonth }) => {
      const values = months(byMonth);
      return { name, months: values, total: values.reduce((a, b) => a + b, 0) };
    }),
    topN
  );
  render(<CategoryBreakdownChart testID="chart" year={2026} groups={groups} lastMonth={8} />);
}

describe('CategoryBreakdownChart', () => {
  it('heads the card with the year’s total and the period counted', () => {
    renderChart([
      { name: 'Restaurant', byMonth: { 0: 30, 4: 45 } },
      { name: 'Loisir', byMonth: { 1: 25 } },
    ]);

    expect(screen.getByText('Total 2026')).toBeTruthy();
    expect(screen.getByText(plain(formatAmount(100)))).toBeTruthy();
    expect(screen.getByText('De janvier à septembre · les prévisions ne sont pas comptées.')).toBeTruthy();
  });

  it('stacks the categories in one bar and lists them ranked, colours by rank', () => {
    renderChart([
      { name: 'Loisir', byMonth: { 1: 25 } },
      { name: 'Restaurant', byMonth: { 0: 75 } },
    ]);

    // Shares as flex weights: the 2px gaps come out of the bar, never pushing the last segment out.
    expect(style('chart-segment-Restaurant')).toMatchObject({ flex: 0.75, backgroundColor: colors.chart1 });
    expect(style('chart-segment-Loisir')).toMatchObject({ flex: 0.25, backgroundColor: colors.chart2 });
    const first = within(screen.getByTestId('chart-row-Restaurant'));
    expect(first.getByText('75 %')).toBeTruthy();
    expect(first.getByText(plain(formatAmount(75)))).toBeTruthy();
  });

  it('opens the first category’s months on arrival, one category at a time', () => {
    renderChart([
      { name: 'Restaurant', byMonth: { 0: 60, 7: 120 } },
      { name: 'Loisir', byMonth: { 1: 25 } },
    ]);
    expect(screen.getByTestId('chart-months-Restaurant')).toBeTruthy();
    expect(
      screen.getByText(`Moyenne ${plain(formatAmount(20))} par mois · le plus haut en août (${plain(formatAmount(120))}).`)
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('chart-row-Loisir'));
    expect(screen.queryByTestId('chart-months-Restaurant')).toBeNull();
    expect(screen.getByTestId('chart-months-Loisir')).toBeTruthy();

    fireEvent.press(screen.getByTestId('chart-row-Loisir'));
    expect(screen.queryByTestId('chart-months-Loisir')).toBeNull();
  });

  it('draws the highest month at full opacity, the others lighter', () => {
    renderChart([{ name: 'Restaurant', byMonth: { 0: 60, 7: 120 } }]);

    expect(style('chart-bar-Restaurant-7')).toMatchObject({ height: '100%', opacity: 1 });
    expect(style('chart-bar-Restaurant-0')).toMatchObject({ height: '50%', opacity: 0.7 });
  });

  it('unfolds « Autres » into the categories it groups', () => {
    renderChart(
      [
        { name: 'A', byMonth: { 0: 50 } },
        { name: 'B', byMonth: { 0: 30 } },
        { name: 'C', byMonth: { 0: 15 } },
        { name: 'D', byMonth: { 0: 5 } },
      ],
      2
    );
    expect(screen.queryByText('C')).toBeNull();

    fireEvent.press(screen.getByTestId('chart-row-others'));

    const members = within(screen.getByTestId('chart-members'));
    expect(members.getByText('C')).toBeTruthy();
    expect(members.getByText('D')).toBeTruthy();
    expect(screen.getByTestId('chart-months-A')).toBeTruthy();
  });

  it('keeps « Sans catégorie » last, in its own colour', () => {
    renderChart([
      { name: null, byMonth: { 0: 80 } },
      { name: 'Restaurant', byMonth: { 0: 20 } },
    ]);

    expect(style('chart-segment-uncategorized').backgroundColor).toBe(colors.chartSansCategorie);
    expect(within(screen.getByTestId('chart-row-uncategorized')).getByText('Sans catégorie')).toBeTruthy();
  });
});
