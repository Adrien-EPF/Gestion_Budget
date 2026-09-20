import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, textStyle } from '../theme/tokens';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={[textStyle('bodyMd'), styles.text]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  text: {
    color: colors.mute,
    textAlign: 'center',
  },
});
