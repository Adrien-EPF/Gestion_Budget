import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { BottomSheet } from './BottomSheet';

/** A phone drawn edge-to-edge: 24 dp of status bar, 48 dp of navigation bar. */
const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
};

function renderSheet() {
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <BottomSheet visible onClose={() => {}}>
        <Text>Nouveau budget</Text>
      </BottomSheet>
    </SafeAreaProvider>,
  );
}

const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

/** Android reports the keyboard without the navigation bar it covers (ReactRootView). */
const showKeyboard = (height: number) =>
  act(() => {
    DeviceEventEmitter.emit('keyboardDidShow', {
      endCoordinates: { height, screenX: 0, screenY: 800 - height, width: 360 },
    });
  });
const hideKeyboard = () =>
  act(() => {
    DeviceEventEmitter.emit('keyboardDidHide', {
      endCoordinates: { height: 0, screenX: 0, screenY: 800, width: 360 },
    });
  });

describe('BottomSheet — barres système et clavier (#37)', () => {
  it('keeps the sheet below the status bar and its buttons above the navigation bar', () => {
    renderSheet();
    expect(style('bottom-sheet-area').paddingTop).toBe(24 + spacing.md);
    expect(style('bottom-sheet-area').paddingBottom).toBe(0);
    expect(style('bottom-sheet').paddingBottom).toBe(spacing.xl + 48);
  });

  it('lifts the sheet right above the keyboard, then puts it back when the keyboard closes', () => {
    renderSheet();

    showKeyboard(300);
    expect(style('bottom-sheet-area').paddingBottom).toBe(300 + 48);
    expect(style('bottom-sheet').paddingBottom).toBe(spacing.xl);

    hideKeyboard();
    expect(style('bottom-sheet-area').paddingBottom).toBe(0);
    expect(style('bottom-sheet').paddingBottom).toBe(spacing.xl + 48);
  });
});
