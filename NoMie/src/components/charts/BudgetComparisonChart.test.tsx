import { render, screen, within } from '@testing-library/react-native';
import { colors } from '../../theme/tokens';
import { BudgetComparisonChart } from './BudgetComparisonChart';

const fillOf = (testID: string) => {
  const style = [screen.getByTestId(testID).props.style].flat(Infinity);
  return Object.assign({}, ...style) as { width: string; backgroundColor: string };
};

describe('BudgetComparisonChart', () => {
  it('draws planned and spent on one scale, the largest amount spanning the width', () => {
    render(
      <BudgetComparisonChart
        testID="chart"
        items={[
          { label: 'Restaurant', planned: 400, spent: 100, watch: false, exceeded: false },
          { label: 'Loisir', planned: 200, spent: 200, watch: true, exceeded: false },
        ]}
      />
    );

    expect(fillOf('chart-planned-Restaurant').width).toBe('100%');
    expect(fillOf('chart-spent-Restaurant').width).toBe('25%');
    expect(fillOf('chart-planned-Loisir').width).toBe('50%');
    expect(fillOf('chart-spent-Loisir').width).toBe('50%');
  });

  it('tints spending sage, or sand when the service says « à surveiller » — never red', () => {
    render(
      <BudgetComparisonChart
        testID="chart"
        items={[
          { label: 'Restaurant', planned: 100, spent: 50, watch: false, exceeded: false },
          { label: 'Loisir', planned: 100, spent: 90, watch: true, exceeded: false },
          { label: 'Culture', planned: 100, spent: 130, watch: true, exceeded: true },
        ]}
      />
    );

    expect(fillOf('chart-spent-Restaurant').backgroundColor).toBe(colors.budgetOk);
    expect(fillOf('chart-spent-Loisir').backgroundColor).toBe(colors.budgetWatch);
    expect(fillOf('chart-spent-Culture').backgroundColor).toBe(colors.budgetWatch);
  });

  it('states the gap factually', () => {
    render(
      <BudgetComparisonChart
        testID="chart"
        items={[
          { label: 'Restaurant', planned: 100, spent: 60, watch: false, exceeded: false },
          { label: 'Culture', planned: 100, spent: 130, watch: true, exceeded: true },
        ]}
      />
    );

    expect(within(screen.getByTestId('chart-row-Restaurant')).getByText('40,00 € de marge')).toBeTruthy();
    expect(within(screen.getByTestId('chart-row-Culture')).getByText('30,00 € de plus que prévu')).toBeTruthy();
  });
});
