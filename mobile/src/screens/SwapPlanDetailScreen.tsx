import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Modal, Pressable, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  getSwapPlan, getDeck, getCard, addCardToSwapPlan, removeCardFromSwapPlan, updateSwapPlanCardCount,
  updateSwapPlan,
} from '../api';
import { cardsDb } from '../db/init';
import { SwapPlan, SwapPlanCard, DeckCard, Card, Deck } from '../types';
import HandTester from '../components/HandTester';
import { theme, COLOR_MAP } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SwapPlanDetail'>;

const TYPE_ORDER: Record<string, number> = { SPIRIT: 0, NEXUS: 1, MAGIC: 2 };

export default function SwapPlanDetailScreen({ route, navigation }: Props) {
  const { planId, deckId, deckName } = route.params;

  const [plan, setPlan]           = useState<SwapPlan | null>(null);
  const [mainCards, setMainCards] = useState<DeckCard[]>([]);
  const [sideCards, setSideCards] = useState<DeckCard[]>([]);
  const [deckObj, setDeckObj]     = useState<(Deck & { cards: DeckCard[]; sideboard: DeckCard[] }) | null>(null);
  const [allCardMeta, setAllCardMeta] = useState<Record<string, Card>>({});
  const [loading, setLoading]     = useState(true);

  // Rename modal
  const [renameModal, setRenameModal] = useState(false);
  const [renameName, setRenameName]   = useState('');

  // Preview mode state
  const [previewMode, setPreviewMode]       = useState(false);
  const [previewSection, setPreviewSection] = useState<'main' | 'sideboard'>('main');
  const [viewMode, setViewMode]             = useState<'list' | 'grid'>('list');
  const [handTester, setHandTester]         = useState(false);

  // Card picker state
  const [pickerVisible, setPickerVisible]     = useState(false);
  const [pickerDirection, setPickerDirection] = useState<'out' | 'in'>('out');

  const load = useCallback(async () => {
    try {
      const [p, deck] = await Promise.all([getSwapPlan(planId), getDeck(deckId)]);
      setPlan(p);
      setDeckObj(deck);
      setMainCards(deck.cards ?? []);
      setSideCards(deck.sideboard ?? []);

      // Build card meta: start from hydrated plan cards
      const meta: Record<string, Card> = {};
      for (const spc of p.cards) {
        if (spc.card) meta[spc.card_id] = spc.card;
      }

      // Fetch metadata for all deck card IDs not yet in meta
      const allIds = [...new Set([
        ...(deck.cards ?? []).map(dc => dc.card_id),
        ...(deck.sideboard ?? []).map(dc => dc.card_id),
      ])];
      const missing = allIds.filter(id => !meta[id]);
      if (missing.length > 0) {
        const placeholders = missing.map(() => '?').join(',');
        const rows = await cardsDb.getAllAsync<{
          CardID: string; Name: string; Cost: number; type: string;
          colors: string | null; Rarity: string;
        }>(
          `SELECT c.CardID, c.Name, c.Cost, c.Rarity, ct.Name AS type,
             (SELECT GROUP_CONCAT(col.Name,'|') FROM CardColors cc
              JOIN Colors col ON cc.ColorID=col.ColorID WHERE cc.CardID=c.CardID) AS colors
           FROM Cards c JOIN CardTypes ct ON c.TypeID=ct.TypeID
           WHERE c.CardID IN (${placeholders})`,
          missing,
        );
        for (const r of rows) {
          meta[r.CardID] = {
            id: r.CardID, name: r.Name, type: r.type, set: '', cost: r.Cost,
            rarity: r.Rarity, color: r.colors ? r.colors.split('|') : [],
            subtypes: [], symbols: [], core: [], effects: [], alt_art_ids: [],
          };
        }
      }
      setAllCardMeta(meta);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [planId, deckId]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!plan) return;
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() => { setRenameName(plan.name); setRenameModal(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
            {plan.name}
          </Text>
          <Feather name="edit-2" size={13} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => setPreviewMode(p => !p)} style={{ padding: 8, marginRight: 4 }}>
          <Feather name={previewMode ? 'edit-2' : 'eye'} size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [plan?.name, previewMode]);

  const outCards = useMemo(() => plan?.cards.filter(c => c.direction === 'out') ?? [], [plan]);
  const inCards  = useMemo(() => plan?.cards.filter(c => c.direction === 'in')  ?? [], [plan]);

  const netChange = useMemo(
    () => inCards.reduce((s, c) => s + c.count, 0) - outCards.reduce((s, c) => s + c.count, 0),
    [inCards, outCards],
  );

  // ── Preview computation ───────────────────────────────────────────────────

  const previewMain = useMemo(() => {
    const map = new Map(mainCards.map(dc => [dc.card_id, { ...dc }]));
    for (const spc of outCards) {
      const ex = map.get(spc.card_id);
      if (ex) {
        const n = ex.count - spc.count;
        n <= 0 ? map.delete(spc.card_id) : map.set(spc.card_id, { ...ex, count: n });
      }
    }
    for (const spc of inCards) {
      const ex = map.get(spc.card_id);
      ex
        ? map.set(spc.card_id, { ...ex, count: ex.count + spc.count })
        : map.set(spc.card_id, { card_id: spc.card_id, count: spc.count, section: 'main' });
    }
    return [...map.values()];
  }, [mainCards, outCards, inCards]);

  const previewSide = useMemo(() => {
    const map = new Map(sideCards.map(dc => [dc.card_id, { ...dc }]));
    for (const spc of inCards) {
      const ex = map.get(spc.card_id);
      if (ex) {
        const n = ex.count - spc.count;
        n <= 0 ? map.delete(spc.card_id) : map.set(spc.card_id, { ...ex, count: n });
      }
    }
    for (const spc of outCards) {
      const ex = map.get(spc.card_id);
      ex
        ? map.set(spc.card_id, { ...ex, count: ex.count + spc.count })
        : map.set(spc.card_id, { card_id: spc.card_id, count: spc.count, section: 'sideboard' });
    }
    return [...map.values()];
  }, [sideCards, outCards, inCards]);

  const sortedPreview = useMemo(() => {
    const arr = previewSection === 'main' ? previewMain : previewSide;
    return [...arr].sort((a, b) => {
      const ca = allCardMeta[a.card_id], cb = allCardMeta[b.card_id];
      if (!ca || !cb) return 0;
      const t = (TYPE_ORDER[ca.type] ?? 3) - (TYPE_ORDER[cb.type] ?? 3);
      if (t !== 0) return t;
      return ca.cost - cb.cost;
    });
  }, [previewSection, previewMain, previewSide, allCardMeta]);

  const previewMainCount = previewMain.reduce((s, dc) => s + dc.count, 0);
  const previewSideCount = previewSide.reduce((s, dc) => s + dc.count, 0);

  // ── Picker ────────────────────────────────────────────────────────────────

  const pickerCandidates = useMemo(() => {
    if (pickerDirection === 'out') {
      const alreadyOut = new Set(outCards.map(c => c.card_id));
      return mainCards.filter(dc => !alreadyOut.has(dc.card_id));
    } else {
      const alreadyIn = new Set(inCards.map(c => c.card_id));
      return sideCards.filter(dc => !alreadyIn.has(dc.card_id));
    }
  }, [pickerDirection, mainCards, sideCards, outCards, inCards]);

  const handleAddFromPicker = async (dc: DeckCard) => {
    setPickerVisible(false);
    try {
      await addCardToSwapPlan(planId, dc.card_id, pickerDirection, dc.count);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const navigateToCard = async (cardId: string) => {
    try {
      const card = await getCard(cardId);
      navigation.navigate('CardDetail', { card });
    } catch {}
  };

  const handleRenamePlan = async () => {
    if (!renameName.trim() || !plan) return;
    try {
      await updateSwapPlan(plan.id, { name: renameName.trim() });
      setRenameModal(false);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRemove = async (spc: SwapPlanCard) => {
    try {
      await removeCardFromSwapPlan(planId, spc.card_id, spc.direction);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCountChange = async (spc: SwapPlanCard, delta: number) => {
    const sourceCards = spc.direction === 'out' ? mainCards : sideCards;
    const sourceDc = sourceCards.find(dc => dc.card_id === spc.card_id);
    const maxCount = sourceDc?.count ?? 4;
    const newCount = Math.max(1, Math.min(maxCount, spc.count + delta));
    if (newCount === spc.count) return;
    try {
      await updateSwapPlanCardCount(planId, spc.card_id, spc.direction, newCount);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderPlanCard = (spc: SwapPlanCard) => {
    const card = spc.card ?? allCardMeta[spc.card_id];
    const sourceCards = spc.direction === 'out' ? mainCards : sideCards;
    const sourceDc = sourceCards.find(dc => dc.card_id === spc.card_id);
    const maxCount = sourceDc?.count ?? 4;

    return (
      <View key={`${spc.card_id}-${spc.direction}`} style={styles.cardRow}>
        <Image
          source={{ uri: `https://www.bssdb.dev/cards/bss/${spc.card_id}.png` }}
          style={styles.cardImage}
          resizeMode="contain"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card?.name ?? spc.card_id}
          </Text>
          {card && (
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>⬡ {card.cost}</Text>
              {card.color.map(c => (
                <View key={c} style={[styles.colorDot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
              ))}
              <Text style={styles.cardMetaText}>{card.type}</Text>
            </View>
          )}
        </View>
        <View style={styles.countRow}>
          <TouchableOpacity
            onPress={() => handleCountChange(spc, -1)}
            disabled={spc.count <= 1}
            style={[styles.qtyBtn, spc.count <= 1 && styles.qtyBtnDisabled]}
          >
            <Text style={[styles.qtyBtnText, spc.count <= 1 && styles.qtyBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>×{spc.count}</Text>
          <TouchableOpacity
            onPress={() => handleCountChange(spc, 1)}
            disabled={spc.count >= maxCount}
            style={[styles.qtyBtn, spc.count >= maxCount && styles.qtyBtnDisabled]}
          >
            <Text style={[styles.qtyBtnText, spc.count >= maxCount && styles.qtyBtnTextDisabled]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleRemove(spc)} style={styles.removeBtn}>
            <Feather name="x" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPreviewListRow = (dc: DeckCard) => {
    const card = allCardMeta[dc.card_id];
    return (
      <TouchableOpacity
        key={dc.card_id}
        style={styles.previewRow}
        onPress={() => navigateToCard(dc.card_id)}
        activeOpacity={0.75}
      >
        <Image
          source={{ uri: `https://www.bssdb.dev/cards/bss/${dc.card_id}.png` }}
          style={styles.cardImage}
          resizeMode="contain"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card?.name ?? dc.card_id}
          </Text>
          {card && (
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>⬡ {card.cost}</Text>
              {card.color.map(c => (
                <View key={c} style={[styles.colorDot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
              ))}
              <Text style={styles.cardMetaText}>{card.type}</Text>
            </View>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>×{dc.count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPickerRow = (dc: DeckCard) => {
    const cardMeta = allCardMeta[dc.card_id];
    return (
      <TouchableOpacity
        key={dc.card_id}
        style={styles.pickerRow}
        onPress={() => handleAddFromPicker(dc)}
        activeOpacity={0.75}
      >
        <Image
          source={{ uri: `https://www.bssdb.dev/cards/bss/${dc.card_id}.png` }}
          style={styles.pickerImage}
          resizeMode="contain"
        />
        <View style={styles.pickerInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {cardMeta?.name ?? dc.card_id}
          </Text>
          {cardMeta && (
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>⬡ {cardMeta.cost}</Text>
              {cardMeta.color.map(c => (
                <View key={c} style={[styles.colorDot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
              ))}
            </View>
          )}
          <Text style={styles.cardMetaText}>×{dc.count} in {dc.section}</Text>
        </View>
        <Feather name="plus" size={18} color={theme.accent} />
      </TouchableOpacity>
    );
  };

  if (loading || !plan) return (
    <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>
  );

  const baseMainCount = mainCards.reduce((s, dc) => s + dc.count, 0);
  const finalMainCount = baseMainCount + netChange;
  const deckOutOfRange = netChange !== 0 && (finalMainCount < 50 || finalMainCount > 60);

  const netChangeDesc = netChange === 0
    ? 'Deck size unchanged'
    : netChange > 0
      ? `Deck grows by ${netChange}`
      : `Deck shrinks by ${Math.abs(netChange)}`;

  // ── Preview view ──────────────────────────────────────────────────────────

  const renameModalEl = (
    <Modal visible={renameModal} transparent animationType="fade">
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        onPress={() => setRenameModal(false)}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <View style={styles.renameSheet}>
          <Text style={styles.renameTitle}>Rename Plan</Text>
          <TextInput
            style={styles.renameInput}
            value={renameName}
            onChangeText={setRenameName}
            placeholderTextColor={theme.textMuted}
            autoFocus
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.renameBtn} onPress={handleRenamePlan} disabled={!renameName.trim()}>
            <Text style={styles.renameBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (previewMode) {
    return (
      <>
      <View style={styles.container}>
        {/* Stats line */}
        <View style={styles.previewStatsBar}>
          <Text style={styles.previewStatsText}>
            {previewMainCount} main · {previewSideCount} sideboard
          </Text>
          <TouchableOpacity onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} style={styles.viewToggle}>
            <Feather name={viewMode === 'list' ? 'grid' : 'list'} size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Section tabs */}
        <View style={styles.sectionToggle}>
          <TouchableOpacity
            style={[styles.sectionTab, previewSection === 'main' && styles.sectionTabActive]}
            onPress={() => setPreviewSection('main')}
          >
            <Text style={[styles.sectionTabText, previewSection === 'main' && styles.sectionTabTextActive]}>
              Main ({previewMainCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, previewSection === 'sideboard' && styles.sectionTabActive]}
            onPress={() => setPreviewSection('sideboard')}
          >
            <Text style={[styles.sectionTabText, previewSection === 'sideboard' && styles.sectionTabTextActive]}>
              Sideboard ({previewSideCount})
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'list' ? (
          <FlatList
            key="list"
            data={sortedPreview}
            keyExtractor={dc => dc.card_id}
            renderItem={({ item }) => renderPreviewListRow(item)}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            ListEmptyComponent={<Text style={styles.empty}>No cards in this section after plan</Text>}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 40 }}
          />
        ) : (
          <FlatList
            key="grid"
            data={sortedPreview}
            keyExtractor={dc => dc.card_id}
            numColumns={3}
            renderItem={({ item }) => {
              const card = allCardMeta[item.card_id];
              if (!card) return <View style={styles.gridItem} />;
              return (
                <TouchableOpacity
                  style={styles.gridItem}
                  onPress={() => navigateToCard(item.card_id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `https://www.bssdb.dev/cards/bss/${item.card_id}.png` }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  {item.count > 1 && (
                    <View style={styles.gridBadge}>
                      <Text style={styles.gridBadgeText}>×{item.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No cards in this section after plan</Text>}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40 }}
          />
        )}
        <TouchableOpacity
          style={[styles.fabSecondary, previewMain.length === 0 && styles.fabDisabled]}
          onPress={() => setHandTester(true)}
          disabled={previewMain.length === 0}
        >
          <Feather name="layers" size={20} color={previewMain.length === 0 ? theme.border : theme.accent} />
        </TouchableOpacity>
      </View>
      {handTester && deckObj && (
        <HandTester
          deck={{ ...deckObj, cards: previewMain }}
          cardMap={allCardMeta}
          onClose={() => setHandTester(false)}
        />
      )}
      {renameModalEl}
      </>
    );
  }

  // ── Edit view ─────────────────────────────────────────────────────────────

  return (
    <>
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Net change hint */}
        {(outCards.length > 0 || inCards.length > 0) && (
          <View style={styles.netRow}>
            <Feather
              name={deckOutOfRange ? 'alert-triangle' : netChange === 0 ? 'check-circle' : 'info'}
              size={14}
              color={deckOutOfRange ? '#ef5350' : netChange === 0 ? '#4caf50' : theme.textMuted}
            />
            <Text style={[styles.netText, deckOutOfRange ? styles.netTextWarn : netChange === 0 && styles.netTextOk]}>
              {netChangeDesc}{' '}
              <Text style={[styles.netCount, deckOutOfRange && styles.netTextWarn]}>
                → {finalMainCount} cards
              </Text>
            </Text>
          </View>
        )}

        {/* Remove section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Remove from Main</Text>
            <Text style={styles.sectionCount}>{outCards.length} cards</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setPickerDirection('out'); setPickerVisible(true); }}
              disabled={mainCards.length === 0}
            >
              <Feather name="plus" size={16} color={mainCards.length === 0 ? theme.textMuted : theme.accent} />
            </TouchableOpacity>
          </View>
          {outCards.length === 0 ? (
            <Text style={styles.emptySec}>No cards selected to remove</Text>
          ) : (
            outCards.map(renderPlanCard)
          )}
        </View>

        {/* Add section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add from Sideboard</Text>
            <Text style={styles.sectionCount}>{inCards.length} cards</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setPickerDirection('in'); setPickerVisible(true); }}
              disabled={sideCards.length === 0}
            >
              <Feather name="plus" size={16} color={sideCards.length === 0 ? theme.textMuted : theme.accent} />
            </TouchableOpacity>
          </View>
          {inCards.length === 0 ? (
            <Text style={styles.emptySec}>
              {sideCards.length === 0
                ? 'Sideboard is empty — add cards to sideboard first'
                : 'No cards selected to bring in'}
            </Text>
          ) : (
            inCards.map(renderPlanCard)
          )}
        </View>
      </ScrollView>

      {/* Card picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={() => setPickerVisible(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>
              {pickerDirection === 'out' ? 'Remove from Main' : 'Add from Sideboard'}
            </Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={{ padding: 4 }}>
              <Feather name="x" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          {pickerCandidates.length === 0 ? (
            <Text style={[styles.emptySec, { padding: 24, textAlign: 'center' }]}>
              {pickerDirection === 'out'
                ? 'All main deck cards already in plan'
                : 'All sideboard cards already in plan'}
            </Text>
          ) : (
            <FlatList
              data={pickerCandidates}
              keyExtractor={dc => dc.card_id}
              renderItem={({ item }) => renderPickerRow(item)}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </Modal>
    </View>
    {renameModalEl}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty:     { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  netRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  netText:     { color: theme.textMuted, fontSize: 12 },
  netTextOk:   { color: '#4caf50' },
  netTextWarn: { color: '#ef5350' },
  netCount:    { color: theme.text, fontWeight: '700', fontSize: 12 },

  section: {
    marginTop: 16, marginHorizontal: 12,
    backgroundColor: theme.surface, borderRadius: 10, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  sectionTitle: { flex: 1, color: theme.text, fontSize: 14, fontWeight: '700' },
  sectionCount: { color: theme.textMuted, fontSize: 12, marginRight: 10 },
  addBtn:       { padding: 6 },
  emptySec:     { color: theme.textMuted, fontSize: 12, padding: 14 },

  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  cardImage:    { width: 40, height: 56, borderRadius: 3, backgroundColor: theme.border },
  cardInfo:     { flex: 1, gap: 3 },
  cardName:     { color: theme.text, fontSize: 13, fontWeight: '600' },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { color: theme.textMuted, fontSize: 11 },
  colorDot:     { width: 8, height: 8, borderRadius: 4 },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qty:               { color: theme.text, fontSize: 14, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  qtyBtn:            { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDisabled:    { borderColor: theme.border },
  qtyBtnText:        { color: theme.accent, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  qtyBtnTextDisabled:{ color: theme.textMuted },
  removeBtn: { padding: 6, marginLeft: 4 },

  // Preview
  previewStatsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  previewStatsText: { color: theme.textMuted, fontSize: 12 },
  viewToggle: { padding: 6 },

  sectionToggle: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  sectionTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  sectionTabActive:     { borderBottomColor: theme.accent },
  sectionTabText:       { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  sectionTabTextActive: { color: theme.accent },

  previewRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 8,
    padding: 8, gap: 10,
  },
  countBadge: {
    backgroundColor: theme.border, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  countBadgeText: { color: theme.text, fontSize: 13, fontWeight: '700' },

  gridItem:      { width: '33.33%', padding: 3 },
  gridImage:     { width: '100%', aspectRatio: 63 / 88, borderRadius: 4, backgroundColor: theme.border },
  gridBadge:     { position: 'absolute', top: 5, right: 5, backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  pickerTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  pickerRow:   {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  pickerImage: { width: 36, height: 50, borderRadius: 3, backgroundColor: theme.border },
  pickerInfo:  { flex: 1, gap: 3 },

  fabSecondary: {
    position: 'absolute', bottom: 24, right: 24,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.accent,
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  fabDisabled: { borderColor: theme.border, opacity: 0.4 },

  renameSheet: { backgroundColor: theme.surface, borderRadius: 16, padding: 24, gap: 12 },
  renameTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  renameInput: {
    backgroundColor: theme.bg, color: theme.text,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: theme.border,
  },
  renameBtn:     { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  renameBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
