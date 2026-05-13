import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { RULEBOOK, RuleChapter, RuleSection } from '../data/rulebook';
import { theme } from '../theme';

const GAME_CHAPTERS    = RULEBOOK.filter(c => c.book === 'game');
const TOURNEY_CHAPTERS = RULEBOOK.filter(c => c.book === 'tournament');

function getStickyIndex(openId: string | null): number[] {
  if (!openId) return [];
  const gi = GAME_CHAPTERS.findIndex(c => c.id === openId);
  if (gi >= 0) return [1 + gi];
  const ti = TOURNEY_CHAPTERS.findIndex(c => c.id === openId);
  if (ti >= 0) return [1 + GAME_CHAPTERS.length + 1 + ti];
  return [];
}

export default function RulebookView() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId(prev => prev === id ? null : id);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      stickyHeaderIndices={getStickyIndex(openId)}
    >
      {[
        <BookHeader key="gh" label="Game Rules" />,
        ...GAME_CHAPTERS.flatMap(c => [
          <ChapterHeader key={`${c.id}-h`} chapter={c} open={openId === c.id} onPress={toggle} />,
          ...(openId === c.id ? [<ChapterBody key={`${c.id}-b`} chapter={c} />] : []),
        ]),
        <BookHeader key="th" label="Tournament Rules" />,
        ...TOURNEY_CHAPTERS.flatMap(c => [
          <ChapterHeader key={`${c.id}-h`} chapter={c} open={openId === c.id} onPress={toggle} />,
          ...(openId === c.id ? [<ChapterBody key={`${c.id}-b`} chapter={c} />] : []),
        ]),
      ]}
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

function ChapterHeader({
  chapter, open, onPress,
}: {
  chapter: RuleChapter;
  open: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <View style={[styles.chapterWrap, open && styles.chapterWrapOpen]}>
      <TouchableOpacity style={styles.chapterRow} onPress={() => onPress(chapter.id)} activeOpacity={0.75}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ChapterBody({ chapter }: { chapter: RuleChapter }) {
  return (
    <View style={styles.chapterBody}>
      {chapter.sections.map((sec: RuleSection, si: number) => (
        <View key={si} style={styles.section}>
          {sec.title ? <Text style={styles.sectionTitle}>{sec.title}</Text> : null}
          {sec.items.map((item: string, ii: number) => {
            const numbered = /^\d+\.\s/.test(item);
            return (
              <View key={ii} style={styles.itemRow}>
                {!numbered && <Text style={styles.bullet}>•</Text>}
                <Text style={[styles.itemText, numbered && styles.numberedItem]}>{item}</Text>
              </View>
            );
          })}
        </View>
      ))}
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

  chapterWrap:     { borderBottomWidth: 1, borderBottomColor: theme.border },
  chapterWrapOpen: { backgroundColor: theme.surface },

  chapterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    backgroundColor: theme.surface,
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

  itemRow:      { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 5 },
  bullet:       { color: theme.textMuted, fontSize: 13, lineHeight: 20, marginRight: 7, marginTop: 1 },
  itemText:     { color: theme.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  numberedItem: { paddingLeft: 4 },
});
