import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCards } from '../api';
import { Card } from '../types';
import CardItem from '../components/CardItem';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Cards'>;

const COLORS  = ['Red','Blue','Green','Yellow','Purple','White'];
const TYPES   = ['SPIRIT','MAGIC','NEXUS'];
const RARITIES= ['X','R','UC','C'];

export default function CardsScreen({ navigation }: Props) {
  const [cards, setCards]     = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [search,       setSearch]       = useState('');
  const [filterColor,  setFilterColor]  = useState<string | null>(null);
  const [filterType,   setFilterType]   = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  useEffect(() => {
    getCards()
      .then(setCards)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterColor  && !c.color.includes(filterColor))    return false;
      if (filterType   && c.type !== filterType)              return false;
      if (filterRarity && c.rarity !== filterRarity)          return false;
      return true;
    });
  }, [cards, search, filterColor, filterType, filterRarity]);

  const toggle = useCallback(<T>(cur: T | null, val: T, set: (v: T | null) => void) => {
    set(cur === val ? null : val);
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;
  if (error)   return <View style={styles.center}><Text style={styles.err}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search cards…"
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Color filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, filterColor === c && styles.chipActive, { borderColor: COLOR_MAP[c] }]}
            onPress={() => toggle(filterColor, c, setFilterColor)}
          >
            <View style={[styles.dot, { backgroundColor: COLOR_MAP[c] }]} />
            <Text style={[styles.chipText, filterColor === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type + Rarity filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, filterType === t && styles.chipActive]}
            onPress={() => toggle(filterType, t, setFilterType)}
          >
            <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {RARITIES.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, filterRarity === r && styles.chipActive]}
            onPress={() => toggle(filterRarity, r, setFilterRarity)}
          >
            <Text style={[styles.chipText, filterRarity === r && styles.chipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{filtered.length} cards</Text>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <CardItem
            card={item}
            onPress={() => navigation.navigate('CardDetail', { card: item })}
          />
        )}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingTop: 8 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  err:       { color: 'red' },
  search: {
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterRow:    { flexGrow: 0, marginBottom: 4 },
  filterContent:{ paddingHorizontal: 12, gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  chipActive:     { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText:       { color: theme.textMuted, fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  dot:   { width: 8, height: 8, borderRadius: 4 },
  count: { color: theme.textMuted, fontSize: 11, marginLeft: 14, marginBottom: 4 },
});
