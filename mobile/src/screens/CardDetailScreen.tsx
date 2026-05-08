import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, COLOR_MAP } from '../theme';
import { Effect, QAItem } from '../types';
import { getKeywordDetail, getCardRulingsById } from '../api';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

const LEVEL_COLOR: Record<number, string> = {
  1: '#1e88e5',
  2: '#fb8c00',
  3: '#43a047',
  4: '#8e24aa',
};

export default function CardDetailScreen({ route, navigation }: Props) {
  const card = route.params.card;
  const [activeId, setActiveId] = useState(card.id);

  useEffect(() => {
    navigation.setOptions({ title: card.name });
  }, [card.name]);
  const imageUrl = `https://www.bssdb.dev/cards/bss/${activeId}.png`;
  const allArtIds = [card.id, ...(card.alt_art_ids ?? [])];

  // Card rulings — fetched on mount, shown only if non-empty
  const [cardRulings, setCardRulings] = useState<QAItem[]>([]);
  const [rulingsModal, setRulingsModal] = useState(false);

  useEffect(() => {
    getCardRulingsById(card.id).then(setCardRulings).catch(() => {});
  }, [card.id]);

  // Keyword detail modal
  const [kwModal,   setKwModal]   = useState<{ name: string; description: string; qa: QAItem[] } | null>(null);
  const [kwLoading, setKwLoading] = useState(false);

  const openKeyword = async (name: string) => {
    setKwLoading(true);
    setKwModal({ name, description: '', qa: [] });
    try {
      const detail = await getKeywordDetail(name);
      setKwModal(detail);
    } finally {
      setKwLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />

      {/* Alt art strip */}
      {allArtIds.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.altStrip} contentContainerStyle={styles.altContent}>
          {allArtIds.map(id => (
            <TouchableOpacity key={id} onPress={() => setActiveId(id)} activeOpacity={0.75}>
              <Image
                source={{ uri: `https://www.bssdb.dev/cards/bss/${id}.png` }}
                style={[styles.altThumb, activeId === id && styles.altThumbActive]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Header */}
      <View style={styles.row}>
        {card.color.map(c => (
          <View key={c} style={[styles.colorBadge, { backgroundColor: COLOR_MAP[c] ?? '#999' }]}>
            <Text style={styles.colorText}>{c}</Text>
          </View>
        ))}
        <Text style={styles.rarity}>{card.rarity}</Text>
        <Text style={styles.cardId}>{card.id}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="Type" value={card.type} />
        <Stat label="Set"  value={card.set} />
        <Stat label="Cost" value={String(card.cost)} />
      </View>

      {card.subtypes.filter(Boolean).length > 0 && (
        <Text style={styles.subtypes}>{card.subtypes.join(' · ')}</Text>
      )}

      {/* Core levels */}
      {card.core.length > 0 && (
        <Section title="Core Levels">
          <View style={styles.coreCards}>
            {card.core.map(lv => {
              const color = LEVEL_COLOR[lv.lv] ?? '#9e9e9e';
              return (
                <View key={lv.lv} style={[styles.coreCard, { borderTopColor: color }]}>
                  <View style={[styles.coreLvBadge, { backgroundColor: color }]}>
                    <Text style={styles.coreLvText}>Lv {lv.lv}</Text>
                  </View>
                  {card.type !== 'NEXUS' && (
                    <>
                      <Text style={[styles.coreBP, { color }]}>{lv.bp.toLocaleString()}</Text>
                      <Text style={styles.coreBPLabel}>BP</Text>
                    </>
                  )}
                  <View style={styles.coreCoresRow}>
                    {Array.from({ length: lv.cores }).map((_, i) => (
                      <View key={i} style={[styles.coreGem, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <Text style={styles.coreCoresLabel}>{lv.cores} core{lv.cores !== 1 ? 's' : ''}</Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* Effects */}
      {card.effects.filter(e => e.condition || e.details || e.keywords.length > 0).length > 0 && (
        <Section title="Effects">
          {card.effects.map((e, i) => (
            <EffectBlock key={i} effect={e} onKeywordPress={openKeyword} />
          ))}
        </Section>
      )}

      {/* Card rulings button — only if rulings exist */}
      {cardRulings.length > 0 && (
        <TouchableOpacity style={styles.rulingsBtn} onPress={() => setRulingsModal(true)}>
          <Feather name="book-open" size={15} color={theme.accent} />
          <Text style={styles.rulingsBtnText}>
            {cardRulings.length} Official Ruling{cardRulings.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Keyword detail modal */}
      <Modal visible={!!kwModal} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setKwModal(null)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.centeredSheet}>
            {kwModal && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{kwModal.name}</Text>
                  <TouchableOpacity onPress={() => setKwModal(null)}>
                    <Feather name="x" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {kwLoading
                    ? <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
                    : <>
                        <Text style={styles.kwDefText}>{kwModal.description}</Text>
                        {kwModal.qa.length > 0 && (
                          <>
                            <Text style={styles.qaHeader}>Rulings ({kwModal.qa.length})</Text>
                            {kwModal.qa.map((qa, i) => <QABlock key={i} qa={qa} />)}
                          </>
                        )}
                      </>
                  }
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Card rulings modal */}
      <Modal visible={rulingsModal} transparent animationType="fade">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setRulingsModal(false)} />
        <View style={styles.centeredWrap} pointerEvents="box-none">
          <View style={styles.centeredSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.sheetTitle}>{card.name}</Text>
                <Text style={styles.sheetSub}>{card.id} · {cardRulings.length} ruling{cardRulings.length !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setRulingsModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {cardRulings.map((qa, i) => <QABlock key={i} qa={qa} />)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function QABlock({ qa }: { qa: QAItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.qaBlock} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
      <Text style={styles.qaQ}>{qa.question}</Text>
      {expanded && <Text style={styles.qaA}>{qa.answer}</Text>}
      <Text style={styles.qaToggle}>{expanded ? '▲ Hide' : '▼ Show answer'}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EffectBlock({ effect, onKeywordPress }: { effect: Effect; onKeywordPress: (name: string) => void }) {
  const hasContent = effect.condition || effect.details || effect.keywords.length > 0;
  if (!hasContent) return null;
  return (
    <View style={styles.effectBlock}>
      {effect.levels.length > 0 && (
        <View style={styles.effectLevelsRow}>
          {effect.levels.map(lv => (
            <View key={lv} style={[styles.effectLvBadge, { backgroundColor: LEVEL_COLOR[lv] ?? '#9e9e9e' }]}>
              <Text style={styles.effectLvText}>Lv {lv}</Text>
            </View>
          ))}
        </View>
      )}
      {effect.steps.length > 0 && (
        <Text style={styles.effectSteps}>{effect.steps.join(' / ')}</Text>
      )}
      {effect.condition && effect.condition !== 'N/A' && (
        <Text style={styles.effectCondition}>{effect.condition}</Text>
      )}
      {effect.keywords.map((kw, i) => (
        <TouchableOpacity key={i} onPress={() => onKeywordPress(kw.name)} activeOpacity={0.7}>
          <Text style={styles.keyword}>
            {kw.name}{kw.modifier != null ? `: ${kw.modifier}` : ''} ↗
          </Text>
        </TouchableOpacity>
      ))}
      {effect.details && effect.details !== 'N/A' && (
        <Text style={styles.effectDetails}>{effect.details}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content:   { padding: 16, paddingBottom: 40 },
  image:     { width: '100%', height: 280, borderRadius: 10, marginBottom: 12 },

  altStrip:       { marginBottom: 14 },
  altContent:     { gap: 6 },
  altThumb:       { width: 54, height: 76, borderRadius: 4, backgroundColor: theme.border, opacity: 0.5 },
  altThumbActive: { opacity: 1, borderWidth: 2, borderColor: theme.accent },

  row:        { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  colorBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  colorText:  { color: '#000', fontSize: 12, fontWeight: '700' },
  rarity:     { fontSize: 16, fontWeight: '800', color: theme.textMuted },
  cardId:     { fontSize: 12, color: theme.textMuted, marginLeft: 'auto' },
  statsRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat:       { flex: 1, backgroundColor: theme.surface, borderRadius: 8, padding: 10, alignItems: 'center' },
  statLabel:  { color: theme.textMuted, fontSize: 10, marginBottom: 2 },
  statValue:  { color: theme.text, fontSize: 13, fontWeight: '600' },
  subtypes:   { color: theme.textMuted, fontSize: 12, marginBottom: 12 },

  section:      { marginTop: 16 },
  sectionTitle: { color: theme.accent, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  coreCards:     { flexDirection: 'row', gap: 8 },
  coreCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 10,
    borderTopWidth: 3, padding: 10, alignItems: 'center', gap: 4,
  },
  coreLvBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 4 },
  coreLvText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  coreBP:        { fontSize: 18, fontWeight: '800' },
  coreBPLabel:   { color: theme.textMuted, fontSize: 10, marginTop: -4 },
  coreCoresRow:  { flexDirection: 'row', gap: 3, marginTop: 4 },
  coreGem:       { width: 8, height: 8, borderRadius: 4 },
  coreCoresLabel:{ color: theme.textMuted, fontSize: 10 },

  effectBlock:     { backgroundColor: theme.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  effectLevelsRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  effectLvBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  effectLvText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  effectSteps:     { color: '#1e88e5', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  effectCondition: { color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  keyword:         { color: '#43a047', fontSize: 13, fontWeight: '600', marginBottom: 2, textDecorationLine: 'underline' },
  effectDetails:   { color: theme.text, fontSize: 13, lineHeight: 20 },

  rulingsBtn:     { marginTop: 20, backgroundColor: theme.surface, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.border },
  rulingsBtnText: { color: theme.accent, fontSize: 14, fontWeight: '700' },

  centeredWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    padding: 20, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centeredSheet: {
    width: '100%', maxHeight: '80%',
    backgroundColor: theme.surface,
    borderRadius: 20, padding: 20,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle:  { color: theme.text, fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  sheetSub:    { color: theme.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
  closeBtn:    { color: theme.textMuted, fontSize: 18, lineHeight: 22 },

  kwDefText: { color: theme.text, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  qaHeader:  { color: theme.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  qaBlock:  { backgroundColor: theme.bg, borderRadius: 8, padding: 12, marginBottom: 8 },
  qaQ:      { color: theme.text, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  qaA:      { color: theme.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  qaToggle: { color: theme.accent, fontSize: 11, fontWeight: '600' },
});
