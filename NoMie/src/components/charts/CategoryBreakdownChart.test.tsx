import { render, screen, within } from '@testing-library/react-native';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';

const fillWidth = (slice: number) => {
  const fill = screen.getByTestId(`chart-slice-${slice}-fill`);
  return Object.assign({}, ...[fill.props.style].flat(Infinity)).width as string;
};

describe('CategoryBreakdownChart', () => {
  it('ranks the categories, the largest bar spanning the width', () => {
    render(
      <CategoryBreakdownChart
        testID="chart"
        items={[
          { label: 'Loisir', amount: 20 },
          { label: 'Restaurant', amount: 80 },
        ]}
      />
    );

    const first = within(screen.getByTestId('chart-slice-0'));
    expect(first.getByText('Restaurant')).toBeTruthy();
    expect(first.getByText('80 %')).toBeTruthy();
    expect(fillWidth(0)).toBe('100%');
    expect(fillWidth(1)).toBe('25%');
  });

  it('shows a tiny share as under one percent rather than zero', () => {
    render(
      <CategoryBreakdownChart
        testID="chart"
        items={[
          { label: 'Logement', amount: 999 },
          { label: 'Don', amount: 1 },
        ]}
      />
    );

    expect(within(screen.getByTestId('chart-slice-1')).getByText('< 1 %')).toBeTruthy();
  });
});
