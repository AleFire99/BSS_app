import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import CardsScreen      from './src/screens/CardsScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import DecksScreen      from './src/screens/DecksScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import RulingsScreen    from './src/screens/RulingsScreen';
import { Card } from './src/types';
import { theme } from './src/theme';

// ── Navigation types ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Cards:      undefined;
  CardDetail: { card: Card };
  Decks:      undefined;
  DeckDetail: { deckId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

const screenOpts = {
  headerStyle:      { backgroundColor: theme.surface },
  headerTintColor:  theme.text,
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle:     { backgroundColor: theme.bg },
};

function CardsStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Cards"      component={CardsScreen}      options={{ title: 'Cards' }} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Card' }} />
    </Stack.Navigator>
  );
}

function DecksStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Decks"      component={DecksScreen}      options={{ title: 'My Decks' }} />
      <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: 'Deck' }} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Card' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle:            { backgroundColor: theme.surface, borderTopColor: theme.border },
          tabBarActiveTintColor:  theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
        }}
      >
        <Tab.Screen
          name="CardsTab"
          component={CardsStack}
          options={{
            title: 'Cards',
            tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="DecksTab"
          component={DecksStack}
          options={{
            title: 'Decks',
            tabBarIcon: ({ color }) => <Feather name="folder" size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="RulingsTab"
          component={RulingsScreen}
          options={{
            title: 'Rulings',
            headerShown: true,
            headerStyle:      { backgroundColor: theme.surface },
            headerTintColor:  theme.text,
            headerTitleStyle: { fontWeight: '700' as const },
            tabBarIcon: ({ color }) => <Feather name="book-open" size={22} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
