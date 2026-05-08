import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>BSS Companion</Text>
      <Text style={styles.version}>v1.0.0</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.body}>
          A fan-made utility app for Battle Spirits Saga players. Browse cards, build decks, test opening hands, and look up rulings — all offline.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changelog</Text>
        <View style={styles.changelogEntry}>
          <Text style={styles.changelogVersion}>v1.0.0</Text>
          <Text style={styles.body}>• Cards browser — search by name, effects, keywords; filter by color, set, rarity, type, cost</Text>
          <Text style={styles.body}>• Deck builder — create, copy, rename, delete decks; sort by type/cost/name/color</Text>
          <Text style={styles.body}>• Opening hand simulator with mulligan support</Text>
          <Text style={styles.body}>• Rulings viewer — keyword definitions and official card Q&A</Text>
          <Text style={styles.body}>• Fully offline — all card data bundled in the app</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <Text style={styles.body}>
          Battle Spirits Saga is a trading card game owned and published by Bandai Namco Entertainment. All card names, images, artwork, and game content are property of Bandai Namco Entertainment Inc.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          This app is an unofficial fan project and is not affiliated with, endorsed by, or sponsored by Bandai Namco Entertainment in any way.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Images</Text>
        <Text style={styles.body}>
          Card data and images are sourced from{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://www.bssdb.dev')}>
            bssdb.dev
          </Text>
          . Huge thanks to the bssdb.dev team for maintaining such a comprehensive database.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Creator</Text>
        <Text style={styles.body}>Made with ♥ by AleFire</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: theme.bg },
  content:  { padding: 24, paddingBottom: 48 },
  appName: {
    color: theme.accent,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  version: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: {
    color: theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: theme.accent,
    textDecorationLine: 'underline',
  },
  changelogEntry:   { gap: 4, marginTop: 4 },
  changelogVersion: { color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 4 },
});
