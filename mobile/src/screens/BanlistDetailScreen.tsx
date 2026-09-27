import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Image,
  ActivityIndicator, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  getCards, getOfficialBanlists, getCustomBanlist, getBanlistDiff, createCustomBanlist,
  renameCustomBanlist, setBanlistEntry, removeBanlistEntry, LIMIT_LABEL,
} from '../api';
import { Banlist, BanlistChange, BanlistEntry, Card } from '../types';
import { theme } from '../theme';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'BanlistDetail'>;

const LIMITS = [0, 1, 2, 3];
const LIMIT_COLOR: Record<number, string> = { 0: '#c62828', 1: '#fb8c00', 2: '#fdd835', 3: '#43a047' };

function statusLabel(limit: number | null): string {
  if (limit === null) return 'Unrestricted';
  return LIMIT_LABEL[limit] ?? `Limit ${limit}`;
}

type Row =
  | { kind: 'header'; title: string; color?: string }
  | { kind: 'entry'; entry: BanlistEntry }
  | { kind: 'change'; change: BanlistChange }
  | { kind: 'empty'; text: string };

export default function BanlistDetailScreen({ route, navigation }: Props) {
  const { banlistKey } = route.params;
  const isCustom = banlistKey.startsWith('custom:');
  const customId = isCustom ? Number(banlistKey.slice('custom:'.length)) : 0;

  const [list, setList]         = useState<Banlist | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addMode, setAddMode]   = useState(false);
  const [search, setSearch]     = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState('');

  const load = useCallback(async () => {
    try {
      const [cards, l] = await Promise.all([
        getCards(),
        isCustom
          ? getCustomBanlist(customId)
          : Promise.resolve(getOfficialBanlists().find(b => b.key === banlistKey) ?? null),
      ]);
      setAllCards(cards);
      setList(l);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [banlistKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!list) return;
    navigation.setOptions({
      title: list.name,
      headerRight: isCustom ? () => (
        <TouchableOpacity
          onPress={() => { setRenameText(list.name); setRenameOpen(true); }}
          style={{ padding: 8, marginRight: 4 }}
        >
          <Feather name="edit-2" size={18} color="#fff" />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [list]);

  const byId   = useMemo(() => new Map(allCards.map(c => [c.id, c])), [allCards]);
  const byName = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of allCards) if (!m.has(c.name)) m.set(c.name, c);
    return m;
  }, [allCards]);
  const findCard = useCallback(
    (name: string, id?: string) => (id ? byId.get(id) : undefined) ?? byName.get(name),
    [byId, byName],
  );

  const limitFor = useMemo(
    () => new Map((list?.entries ?? []).map(e => [e.card_name, e.limit])),
    [list],
  );

  const rows = useMemo<Row[]>(() => {
    if (!list) return [];
    const out: Row[] = [];
    const groups = new Map<number, BanlistEntry[]>();
    for (const e of list.entries) {
      if (!groups.has(e.limit)) groups.set(e.limit, []);
      groups.get(e.limit)!.push(e);
    }
    for (const limit of [...groups.keys()].sort((a, b) => a - b)) {
      out.push({ kind: 'header', title: statusLabel(limit), color: LIMIT_COLOR[limit] });
      for (const e of groups.get(limit)!.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
        out.push({ kind: 'entry', entry: e });
      }
    }
    if (list.entries.length === 0) {
      out.push({ kind: 'empty', text: isCustom ? 'No cards yet. Tap + to add cards.' : 'No restrictions.' });
    }
    if (!isCustom) {
      const diff = getBanlistDiff(list.key);
      if (diff) {
        out.push({ kind: 'header', title: 'Changes vs previous list' });
        if (diff.length === 0) out.push({ kind: 'empty', text: 'No changes.' });
        diff.forEach(c => out.push({ kind: 'change', change: c }));
      }
    }
    return out;
  }, [list, isCustom]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const out: Card[] = [];
    for (const c of allCards) {
      if (seen.has(c.name)) continue;
      if (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) {
        seen.add(c.name);
        out.push(c);
        if (out.length >= 50) break;
      }
    }
    return out;
  }, [search, allCards]);

  const handleSetLimit = async (card: { name: string; id?: string }, limit: number) => {
    try {
      if (limitFor.get(card.name) === limit) await removeBanlistEntry(customId, card.name);
      else await setBanlistEntry(customId, card, limit);
      setList(await getCustomBanlist(customId));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDuplicate = async () => {
    if (!list) return;
    try {
      const copy = await createCustomBanlist(`${list.name} (custom)`, list.key);
      navigation.replace('BanlistDetail', { banlistKey: copy.key });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRename = async () => {
    const name = renameText.trim();
    if (!name) return;
    try {
      await renameCustomBanlist(customId, name);
      setRenameOpen(false);
      setList(await getCustomBanlist(customId));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} size="large" /></View>;
  if (!list)   return <View style={styles.center}><Text style={styles.emptyText}>Banlist not found.</Text></View>;

  const renderLimitChips = (card: { name: string; id?: string }) => {
    const current = limitFor.get(card.name);
    return (
      <View style={styles.limitChips}>
        {LIMITS.map(l => (
          <TouchableOpacity
            key={l}
            style={[styles.limitChip, current === l && { backgroundColor: LIMIT_COLOR[l], borderColor: LIMIT_COLOR[l] }]}
            onPress={() => handleSetLimit(card, l)}
          >
            <Text style={[styles.limitChipText, current === l && styles.limitChipTextActive]}>
              {l === 0 ? '✕' : l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCardLine = (name: string, id: string | undefined, right: React.ReactNode, sub?: string) => {
    const card = findCard(name, id);
    const imgId = id ?? card?.id;
    return (
      <TouchableOpacity
        style={styles.cardRow}
        onPress={() => card && navigation.navigate('CardDetail', { card })}
        activeOpacity={0.75}
      >
        {imgId ? (
          <Image source={{ uri: `https://www.bssdb.dev/cards/bss/${imgId}.png` }} style={styles.thumb} resizeMode="contain" />
        ) : <View style={styles.thumb} />}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{sub ?? imgId ?? ''}</Text>
        </View>
        {right}
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'header':
        return (
          <View style={styles.groupHeader}>
            {item.color && <View style={[styles.groupDot, { backgroundColor: item.color }]} />}
            <Text style={styles.groupTitle}>{item.title}</Text>
          </View>
        );
      case 'empty':
        return <Text style={styles.emptyText}>{item.text}</Text>;
      case 'entry': {
        const e = item.entry;
        return renderCardLine(
          e.card_name, e.card_id,
          isCustom ? renderLimitChips({ name: e.card_name, id: e.card_id }) : null,
        );
      }
      case 'change': {
        const c = item.change;
        const color = c.to === null ? '#43a047' : c.from === null || (c.to < c.from) ? '#c62828' : '#fb8c00';
        return renderCardLine(
          c.card_name, c.card_id,
          <Feather name={c.to === null ? 'arrow-up-circle' : 'arrow-down-circle'} size={18} color={color} />,
          `${statusLabel(c.from)} → ${statusLabel(c.to)}`,
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {!isCustom && (
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>Effective {list.effective}</Text>
          {list.source && (
            <TouchableOpacity onPress={() => Linking.openURL(list.source!)}>
              <Text style={styles.link}>Source</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.dupBtn} onPress={handleDuplicate}>
            <Feather name="copy" size={13} color={theme.accent} />
            <Text style={styles.dupText}>Duplicate as custom</Text>
          </TouchableOpacity>
        </View>
      )}

      {addMode ? (
        <View style={styles.container}>
          <View style={styles.searchWrap}>
            <Feather name="search" size={15} color={theme.textMuted} style={{ marginLeft: 10, marginRight: 6 }} />
            <TextInput
              style={styles.search}
              placeholder="Search card name or ID…"
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <Text style={styles.hint}>Tap a limit to set it (✕ = forbidden). Tap again to remove.</Text>
          <FlatList
            data={searchResults}
            keyExtractor={c => c.id}
            renderItem={({ item }) => renderCardLine(item.name, item.id, renderLimitChips({ name: item.name, id: item.id }))}
            ListEmptyComponent={<Text style={styles.emptyText}>{search ? 'No cards found' : 'Type to search cards'}</Text>}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => `${r.kind}-${i}`}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {isCustom && (
        <TouchableOpacity style={styles.fab} onPress={() => { setAddMode(m => !m); setSearch(''); }}>
          <Feather name={addMode ? 'check' : 'plus'} size={22} color="#000" />
        </TouchableOpacity>
      )}

      <Modal visible={renameOpen} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setRenameOpen(false)} />
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Rename Banlist</Text>
            <TextInput style={styles.input} value={renameText} onChangeText={setRenameText} autoFocus />
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
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },

  infoBar:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface },
  infoText: { color: theme.textMuted, fontSize: 12 },
  link:     { color: theme.accent, fontSize: 12, textDecorationLine: 'underline' },
  dupBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dupText:  { color: theme.accent, fontSize: 12, fontWeight: '600' },

  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6 },
  groupDot:    { width: 10, height: 10, borderRadius: 5 },
  groupTitle:  { color: theme.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  cardRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 8, marginHorizontal: 12, marginVertical: 3, padding: 8, gap: 10 },
  thumb:    { width: 40, height: 56, borderRadius: 4, backgroundColor: theme.border },
  cardInfo: { flex: 1 },
  cardName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  cardSub:  { color: theme.textMuted, fontSize: 11, marginTop: 2 },

  limitChips:          { flexDirection: 'row', gap: 4 },
  limitChip:           { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  limitChipText:       { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  limitChipTextActive: { color: '#000' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 8, margin: 12, marginBottom: 4 },
  search:     { flex: 1, color: theme.text, paddingVertical: 10, paddingRight: 10, fontSize: 14 },
  hint:       { color: theme.textMuted, fontSize: 11, marginHorizontal: 14, marginBottom: 6 },
  emptyText:  { color: theme.textMuted, textAlign: 'center', marginTop: 24, fontSize: 13 },

  fab: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent, right: 20, bottom: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },

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
