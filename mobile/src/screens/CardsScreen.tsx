import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView, Modal, Pressable,
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
        const subtypeMatch = c.subtypes.some(st => st.toLowerCase().includes(lq));
        if (!nameMatch && !effectMatch && !subtypeMatch) return false;
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
        <Feather name="search" size={15} color={theme.textMuted} style={{ marginLeft: 10, marginRight: 6 }} />
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

      {/* Set picker dropdown */}
      <Modal visible={setPickerOpen} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSetPickerOpen(false)} />
        <View style={styles.dropMenuWrap} pointerEvents="box-none">
          <View style={styles.dropSetMenu}>
            <Text style={styles.dropMenuTitle}>Set</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <TouchableOpacity
                style={styles.dropMenuRow}
                onPress={() => { setFilterSet(null); setSetPickerOpen(false); }}
              >
                <Text style={[styles.dropMenuText, !filterSet && styles.dropMenuTextActive]}>All Sets</Text>
                {!filterSet && <Feather name="check" size={16} color={theme.accent} />}
              </TouchableOpacity>
              {sets.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.dropMenuRow}
                  onPress={() => { setFilterSet(s); setSetPickerOpen(false); }}
                >
                  <Text style={[styles.dropMenuText, filterSet === s && styles.dropMenuTextActive]}>{s}</Text>
                  {filterSet === s && <Feather name="check" size={16} color={theme.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rarity picker dropdown */}
      <Modal visible={rarityPickerOpen} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setRarityPickerOpen(false)} />
        <View style={styles.dropMenuWrap} pointerEvents="box-none">
          <View style={styles.dropRarityMenu}>
            <Text style={styles.dropMenuTitle}>Rarity</Text>
            <TouchableOpacity
              style={styles.dropMenuRow}
              onPress={() => { setFilterRarity(null); setRarityPickerOpen(false); }}
            >
              <Text style={[styles.dropMenuText, !filterRarity && styles.dropMenuTextActive]}>All Rarities</Text>
              {!filterRarity && <Feather name="check" size={16} color={theme.accent} />}
            </TouchableOpacity>
            {rarities.map(r => (
              <TouchableOpacity
                key={r}
                style={styles.dropMenuRow}
                onPress={() => { setFilterRarity(r); setRarityPickerOpen(false); }}
              >
                <Text style={[styles.dropMenuText, filterRarity === r && styles.dropMenuTextActive]}>{r}</Text>
                {filterRarity === r && <Feather name="check" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Type picker dropdown */}
      <Modal visible={typePickerOpen} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypePickerOpen(false)} />
        <View style={styles.dropMenuWrap} pointerEvents="box-none">
          <View style={styles.dropTypeMenu}>
            <Text style={styles.dropMenuTitle}>Type</Text>
            <TouchableOpacity
              style={styles.dropMenuRow}
              onPress={() => { setFilterType(null); setTypePickerOpen(false); }}
            >
              <Text style={[styles.dropMenuText, !filterType && styles.dropMenuTextActive]}>All Types</Text>
              {!filterType && <Feather name="check" size={16} color={theme.accent} />}
            </TouchableOpacity>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.dropMenuRow}
                onPress={() => { setFilterType(t); setTypePickerOpen(false); }}
              >
                <Text style={[styles.dropMenuText, filterType === t && styles.dropMenuTextActive]}>{t}</Text>
                {filterType === t && <Feather name="check" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
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

  searchWrap: {
    marginHorizontal: 12, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 8,
    position: 'relative',
  },
  search: {
    flex: 1,
    color: theme.text,
    paddingLeft: 0, paddingRight: 36, paddingVertical: 8,
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

  dropMenuWrap: { ...StyleSheet.absoluteFillObject },
  dropSetMenu: {
    position: 'absolute', top: 148, left: 12,
    backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 4,
    minWidth: 130, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  dropRarityMenu: {
    position: 'absolute', top: 148, left: 148,
    backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 4,
    minWidth: 140, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  dropTypeMenu: {
    position: 'absolute', top: 148, right: 56,
    backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 4,
    minWidth: 130, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  dropMenuTitle: {
    color: theme.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  dropMenuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  dropMenuText:       { color: theme.text, fontSize: 14 },
  dropMenuTextActive: { color: theme.accent, fontWeight: '700' },
});
