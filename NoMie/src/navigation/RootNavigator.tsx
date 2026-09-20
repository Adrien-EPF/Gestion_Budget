import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { TabBar } from '../components/TabBar';
import { AccountsScreen } from '../screens/AccountsScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { RecurrencesScreen } from '../screens/RecurrencesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MonthProvider } from './MonthContext';

const Tab = createBottomTabNavigator();

/**
 * Bottom tabs keep every screen mounted once visited (React Navigation's
 * default), which is what gives us "l'état de chaque écran est conservé"
 * (handoff §7) for free — no extra state plumbing needed here.
 */
export function RootNavigator() {
  return (
    <MonthProvider>
      <NavigationContainer>
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
