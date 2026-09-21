import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { TabBar } from '../components/TabBar';
import { useNotificationScheduler } from '../notifications/NotificationSchedulerContext';
import type { NotificationDestination } from '../notifications/scheduler';
import { AccountsScreen } from '../screens/AccountsScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { RecurrencesScreen } from '../screens/RecurrencesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MonthProvider } from './MonthContext';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Bottom tabs keep every screen mounted once visited (React Navigation's
 * default), which is what gives us "l'état de chaque écran est conservé"
 * (handoff §7) for free — no extra state plumbing needed here.
 */
export function RootNavigator() {
  const navigationRef = useNavigationContainerRef<TabParamList>();
  const scheduler = useNotificationScheduler();
  // A tap that launched the app arrives before the navigator is ready: keep it until then.
  const waitingDestination = useRef<NotificationDestination | null>(null);

  const open = (destination: NotificationDestination) => {
    if (!navigationRef.isReady()) {
      waitingDestination.current = destination;
    } else if (destination.screen === 'Comptes') {
      // Same landing as the « n à pointer » badge of Accueil.
      navigationRef.navigate('Comptes', { scrollToToPoint: Date.now() });
    } else {
      navigationRef.navigate(destination.screen);
    }
  };

  useEffect(() => scheduler.onNotificationTap(open), [scheduler]);

  return (
    <MonthProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (waitingDestination.current) open(waitingDestination.current);
          waitingDestination.current = null;
        }}
      >
        <Tab.Navigator
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Accueil" component={HomeScreen} />
          <Tab.Screen name="Comptes" component={AccountsScreen} />
          <Tab.Screen name="Budgets" component={BudgetsScreen} />
          <Tab.Screen name="Récurrences" component={RecurrencesScreen} />
          <Tab.Screen name="Réglages" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </MonthProvider>
  );
}
