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
        <Text style={styles.sectionTitle}>Creator</Text>
        <Text style={styles.body}>Made with ♥ by AleFire</Text>
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
        <Text style={styles.sectionTitle}>Changelog</Text>
        <View style={styles.changelogEntry}>
          <Text style={styles.changelogVersion}>v1.0.0</Text>

          <Text style={styles.changelogGroup}>Cards</Text>
          <Text style={styles.body}>• Browse all cards with thumbnail images</Text>
          <Text style={styles.body}>• Search by name, card effects, and keywords</Text>
          <Text style={styles.body}>• Filter by color, set, rarity, type, and cost range</Text>
          <Text style={styles.body}>• Tap any card to view full details</Text>

          <Text style={styles.changelogGroup}>Deck Builder</Text>
          <Text style={styles.body}>• Create, rename, copy, and delete decks</Text>
          <Text style={styles.body}>• Add cards with full collection-style filters (name/effects/keywords search, color gems, set, rarity, type, cost range)</Text>
          <Text style={styles.body}>• Sort deck cards by type › cost, type › name, or type › color via dropdown</Text>
          <Text style={styles.body}>• Color dots on each card row for quick color recognition</Text>
          <Text style={styles.body}>• Swipe left to remove a card (with 4-second undo)</Text>
          <Text style={styles.body}>• Live deck stats: card count, avg cost, Spirit/Magic/Nexus breakdown, color distribution</Text>
          <Text style={styles.body}>• Grid view mode for visual overview</Text>
          <Text style={styles.body}>• Keyboard-aware modals — name prompt slides above the keyboard</Text>

          <Text style={styles.changelogGroup}>Hand Tester</Text>
          <Text style={styles.body}>• Simulates a 5-card opening hand drawn from your deck</Text>
          <Text style={styles.body}>• Mulligan support — redraw as many times as you like</Text>
          <Text style={styles.body}>• Auto-draws on open, no extra tap needed</Text>

          <Text style={styles.changelogGroup}>Rulings</Text>
          <Text style={styles.body}>• Keyword definitions with per-keyword Q&A rulings</Text>
          <Text style={styles.body}>• Official card-specific Q&A from the BSS rulebook</Text>
          <Text style={styles.body}>• Centered popup dialogs — no longer hidden behind the navigation bar</Text>
          <Text style={styles.body}>• Search keywords and cards by name, ID, or ruling text</Text>

          <Text style={styles.changelogGroup}>General</Text>
          <Text style={styles.body}>• Fully offline — all card data bundled in the app</Text>
          <Text style={styles.body}>• No account or internet connection required</Text>
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
  changelogVersion: { color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  changelogGroup:   { color: theme.accent, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 2 },
});
