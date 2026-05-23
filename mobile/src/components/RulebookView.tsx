import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RULEBOOK, RuleChapter, RuleSection } from '../data/rulebook';
import { ThemeType } from '../theme';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useTranslation } from 'react-i18next';

const GAME_CHAPTERS    = RULEBOOK.filter(c => c.book === 'game');
const TOURNEY_CHAPTERS = RULEBOOK.filter(c => c.book === 'tournament');

export default function RulebookView() {
  const { theme } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId(prev => prev === id ? null : id);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {[
        <BookHeader key="gh" label={t('rulings.gameRules')} styles={styles} />,
        ...GAME_CHAPTERS.flatMap(c => [
          <ChapterHeader key={`${c.id}-h`} chapter={c} open={openId === c.id} onPress={toggle} styles={styles} theme={theme} />,
          ...(openId === c.id ? [<ChapterBody key={`${c.id}-b`} chapter={c} styles={styles} />] : []),
        ]),
        <BookHeader key="th" label={t('rulings.tourneyRules')} styles={styles} />,
        ...TOURNEY_CHAPTERS.flatMap(c => [
          <ChapterHeader key={`${c.id}-h`} chapter={c} open={openId === c.id} onPress={toggle} styles={styles} theme={theme} />,
          ...(openId === c.id ? [<ChapterBody key={`${c.id}-b`} chapter={c} styles={styles} />] : []),
        ]),
      ]}
    </ScrollView>
  );
}

function BookHeader({ label, styles }: { label: string; styles: any }) {
  return (
    <View style={styles.bookHeader}>
      <Text style={styles.bookHeaderText}>{label}</Text>
      <View style={styles.bookHeaderLine} />
    </View>
  );
}

function ChapterHeader({
  chapter, open, onPress, styles, theme,
}: {
  chapter: RuleChapter;
  open: boolean;
  onPress: (id: string) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View style={[styles.chapterWrap, open && styles.chapterWrapOpen]}>
      <TouchableOpacity style={styles.chapterRow} onPress={() => onPress(chapter.id)} activeOpacity={0.75}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function ChapterBody({ chapter, styles }: { chapter: RuleChapter; styles: any }) {
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

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32 },

    bookHeader: {
      marginTop: 20, marginBottom: 4,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    bookHeaderText: {
      color: theme.accent, fontSize: 11, fontWeight: '800',
      textTransform: 'uppercase', letterSpacing: 1.5,
    },
    bookHeaderLine: { flex: 1, height: 1, backgroundColor: theme.border },

    chapterWrap:     { borderBottomWidth: 1, borderBottomColor: theme.border },
    chapterWrapOpen: {},

    chapterRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
    },
    chapterTitle: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },

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
}
