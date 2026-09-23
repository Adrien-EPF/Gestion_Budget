import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { plain } from '../../test-utils/renderWithApp';
import { BalanceLineChart, type BalanceChartAccount } from './BalanceLineChart';

const flat = (value: number) => Array<number>(12).fill(value);
const rising = (from: number) => Array.from({ length: 12 }, (_, m) => from + 100 * m);

const courant: BalanceChartAccount = {
  id: 1,
  name: 'Compte courant',
  color: colors.chartCompte1,
  real: rising(1000),
  pointed: rising(900),
};
const livret: BalanceChartAccount = {
  id: 2,
  name: 'Livret A',
  color: colors.chartCompte2,
  real: flat(3000),
  pointed: flat(3000),
};

function renderChart(accounts: BalanceChartAccount[], lastMonth: number | null = 11) {
  const view = render(<BalanceLineChart testID="chart" accounts={accounts} lastMonth={lastMonth} />);
  // The curves are drawn once the plot's width is known.
  fireEvent(screen.getByTestId('chart-plot'), 'layout', { nativeEvent: { layout: { width: 300, height: 152 } } });
  return view;
}

const paths = (view: ReturnType<typeof render>) =>
  view.UNSAFE_getAllByType(Path).map((p) => ({
    stroke: p.props.stroke,
    dashed: p.props.strokeDasharray !== undefined,
    faded: p.props.strokeOpacity === 0.4,
  }));
const reading = (account: BalanceChartAccount) => within(screen.getByTestId(`chart-reading-${account.id}`));

describe('BalanceLineChart', () => {
  it('draws one réel curve per account, in its colour, and switches them all to pointé', () => {
    const view = renderChart([courant, livret]);

    expect(paths(view)).toEqual([
      { stroke: colors.chartCompte1, dashed: false, faded: false },
      { stroke: colors.chartCompte2, dashed: false, faded: false },
    ]);
    expect(reading(courant).getByText(plain(formatAmount(2100)))).toBeTruthy();
    expect(reading(courant).getByText(`Pointé ${plain(formatAmount(2000))}`)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Pointé' }));

    expect(reading(courant).getByText(plain(formatAmount(2000)))).toBeTruthy();
    expect(reading(courant).getByText(`Réel ${plain(formatAmount(2100))}`)).toBeTruthy();
  });

  it('shows a single account’s réel and pointé together, pointé dashed, without the switch', () => {
    const view = renderChart([courant]);

    expect(paths(view)).toEqual([
      { stroke: colors.chartCompte1, dashed: false, faded: false },
      { stroke: colors.chartCompte1, dashed: true, faded: false },
    ]);
    expect(screen.queryByRole('button', { name: 'Pointé' })).toBeNull();
    expect(screen.getByText('Réel')).toBeTruthy();
    expect(screen.getByText('Pointé')).toBeTruthy();
  });

  it('continues réel lighter over the months to come, while pointé stops at the current month', () => {
    const view = renderChart([courant], 8);

    expect(paths(view)).toEqual([
      { stroke: colors.chartCompte1, dashed: false, faded: false },
      { stroke: colors.chartCompte1, dashed: false, faded: true },
      { stroke: colors.chartCompte1, dashed: true, faded: false },
    ]);
    expect(screen.getByText('Trait plus clair : prévisions d’octobre à décembre')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Mois suivant'));

    expect(screen.getByText('Fin octobre')).toBeTruthy();
    expect(screen.getByText('Prévision')).toBeTruthy();
    expect(reading(courant).getByText('Rien de pointé à cette date')).toBeTruthy();
  });

  it('reads the current month by default, another one from its column or the stepper', () => {
    renderChart([courant], 8);
    expect(screen.getByText('Fin septembre')).toBeTruthy();
    expect(screen.queryByText('Prévision')).toBeNull();

    fireEvent.press(screen.getByLabelText('Fin mars'));

    expect(screen.getByText('Fin mars')).toBeTruthy();
    expect(reading(courant).getByText(plain(formatAmount(1200)))).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Mois précédent'));
    expect(screen.getByText('Fin février')).toBeTruthy();
  });

  it('isolates one account from its chip, and brings them all back on a second tap', () => {
    const view = renderChart([courant, livret]);
    expect(screen.getByText('Touche un compte pour l’isoler.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Livret A' }));

    expect(paths(view)).toHaveLength(1);
    expect(screen.queryByTestId(`chart-reading-${courant.id}`)).toBeNull();
    expect(screen.getByText('Touche à nouveau pour revoir tous les comptes.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Livret A' }));
    expect(paths(view)).toHaveLength(2);
  });

  it('reads below zero against the zero line and a sentence, never in red', () => {
    const real = [640, 420, 510, 300, 180, 390, 120, -240, 85, 60, 210, 690];
    const view = renderChart([{ ...courant, real, pointed: real }]);
    fireEvent.press(screen.getByLabelText('Fin août'));

    expect(screen.getByTestId('chart-below-zero')).toBeTruthy();
    expect(paths(view).every((p) => p.stroke === colors.chartCompte1)).toBe(true);
    const amount = reading(courant).getByText(plain(formatAmount(-240)));
    expect(StyleSheet.flatten(amount.props.style).color).toBe(colors.amountNegative);
    expect(screen.getByText(/^Le Compte courant est passé sous zéro fin août/)).toBeTruthy();
  });

  it('graduates the scale with round amounts, zero included', () => {
    renderChart([livret]);

    for (const label of ['3 000 €', '2 000 €', '1 000 €', '0 €']) expect(screen.getByText(label)).toBeTruthy();
  });
});
