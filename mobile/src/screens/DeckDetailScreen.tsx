import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Animated, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDeck, getCards, addCardToDeck, removeCardFromDeck, updateDeck, updateCardCount } from '../api';
import { Feather } from '@expo/vector-icons';
import HandTester from '../components/HandTester';
import DeckExportModal from '../components/DeckExportModal';
import SwipeableRow from '../components/SwipeableRow';
import RangeSlider from '../components/RangeSlider';
import { Card, Deck, DeckCard } from '../types';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'White'];
const TYPES  = ['SPIRIT', 'MAGIC', 'NEXUS'];
const TYPE_ORDER: Record<string, number> = { SPIRIT: 0, NEXUS: 1, MAGIC: 2 };
type SortMode = 'type+cost' | 'type+name' | 'type+color';
const SORT_LABELS: Record<SortMode, string> = { 'type+cost': 'Cost', 'type+name': 'Name', 'type+color': 'Color' };
const SORT_CYCLE: SortMode[] = ['type+cost', 'type+name', 'type+color'];

export default function DeckDetailScreen({ route, navigation }: Props) {
  const { deckId } = route.params;

  const [deck, setDeck]           = useState<(Deck & { cards: DeckCard[] }) | null>(null);
  const [allCards, setAllCards]   = useState<Card[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addMode, setAddMode]     = useState(false);
  const [editName, setEditName]   = useState('');
  const [editModal, setEditModal] = useState(false);
  const [handTester, setHandTester] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [viewMode, setViewMode]   = useState<'list' | 'grid'>('list');
  const [sortMode, setSortMode]     = useState<SortMode>('type+cost');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Add card filter states
  const [addSearch,     setAddSearch]     = useState('');
  const [addColors,     setAddColors]     = useState<string[]>([]);
  const [addType,       setAddType]       = useState<string | null>(null);
  const [addRarity,     setAddRarity]     = useState<string | null>(null);
  const [addSet,        setAddSet]        = useState<string | null>(null);
  const [addCostRange,  setAddCostRange]  = useState<[number, number]>([0, 13]);
  const [addSetOpen,    setAddSetOpen]    = useState(false);
  const [addRarityOpen, setAddRarityOpen] = useState(false);
  const [addTypeOpen,   setAddTypeOpen]   = useState(false);

  // Card swipe-delete flow
  const [collapsingCardId, setCollapsingCardId] = useState<string | null>(null);
  const [undoCard, setUndoCard]                 = useState<{ dc: DeckCard; index: number } | null>(null);
  const [showCardToast, setShowCardToast]       = useState(false);
  const pendingCardDeleteRef = useRef<{ dc: DeckCard; index: number } | null>(null);
  const cardDeleteTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardToastAnim        = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    Promise.all([getDeck(deckId), getCards()])
      .then(([d, cards]) => { setDeck(d); setAllCards(cards); })
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [deckId]);

  useEffect(() => { load(); navigation.setOptions({ title: 'Deck' }); }, []);
  useEffect(() => {
    if (!deck) return;
    navigation.setOptions({
      title: deck.name,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => { setEditName(deck.name); setEditModal(true); }}
          style={{ marginRight: 16 }}
        >
          <Feather name="edit-2" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [deck]);
  useEffect(() => {
    Animated.spring(cardToastAnim, { toValue: showCardToast ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [showCardToast, cardToastAnim]);

  const cardMap = useMemo(
    () => Object.fromEntries(allCards.map(c => [c.id, c])),
    [allCards]
  );

  const addSets     = useMemo(() => [...new Set(allCards.map(c => c.set))].sort(), [allCards]);
  const addRarities = useMemo(() => [...new Set(allCards.map(c => c.rarity))].sort(), [allCards]);
  const maxAddCost  = useMemo(() => allCards.length > 0 ? Math.max(...allCards.map(c => c.cost)) : 13, [allCards]);

  const getDeckCount = (cardId: string) =>
    deck?.cards?.find(dc => dc.card_id === cardId)?.count ?? 0;

  const filteredAdd = useMemo(() => {
    return allCards.filter(c => {
      if (addSearch) {
        const lq = addSearch.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(lq);
        const effectMatch = c.effects.some(e =>
          (e.details?.toLowerCase().includes(lq) ?? false) ||
          (e.condition?.toLowerCase().includes(lq) ?? false) ||
          e.keywords.some(kw => kw.name.toLowerCase().includes(lq))
        );
        if (!nameMatch && !effectMatch) return false;
      }
      if (addColors.length > 0 && !addColors.every(col => c.color.includes(col))) return false;
      if (addType   && c.type !== addType)     return false;
      if (addRarity && c.rarity !== addRarity) return false;
      if (addSet    && c.set !== addSet)       return false;
      if (c.cost < addCostRange[0] || c.cost > addCostRange[1]) return false;
      return true;
    });
  }, [allCards, addSearch, addColors, addType, addRarity, addSet, addCostRange]);

  const sortedCards = useMemo(() => {
    const cards = [...(deck?.cards ?? [])];
    return cards.sort((a, b) => {
      const ca = cardMap[a.card_id], cb = cardMap[b.card_id];
      if (!ca || !cb) return 0;
      const tDiff = (TYPE_ORDER[ca.type] ?? 3) - (TYPE_ORDER[cb.type] ?? 3);
      if (tDiff !== 0) return tDiff;
      if (sortMode === 'type+cost') return ca.cost - cb.cost;
      if (sortMode === 'type+name') return ca.name.localeCompare(cb.name);
      if (sortMode === 'type+color') return (ca.color[0] ?? '').localeCompare(cb.color[0] ?? '');
      return 0;
    });
  }, [deck?.cards, cardMap, sortMode]);

  const closeAddMode = () => {
    setAddMode(false);
    setAddSearch(''); setAddColors([]); setAddType(null);
    setAddRarity(null); setAddSet(null); setAddCostRange([0, maxAddCost]);
  };

  const pendingAdds = useRef<Set<string>>(new Set());
  const handleAdd = async (cardId: string) => {
    if (pendingAdds.current.has(cardId)) return;
    pendingAdds.current.add(cardId);
    try { await addCardToDeck(deckId, cardId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { pendingAdds.current.delete(cardId); }
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

  if (loading || !deck) return (
    <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>
  );

  const cardToastTranslate = cardToastAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const addCostActive = addCostRange[0] !== 0 || addCostRange[1] !== maxAddCost;

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
              <View style={styles.colorDots}>
                {card.color.map(c => (
                  <View key={c} style={[styles.colorDot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
                ))}
              </View>
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
          {Object.entries(deck.colors).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
            <View key={c} style={styles.colorChip}>
              <View style={[styles.dot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
              <Text style={styles.colorQty}>{n}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => setSortMenuOpen(true)} style={styles.statsBtn}>
          <Feather name="sliders" size={18} color={theme.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} style={styles.statsBtn}>
          <Feather name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={theme.accent} />
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
          {/* Search */}
          <View style={styles.addSearchWrap}>
            <TextInput
              style={styles.search}
              placeholder="Search name, effects, keywords…"
              placeholderTextColor={theme.textMuted}
              value={addSearch}
              onChangeText={setAddSearch}
              autoFocus
            />
            {addSearch.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setAddSearch('')}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter toolbar */}
          <View style={styles.addToolbar}>
            <TouchableOpacity
              style={[styles.filterBtn, !!addSet && styles.filterBtnActive]}
              onPress={() => setAddSetOpen(true)}
            >
              <Text style={[styles.filterBtnText, !!addSet && styles.filterBtnTextActive]} numberOfLines={1}>
                {addSet ?? 'Set'} ▾
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, !!addRarity && styles.filterBtnActive]}
              onPress={() => setAddRarityOpen(true)}
            >
              <Text style={[styles.filterBtnText, !!addRarity && styles.filterBtnTextActive]} numberOfLines={1}>
                {addRarity ?? 'Rarity'} ▾
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, !!addType && styles.filterBtnActive]}
              onPress={() => setAddTypeOpen(true)}
            >
              <Text style={[styles.filterBtnText, !!addType && styles.filterBtnTextActive]} numberOfLines={1}>
                {addType ?? 'Type'} ▾
              </Text>
            </TouchableOpacity>
          </View>

          {/* Color gems */}
          <View style={styles.gemRow}>
            {COLORS.map(c => {
              const active = addColors.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setAddColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  activeOpacity={0.75}
                >
                  <View style={[styles.gem, { backgroundColor: COLOR_MAP[c] }, active && styles.gemActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cost slider */}
          <View style={styles.costSection}>
            <Text style={[styles.costLabel, addCostActive && styles.costLabelActive]}>
              Cost: {addCostRange[0]} – {addCostRange[1]}
            </Text>
            <RangeSlider min={0} max={maxAddCost} values={addCostRange} onChange={setAddCostRange} />
          </View>

          <Text style={styles.addCount}>{filteredAdd.length} cards</Text>

          <FlatList
            data={filteredAdd}
            keyExtractor={c => c.id}
            renderItem={({ item }) => renderCardRow({ card_id: item.id, count: getDeckCount(item.id) }, item, false)}
            ListEmptyComponent={<Text style={styles.empty}>No cards match filters</Text>}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews
          />

          <TouchableOpacity style={styles.fab} onPress={closeAddMode}>
            <Feather name="check" size={22} color="#000" />
          </TouchableOpacity>

          {/* Picker modals */}
          <Modal visible={addSetOpen} transparent animationType="fade">
            <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setAddSetOpen(false)} />
            <View style={styles.pickerCenteredWrap} pointerEvents="box-none">
              <View style={styles.pickerSheet}>
                <Text style={styles.pickerTitle}>Select Set</Text>
                <ScrollView>
                  <TouchableOpacity style={styles.pickerRow} onPress={() => { setAddSet(null); setAddSetOpen(false); }}>
                    <Text style={[styles.pickerRowText, !addSet && styles.pickerRowSelected]}>All Sets</Text>
                  </TouchableOpacity>
                  {addSets.map(s => (
                    <TouchableOpacity key={s} style={styles.pickerRow} onPress={() => { setAddSet(s); setAddSetOpen(false); }}>
                      <Text style={[styles.pickerRowText, addSet === s && styles.pickerRowSelected]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal visible={addRarityOpen} transparent animationType="fade">
            <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setAddRarityOpen(false)} />
            <View style={styles.pickerCenteredWrap} pointerEvents="box-none">
              <View style={styles.pickerSheet}>
                <Text style={styles.pickerTitle}>Select Rarity</Text>
                <ScrollView>
                  <TouchableOpacity style={styles.pickerRow} onPress={() => { setAddRarity(null); setAddRarityOpen(false); }}>
                    <Text style={[styles.pickerRowText, !addRarity && styles.pickerRowSelected]}>All Rarities</Text>
                  </TouchableOpacity>
                  {addRarities.map(r => (
                    <TouchableOpacity key={r} style={styles.pickerRow} onPress={() => { setAddRarity(r); setAddRarityOpen(false); }}>
                      <Text style={[styles.pickerRowText, addRarity === r && styles.pickerRowSelected]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal visible={addTypeOpen} transparent animationType="fade">
            <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setAddTypeOpen(false)} />
            <View style={styles.pickerCenteredWrap} pointerEvents="box-none">
              <View style={styles.pickerSheet}>
                <Text style={styles.pickerTitle}>Select Type</Text>
                <ScrollView>
                  <TouchableOpacity style={styles.pickerRow} onPress={() => { setAddType(null); setAddTypeOpen(false); }}>
                    <Text style={[styles.pickerRowText, !addType && styles.pickerRowSelected]}>All Types</Text>
                  </TouchableOpacity>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t} style={styles.pickerRow} onPress={() => { setAddType(t); setAddTypeOpen(false); }}>
                      <Text style={[styles.pickerRowText, addType === t && styles.pickerRowSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <View style={styles.flex}>
          {viewMode === 'list' ? (
            <FlatList
              key="list"
              data={sortedCards}
              keyExtractor={dc => dc.card_id}
              renderItem={({ item }) => {
                const card = cardMap[item.card_id];
                if (!card) return null;
                return renderCardRow(item, card, true);
              }}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              ListEmptyComponent={<Text style={styles.empty}>Deck is empty. Add cards!</Text>}
              contentContainerStyle={{ paddingBottom: 200, paddingHorizontal: 12, paddingTop: 8 }}
            />
          ) : (
            <FlatList
              key="grid"
              data={sortedCards}
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
              contentContainerStyle={{ paddingBottom: 200, paddingHorizontal: 8 }}
            />
          )}

          <TouchableOpacity style={styles.fab} onPress={() => setAddMode(true)}>
            <Feather name="plus" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabSecondary, { bottom: 100, right: 26 }, deck.card_count === 0 && styles.fabDisabled]}
            onPress={() => setExportModal(true)}
            disabled={deck.card_count === 0}
          >
            <Feather name="upload" size={20} color={deck.card_count === 0 ? theme.textMuted : theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabSecondary, { bottom: 152, right: 26 }, deck.card_count === 0 && styles.fabDisabled]}
            onPress={() => setHandTester(true)}
            disabled={deck.card_count === 0}
          >
            <Feather name="layers" size={20} color={deck.card_count === 0 ? theme.textMuted : theme.accent} />
          </TouchableOpacity>

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

      <DeckExportModal
        visible={exportModal}
        deck={deck}
        cardMap={cardMap}
        onClose={() => setExportModal(false)}
      />

      {/* Sort dropdown */}
      <Modal visible={sortMenuOpen} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortMenuOpen(false)} />
        <View style={styles.sortMenuWrap} pointerEvents="box-none">
          <View style={styles.sortMenu}>
            <Text style={styles.sortMenuTitle}>Sort by</Text>
            {SORT_CYCLE.map(mode => (
              <TouchableOpacity
                key={mode}
                style={styles.sortMenuRow}
                onPress={() => { setSortMode(mode); setSortMenuOpen(false); }}
              >
                <Text style={[styles.sortMenuText, sortMode === mode && styles.sortMenuTextActive]}>
                  {SORT_LABELS[mode]}
                </Text>
                {sortMode === mode && <Feather name="check" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Rename deck modal — keyboard-aware */}
      <Modal visible={editModal} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setEditModal(false)} />
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
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
        </KeyboardAvoidingView>
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

  sortMenuWrap: { ...StyleSheet.absoluteFillObject },
  sortMenu: {
    position: 'absolute', top: 90, right: 12,
    backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 4,
    minWidth: 150, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  sortMenuTitle: {
    color: theme.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  sortMenuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  sortMenuText:       { color: theme.text, fontSize: 14 },
  sortMenuTextActive: { color: theme.accent, fontWeight: '700' },

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
  cardBlockMeta:      { flexDirection: 'row', gap: 8, marginBottom: 2, alignItems: 'center' },
  cardBlockMetaText:  { color: theme.textMuted, fontSize: 12 },
  cardBlockSub:       { color: theme.textMuted, fontSize: 11 },
  cardBlockQty:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  colorDots:          { flexDirection: 'row', gap: 3, alignItems: 'center' },
  colorDot:           { width: 10, height: 10, borderRadius: 5 },

  qty:                { color: theme.text, fontSize: 15, fontWeight: '700', minWidth: 26, textAlign: 'center' },
  qtyBtn:             { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDisabled:     { borderColor: theme.border },
  qtyBtnText:         { color: theme.accent, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  qtyBtnTextDisabled: { color: theme.textMuted },

  gridItem:      { width: '33.33%', padding: 3 },
  gridImage:     { width: '100%', height: 150, borderRadius: 4, backgroundColor: theme.border },
  gridBadge:     { position: 'absolute', top: 5, right: 5, backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  addSearchWrap:       { marginHorizontal: 12, marginTop: 8, marginBottom: 6, position: 'relative' },
  addToolbar:          { flexDirection: 'row', marginHorizontal: 12, marginBottom: 6, gap: 8 },
  addCount:            { color: theme.textMuted, fontSize: 11, marginLeft: 14, marginBottom: 4 },
  search: {
    backgroundColor: theme.surface, color: theme.text,
    borderRadius: 8, paddingHorizontal: 12, paddingRight: 36,
    paddingVertical: 8, fontSize: 14,
  },
  clearBtn:            { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  clearText:           { color: theme.textMuted, fontSize: 15 },
  filterBtn:           { flex: 1, backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  filterBtnActive:     { backgroundColor: theme.accent },
  filterBtnText:       { color: theme.textMuted, fontSize: 13 },
  filterBtnTextActive: { color: '#fff', fontWeight: '700' },
  gemRow:              { flexDirection: 'row', gap: 12, paddingHorizontal: 14, marginBottom: 8, alignItems: 'center' },
  gem:                 { width: 28, height: 28, borderRadius: 14, opacity: 0.45 },
  gemActive:           { opacity: 1, borderWidth: 2.5, borderColor: '#fff' },
  costSection:         { marginHorizontal: 12, marginBottom: 6 },
  costLabel:           { color: theme.textMuted, fontSize: 11, marginBottom: 6 },
  costLabelActive:     { color: theme.accent },

  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  fab: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent, right: 20, bottom: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabSecondary: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.accent,
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  fabDisabled: { borderColor: theme.border, opacity: 0.4 },

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

  sheet: {
    backgroundColor: theme.surface,
    borderRadius: 16,
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

  pickerCenteredWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  pickerSheet:       { width: '90%', maxHeight: '70%', backgroundColor: theme.surface, borderRadius: 16, padding: 20 },
  pickerTitle:       { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerRow:         { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border },
  pickerRowText:     { color: theme.text, fontSize: 14 },
  pickerRowSelected: { fontWeight: '700', color: theme.accent },
});
