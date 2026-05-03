import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDecks, createDeck, deleteDeck } from '../api';
import { Deck } from '../types';
import DeckItem from '../components/DeckItem';
import { theme } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Decks'>;

export default function DecksScreen({ navigation }: Props) {
  const [decks, setDecks]       = useState<Deck[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalVisible, setModal]= useState(false);
  const [newName, setNewName]   = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getDecks()
      .then(setDecks)
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when navigating back from DeckDetail
  useEffect(() => {
    return navigation.addListener('focus', load);
  }, [navigation, load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const deck = await createDeck(newName.trim(), newNotes.trim() || undefined);
      setModal(false);
      setNewName('');
      setNewNotes('');
      navigation.navigate('DeckDetail', { deckId: deck.id });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (deck: Deck) => {
    Alert.alert('Delete Deck', `Delete "${deck.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteDeck(deck.id).then(load).catch(e => Alert.alert('Error', e.message)),
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={decks}
        keyExtractor={d => String(d.id)}
        renderItem={({ item }) => (
          <DeckItem
            deck={item}
            onPress={() => navigation.navigate('DeckDetail', { deckId: item.id })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No decks yet. Create one!</Text>
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New deck modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>New Deck</Text>
          <TextInput
            style={styles.input}
            placeholder="Deck name"
            placeholderTextColor={theme.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textMuted}
            value={newNotes}
            onChangeText={setNewNotes}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, (!newName.trim() || creating) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!newName.trim() || creating}
          >
            <Text style={styles.btnText}>{creating ? 'Creating…' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty:     { color: theme.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  fabText:   { color: '#fff', fontSize: 32, lineHeight: 36 },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12,
  },
  sheetTitle:  { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  input: {
    backgroundColor: theme.bg,
    color: theme.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  btn: { backgroundColor: theme.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
