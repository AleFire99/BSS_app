import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDeck, getCards, addCardToDeck, removeCardFromDeck, updateDeck } from '../api';
import { Card, Deck, DeckCard } from '../types';
import CardItem from '../components/CardItem';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

export default function DeckDetailScreen({ route, navigation }: Props) {
  const { deckId } = route.params;

  const [deck, setDeck]           = useState<(Deck & { cards: DeckCard[] }) | null>(null);
  const [allCards, setAllCards]   = useState<Card[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addMode, setAddMode]     = useState(false);
  const [search, setSearch]       = useState('');
  const [editName, setEditName]   = useState('');
  const [editModal, setEditModal] = useState(false);

  const load = useCallback(() => {
    Promise.all([getDeck(deckId), getCards()])
      .then(([d, cards]) => { setDeck(d); setAllCards(cards); })
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [deckId]);

  useEffect(() => {
    load();
    navigation.setOptions({ title: 'Deck' });
  }, []);

  useEffect(() => {
    if (deck) navigation.setOptions({ title: deck.name });
  }, [deck]);

  const cardMap = React.useMemo(
    () => Object.fromEntries(allCards.map(c => [c.id, c])),
    [allCards]
  );

  const deckCardIds = new Set(deck?.cards?.map(dc => dc.card_id) ?? []);

  const filteredAdd = React.useMemo(() => {
    if (!search) return [];
    return allCards
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 30);
  }, [allCards, search]);

  const handleAdd = async (cardId: string) => {
    try {
      await addCardToDeck(deckId, cardId);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRemove = (cardId: string) => {
    Alert.alert('Remove card', 'Remove from deck?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () =>
        removeCardFromDeck(deckId, cardId).then(load).catch(e => Alert.alert('Error', e.message))
      },
    ]);
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      await updateDeck(deckId, { name: editName.trim() });
      setEditModal(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading || !deck) return (
    <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>
  );

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.cardCount}>{deck.card_count} cards</Text>
        <View style={styles.colorRow}>
          {Object.entries(deck.colors).sort((a,b) => b[1]-a[1]).map(([c, n]) => (
            <View key={c} style={styles.colorChip}>
              <View style={[styles.dot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
              <Text style={styles.colorQty}>{n}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => { setEditName(deck.name); setEditModal(true); }}>
          <Text style={styles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>

      {addMode ? (
        /* ── Add card mode ── */
        <View style={styles.flex}>
          <TextInput
            style={styles.search}
            placeholder="Search to add…"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <FlatList
            data={filteredAdd}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <CardItem
                card={item}
                onPress={() => navigation.navigate('CardDetail', { card: item })}
                actionLabel={deckCardIds.has(item.id) ? '+1' : 'Add'}
                onAction={() => handleAdd(item.id)}
              />
            )}
            ListEmptyComponent={
              search.length > 0
                ? <Text style={styles.empty}>No results</Text>
                : <Text style={styles.empty}>Type to search cards</Text>
            }
          />
          <TouchableOpacity style={styles.doneBtn} onPress={() => setAddMode(false)}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Deck card list ── */
        <View style={styles.flex}>
          <FlatList
            data={deck.cards}
            keyExtractor={dc => dc.card_id}
            renderItem={({ item }) => {
              const card = cardMap[item.card_id];
              if (!card) return null;
              return (
                <View style={styles.deckCardRow}>
                  <CardItem
                    card={card}
                    onPress={() => navigation.navigate('CardDetail', { card })}
                  />
                  <View style={styles.qtyControls}>
                    <Text style={styles.qty}>×{item.count}</Text>
                    <TouchableOpacity onPress={() => handleRemove(item.card_id)}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>Deck is empty. Add cards!</Text>
            }
            contentContainerStyle={{ paddingBottom: 80 }}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setAddMode(true)}>
            <Text style={styles.fabText}>+ Add Card</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rename modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Rename Deck</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor={theme.textMuted}
            autoFocus
          />
          <TouchableOpacity style={styles.btn} onPress={handleRename}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  flex:      { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, padding: 12, gap: 10,
  },
  cardCount:  { color: theme.accent, fontWeight: '700', fontSize: 14 },
  colorRow:   { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorChip:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  colorQty:   { color: theme.textMuted, fontSize: 12 },
  editBtn:    { color: theme.accent, fontSize: 13 },
  search: {
    backgroundColor: theme.surface, color: theme.text,
    borderRadius: 8, margin: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  deckCardRow: { flexDirection: 'row', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 14 },
  qty:         { color: theme.text, fontSize: 16, fontWeight: '700' },
  removeBtn:   { color: 'red', fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: theme.accent, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 14, elevation: 6,
  },
  fabText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneBtn: {
    backgroundColor: theme.surface, margin: 12, borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  doneBtnText: { color: theme.text, fontWeight: '700', fontSize: 15 },
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12,
  },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: theme.bg, color: theme.text,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: theme.border,
  },
  btn:    { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
