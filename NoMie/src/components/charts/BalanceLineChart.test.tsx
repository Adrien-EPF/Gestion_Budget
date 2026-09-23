import { fireEvent, render, screen } from '@testing-library/react-native';
import { Line, Path } from 'react-native-svg';
import { BalanceLineChart } from './BalanceLineChart';

const flat = (value: number) => Array<number>(12).fill(value);

function renderChart(real: number[], pointed: number[]) {
  const view = render(<BalanceLineChart testID="chart" real={real} pointed={pointed} subject="Compte" />);
  // The plot is drawn once its width is known.
  fireEvent(screen.getByTestId('chart-plot'), 'layout', {
    nativeEvent: { layout: { width: 308, height: 140 } },
  });
  return view;
}

describe('BalanceLineChart', () => {
  it('draws the réel and pointé lines on a scale hugging their values', () => {
    const real = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const view = renderChart(real, flat(100));

    const [pointedPath, realPath] = view.UNSAFE_getAllByType(Path);
    expect(realPath.props.d).toMatch(/^M0 132 L/);
    expect(realPath.props.d).toMatch(/L300 0$/);
    expect(pointedPath.props.d).toMatch(/L300 132$/);
    expect(screen.getByText('1 200,00 €')).toBeTruthy();
    expect(screen.getByText('100,00 €')).toBeTruthy();
  });

  it('marks zero only when the balance crosses it', () => {
    expect(renderChart(flat(50), flat(40)).UNSAFE_queryAllByType(Line)).toHaveLength(0);
    expect(renderChart([...flat(50).slice(1), -50], flat(40)).UNSAFE_queryAllByType(Line)).toHaveLength(1);
  });
});
