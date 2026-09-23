import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { Budget, BudgetMonth, BudgetYear } from '../../services/dataService';
import { colors } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { plain } from '../../test-utils/renderWithApp';
import { BudgetYearChart } from './BudgetYearChart';

const budget: Budget = {
  id: 1,
  categoryId: 1,
  categoryName: 'Restaurant',
  amount: 120,
  carryOver: false,
  startMonth: { year: 2026, month: 0 },
};

/** January to September gone by, spending as given; October to December to come. */
function year(spent: number[], overrides: Partial<Budget> = {}, ceilings: number[] = []): BudgetYear {
  const months = Array.from({ length: 12 }, (_, month): BudgetMonth => {
    const ceiling = ceilings[month] ?? 120;
    return month <= 8
      ? { month, state: 'realized', spent: spent[month] ?? 0, ceiling, carriedOver: ceiling - 120 }
      : { month, state: 'upcoming', spent: 0, ceiling, carriedOver: ceiling - 120 };
  });
  return { budget: { ...budget, ...overrides }, months };
}

const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('BudgetYearChart', () => {
  it('draws each month gone by against its ceiling, sage within it and sand above — nothing more', () => {
    render(<BudgetYearChart testID="chart" budgetYear={year([100, 168])} lastMonth={8} />);

    // Scale: the highest amount (168) × 1.12.
    expect(style('chart-bar-0')).toMatchObject({ height: `${(100 / (168 * 1.12)) * 100}%`, backgroundColor: colors.budgetOk });
    expect(style('chart-bar-1').backgroundColor).toBe(colors.budgetWatch);
    expect(style('chart-cap-1').bottom).toBe(`${(120 / (168 * 1.12)) * 100}%`);
  });

  it('shows only the ceiling of a month to come', () => {
    render(<BudgetYearChart testID="chart" budgetYear={year([100])} lastMonth={8} />);

    expect(screen.queryByTestId('chart-bar-9')).toBeNull();
    expect(screen.getByTestId('chart-cap-9')).toBeTruthy();
  });

  it('sums the year up and legends the ceiling, reliquat included with carry-over', () => {
    const { rerender } = render(<BudgetYearChart testID="chart" budgetYear={year([100])} lastMonth={8} />);
    expect(screen.getByText('Dans le prévu tous les mois')).toBeTruthy();
    expect(screen.getByText('Prévu')).toBeTruthy();

    rerender(<BudgetYearChart testID="chart" budgetYear={year([100], { carryOver: true })} lastMonth={8} />);
    expect(screen.getByText('Prévu, reliquat inclus')).toBeTruthy();
  });

  it('reads the current month by default, another one from its column or the stepper', () => {
    render(<BudgetYearChart testID="chart" budgetYear={year([0, 0, 0, 0, 0, 0, 0, 0, 138])} lastMonth={8} />);
    const reading = () => within(screen.getByTestId('chart-reading'));
    expect(reading().getByText('Septembre')).toBeTruthy();
    expect(reading().getByText('Un peu au-dessus')).toBeTruthy();
    expect(reading().getByText(`${plain(formatAmount(138))} dépensés sur ${plain(formatAmount(120))} prévus`)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Mois suivant'));
    expect(reading().getByText('Octobre')).toBeTruthy();
    expect(reading().getByText('À venir')).toBeTruthy();
    expect(reading().getByText('Mois pas encore commencé.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Mars'));
    expect(reading().getByText('Dans le prévu')).toBeTruthy();
    expect(reading().getByText(`Il est resté ${plain(formatAmount(120))}.`)).toBeTruthy();
  });

  it('keeps its ceilings when nothing was spent', () => {
    render(<BudgetYearChart testID="chart" budgetYear={year([])} lastMonth={8} />);

    expect(screen.getByText('Rien de dépensé ici cette année.')).toBeTruthy();
    expect(screen.queryByTestId('chart-bar-0')).toBeNull();
    expect(screen.getByTestId('chart-cap-0')).toBeTruthy();
  });

  it('shows the controls it is given above the summary', () => {
    render(
      <BudgetYearChart testID="chart" budgetYear={year([100])} lastMonth={8} controls={<Text>Chips</Text>} />
    );

    expect(screen.getByText('Chips')).toBeTruthy();
  });
});
