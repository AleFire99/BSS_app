import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  getOfficialBanlists, getCustomBanlists, createCustomBanlist, deleteCustomBanlist,
} from '../api';
import { Banlist } from '../types';
import { theme } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Banlists'>;

function countSummary(list: Banlist): string {
  const banned  = list.entries.filter(e => e.limit === 0).length;
  const limited = list.entries.length - banned;
  return `${banned} forbidden · ${limited} limited`;
}

export default function BanlistsScreen({ navigation }: Props) {
  const official = getOfficialBanlists();
  const [customs, setCustoms]       = useState<Banlist[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName]       = useState('');
  const [basedOn, setBasedOn]       = useState<string | null>(official[0]?.key ?? null);

  const load = useCallback(() => {
    getCustomBanlists().then(setCustoms).catch(e => Alert.alert('Error', e.message));
  }, []);

  useFocusEffect(load);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const list = await createCustomBanlist(name, basedOn ?? undefined);
      setCreateOpen(false);
      setNewName('');
      navigation.navigate('BanlistDetail', { banlistKey: list.key });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const confirmDelete = (list: Banlist) => {
    Alert.alert(
      'Delete banlist',
      `Delete "${list.name}"? Decks using it switch to the latest official list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => deleteCustomBanlist(Number(list.key.slice('custom:'.length)))
            .then(load)
            .catch(e => Alert.alert('Error', e.message)),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Official</Text>
        {official.map((b, i) => (
          <TouchableOpacity
            key={b.key}
            style={styles.item}
            onPress={() => navigation.navigate('BanlistDetail', { banlistKey: b.key })}
            activeOpacity={0.75}
          >
            <View style={styles.timelineDot}>
              <View style={[styles.dot, i === 0 && styles.dotCurrent]} />
              {i < official.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{b.name}</Text>
                {i === 0 && (
                  <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>CURRENT</Text></View>
                )}
              </View>
              <Text style={styles.itemMeta}>{b.effective} · {countSummary(b)}</Text>
              {b.complete === false && <Text style={styles.incomplete}>Incomplete data</Text>}
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.customHeader}>
          <Text style={styles.sectionTitle}>Custom</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => setCreateOpen(true)}>
            <Feather name="plus" size={14} color="#000" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        {customs.length === 0 && (
          <Text style={styles.empty}>No custom banlists yet. Create one for your local format or house rules.</Text>
        )}
        {customs.map(b => (
          <TouchableOpacity
            key={b.key}
            style={styles.item}
            onPress={() => navigation.navigate('BanlistDetail', { banlistKey: b.key })}
            onLongPress={() => confirmDelete(b)}
            activeOpacity={0.75}
          >
            <View style={styles.itemBody}>
              <Text style={styles.itemName}>{b.name}</Text>
              <Text style={styles.itemMeta}>{countSummary(b)}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(b)} style={styles.iconBtn}>
              <Feather name="trash-2" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={createOpen} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setCreateOpen(false)} />
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Banlist</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <Text style={styles.sheetLabel}>Start from</Text>
            <View style={styles.chipRow}>
              {[{ key: null as string | null, name: 'Empty' }, ...official.map(b => ({ key: b.key as string | null, name: b.name }))].map(opt => (
                <TouchableOpacity
                  key={opt.key ?? 'empty'}
                  style={[styles.chip, basedOn === opt.key && styles.chipActive]}
                  onPress={() => setBasedOn(opt.key)}
                >
                  <Text style={[styles.chipText, basedOn === opt.key && styles.chipTextActive]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, !newName.trim() && { opacity: 0.5 }]} onPress={handleCreate} disabled={!newName.trim()}>
              <Text style={styles.btnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content:   { padding: 12, paddingBottom: 40 },

  sectionTitle: { color: theme.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 8 },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  newBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accent, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  newBtnText:   { color: '#000', fontSize: 12, fontWeight: '700' },

  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  itemBody:   { flex: 1, gap: 3 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName:   { color: theme.text, fontSize: 15, fontWeight: '700' },
  itemMeta:   { color: theme.textMuted, fontSize: 12 },
  incomplete: { color: '#fb8c00', fontSize: 11 },
  iconBtn:    { padding: 6 },

  timelineDot:  { width: 12, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.border },
  dotCurrent:   { backgroundColor: theme.accent },
  timelineLine: { position: 'absolute', top: '60%', bottom: -20, width: 2, backgroundColor: theme.border },

  currentBadge:     { backgroundColor: theme.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  currentBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },

  empty: { color: theme.textMuted, fontSize: 13, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },

  sheet:      { backgroundColor: theme.surface, borderRadius: 16, padding: 24, gap: 12 },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  sheetLabel: { color: theme.textMuted, fontSize: 12 },
  input: {
    backgroundColor: theme.bg, color: theme.text,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: theme.border,
  },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive:     { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText:       { color: theme.textMuted, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  btn:     { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
