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
import { Feather } from '@expo/vector-icons';
import RangeSlider from '../components/RangeSlider';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Cards'>;
type ViewMode = 'list' | 'grid';

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'White'];
const TYPES  = ['SPIRIT', 'MAGIC', 'NEXUS'];
const PAGE_SIZE = 50;

export default function CardsScreen({ navigation }: Props) {
  const [cards, setCards]       = useState<Card[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [search,        setSearch]        = useState('');
  const [filterColors,  setFilterColors]  = useState<string[]>([]);
  const [filterType,    setFilterType]    = useState<string | null>(null);
  const [filterRarity,  setFilterRarity]  = useState<string | null>(null);
  const [filterSet,     setFilterSet]     = useState<string | null>(null);
  const [costRange,     setCostRange]     = useState<[number, number]>([0, 10]);
  const [setPickerOpen,    setSetPickerOpen]    = useState(false);
  const [rarityPickerOpen, setRarityPickerOpen] = useState(false);
  const [typePickerOpen,   setTypePickerOpen]   = useState(false);
  const [displayCount,  setDisplayCount]  = useState(PAGE_SIZE);

  useEffect(() => {
    getCards()
      .then(setCards)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sets     = useMemo(() => [...new Set(cards.map(c => c.set))].sort(), [cards]);
  const rarities = useMemo(() => [...new Set(cards.map(c => c.rarity))].sort(), [cards]);
  const maxCost  = useMemo(() => cards.length > 0 ? Math.max(...cards.map(c => c.cost)) : 10, [cards]);

  useEffect(() => { if (cards.length > 0) setCostRange([0, maxCost]); }, [maxCost]);

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (search) {
        const lq = search.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(lq);
        const effectMatch = c.effects.some(e =>
          (e.details?.toLowerCase().includes(lq) ?? false) ||
          (e.condition?.toLowerCase().includes(lq) ?? false) ||
          e.keywords.some(kw => kw.name.toLowerCase().includes(lq))
        );
        if (!nameMatch && !effectMatch) return false;
      }
      if (filterColors.length > 0 && !filterColors.every(col => c.color.includes(col))) return false;
      if (filterType   && c.type !== filterType)   return false;
      if (filterRarity && c.rarity !== filterRarity) return false;
      if (filterSet    && c.set !== filterSet)       return false;
      if (c.cost < costRange[0] || c.cost > costRange[1]) return false;
      return true;
    });
  }, [cards, search, filterColors, filterType, filterRarity, filterSet, costRange]);

  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [filtered]);

  const displayed = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  const toggleColor = useCallback((c: string) => {
    setFilterColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
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

  const costActive = costRange[0] !== 0 || costRange[1] !== maxCost;

  return (
    <View style={styles.container}>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search name, effects, keywords…"
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

      {/* Toolbar: Set | Rarity | Type | View toggle */}
      <View style={styles.toolbarRow}>
        <TouchableOpacity
          style={[styles.filterBtn, !!filterSet && styles.filterBtnActive]}
          onPress={() => setSetPickerOpen(true)}
        >
          <Text style={[styles.filterBtnText, !!filterSet && styles.filterBtnTextActive]} numberOfLines={1}>
            {filterSet ?? 'Set'} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, !!filterRarity && styles.filterBtnActive]}
          onPress={() => setRarityPickerOpen(true)}
        >
          <Text style={[styles.filterBtnText, !!filterRarity && styles.filterBtnTextActive]} numberOfLines={1}>
            {filterRarity ?? 'Rarity'} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, !!filterType && styles.filterBtnActive]}
          onPress={() => setTypePickerOpen(true)}
        >
          <Text style={[styles.filterBtnText, !!filterType && styles.filterBtnTextActive]} numberOfLines={1}>
            {filterType ?? 'Type'} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
        >
          <Feather name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Color gems */}
      <View style={styles.gemRow}>
        {COLORS.map(c => {
          const active = filterColors.includes(c);
          return (
            <TouchableOpacity key={c} onPress={() => toggleColor(c)} activeOpacity={0.75}>
              <View style={[styles.gem, { backgroundColor: COLOR_MAP[c] }, active && styles.gemActive]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cost range slider */}
      <View style={styles.costSection}>
        <Text style={[styles.costLabel, costActive && styles.costLabelActive]}>
          Cost: {costRange[0]} – {costRange[1]}
        </Text>
        <RangeSlider
          min={0}
          max={maxCost}
          values={costRange}
          onChange={setCostRange}
        />
      </View>

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
      <Modal visible={setPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSetPickerOpen(false)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Set</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => { setFilterSet(null); setSetPickerOpen(false); }}
              >
                <Text style={[styles.modalRowText, !filterSet && styles.modalRowSelected]}>All Sets</Text>
              </TouchableOpacity>
              {sets.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.modalRow}
                  onPress={() => { setFilterSet(s); setSetPickerOpen(false); }}
                >
                  <Text style={[styles.modalRowText, filterSet === s && styles.modalRowSelected]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Type picker modal */}
      <Modal visible={typePickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setTypePickerOpen(false)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Type</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => { setFilterType(null); setTypePickerOpen(false); }}
              >
                <Text style={[styles.modalRowText, !filterType && styles.modalRowSelected]}>All Types</Text>
              </TouchableOpacity>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={styles.modalRow}
                  onPress={() => { setFilterType(t); setTypePickerOpen(false); }}
                >
                  <Text style={[styles.modalRowText, filterType === t && styles.modalRowSelected]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rarity picker modal */}
      <Modal visible={rarityPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setRarityPickerOpen(false)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Rarity</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => { setFilterRarity(null); setRarityPickerOpen(false); }}
              >
                <Text style={[styles.modalRowText, !filterRarity && styles.modalRowSelected]}>All Rarities</Text>
              </TouchableOpacity>
              {rarities.map(r => (
                <TouchableOpacity
                  key={r}
                  style={styles.modalRow}
                  onPress={() => { setFilterRarity(r); setRarityPickerOpen(false); }}
                >
                  <Text style={[styles.modalRowText, filterRarity === r && styles.modalRowSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingTop: 8 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  err:       { color: 'red' },

  searchWrap: { marginHorizontal: 12, marginBottom: 6, position: 'relative' },
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

  toolbarRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 6, gap: 8 },
  filterBtn:         { flex: 1, backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  filterBtnActive:   { backgroundColor: theme.accent },
  filterBtnText:     { color: theme.textMuted, fontSize: 13 },
  filterBtnTextActive: { color: '#fff', fontWeight: '700' },
  viewToggle:     { backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, justifyContent: 'center' },

  gemRow:    { flexDirection: 'row', gap: 12, paddingHorizontal: 14, marginBottom: 8, alignItems: 'center' },
  gem:       { width: 28, height: 28, borderRadius: 14, opacity: 0.45 },
  gemActive: { opacity: 1, borderWidth: 2.5, borderColor: '#fff' },

  costSection:     { marginHorizontal: 12, marginBottom: 6 },
  costLabel:       { color: theme.textMuted, fontSize: 11, marginBottom: 6 },
  costLabelActive: { color: theme.accent },

  count:      { color: theme.textMuted, fontSize: 11, marginLeft: 14, marginBottom: 4 },
  footerText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', padding: 16 },

  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  centeredWrap:{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: '90%', maxHeight: '70%', backgroundColor: theme.surface,
    borderRadius: 16, padding: 20,
  },
  sheetTitle:       { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalRow:         { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalRowText:     { color: theme.text, fontSize: 14 },
  modalRowSelected: { fontWeight: '700', color: theme.accent },
});
