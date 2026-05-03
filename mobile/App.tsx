import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import CardsScreen      from './src/screens/CardsScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import DecksScreen      from './src/screens/DecksScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
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
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🃏</Text>,
          }}
        />
        <Tab.Screen
          name="DecksTab"
          component={DecksStack}
          options={{
            title: 'Decks',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📚</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
