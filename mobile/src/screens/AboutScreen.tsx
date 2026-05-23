import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { ThemeType } from '../theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme, language, setLanguage } = useAppSettings();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* ── Settings section ── */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>{t('settings.title')}</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('settings.language')}</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, language === 'en' && styles.pillActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.pillText, language === 'en' && styles.pillTextActive]}>🇬🇧 English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, language === 'it' && styles.pillActive]}
              onPress={() => setLanguage('it')}
            >
              <Text style={[styles.pillText, language === 'it' && styles.pillTextActive]}>🇮🇹 Italiano</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('settings.theme')}</Text>
          <View style={styles.iconToggleRow}>
            <TouchableOpacity
              style={[styles.iconToggle, !isDark && styles.iconToggleActive]}
              onPress={() => isDark && toggleTheme()}
            >
              <Feather name="sun" size={18} color={!isDark ? '#fff' : theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconToggle, isDark && styles.iconToggleActive]}
              onPress={() => !isDark && toggleTheme()}
            >
              <Feather name="moon" size={18} color={isDark ? '#fff' : theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── About content ── */}
      <Text style={styles.appName}>{t('about.appName')}</Text>
      <Text style={styles.version}>{t('about.version')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about.about')}</Text>
        <Text style={styles.body}>{t('about.aboutBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about.creator')}</Text>
        <Text style={styles.body}>{t('about.creatorBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about.dataImages')}</Text>
        <Text style={styles.body}>
          {t('about.dataBody').split('bssdb.dev')[0]}
          <Text style={styles.link} onPress={() => Linking.openURL('https://www.bssdb.dev')}>
            bssdb.dev
          </Text>
          {t('about.dataBody').split('bssdb.dev').slice(1).join('bssdb.dev')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about.changelog')}</Text>

        <View style={styles.changelogEntry}>
          <Text style={styles.changelogVersion}>v1.8.0</Text>
          <Text style={styles.changelogGroup}>Languages & Theme</Text>
          <Text style={styles.body}>• Italian translation for all UI strings</Text>
          <Text style={styles.body}>• Light/dark theme toggle</Text>
          <Text style={styles.body}>• Infrastructure for Italian card content translations (populate assets/i18n/cards_it.json)</Text>
          <Text style={styles.body}>• Settings section in About tab</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.7.0</Text>
          <Text style={styles.changelogGroup}>Cards & Deck Builder</Text>
          <Text style={styles.body}>• Search now matches card subtypes (e.g. "DRAGON", "NEXUS BRAVE", "VALIANT HERO")</Text>
          <Text style={styles.changelogGroup}>Opening Hand</Text>
          <Text style={styles.body}>• Mulligan percentage now locks in at the moment you decide — accepting a mulliganed hand no longer moves the counter</Text>
          <Text style={styles.changelogGroup}>Bug Fixes</Text>
          <Text style={styles.body}>• Android system app info now shows the correct version</Text>
          <Text style={styles.body}>• App icon now appears correctly in the recent apps switcher</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.6.0</Text>
          <Text style={styles.changelogGroup}>Opening Hand</Text>
          <Text style={styles.body}>• Renamed from "Hand Test" to "Opening Hand"</Text>
          <Text style={styles.body}>• New playing card icon on the hand tester FAB</Text>
          <Text style={styles.body}>• Reset button (↺) in the modal header draws a new hand without closing</Text>
          <Text style={styles.body}>• One mulligan per hand — button disappears after use</Text>
          <Text style={styles.body}>• Compact +1 button to draw the 5th card (and up to 7 total)</Text>
          <Text style={styles.body}>• Session stats: tracks percentage of hands kept without mulligan</Text>
          <Text style={styles.body}>• Hand tester now also available in Swap Plan edit mode</Text>
          <Text style={styles.changelogGroup}>Deck List</Text>
          <Text style={styles.body}>• Sort modal reordered: Date first, then alphabetical</Text>
          <Text style={styles.body}>• Fixed occasional spacing glitch when toggling sort direction</Text>
          <Text style={styles.changelogGroup}>Rulebook</Text>
          <Text style={styles.body}>• Chapter title no longer sticks at the top while scrolling</Text>
          <Text style={styles.changelogGroup}>Export / Import</Text>
          <Text style={styles.body}>• TXT export now includes a "=== Main ===" section header for consistency with sideboard</Text>
          <Text style={styles.body}>• TXT import correctly handles the new Main header</Text>
          <Text style={styles.body}>• Image export version now reflects the current app version</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.5.0</Text>
          <Text style={styles.changelogGroup}>Deck List</Text>
          <Text style={styles.body}>• Search bar to filter decks by name</Text>
          <Text style={styles.body}>• Color gem filter — tap one or more colors to narrow the list to decks containing those colors</Text>
          <Text style={styles.body}>• Sort by Name, Date, Quantity, or Avg Cost with asc/desc toggle</Text>
          <Text style={styles.body}>• Empty state distinguishes no decks from no matches</Text>
          <Text style={styles.changelogGroup}>Deck Export</Text>
          <Text style={styles.body}>• Color legend in image export now wraps compactly — no more spread-out column for multi-color decks</Text>
          <Text style={styles.changelogGroup}>Rulebook</Text>
          <Text style={styles.body}>• Redesigned to match the style of Keywords and Card Rulings — flat rows, no solid header blocks, consistent chevron icons</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.4.0</Text>
          <Text style={styles.changelogGroup}>Sideboard</Text>
          <Text style={styles.body}>• Deck builder now supports a 10-card sideboard alongside the main deck</Text>
          <Text style={styles.body}>• Section tabs (Main Deck / Sideboard) in deck view to switch between card pools</Text>
          <Text style={styles.body}>• 4-copy rule enforced combined across main + sideboard</Text>
          <Text style={styles.body}>• Sideboard card count shown in the deck list</Text>
          <Text style={styles.changelogGroup}>Swap Plans</Text>
          <Text style={styles.body}>• Create swap plans per deck for specific matchups (e.g. "vs Aggro")</Text>
          <Text style={styles.body}>• Mark cards to remove from main deck and bring in from sideboard</Text>
          <Text style={styles.body}>• Deck size indicator shows resulting count and warns if outside 50–60 card range</Text>
          <Text style={styles.body}>• Preview mode (eye icon) shows the post-plan deck in list or grid view</Text>
          <Text style={styles.body}>• Tap any card in preview to view full card details</Text>
          <Text style={styles.body}>• Test opening hands from the post-plan card pool (layers FAB)</Text>
          <Text style={styles.body}>• Long-press context menu: rename, copy, delete — same pattern as decks</Text>
          <Text style={styles.body}>• Tap plan or deck title in header to rename inline</Text>
          <Text style={styles.changelogGroup}>Export / Import</Text>
          <Text style={styles.body}>• Sideboard section in TXT and CSV exports</Text>
          <Text style={styles.body}>• Image export shows sideboard in a compact 5-column grid below main deck</Text>
          <Text style={styles.body}>• Import supports sideboard in TXT (=== Sideboard ===) and CSV (Section column)</Text>
          <Text style={styles.body}>• JSON export removed</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.3.2</Text>
          <Text style={styles.changelogGroup}>Deck Export</Text>
          <Text style={styles.body}>• Removed incorrect "mana" label from Avg Cost stat</Text>
          <Text style={styles.body}>• Tightened padding in export image — renders more compact on mobile screens</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.3.1</Text>
          <Text style={styles.changelogGroup}>Rulebook</Text>
          <Text style={styles.body}>• Numbered steps no longer show a redundant bullet point</Text>
          <Text style={styles.body}>• Opening a chapter now collapses the previous one</Text>
          <Text style={styles.body}>• Open chapter title stays pinned at the top while scrolling</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.3.0</Text>
          <Text style={styles.changelogGroup}>Rulings</Text>
          <Text style={styles.body}>• New Rulebook tab — condensed comprehensive game rules and tournament rules in an accordion layout</Text>
          <Text style={styles.body}>• Keyword descriptions now include full mechanics, effect type, edge cases, and stacking rules</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
          <Text style={styles.changelogVersion}>v1.2.0</Text>
          <Text style={styles.changelogGroup}>Card Detail</Text>
          <Text style={styles.body}>• Tap the card image to zoom it full-screen</Text>
          <Text style={styles.body}>• Tap anywhere or the X button to dismiss</Text>
          <Text style={styles.changelogGroup}>Hand Tester</Text>
          <Text style={styles.body}>• Tap any card in your hand to zoom it full-screen</Text>
          <Text style={styles.changelogGroup}>Deck Builder</Text>
          <Text style={styles.body}>• Set, Rarity, and Type filters in add-card mode now use inline dropdowns matching the Cards browser</Text>
          <Text style={styles.body}>• Fixed: card spacing in add-card mode is now consistent with the Cards browser</Text>
        </View>

        <View style={[styles.changelogEntry, { marginTop: 20 }]}>
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
        <Text style={styles.sectionTitle}>{t('about.legal')}</Text>
        <Text style={styles.body}>{t('about.legalBody')}</Text>
        <Text style={[styles.body, { marginTop: 8 }]}>{t('about.legalBody2')}</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
    scroll:   { flex: 1, backgroundColor: theme.bg },
    content:  { padding: 24, paddingBottom: 48 },

    settingsCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 28,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    settingsTitle: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingLabel:   { color: theme.text, fontSize: 15 },
    pillRow:        { flexDirection: 'row', gap: 8 },
    pill: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5, borderColor: theme.border,
    },
    pillActive:     { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText:       { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
    pillTextActive: { color: '#fff' },
    iconToggleRow:  { flexDirection: 'row', gap: 8 },
    iconToggle: {
      width: 36, height: 36, borderRadius: 18,
      borderWidth: 1.5, borderColor: theme.border,
      alignItems: 'center', justifyContent: 'center',
    },
    iconToggleActive: { backgroundColor: theme.accent, borderColor: theme.accent },

    appName: { color: theme.accent, fontSize: 28, fontWeight: '800', marginBottom: 4 },
    version: { color: theme.textMuted, fontSize: 13, marginBottom: 32 },
    section: { marginBottom: 28 },
    sectionTitle: {
      color: theme.accent, fontSize: 13, fontWeight: '700',
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
    },
    body:           { color: theme.textMuted, fontSize: 15, lineHeight: 22 },
    link:           { color: theme.accent, textDecorationLine: 'underline' },
    changelogEntry:   { gap: 4, marginTop: 4 },
    changelogVersion: { color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 8 },
    changelogGroup:   { color: theme.accent, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 2 },
  });
}
