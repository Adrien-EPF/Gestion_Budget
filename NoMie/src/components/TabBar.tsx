import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, textStyle } from '../theme/tokens';

/**
 * Custom tab bar matching DESIGN.md's tab-bar component exactly (the
 * default React Navigation tab bar doesn't have our tokens). Icons are
 * square placeholders per the handoff — "à remplacer par de vraies
 * icônes ligne" once a real icon set is chosen.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.bar}>
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
            <Text style={[textStyle('caption'), { color: tint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
  },
});
