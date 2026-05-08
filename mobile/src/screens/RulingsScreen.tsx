import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, ScrollView, StyleSheet,
  TouchableOpacity, Modal, ActivityIndicator, Pressable,
} from 'react-native';
import { getKeywords, getKeywordDetail, getCardRulings } from '../api';
import { KeywordDef, QAItem, CardRuling } from '../types';
import { theme } from '../theme';

type Segment = 'keywords' | 'cards';

interface CardGroup {
  card_id: string;
  card_name: string;
  entries: QAItem[];
}

export default function RulingsScreen() {
  const [segment, setSegment]     = useState<Segment>('keywords');
  const [search,  setSearch]      = useState('');

  const [keywords,    setKeywords]    = useState<KeywordDef[]>([]);
  const [cardRulings, setCardRulings] = useState<CardRuling[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // Selected keyword detail modal
  const [kwDetail,       setKwDetail]       = useState<{ name: string; description: string; qa: QAItem[] } | null>(null);
  const [kwDetailLoading, setKwDetailLoading] = useState(false);

  // Selected card rulings modal
  const [cardDetail, setCardDetail] = useState<CardGroup | null>(null);

  useEffect(() => {
    Promise.all([getKeywords(), getCardRulings()])
      .then(([kws, rulings]) => { setKeywords(kws); setCardRulings(rulings); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Reset search on segment switch
  const switchSegment = useCallback((s: Segment) => {
    setSegment(s);
    setSearch('');
  }, []);

  const filteredKeywords = useMemo(() => {
    if (!search) return keywords;
    const lq = search.toLowerCase();
    return keywords.filter(k =>
      k.name.toLowerCase().includes(lq) ||
      k.description.toLowerCase().includes(lq)
    );
  }, [keywords, search]);

  const cardGroups = useMemo((): CardGroup[] => {
    const map = new Map<string, CardGroup>();
    for (const r of cardRulings) {
      if (!map.has(r.card_id)) {
        map.set(r.card_id, { card_id: r.card_id, card_name: r.card_name, entries: [] });
      }
      map.get(r.card_id)!.entries.push({ question: r.question, answer: r.answer });
    }
    return Array.from(map.values());
  }, [cardRulings]);

  const filteredCards = useMemo(() => {
    if (!search) return cardGroups;
    const lq = search.toLowerCase();
    return cardGroups.filter(g =>
      g.card_id.toLowerCase().includes(lq) ||
      g.card_name.toLowerCase().includes(lq) ||
      g.entries.some(e => e.question.toLowerCase().includes(lq) || e.answer.toLowerCase().includes(lq))
    );
  }, [cardGroups, search]);

  const openKeyword = useCallback(async (kw: KeywordDef) => {
    setKwDetailLoading(true);
    setKwDetail({ name: kw.name, description: kw.description, qa: [] });
    try {
      const detail = await getKeywordDetail(kw.name);
      setKwDetail(detail);
    } finally {
      setKwDetailLoading(false);
    }
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;
  if (error)   return <View style={styles.center}><Text style={styles.err}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>

      {/* Segment selector */}
      <View style={styles.segRow}>
        <TouchableOpacity
          style={[styles.seg, segment === 'keywords' && styles.segActive]}
          onPress={() => switchSegment('keywords')}
        >
          <Text style={[styles.segText, segment === 'keywords' && styles.segTextActive]}>
            Keywords ({keywords.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.seg, segment === 'cards' && styles.segActive]}
          onPress={() => switchSegment('cards')}
        >
          <Text style={[styles.segText, segment === 'cards' && styles.segTextActive]}>
            Card Rulings ({cardGroups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder={segment === 'keywords' ? 'Search keywords…' : 'Search by card name or ID…'}
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Keywords list */}
      {segment === 'keywords' && (
        <FlatList
          data={filteredKeywords}
          keyExtractor={k => k.name}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.kwRow} onPress={() => openKeyword(item)} activeOpacity={0.75}>
              <View style={styles.kwRowInner}>
                <Text style={styles.kwName}>{item.name}</Text>
                {item.qa_count > 0 && (
                  <Text style={styles.badge}>{item.qa_count}</Text>
                )}
              </View>
              <Text style={styles.kwDesc} numberOfLines={2}>{item.description}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Card Q&A list */}
      {segment === 'cards' && (
        <FlatList
          data={filteredCards}
          keyExtractor={g => g.card_id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cardRow} onPress={() => setCardDetail(item)} activeOpacity={0.75}>
              <View style={styles.cardRowInner}>
                <Text style={styles.cardId}>{item.card_id}</Text>
                <Text style={styles.badge}>{item.entries.length}</Text>
              </View>
              <Text style={styles.cardName}>{item.card_name}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {/* Keyword detail modal */}
      <Modal visible={!!kwDetail} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setKwDetail(null)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.centeredSheet}>
            {kwDetail && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{kwDetail.name}</Text>
                  <TouchableOpacity onPress={() => setKwDetail(null)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  <Text style={styles.kwDefText}>{kwDetail.description}</Text>
                  {kwDetailLoading && <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />}
                  {kwDetail.qa.length > 0 && (
                    <>
                      <Text style={styles.qaHeader}>Rulings ({kwDetail.qa.length})</Text>
                      {kwDetail.qa.map((qa, i) => <QABlock key={i} qa={qa} />)}
                    </>
                  )}
                  {!kwDetailLoading && kwDetail.qa.length === 0 && (
                    <Text style={styles.emptyNote}>No rulings for this keyword.</Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Card ruling modal */}
      <Modal visible={!!cardDetail} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setCardDetail(null)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.centeredSheet}>
            {cardDetail && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.sheetTitle}>{cardDetail.card_name}</Text>
                    <Text style={styles.sheetSub}>{cardDetail.card_id}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCardDetail(null)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {cardDetail.entries.map((qa, i) => <QABlock key={i} qa={qa} />)}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function QABlock({ qa }: { qa: QAItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.qaBlock} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
      <Text style={styles.qaQ}>{qa.question}</Text>
      {expanded && <Text style={styles.qaA}>{qa.answer}</Text>}
      <Text style={styles.qaToggle}>{expanded ? '▲ Hide' : '▼ Show answer'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  err:       { color: 'red' },

  segRow:        { flexDirection: 'row', marginHorizontal: 12, marginTop: 10, marginBottom: 6, backgroundColor: theme.surface, borderRadius: 10, padding: 3 },
  seg:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive:     { backgroundColor: theme.accent },
  segText:       { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  segTextActive: { color: '#fff', fontWeight: '700' },

  searchWrap: { marginHorizontal: 12, marginBottom: 8, position: 'relative' },
  search: {
    backgroundColor: theme.surface, color: theme.text, borderRadius: 8,
    paddingHorizontal: 12, paddingRight: 36, paddingVertical: 8, fontSize: 14,
  },
  clearBtn:  { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  clearText: { color: theme.textMuted, fontSize: 15 },

  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  sep:         { height: 1, backgroundColor: theme.border },

  kwRow:      { paddingVertical: 12 },
  kwRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  kwName:     { color: theme.text, fontSize: 15, fontWeight: '700', flex: 1 },
  kwDesc:     { color: theme.textMuted, fontSize: 12, lineHeight: 17 },

  cardRow:      { paddingVertical: 12 },
  cardRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardId:       { color: theme.accent, fontSize: 12, fontWeight: '700' },
  cardName:     { color: theme.text, fontSize: 14 },

  badge: {
    backgroundColor: theme.surface, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    color: theme.textMuted, fontSize: 11, fontWeight: '600',
    borderWidth: 1, borderColor: theme.border,
    overflow: 'hidden',
  },

  centeredWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    padding: 20, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centeredSheet: {
    width: '100%', maxHeight: '80%',
    backgroundColor: theme.surface,
    borderRadius: 20, padding: 20,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle:  { color: theme.text, fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  sheetSub:    { color: theme.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
  closeBtn:    { color: theme.textMuted, fontSize: 18, lineHeight: 22 },

  kwDefText: { color: theme.text, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  qaHeader:  { color: theme.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  emptyNote: { color: theme.textMuted, fontSize: 13, fontStyle: 'italic' },

  qaBlock:  { backgroundColor: theme.bg, borderRadius: 8, padding: 12, marginBottom: 8 },
  qaQ:      { color: theme.text, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  qaA:      { color: theme.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  qaToggle: { color: theme.accent, fontSize: 11, fontWeight: '600' },
});
