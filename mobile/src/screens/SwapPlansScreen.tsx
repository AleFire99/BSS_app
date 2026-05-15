import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { getSwapPlans, getSwapPlan, createSwapPlan, updateSwapPlan, deleteSwapPlan, addCardToSwapPlan } from '../api';
import SwipeableRow from '../components/SwipeableRow';
import { SwapPlan } from '../types';
import { theme } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SwapPlans'>;

export default function SwapPlansScreen({ route, navigation }: Props) {
  const { deckId, deckName } = route.params;

  const [plans, setPlans]           = useState<SwapPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [copying, setCopying]       = useState(false);

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [planName, setPlanName]       = useState('');

  // Rename modal
  const [renameModal, setRenameModal]   = useState(false);
  const [renameName, setRenameName]     = useState('');
  const renamingPlanId = useRef<number | null>(null);

  // Context menu (long-press)
  const [contextPlan, setContextPlan]             = useState<SwapPlan | null>(null);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<SwapPlan | null>(null);

  // Swipe-delete collapse
  const [collapsingId, setCollapsingId] = useState<number | null>(null);

  const load = useCallback(() => {
    getSwapPlans(deckId)
      .then(setPlans)
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [deckId]);

  useEffect(() => {
    load();
    navigation.setOptions({ title: `${deckName} — Plans` });
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!planName.trim()) return;
    try {
      const plan = await createSwapPlan(deckId, planName.trim());
      setCreateModal(false);
      setPlanName('');
      load();
      navigation.navigate('SwapPlanDetail', { planId: plan.id, deckId, deckName });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ── Rename ──────────────────────────────────────────────────────────────────

  const openRename = (plan: SwapPlan) => {
    setContextPlan(null);
    renamingPlanId.current = plan.id;
    setRenameName(plan.name);
    setRenameModal(true);
  };

  const handleRename = async () => {
    if (!renameName.trim() || !renamingPlanId.current) return;
    try {
      await updateSwapPlan(renamingPlanId.current, { name: renameName.trim() });
      setRenameModal(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ── Copy ────────────────────────────────────────────────────────────────────

  const handleCopy = async (plan: SwapPlan) => {
    setContextPlan(null);
    setCopying(true);
    try {
      const full = await getSwapPlan(plan.id);
      const copy = await createSwapPlan(deckId, `${plan.name} (copy)`, plan.notes ?? undefined);
      await Promise.all(full.cards.map(c => addCardToSwapPlan(copy.id, c.card_id, c.direction, c.count)));
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCopying(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDeletePress = (plan: SwapPlan) => setCollapsingId(plan.id);

  const handleCollapseEnd = async (planId: number) => {
    setCollapsingId(null);
    setPlans(prev => prev.filter(p => p.id !== planId));
    try { await deleteSwapPlan(planId); }
    catch (e: any) { Alert.alert('Error', e.message); load(); }
  };

  const handleContextDelete = (plan: SwapPlan) => {
    setContextPlan(null);
    setConfirmDeletePlan(plan);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeletePlan) return;
    const plan = confirmDeletePlan;
    setConfirmDeletePlan(null);
    handleDeletePress(plan);
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => {
          const outCount = item.cards.filter(c => c.direction === 'out').reduce((s, c) => s + c.count, 0);
          const inCount  = item.cards.filter(c => c.direction === 'in').reduce((s, c) => s + c.count, 0);
          return (
            <SwipeableRow
              borderRadius={8}
              onDeletePress={() => handleDeletePress(item)}
              collapsing={collapsingId === item.id}
              onCollapseEnd={() => handleCollapseEnd(item.id)}
            >
              <TouchableOpacity
                style={styles.planRow}
                onPress={() => navigation.navigate('SwapPlanDetail', { planId: item.id, deckId, deckName })}
                onLongPress={() => setContextPlan(item)}
                activeOpacity={0.75}
              >
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{item.name}</Text>
                  {item.cards.length > 0 ? (
                    <Text style={styles.planSub}>
                      −{outCount} / +{inCount}
                      {item.notes ? `  ·  ${item.notes}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.planSub}>Empty plan{item.notes ? `  ·  ${item.notes}` : ''}</Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </SwipeableRow>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No swap plans yet.{'\n'}Tap + to create one.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 120 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setPlanName(''); setCreateModal(true); }}>
        <Feather name="plus" size={22} color="#000" />
      </TouchableOpacity>

      {copying && (
        <View style={styles.copyingBanner}>
          <ActivityIndicator color={theme.accent} size="small" />
          <Text style={styles.copyingText}>Copying plan…</Text>
        </View>
      )}

      {/* Context menu */}
      <Modal visible={!!contextPlan} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setContextPlan(null)} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.contextSheet}>
            <Text style={styles.contextTitle} numberOfLines={1}>{contextPlan?.name}</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => contextPlan && openRename(contextPlan)}>
              <Feather name="edit-2" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => contextPlan && handleCopy(contextPlan)}>
              <Feather name="copy" size={18} color={theme.textMuted} />
              <Text style={styles.menuLabel}>Copy</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={() => contextPlan && handleContextDelete(contextPlan)}>
              <Feather name="trash-2" size={18} color="#ef5350" />
              <Text style={[styles.menuLabel, styles.menuDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm delete */}
      <Modal visible={!!confirmDeletePlan} transparent animationType="fade">
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setConfirmDeletePlan(null)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete plan?</Text>
            <Text style={styles.dialogBody}>"{confirmDeletePlan?.name}" will be permanently deleted.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setConfirmDeletePlan(null)}>
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleConfirmDelete}>
                <Text style={[styles.dialogBtnText, { color: '#ef5350' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create plan modal */}
      <Modal visible={createModal} transparent animationType="fade">
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={() => setCreateModal(false)}
        />
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Swap Plan</Text>
            <TextInput
              style={styles.input}
              placeholder="Plan name (e.g. vs Aggro)"
              placeholderTextColor={theme.textMuted}
              value={planName}
              onChangeText={setPlanName}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={!planName.trim()}>
              <Text style={styles.btnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rename modal */}
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
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Rename Plan</Text>
            <TextInput
              style={styles.input}
              value={renameName}
              onChangeText={setRenameName}
              placeholderTextColor={theme.textMuted}
              autoFocus
              selectTextOnFocus
            />
            <TouchableOpacity style={styles.btn} onPress={handleRename} disabled={!renameName.trim()}>
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
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty:     { color: theme.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },

  planRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 8,
    padding: 14, gap: 12,
  },
  planInfo: { flex: 1, gap: 3 },
  planName: { color: theme.text, fontSize: 15, fontWeight: '600' },
  planSub:  { color: theme.textMuted, fontSize: 12 },

  fab: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent, right: 20, bottom: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },

  copyingBanner: {
    position: 'absolute', top: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2a2a2a', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16, elevation: 6,
  },
  copyingText: { color: theme.textMuted, fontSize: 13 },

  // Context menu
  scrim:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap:{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  contextSheet: {
    backgroundColor: '#2a2a2a', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 0, width: '100%',
  },
  contextTitle: { color: theme.textMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  menuRow:   { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 20 },
  menuLabel: { color: theme.text, fontSize: 16 },
  menuDivider: { height: 1, backgroundColor: theme.border, marginVertical: 4, marginHorizontal: 20 },
  menuDanger:  { color: '#ef5350' },

  // Confirm delete dialog
  dialogWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 32 },
  dialog: {
    width: '100%', backgroundColor: '#2a2a2a',
    borderRadius: 20, padding: 24, elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  dialogTitle:   { color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 14 },
  dialogBody:    { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  dialogBtn:     { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 100 },
  dialogBtnText: { fontSize: 14, fontWeight: '600' },

  // Create / rename sheet
  sheet:      { backgroundColor: theme.surface, borderRadius: 16, padding: 24, gap: 12 },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: theme.bg, color: theme.text,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: theme.border,
  },
  btn:     { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
