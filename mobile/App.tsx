import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { initCardsDb, initDeckDb } from './src/db';

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

// ── Bootstrap: copy cards.db from APK assets → SQLite dir, open both DBs ────

function DatabaseBridge({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initCardsDb()
      .then(() => initDeckDb())
      .then(() => setReady(true))
      .catch(e => setError(String(e)));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.bg }}>
        <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 8 }}>Init error:</Text>
        <Text style={{ color: theme.text, fontFamily: 'monospace', fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <DatabaseBridge>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle:             { backgroundColor: theme.surface, borderTopColor: theme.border },
            tabBarActiveTintColor:   theme.accent,
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
    </DatabaseBridge>
  );
}
