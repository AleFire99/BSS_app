import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { RULEBOOK, RuleChapter } from '../data/rulebook';
import { theme } from '../theme';

const GAME_CHAPTERS    = RULEBOOK.filter(c => c.book === 'game');
const TOURNEY_CHAPTERS = RULEBOOK.filter(c => c.book === 'tournament');

export default function RulebookView() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BookHeader label="Game Rules" />
      {GAME_CHAPTERS.map(c => <ChapterRow key={c.id} chapter={c} open={expanded.has(c.id)} onPress={toggle} />)}

      <BookHeader label="Tournament Rules" />
      {TOURNEY_CHAPTERS.map(c => <ChapterRow key={c.id} chapter={c} open={expanded.has(c.id)} onPress={toggle} />)}
    </ScrollView>
  );
}

function BookHeader({ label }: { label: string }) {
  return (
    <View style={styles.bookHeader}>
      <Text style={styles.bookHeaderText}>{label}</Text>
    </View>
  );
}

function ChapterRow({
  chapter, open, onPress,
}: {
  chapter: RuleChapter;
  open: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <View style={styles.chapterWrap}>
      <TouchableOpacity style={styles.chapterRow} onPress={() => onPress(chapter.id)} activeOpacity={0.75}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.chapterBody}>
          {chapter.sections.map((sec, si) => (
            <View key={si} style={styles.section}>
              {sec.title ? <Text style={styles.sectionTitle}>{sec.title}</Text> : null}
              {sec.items.map((item, ii) => (
                <View key={ii} style={styles.itemRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 32 },

  bookHeader: {
    marginTop: 16, marginBottom: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: theme.accent,
    borderRadius: 8,
  },
  bookHeaderText: {
    color: '#1a1a1a', fontSize: 12, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  chapterWrap: { borderBottomWidth: 1, borderBottomColor: theme.border },

  chapterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
  },
  chapterTitle: { color: theme.text, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  chevron:      { color: theme.textMuted, fontSize: 11 },

  chapterBody: { paddingBottom: 12 },

  section:      { marginTop: 10 },
  sectionTitle: {
    color: theme.accent, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 6, paddingHorizontal: 4,
  },

  itemRow:  { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 5 },
  bullet:   { color: theme.textMuted, fontSize: 13, lineHeight: 20, marginRight: 7, marginTop: 1 },
  itemText: { color: theme.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
});
