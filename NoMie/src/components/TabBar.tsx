import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, textStyle } from '../theme/tokens';

/**
 * Custom tab bar matching DESIGN.md's tab-bar component exactly (the
 * default React Navigation tab bar doesn't have our tokens). Icons are
 * square placeholders per the handoff — "à remplacer par de vraies
 * icônes ligne" once a real icon set is chosen.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Edge-to-edge: the bar's surface runs under Android's navigation bar, the tabs stay above it.
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + bottom, paddingBottom: bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const tint = isFocused ? colors.primary : colors.mute;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              style={[
                styles.iconPlaceholder,
                { borderColor: tint },
                isFocused && { backgroundColor: colors.primarySoft },
              ]}
            />
            {/* « Récurrences » is the longest label: one line, shrunk a little on narrow screens. */}
            <Text
              style={[textStyle('caption'), { color: tint }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    // Pinned to the top, not centered: every icon sits on the same line whatever its label does.
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
    paddingHorizontal: 2,
    gap: 5,
  },
  iconPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
  },
});
