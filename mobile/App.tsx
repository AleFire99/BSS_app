import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { initCardsDb, initDeckDb } from './src/db';
import { AppSettingsProvider, useAppSettings } from './src/contexts/AppSettingsContext';
import './src/i18n';

import CardsScreen          from './src/screens/CardsScreen';
import CardDetailScreen      from './src/screens/CardDetailScreen';
import DecksScreen           from './src/screens/DecksScreen';
import DeckDetailScreen      from './src/screens/DeckDetailScreen';
import SwapPlansScreen       from './src/screens/SwapPlansScreen';
import SwapPlanDetailScreen  from './src/screens/SwapPlanDetailScreen';
import RulingsScreen         from './src/screens/RulingsScreen';
import AboutScreen           from './src/screens/AboutScreen';
import { Card } from './src/types';
import { darkTheme } from './src/theme';

// ── Navigation types ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Cards:          undefined;
  CardDetail:     { card: Card };
  Decks:          undefined;
  DeckDetail:     { deckId: number };
  SwapPlans:      { deckId: number; deckName: string };
  SwapPlanDetail: { planId: number; deckId: number; deckName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

function CardsStack() {
  const { theme } = useAppSettings();
  const { t } = useTranslation();
  const screenOpts = {
    headerStyle:      { backgroundColor: theme.surface },
    headerTintColor:  theme.text,
    headerTitleStyle: { fontWeight: '700' as const },
    contentStyle:     { backgroundColor: theme.bg },
  };
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Cards"      component={CardsScreen}      options={{ title: t('tabs.cards') }} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}

function DecksStack() {
  const { theme } = useAppSettings();
  const { t } = useTranslation();
  const screenOpts = {
    headerStyle:      { backgroundColor: theme.surface },
    headerTintColor:  theme.text,
    headerTitleStyle: { fontWeight: '700' as const },
    contentStyle:     { backgroundColor: theme.bg },
  };
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Decks"          component={DecksScreen}          options={{ title: t('decks.title') }} />
      <Stack.Screen name="DeckDetail"     component={DeckDetailScreen}     options={{ title: '' }} />
      <Stack.Screen name="SwapPlans"      component={SwapPlansScreen}      options={{ title: '' }} />
      <Stack.Screen name="SwapPlanDetail" component={SwapPlanDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="CardDetail"     component={CardDetailScreen}     options={{ title: '' }} />
    </Stack.Navigator>
  );
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

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
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: darkTheme.bg }}>
        <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 8 }}>Init error:</Text>
        <Text style={{ color: darkTheme.text, fontFamily: 'monospace', fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkTheme.bg }}>
        <ActivityIndicator color={darkTheme.accent} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ── Root nav — needs to be inside AppSettingsProvider ─────────────────────────

function RootNav() {
  const { theme, isDark } = useAppSettings();
  const { t } = useTranslation();

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
            title: t('tabs.cards'),
            tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="DecksTab"
          component={DecksStack}
          options={{
            title: t('tabs.decks'),
            tabBarIcon: ({ color }) => <Feather name="folder" size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="RulingsTab"
          component={RulingsScreen}
          options={{
            title: t('tabs.rulings'),
            headerShown: true,
            headerStyle:      { backgroundColor: theme.surface },
            headerTintColor:  theme.text,
            headerTitleStyle: { fontWeight: '700' as const },
            tabBarIcon: ({ color }) => <Feather name="book-open" size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="AboutTab"
          component={AboutScreen}
          options={{
            title: t('tabs.about'),
            headerShown: true,
            headerStyle:      { backgroundColor: theme.surface },
            headerTintColor:  theme.text,
            headerTitleStyle: { fontWeight: '700' as const },
            tabBarIcon: ({ color }) => <Feather name="info" size={22} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppSettingsProvider>
      <DatabaseBridge>
        <RootNav />
      </DatabaseBridge>
    </AppSettingsProvider>
  );
}
