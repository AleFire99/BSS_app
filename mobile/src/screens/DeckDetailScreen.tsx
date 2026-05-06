import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDeck, getCards, addCardToDeck, removeCardFromDeck, updateDeck, updateCardCount } from '../api';
import { Feather } from '@expo/vector-icons';
import HandTester from '../components/HandTester';
import SwipeableRow from '../components/SwipeableRow';
import { Card, Deck, DeckCard } from '../types';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

export default function DeckDetailScreen({ route, navigation }: Props) {
  const { deckId } = route.params;

  const [deck, setDeck]         = useState<(Deck & { cards: DeckCard[] }) | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addMode, setAddMode]   = useState(false);
  const [search, setSearch]     = useState('');
  const [editName, setEditName] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [handTester, setHandTester] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Card swipe-delete flow
  const [collapsingCardId, setCollapsingCardId]   = useState<string | null>(null);
  const [undoCard, setUndoCard]                   = useState<{ dc: DeckCard; index: number } | null>(null);
  const [showCardToast, setShowCardToast]         = useState(false);
  const pendingCardDeleteRef = useRef<{ dc: DeckCard; index: number } | null>(null);
  const cardDeleteTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardToastAnim        = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.spring(cardToastAnim, { toValue: showCardToast ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [showCardToast, cardToastAnim]);

  const cardMap = React.useMemo(
    () => Object.fromEntries(allCards.map(c => [c.id, c])),
    [allCards]
  );

  const getDeckCount = (cardId: string) =>
    deck?.cards?.find(dc => dc.card_id === cardId)?.count ?? 0;

  const filteredAdd = React.useMemo(() => {
    if (!search) return [];
    return allCards.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30);
  }, [allCards, search]);

  const handleAdd = async (cardId: string) => {
    try { await addCardToDeck(deckId, cardId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDecrement = async (cardId: string, currentCount: number) => {
    try {
      if (currentCount <= 1) await removeCardFromDeck(deckId, cardId);
      else await updateCardCount(deckId, cardId, currentCount - 1);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    try { await updateDeck(deckId, { name: editName.trim() }); setEditModal(false); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ── Card swipe-delete ─────────────────────────────────────────────────────────

  const handleCardDeletePress = useCallback((dc: DeckCard) => {
    const idx = deck?.cards?.findIndex(c => c.card_id === dc.card_id) ?? -1;
    pendingCardDeleteRef.current = { dc, index: idx };
    setCollapsingCardId(dc.card_id);
  }, [deck]);

  const handleCardCollapseEnd = useCallback(() => {
    const item = pendingCardDeleteRef.current;
    if (!item) return;
    pendingCardDeleteRef.current = null;
    setCollapsingCardId(null);
    setDeck(prev => prev ? {
      ...prev,
      cards: prev.cards?.filter(c => c.card_id !== item.dc.card_id) ?? [],
      card_count: Math.max(0, prev.card_count - item.dc.count),
    } : null);
    setUndoCard(item);
    setShowCardToast(true);

    if (cardDeleteTimerRef.current) clearTimeout(cardDeleteTimerRef.current);
    cardDeleteTimerRef.current = setTimeout(() => {
      removeCardFromDeck(deckId, item.dc.card_id).catch(e => Alert.alert('Error', e.message));
      setUndoCard(null);
      setShowCardToast(false);
      cardDeleteTimerRef.current = null;
    }, 4500);
  }, [deckId]);

  const handleCardUndo = () => {
    if (cardDeleteTimerRef.current) { clearTimeout(cardDeleteTimerRef.current); cardDeleteTimerRef.current = null; }
    setShowCardToast(false);
    if (undoCard) {
      setDeck(prev => {
        if (!prev) return prev;
        const next = [...(prev.cards ?? [])];
        next.splice(Math.min(undoCard.index, next.length), 0, undoCard.dc);
        return { ...prev, cards: next, card_count: prev.card_count + undoCard.dc.count };
      });
      setUndoCard(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading || !deck) return (
    <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>
  );

  const cardToastTranslate = cardToastAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  const renderCardRow = (dc: DeckCard, card: Card, swipeable = false) => {
    const row = (
      <View style={styles.cardBlock}>
        <TouchableOpacity
          style={styles.cardBlockTouchable}
          onPress={() => navigation.navigate('CardDetail', { card })}
          activeOpacity={0.75}
        >
          <Image
            source={{ uri: `https://www.bssdb.dev/cards/bss/${dc.card_id}.png` }}
            style={styles.cardBlockImage}
            resizeMode="contain"
          />
          <View style={styles.cardBlockInfo}>
            <Text style={styles.cardBlockName} numberOfLines={1}>{card.name}</Text>
            <View style={styles.cardBlockMeta}>
              <Text style={styles.cardBlockMetaText}>⬡ {card.cost}</Text>
              <Text style={styles.cardBlockMetaText}>{card.rarity}</Text>
            </View>
            <Text style={styles.cardBlockSub} numberOfLines={1}>{card.type} · {card.id}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.cardBlockQty}>
          <TouchableOpacity
            onPress={() => handleDecrement(dc.card_id, dc.count)}
            disabled={dc.count === 0}
            style={[styles.qtyBtn, dc.count === 0 && styles.qtyBtnDisabled]}
          >
            <Text style={[styles.qtyBtnText, dc.count === 0 && styles.qtyBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>×{dc.count}</Text>
          <TouchableOpacity
            onPress={() => handleAdd(dc.card_id)}
            disabled={dc.count >= 4}
            style={[styles.qtyBtn, dc.count >= 4 && styles.qtyBtnDisabled]}
          >
            <Text style={[styles.qtyBtnText, dc.count >= 4 && styles.qtyBtnTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (!swipeable) return row;

    return (
      <SwipeableRow
        borderRadius={8}
        onDeletePress={() => handleCardDeletePress(dc)}
        collapsing={collapsingCardId === dc.card_id}
        onCollapseEnd={handleCardCollapseEnd}
      >
        {row}
      </SwipeableRow>
    );
  };

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
        <TouchableOpacity
          onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
          style={styles.statsBtn}
        >
          <Feather name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={theme.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setEditName(deck.name); setEditModal(true); }}
          style={styles.statsBtn}
        >
          <Feather name="edit-2" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {deck.card_count > 0 && (
        <View style={styles.deckStatsBadges}>
          <View style={styles.deckStatsBadge}>
            <Text style={styles.deckStatsBadgeLabel}>Avg Cost</Text>
            <Text style={styles.deckStatsBadgeValue}>⬡ {deck.avg_cost}</Text>
          </View>
          <View style={styles.deckStatsDivider} />
          <View style={styles.deckStatsBadge}>
            <Text style={styles.deckStatsBadgeLabel}>Spirit</Text>
            <Text style={styles.deckStatsBadgeValue}>{deck.type_counts?.['SPIRIT'] ?? 0}</Text>
          </View>
          <View style={styles.deckStatsDivider} />
          <View style={styles.deckStatsBadge}>
            <Text style={styles.deckStatsBadgeLabel}>Magic</Text>
            <Text style={styles.deckStatsBadgeValue}>{deck.type_counts?.['MAGIC'] ?? 0}</Text>
          </View>
          <View style={styles.deckStatsDivider} />
          <View style={styles.deckStatsBadge}>
            <Text style={styles.deckStatsBadgeLabel}>Nexus</Text>
            <Text style={styles.deckStatsBadgeValue}>{deck.type_counts?.['NEXUS'] ?? 0}</Text>
          </View>
        </View>
      )}

      {addMode ? (
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
            renderItem={({ item }) => renderCardRow({ card_id: item.id, count: getDeckCount(item.id) }, item, false)}
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
        <View style={styles.flex}>
          {viewMode === 'list' ? (
            <FlatList
              key="list"
              data={deck.cards}
              keyExtractor={dc => dc.card_id}
              renderItem={({ item }) => {
                const card = cardMap[item.card_id];
                if (!card) return null;
                return renderCardRow(item, card, true);
              }}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              ListEmptyComponent={<Text style={styles.empty}>Deck is empty. Add cards!</Text>}
              contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 12, paddingTop: 8 }}
            />
          ) : (
            <FlatList
              key="grid"
              data={deck.cards}
              keyExtractor={dc => dc.card_id}
              numColumns={3}
              renderItem={({ item }) => {
                const card = cardMap[item.card_id];
                if (!card) return <View style={styles.gridItem} />;
                return (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CardDetail', { card })}
                    style={styles.gridItem}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: `https://www.bssdb.dev/cards/bss/${item.card_id}.png` }}
                      style={styles.gridImage}
                      resizeMode="contain"
                    />
                    {item.count > 1 && (
                      <View style={styles.gridBadge}>
                        <Text style={styles.gridBadgeText}>×{item.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Deck is empty. Add cards!</Text>}
              contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 8 }}
            />
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.bottomBtn, styles.bottomBtnSecondary, deck.card_count === 0 && styles.bottomBtnDisabled]}
              onPress={() => setHandTester(true)}
              disabled={deck.card_count === 0}
            >
              <Text style={styles.bottomBtnSecondaryText}>Test Hand</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomBtn, styles.bottomBtnPrimary]} onPress={() => setAddMode(true)}>
              <Text style={styles.bottomBtnPrimaryText}>+ Add Card</Text>
            </TouchableOpacity>
          </View>

          {/* Card undo toast */}
          <Animated.View
            style={[styles.toast, { transform: [{ translateY: cardToastTranslate }], opacity: cardToastAnim }]}
            pointerEvents={showCardToast ? 'auto' : 'none'}
          >
            <Text style={styles.toastMsg}>Card removed</Text>
            <TouchableOpacity onPress={handleCardUndo} style={styles.undoBtn}>
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {handTester && (
        <HandTester deck={deck} cardMap={cardMap} onClose={() => setHandTester(false)} />
      )}

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
    backgroundColor: theme.surface, paddingVertical: 8, paddingHorizontal: 12, gap: 8,
  },
  cardCount: { color: theme.accent, fontWeight: '700', fontSize: 14 },
  colorRow:  { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  colorQty:  { color: theme.textMuted, fontSize: 12 },
  statsBtn:  { paddingHorizontal: 10, paddingVertical: 6 },

  deckStatsBadges: {
    flexDirection: 'row', backgroundColor: theme.surface,
    borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 8,
  },
  deckStatsBadge:      { flex: 1, alignItems: 'center', gap: 2 },
  deckStatsBadgeLabel: { color: theme.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  deckStatsBadgeValue: { color: theme.text, fontSize: 15, fontWeight: '700' },
  deckStatsDivider:    { width: 1, backgroundColor: theme.border, marginVertical: 4 },

  cardBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 8,
  },
  cardBlockTouchable: { flex: 1, flexDirection: 'row', padding: 8, gap: 10, alignItems: 'center' },
  cardBlockImage:     { width: 50, height: 70, borderRadius: 4, backgroundColor: theme.border },
  cardBlockInfo:      { flex: 1 },
  cardBlockName:      { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardBlockMeta:      { flexDirection: 'row', gap: 8, marginBottom: 2 },
  cardBlockMetaText:  { color: theme.textMuted, fontSize: 12 },
  cardBlockSub:       { color: theme.textMuted, fontSize: 11 },
  cardBlockQty:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },

  qty:                { color: theme.text, fontSize: 15, fontWeight: '700', minWidth: 26, textAlign: 'center' },
  qtyBtn:             { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDisabled:     { borderColor: theme.border },
  qtyBtnText:         { color: theme.accent, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  qtyBtnTextDisabled: { color: theme.textMuted },

  gridItem:      { width: '33.33%', padding: 3 },
  gridImage:     { width: '100%', height: 150, borderRadius: 4, backgroundColor: theme.border },
  gridBadge:     { position: 'absolute', top: 5, right: 5, backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  search: {
    backgroundColor: theme.surface, color: theme.text,
    borderRadius: 8, margin: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border,
  },
  bottomBtn:              { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  bottomBtnPrimary:       { backgroundColor: theme.accent },
  bottomBtnSecondary:     { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.accent },
  bottomBtnDisabled:      { borderColor: theme.border, opacity: 0.4 },
  bottomBtnPrimaryText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomBtnSecondaryText: { color: theme.accent, fontWeight: '700', fontSize: 15 },

  doneBtn:     { backgroundColor: theme.surface, margin: 12, borderRadius: 8, padding: 14, alignItems: 'center' },
  doneBtnText: { color: theme.text, fontWeight: '700', fontSize: 15 },

  toast: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: '#2a2a2a', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', paddingLeft: 16, height: 48,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  toastMsg:  { flex: 1, color: '#e0e0e0', fontSize: 14 },
  undoBtn:   { paddingHorizontal: 16, paddingVertical: 12 },
  undoText:  { color: theme.accent, fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
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
  btn:     { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
