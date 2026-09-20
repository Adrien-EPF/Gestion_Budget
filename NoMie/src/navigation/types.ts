import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type TabParamList = {
  Accueil: undefined;
  /** `scrollToToPoint` is a changing token: every new value scrolls to the « À pointer » section. */
  Comptes: { scrollToToPoint?: number } | undefined;
  Budgets: undefined;
  Récurrences: undefined;
  Réglages: undefined;
};

export type TabNavigation = BottomTabNavigationProp<TabParamList>;
export type TabScreenProps<Name extends keyof TabParamList> = BottomTabScreenProps<TabParamList, Name>;
