import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCards } from '../api';
import { Card } from '../types';
import CardItem from '../components/CardItem';
import CardGrid from '../components/CardGrid';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Cards'>;
type ViewMode = 'list' | 'grid';

const COLORS   = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'White'];
const TYPES    = ['SPIRIT', 'MAGIC', 'NEXUS'];
const RARITIES = ['X', 'R', 'UC', 'C'];
const PAGE_SIZE = 50;

export default function CardsScreen({ navigation }: Props) {
  const [cards, setCards]       = useState<Card[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [search,        setSearch]        = useState('');
  const [filterColor,   setFilterColor]   = useState<string | null>(null);
  const [filterType,    setFilterType]    = useState<string | null>(null);
  const [filterRarity,  setFilterRarity]  = useState<string | null>(null);
  const [filterSet,     setFilterSet]     = useState<string | null>(null);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [displayCount,  setDisplayCount]  = useState(PAGE_SIZE);

  useEffect(() => {
    getCards()
      .then(setCards)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sets = useMemo(() => [...new Set(cards.map(c => c.set))].sort(), [cards]);

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (search       && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterColor  && !c.color.includes(filterColor))   return false;
      if (filterType   && c.type !== filterType)             return false;
      if (filterRarity && c.rarity !== filterRarity)         return false;
      if (filterSet    && c.set !== filterSet)               return false;
      return true;
    });
  }, [cards, search, filterColor, filterType, filterRarity, filterSet]);

  // Reset pagination whenever filters change
  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [filtered]);

  const displayed = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  const toggle = useCallback(<T>(cur: T | null, val: T, set: (v: T | null) => void) => {
    set(cur === val ? null : val);
  }, []);

  const loadMore = useCallback(() => {
    if (displayCount < filtered.length) setDisplayCount(n => n + PAGE_SIZE);
  }, [displayCount, filtered.length]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;
  if (error)   return <View style={styles.center}><Text style={styles.err}>Error: {error}</Text></View>;

  const footer = displayCount < filtered.length
    ? <ActivityIndicator color={theme.accent} style={{ padding: 16 }} />
    : filtered.length > PAGE_SIZE
      ? <Text style={styles.footerText}>All {filtered.length} cards shown</Text>
      : null;

  return (
    <View style={styles.container}>

      {/* Search bar with clear button */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search cards…"
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

      {/* Set picker + view toggle */}
      <View style={styles.toolbarRow}>
        <TouchableOpacity
          style={[styles.setBtn, !!filterSet && styles.setBtnActive]}
          onPress={() => setSetPickerOpen(true)}
        >
          <Text style={[styles.setBtnText, !!filterSet && styles.setBtnTextActive]}>
            {filterSet ?? 'All Sets'} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
        >
          <Text style={styles.viewToggleText}>{viewMode === 'list' ? '⊞' : '☰'}</Text>
        </TouchableOpacity>
      </View>

      {/* Color filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {COLORS.map(c => {
          const active = filterColor === c;
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                { borderColor: COLOR_MAP[c] },
                active && { backgroundColor: COLOR_MAP[c], borderColor: COLOR_MAP[c] },
              ]}
              onPress={() => toggle(filterColor, c, setFilterColor)}
            >
              <View style={[styles.dot, { backgroundColor: active ? (c === 'White' ? '#555' : '#fff') : COLOR_MAP[c] }]} />
              <Text style={[styles.chipText, active && { color: c === 'Yellow' || c === 'White' ? '#222' : '#fff', fontWeight: '700' }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Type + Rarity chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {TYPES.map(t => {
          const active = filterType === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.chip, active && styles.chipAccentActive]}
              onPress={() => toggle(filterType, t, setFilterType)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
        {RARITIES.map(r => {
          const active = filterRarity === r;
          return (
            <TouchableOpacity
              key={r}
              style={[styles.chip, active && styles.chipAccentActive]}
              onPress={() => toggle(filterRarity, r, setFilterRarity)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.count}>
        {filtered.length} cards{displayCount < filtered.length ? ` · showing ${displayCount}` : ''}
      </Text>

      {viewMode === 'list' ? (
        <FlatList
          data={displayed}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <CardItem
              card={item}
              onPress={() => navigation.navigate('CardDetail', { card: item })}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={footer}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
        />
      ) : (
        <CardGrid
          cards={displayed}
          onPress={card => navigation.navigate('CardDetail', { card })}
          onEndReached={loadMore}
          footer={footer}
        />
      )}

      {/* Set picker modal */}
      <Modal visible={setPickerOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSetPickerOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select Set</Text>
          <ScrollView>
            <TouchableOpacity
              style={[styles.setRow, !filterSet && styles.setRowActive]}
              onPress={() => { setFilterSet(null); setSetPickerOpen(false); }}
            >
              <Text style={[styles.setRowText, !filterSet && styles.setRowTextActive]}>All Sets</Text>
            </TouchableOpacity>
            {sets.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.setRow, filterSet === s && styles.setRowActive]}
                onPress={() => { setFilterSet(s); setSetPickerOpen(false); }}
              >
                <Text style={[styles.setRowText, filterSet === s && styles.setRowTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingTop: 8 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  err:       { color: 'red' },

  searchWrap: { marginHorizontal: 12, marginBottom: 6 },
  search: {
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingRight: 36,
    paddingVertical: 8,
    fontSize: 14,
  },
  clearBtn:  { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  clearText: { color: theme.textMuted, fontSize: 15 },

  toolbarRow:      { flexDirection: 'row', marginHorizontal: 12, marginBottom: 6, gap: 8 },
  setBtn:          { flex: 1, backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  setBtnActive:    { backgroundColor: theme.accent },
  setBtnText:      { color: theme.textMuted, fontSize: 13 },
  setBtnTextActive:{ color: '#fff', fontWeight: '700' },
  viewToggle:      { backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, justifyContent: 'center' },
  viewToggleText:  { color: theme.text, fontSize: 18 },

  filterRow:      { flexGrow: 0, marginBottom: 4 },
  filterContent:  { paddingHorizontal: 12, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  chipAccentActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText:         { color: theme.textMuted, fontSize: 12 },
  chipTextActive:   { color: '#fff', fontWeight: '700' },
  dot:              { width: 8, height: 8, borderRadius: 4 },

  count:      { color: theme.textMuted, fontSize: 11, marginLeft: 14, marginBottom: 4 },
  footerText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', padding: 16 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '60%', backgroundColor: theme.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  sheetTitle:       { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  setRow:           { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border },
  setRowActive:     {},
  setRowText:       { color: theme.text, fontSize: 14 },
  setRowTextActive: { color: theme.accent, fontWeight: '700' },
});
