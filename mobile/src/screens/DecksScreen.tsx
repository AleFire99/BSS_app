import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDecks, getDeck, createDeck, updateDeck, deleteDeck, addCardToDeck } from '../api';
import { pickAndImportDeck } from '../utils/deckImport';
import { Feather } from '@expo/vector-icons';
import { Deck } from '../types';
import DeckItem from '../components/DeckItem';
import SwipeableRow from '../components/SwipeableRow';
import { theme } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Decks'>;

export default function DecksScreen({ navigation }: Props) {
  const [decks, setDecks]     = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName]             = useState('');
  const [creating, setCreating]           = useState(false);

  // Context menu (long-press)
  const [contextDeck, setContextDeck]         = useState<Deck | null>(null);
  const [renameVisible, setRenameVisible]     = useState(false);
  const [renameName, setRenameName]           = useState('');
  const [renaming, setRenaming]               = useState(false);
  const [copying, setCopying]                 = useState(false);
  const [importing, setImporting]             = useState(false);

  // Delete flow
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
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { return navigation.addListener('focus', load); }, [navigation, load]);

  useEffect(() => {
    Animated.spring(toastAnim, { toValue: showToast ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [showToast, toastAnim]);

  // ── Create ────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const deck = await createDeck(newName.trim());
      setCreateVisible(false);
      setNewName('');
      navigation.navigate('DeckDetail', { deckId: deck.id });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────────

  const handleRename = async () => {
    if (!renameName.trim() || !renamedDeckId.current) return;
    setRenaming(true);
    try {
      const updated = await updateDeck(renamedDeckId.current!, { name: renameName.trim() });
      setDecks(prev => prev.map(d => d.id === updated.id ? { ...d, name: updated.name } : d));
      setRenameVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
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

  // ── Copy ──────────────────────────────────────────────────────────────────────

  const handleCopy = async (deck: Deck) => {
    setContextDeck(null);
    setCopying(true);
    try {
      const full    = await getDeck(deck.id);
      const copy    = await createDeck(`${deck.name} (copy)`);
      await Promise.all((full.cards ?? []).map(c => addCardToDeck(copy.id, c.card_id, c.count)));
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCopying(false);
    }
  };

  // ── Import ───────────────────────────────────────────────────────────────────

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
          'Import complete',
          `"${result.deckName}" imported with ${result.cardCount} cards.\n\n` +
          `${result.unknownIds.length} unknown card ID(s) skipped:\n${skipped}${more}`,
        );
      } else {
        navigation.navigate('DeckDetail', { deckId: result.deckId });
      }
    } catch (e: any) {
      Alert.alert('Import failed', e.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

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
      // Commit the deck whose undo window we just closed
      if (pendingUndoIdRef.current !== null) {
        deleteDeck(pendingUndoIdRef.current).catch(e => Alert.alert('Error', e.message));
      }
    }

    pendingUndoIdRef.current = item.deck.id;
    deleteTimerRef.current = setTimeout(() => {
      deleteDeck(item.deck.id).catch(e => Alert.alert('Error', e.message));
      pendingUndoIdRef.current = null;
      setUndoItem(null);
      setShowToast(false);
      deleteTimerRef.current = null;
    }, 4500);
  }, []);

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

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;

  const toastTranslate = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <View style={styles.container}>
      <FlatList
        data={decks}
        keyExtractor={d => String(d.id)}
        renderItem={({ item }) => (
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
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.empty}>No decks yet. Create one!</Text>}
        contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}
      />

      {/* Import FAB */}
      <TouchableOpacity style={styles.fabImport} onPress={handleImport} disabled={importing}>
        <Feather name="download" size={20} color={theme.accent} />
      </TouchableOpacity>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)}>
        <Feather name="plus" size={22} color="#000" />
      </TouchableOpacity>

      {/* Copying / importing indicator */}
      {(copying || importing) && (
        <View style={styles.copyingBanner}>
          <ActivityIndicator color={theme.accent} size="small" />
          <Text style={styles.copyingText}>{importing ? 'Importing deck…' : 'Copying deck…'}</Text>
        </View>
      )}

      {/* Undo toast */}
      <Animated.View
        style={[styles.toast, { transform: [{ translateY: toastTranslate }], opacity: toastAnim }]}
        pointerEvents={showToast ? 'auto' : 'none'}
      >
        <Text style={styles.toastMsg}>Deck deleted</Text>
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Context menu (long-press) */}
      <Modal visible={!!contextDeck} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setContextDeck(null)} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Text style={styles.sheetDeckName} numberOfLines={1}>{contextDeck?.name}</Text>

            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && openRenameForDeck(contextDeck)}>
              <Feather name="edit-2" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && handleCopy(contextDeck)}>
              <Feather name="copy" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>Copy</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuRow} onPress={() => contextDeck && handleDeletePress(contextDeck)}>
              <Feather name="trash-2" size={18} color="#ef5350" />
              <Text style={[styles.menuLabel, styles.menuDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setRenameVisible(false)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename deck</Text>
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
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={handleRename}
                disabled={!renameName.trim() || renaming}
              >
                <Text style={[styles.dialogBtnText, { color: theme.accent }]}>
                  {renaming ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={!!confirmDeck} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setConfirmDeck(null)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete deck?</Text>
            <Text style={styles.dialogBody}>"{confirmDeck?.name}" will be permanently deleted.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setConfirmDeck(null)}>
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleConfirmDelete}>
                <Text style={[styles.dialogBtnText, { color: '#ef5350' }]}>Delete</Text>
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
            <Text style={styles.sheetTitle}>New Deck</Text>
            <TextInput
              style={styles.input}
              placeholder="Deck name"
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
              <Text style={styles.btnText}>{creating ? 'Creating…' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty:     { color: theme.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
  itemWrapper: {},

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  fabImport: {
    position: 'absolute', bottom: 92, right: 28,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.accent,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5,
  },

  copyingBanner: {
    position: 'absolute', top: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2a2a2a', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16,
    elevation: 6,
  },
  copyingText: { color: theme.textMuted, fontSize: 13 },

  toast: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#2a2a2a', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', paddingLeft: 16, height: 48,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  toastMsg:  { flex: 1, color: '#e0e0e0', fontSize: 14 },
  undoBtn:   { paddingHorizontal: 16, paddingVertical: 12 },
  undoText:  { color: theme.accent, fontSize: 14, fontWeight: '700' },

  scrim:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  dialogWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 32 },
  dialog: {
    width: '100%', backgroundColor: '#2a2a2a',
    borderRadius: 20, padding: 24,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  dialogTitle:   { color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 14 },
  dialogBody:    { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  dialogBtn:     { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 100 },
  dialogBtnText: { fontSize: 14, fontWeight: '600' },

  // Context menu sheet
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  sheet: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 0,
    width: '100%',
  },
  sheetDeckName: { color: theme.textMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  menuRow:    { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 20 },
  menuLabel:  { color: theme.text, fontSize: 16 },
  menuDivider:{ height: 1, backgroundColor: theme.border, marginVertical: 4, marginHorizontal: 20 },
  menuDanger: { color: '#ef5350' },

  // Create sheet
  createSheet: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 24, gap: 12,
  },
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
