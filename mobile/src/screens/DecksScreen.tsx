import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Animated,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getDecks, getDeck, createDeck, updateDeck, deleteDeck, addCardToDeck } from '../api';
import { pickAndImportDeck } from '../utils/deckImport';
import { Feather } from '@expo/vector-icons';
import { Deck } from '../types';
import DeckItem from '../components/DeckItem';
import SwipeableRow from '../components/SwipeableRow';
import { COLOR_MAP, ThemeType } from '../theme';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Decks'>;
type SortMode = 'name' | 'date' | 'quantity' | 'avg_cost';

const SORT_CYCLE: SortMode[] = ['date', 'avg_cost', 'name', 'quantity'];
const SORT_DEFAULT_DIR: Record<SortMode, 'asc' | 'desc'> = {
  name:     'asc',
  date:     'desc',
  quantity: 'desc',
  avg_cost: 'asc',
};

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'White'];

export default function DecksScreen({ navigation }: Props) {
  const { theme } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const SORT_LABELS: Record<SortMode, string> = useMemo(() => ({
    name:     t('decks.sort.name'),
    date:     t('decks.sort.date'),
    quantity: t('decks.sort.quantity'),
    avg_cost: t('decks.sort.avgCost'),
  }), [t]);

  const [decks, setDecks]     = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]               = useState('');
  const [filterColors, setFilterColors]   = useState<string[]>([]);
  const [sortMode, setSortMode]           = useState<SortMode>('date');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen]   = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName]             = useState('');
  const [creating, setCreating]           = useState(false);

  const [contextDeck, setContextDeck]         = useState<Deck | null>(null);
  const [renameVisible, setRenameVisible]     = useState(false);
  const [renameName, setRenameName]           = useState('');
  const [renaming, setRenaming]               = useState(false);
  const [copying, setCopying]                 = useState(false);
  const [importing, setImporting]             = useState(false);

  const [confirmDeck, setConfirmDeck]   = useState<Deck | null>(null);
  const [collapsingId, setCollapsingId] = useState<number | null>(null);
  const [undoItem, setUndoItem]         = useState<{ deck: Deck; index: number } | null>(null);
  const [showToast, setShowToast]       = useState(false);
  const pendingDeleteRef  = useRef<{ deck: Deck; index: number } | null>(null);
  const deleteTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUndoIdRef  = useRef<number | null>(null);
  const toastAnim        = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
    setLoading(true);
    getDecks()
      .then(setDecks)
      .catch(e => Alert.alert(t('common.error'), e.message))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { return navigation.addListener('focus', load); }, [navigation, load]);

  useEffect(() => {
    Animated.spring(toastAnim, { toValue: showToast ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [showToast, toastAnim]);

  const displayDecks = useMemo(() => {
    let list = [...decks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q));
    }
    if (filterColors.length > 0) {
      list = list.filter(d => filterColors.every(c => (d.colors[c] ?? 0) > 0));
    }
    switch (sortMode) {
      case 'name':     list.sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)); break;
      case 'date':     list.sort((a, b) => sortDir === 'desc' ? b.updated_at.localeCompare(a.updated_at) : a.updated_at.localeCompare(b.updated_at)); break;
      case 'quantity': list.sort((a, b) => sortDir === 'desc' ? b.card_count - a.card_count : a.card_count - b.card_count); break;
      case 'avg_cost': list.sort((a, b) => sortDir === 'asc' ? a.avg_cost - b.avg_cost : b.avg_cost - a.avg_cost); break;
    }
    return list;
  }, [decks, search, filterColors, sortMode, sortDir]);

  const toggleColor = (color: string) =>
    setFilterColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);

  const handleSetSortMode = (mode: SortMode) => {
    setSortMode(mode);
    setSortDir(SORT_DEFAULT_DIR[mode]);
    setSortMenuOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const deck = await createDeck(newName.trim());
      setCreateVisible(false);
      setNewName('');
      navigation.navigate('DeckDetail', { deckId: deck.id });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renameName.trim() || !renamedDeckId.current) return;
    setRenaming(true);
    try {
      const updated = await updateDeck(renamedDeckId.current!, { name: renameName.trim() });
      setDecks(prev => prev.map(d => d.id === updated.id ? { ...d, name: updated.name } : d));
      setRenameVisible(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setRenaming(false);
    }
  };

  const renamedDeckId = useRef<number | null>(null);

  const openRenameForDeck = (deck: Deck) => {
    renamedDeckId.current = deck.id;
    setContextDeck(null);
    setRenameName(deck.name);
    setRenameVisible(true);
  };

  const handleCopy = async (deck: Deck) => {
    setContextDeck(null);
    setCopying(true);
    try {
      const full    = await getDeck(deck.id);
      const copy    = await createDeck(`${deck.name} (copy)`);
      await Promise.all((full.cards ?? []).map(c => addCardToDeck(copy.id, c.card_id, c.count)));
      load();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCopying(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await pickAndImportDeck();
      if (!result) return;
      load();
      if (result.unknownIds.length > 0) {
        const skipped = result.unknownIds.slice(0, 5).join(', ');
        const more = result.unknownIds.length > 5 ? ` (+${result.unknownIds.length - 5} more)` : '';
        Alert.alert(
          t('decks.importComplete'),
          `"${result.deckName}" imported with ${result.cardCount} main + ${result.sideboardCount} sideboard cards.\n\n` +
          `${result.unknownIds.length} unknown card ID(s) skipped:\n${skipped}${more}`,
        );
      } else {
        navigation.navigate('DeckDetail', { deckId: result.deckId });
      }
    } catch (e: any) {
      Alert.alert(t('decks.importFailed'), e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePress = (deck: Deck) => { setContextDeck(null); setConfirmDeck(deck); };

  const handleConfirmDelete = () => {
    if (!confirmDeck) return;
    const deck = confirmDeck;
    const idx  = decks.findIndex(d => d.id === deck.id);
    pendingDeleteRef.current = { deck, index: idx };
    setConfirmDeck(null);
    setCollapsingId(deck.id);
  };

  const handleCollapseEnd = useCallback(() => {
    const item = pendingDeleteRef.current;
    if (!item) return;
    pendingDeleteRef.current = null;
    setCollapsingId(null);
    setDecks(prev => prev.filter(d => d.id !== item.deck.id));
    setUndoItem(item);
    setShowToast(true);

    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
      if (pendingUndoIdRef.current !== null) {
        deleteDeck(pendingUndoIdRef.current).catch(e => Alert.alert(t('common.error'), e.message));
      }
    }

    pendingUndoIdRef.current = item.deck.id;
    deleteTimerRef.current = setTimeout(() => {
      deleteDeck(item.deck.id).catch(e => Alert.alert(t('common.error'), e.message));
      pendingUndoIdRef.current = null;
      setUndoItem(null);
      setShowToast(false);
      deleteTimerRef.current = null;
    }, 4500);
  }, [t]);

  const handleUndo = () => {
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    pendingUndoIdRef.current = null;
    setShowToast(false);
    if (undoItem) {
      setDecks(prev => {
        const next = [...prev];
        next.splice(Math.min(undoItem.index, next.length), 0, undoItem.deck);
        return next;
      });
      setUndoItem(null);
    }
  };

  const renderDeckItem = (item: Deck) => (
    <SwipeableRow
      onDeletePress={() => handleDeletePress(item)}
      collapsing={collapsingId === item.id}
      onCollapseEnd={handleCollapseEnd}
    >
      <View style={styles.itemWrapper}>
        <DeckItem
          deck={item}
          onPress={() => navigation.navigate('DeckDetail', { deckId: item.id })}
          onLongPress={() => setContextDeck(item)}
        />
      </View>
    </SwipeableRow>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;

  const toastTranslate = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <View style={styles.container}>
      <View style={styles.filterBarContainer}>
        <View style={styles.filterBar}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Feather name="search" size={15} color={theme.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('decks.searchPlaceholder')}
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x" size={15} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortMenuOpen(true)}>
              <Feather name="sliders" size={15} color={theme.textMuted} />
              <Text style={styles.sortBtnText}>{SORT_LABELS[sortMode]}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dirBtn} onPress={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
              <Feather name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.gemRow}>
            {COLORS.map(c => {
              const active = filterColors.includes(c);
              return (
                <TouchableOpacity key={c} onPress={() => toggleColor(c)} activeOpacity={0.7}>
                  <View style={[styles.gem, { backgroundColor: COLOR_MAP[c] ?? '#999' }, active && styles.gemActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
      <FlatList
        key={`${sortMode}-${sortDir}`}
        style={{ flex: 1 }}
        data={displayDecks}
        keyExtractor={d => String(d.id)}
        renderItem={({ item }) => renderDeckItem(item)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {decks.length === 0 ? t('decks.noDecksYet') : t('decks.noDecksMatch')}
          </Text>
        }
        contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}
      />

      <TouchableOpacity style={styles.fabImport} onPress={handleImport} disabled={importing}>
        <Feather name="download" size={20} color={theme.accent} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)}>
        <Feather name="plus" size={22} color="#000" />
      </TouchableOpacity>

      {(copying || importing) && (
        <View style={styles.copyingBanner}>
          <ActivityIndicator color={theme.accent} size="small" />
          <Text style={styles.copyingText}>{importing ? t('decks.importingDeck') : t('decks.copyingDeck')}</Text>
        </View>
      )}

      <Animated.View
        style={[styles.toast, { transform: [{ translateY: toastTranslate }], opacity: toastAnim }]}
        pointerEvents={showToast ? 'auto' : 'none'}
      >
        <Text style={styles.toastMsg}>{t('decks.deckDeleted')}</Text>
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
          <Text style={styles.undoText}>{t('decks.undo')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Sort menu */}
      <Modal visible={sortMenuOpen} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortMenuOpen(false)} />
        <View style={styles.sortMenuWrap} pointerEvents="box-none">
          <View style={styles.sortMenu}>
            <Text style={styles.sortMenuTitle}>{t('decks.sortBy')}</Text>
            {SORT_CYCLE.map(mode => (
              <TouchableOpacity key={mode} style={styles.sortMenuRow} onPress={() => handleSetSortMode(mode)}>
                <Text style={[styles.sortMenuText, sortMode === mode && styles.sortMenuTextActive]}>
                  {SORT_LABELS[mode]}
                </Text>
                {sortMode === mode && <Feather name="check" size={15} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Context menu */}
      <Modal visible={!!contextDeck} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setContextDeck(null)} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetDeckName} numberOfLines={1}>{contextDeck?.name}</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && openRenameForDeck(contextDeck)}>
              <Feather name="edit-2" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>{t('decks.rename')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && handleCopy(contextDeck)}>
              <Feather name="copy" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>{t('decks.copy')}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && handleDeletePress(contextDeck)}>
              <Feather name="trash-2" size={18} color="#ef5350" />
              <Text style={[styles.menuLabel, styles.menuDanger]}>{t('decks.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setRenameVisible(false)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t('decks.renameDeck')}</Text>
            <TextInput
              style={styles.input}
              value={renameName}
              onChangeText={setRenameName}
              placeholderTextColor={theme.textMuted}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setRenameVisible(false)}>
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>{t('decks.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={handleRename}
                disabled={!renameName.trim() || renaming}
              >
                <Text style={[styles.dialogBtnText, { color: theme.accent }]}>
                  {renaming ? t('decks.saving') : t('decks.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDeck} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setConfirmDeck(null)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t('decks.deleteDeck')}</Text>
            <Text style={styles.dialogBody}>{t('decks.deleteBody', { name: confirmDeck?.name })}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setConfirmDeck(null)}>
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>{t('decks.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleConfirmDelete}>
                <Text style={[styles.dialogBtnText, { color: '#ef5350' }]}>{t('decks.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create deck modal */}
      <Modal visible={createVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setCreateVisible(false)} />
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View style={styles.createSheet}>
            <Text style={styles.sheetTitle}>{t('decks.newDeck')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('decks.deckNamePlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, (!newName.trim() || creating) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
            >
              <Text style={styles.btnText}>{creating ? t('decks.creating') : t('decks.create')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    empty:     { color: theme.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
    itemWrapper: {},

    filterBarContainer: { paddingHorizontal: 12, paddingTop: 8 },
    filterBar:   { marginBottom: 8 },
    searchRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surface, borderRadius: 8,
      paddingHorizontal: 10, height: 38,
      borderWidth: 1, borderColor: theme.border,
    },
    searchInput:  { flex: 1, color: theme.text, fontSize: 14, paddingVertical: 0 },
    sortBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: theme.surface, borderRadius: 8,
      paddingHorizontal: 10, height: 38,
      borderWidth: 1, borderColor: theme.border,
    },
    sortBtnText: { color: theme.textMuted, fontSize: 13 },

    gemRow:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
    gem:       { width: 26, height: 26, borderRadius: 13, opacity: 0.4 },
    gemActive: { opacity: 1, borderWidth: 2.5, borderColor: '#fff' },

    dirBtn: {
      backgroundColor: theme.surface, borderRadius: 8,
      width: 38, height: 38,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: theme.border,
    },

    sortMenuWrap: { ...StyleSheet.absoluteFillObject },
    sortMenu: {
      position: 'absolute', top: 90, right: 12,
      backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 4, minWidth: 150,
      elevation: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
      borderWidth: 1, borderColor: theme.border,
    },
    sortMenuTitle: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 14, paddingVertical: 8 },
    sortMenuRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border },
    sortMenuText:  { color: theme.text, fontSize: 14 },
    sortMenuTextActive: { color: theme.accent, fontWeight: '700' },

    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: theme.accent,
      justifyContent: 'center', alignItems: 'center', elevation: 6,
    },
    fabImport: {
      position: 'absolute', bottom: 92, right: 28,
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.accent,
      justifyContent: 'center', alignItems: 'center', elevation: 5,
    },

    copyingBanner: {
      position: 'absolute', top: 12, alignSelf: 'center',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.surface, borderRadius: 20,
      paddingVertical: 8, paddingHorizontal: 16, elevation: 6,
      borderWidth: 1, borderColor: theme.border,
    },
    copyingText: { color: theme.textMuted, fontSize: 13 },

    toast: {
      position: 'absolute', bottom: 24, left: 16, right: 16,
      backgroundColor: theme.surface, borderRadius: 8,
      flexDirection: 'row', alignItems: 'center', paddingLeft: 16, height: 48,
      elevation: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
      borderWidth: 1, borderColor: theme.border,
    },
    toastMsg:  { flex: 1, color: theme.text, fontSize: 14 },
    undoBtn:   { paddingHorizontal: 16, paddingVertical: 12 },
    undoText:  { color: theme.accent, fontSize: 14, fontWeight: '700' },

    scrim:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    dialogWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 32 },
    dialog: {
      width: '100%', backgroundColor: theme.surface,
      borderRadius: 20, padding: 24, elevation: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
      borderWidth: 1, borderColor: theme.border,
    },
    dialogTitle:   { color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 14 },
    dialogBody:    { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
    dialogBtn:     { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 100 },
    dialogBtnText: { fontSize: 14, fontWeight: '600' },

    sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    sheet: {
      backgroundColor: theme.surface, borderRadius: 20,
      paddingVertical: 8, paddingHorizontal: 0, width: '100%',
      borderWidth: 1, borderColor: theme.border,
    },
    sheetDeckName: { color: theme.textMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
    menuRow:    { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 20 },
    menuLabel:  { color: theme.text, fontSize: 16 },
    menuDivider:{ height: 1, backgroundColor: theme.border, marginVertical: 4, marginHorizontal: 20 },
    menuDanger: { color: '#ef5350' },

    createSheet: { backgroundColor: theme.surface, borderRadius: 16, padding: 24, gap: 12 },
    sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
    input: {
      backgroundColor: theme.bg, color: theme.text,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, borderWidth: 1, borderColor: theme.border,
    },
    btn:        { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
    btnDisabled:{ opacity: 0.4 },
    btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
