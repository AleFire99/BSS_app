import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>BSS Companion</Text>
      <Text style={styles.version}>v1.1.0</Text>

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
          <Text style={styles.changelogVersion}>v1.1.0</Text>

          <Text style={styles.changelogGroup}>Deck Export</Text>
          <Text style={styles.body}>• Export decks as Image, Text, or CSV</Text>
          <Text style={styles.body}>• Image: dark-theme preview with color donut chart, avg cost, type breakdown, and full card grid</Text>
          <Text style={styles.body}>• Text: human-readable list (e.g. 4x BSS01-001: Card Name)</Text>
          <Text style={styles.body}>• CSV: spreadsheet-compatible with Count, CardID, Name, Type, Color, Rarity, Cost columns</Text>
          <Text style={styles.body}>• Share via system share sheet or save directly to device storage</Text>

          <Text style={styles.changelogGroup}>Deck Import</Text>
          <Text style={styles.body}>• Import decks from .json, .txt, or .csv files</Text>
          <Text style={styles.body}>• Unknown card IDs are reported and skipped gracefully</Text>

          <Text style={styles.changelogGroup}>Deck List</Text>
          <Text style={styles.body}>• Stacked FABs (create / import / hand-test) replace bottom bar</Text>
          <Text style={styles.body}>• Long-press context menu is now centered on screen</Text>

          <Text style={styles.changelogGroup}>Deck Builder</Text>
          <Text style={styles.body}>• Round accent FAB replaces "Done" text button in add-card mode</Text>
          <Text style={styles.body}>• Rename icon moved to the navigation header for easier access</Text>
          <Text style={styles.body}>• Card grid uses correct 63:88 aspect ratio with equal padding on all sides</Text>

          <Text style={styles.changelogGroup}>Cards Browser</Text>
          <Text style={styles.body}>• Set, Rarity, and Type filters now open inline dropdowns — no full-screen modal</Text>
          <Text style={styles.body}>• Active filter highlighted in accent color</Text>

          <Text style={styles.changelogGroup}>Bug Fixes</Text>
          <Text style={styles.body}>• Fixed: deleting multiple decks in a row now correctly removes all of them</Text>
          <Text style={styles.body}>• Fixed: importing a .txt file with card IDs ending in a colon now parses correctly</Text>
          <Text style={styles.body}>• Fixed: CSV export was missing rarity data</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.0.1</Text>

          <Text style={styles.changelogGroup}>Bug Fixes</Text>
          <Text style={styles.body}>• Fixed: adding the same card rapidly could exceed the 4-copy limit due to a race condition</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.0.0</Text>

          <Text style={styles.changelogGroup}>Cards</Text>
          <Text style={styles.body}>• Browse all cards with thumbnail images</Text>
          <Text style={styles.body}>• Search by name, card effects, and keywords</Text>
          <Text style={styles.body}>• Filter by color, set, rarity, type, and cost range</Text>
          <Text style={styles.body}>• Tap any card to view full details</Text>

          <Text style={styles.changelogGroup}>Deck Builder</Text>
          <Text style={styles.body}>• Create, rename, copy, and delete decks</Text>
          <Text style={styles.body}>• Add cards with full collection-style filters</Text>
          <Text style={styles.body}>• Sort deck cards by type › cost, type › name, or type › color</Text>
          <Text style={styles.body}>• Swipe left to remove a card (with undo)</Text>
          <Text style={styles.body}>• Live deck stats: card count, avg cost, type breakdown, color distribution</Text>
          <Text style={styles.body}>• List and grid view modes</Text>

          <Text style={styles.changelogGroup}>Hand Tester</Text>
          <Text style={styles.body}>• Simulate a 5-card opening hand drawn from your deck</Text>
          <Text style={styles.body}>• Mulligan support — redraw as many times as you like</Text>

          <Text style={styles.changelogGroup}>Rulings</Text>
          <Text style={styles.body}>• Keyword definitions with Q&A rulings</Text>
          <Text style={styles.body}>• Official card-specific Q&A from the BSS rulebook</Text>

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
