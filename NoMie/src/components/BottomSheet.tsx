import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, rounded, spacing } from '../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  /** Called on scrim tap and Android back; the owner decides to hide the sheet. */
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Scrim + sheet per handoff §6.6: scrim fades in over 160ms, the sheet
 * slides up over 220ms. Children are only mounted while visible, so
 * whatever draft state they hold is dropped on close ("vide le brouillon").
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const scrim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scrim.setValue(0);
    slide.setValue(0);
    Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scrim, slide]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(35,35,35,0.32)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    padding: spacing.xl,
    shadowColor: 'rgb(35,35,35)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.hairline,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});
