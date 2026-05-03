import React from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, COLOR_MAP, RARITY_COLOR } from '../theme';
import { Effect } from '../types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

export default function CardDetailScreen({ route }: Props) {
  const card = route.params.card;
  const imageUrl = `https://www.bssdb.dev/cards/bss/${card.id}.png`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />

      {/* Header */}
      <Text style={styles.name}>{card.name}</Text>
      <View style={styles.row}>
        {card.color.map(c => (
          <View key={c} style={[styles.colorBadge, { backgroundColor: COLOR_MAP[c] ?? '#999' }]}>
            <Text style={styles.colorText}>{c}</Text>
          </View>
        ))}
        <Text style={[styles.rarity, { color: RARITY_COLOR[card.rarity] ?? theme.textMuted }]}>
          {card.rarity}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="Type"   value={card.type} />
        <Stat label="Set"    value={card.set} />
        <Stat label="Cost"   value={String(card.cost)} />
      </View>

      {card.subtypes.filter(Boolean).length > 0 && (
        <Text style={styles.subtypes}>{card.subtypes.join(' · ')}</Text>
      )}

      {/* Core levels */}
      {card.core.length > 0 && (
        <Section title="Core Levels">
          {card.core.map(lv => (
            <View key={lv.lv} style={styles.coreRow}>
              <Text style={styles.coreLabel}>Lv {lv.lv}</Text>
              <Text style={styles.coreVal}>{lv.bp.toLocaleString()} BP</Text>
              <Text style={styles.coreVal}>{lv.cores} cores</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Effects */}
      {card.effects.filter(e => e.condition || e.details || e.keywords.length > 0).length > 0 && (
        <Section title="Effects">
          {card.effects.map((e, i) => <EffectBlock key={i} effect={e} />)}
        </Section>
      )}
    </ScrollView>
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

function EffectBlock({ effect }: { effect: Effect }) {
  const hasContent = effect.condition || effect.details || effect.keywords.length > 0;
  if (!hasContent) return null;
  return (
    <View style={styles.effectBlock}>
      {effect.levels.length > 0 && (
        <Text style={styles.effectLevels}>Lv {effect.levels.join(', ')}</Text>
      )}
      {effect.steps.length > 0 && (
        <Text style={styles.effectSteps}>{effect.steps.join(' / ')}</Text>
      )}
      {effect.condition && effect.condition !== 'N/A' && (
        <Text style={styles.effectCondition}>{effect.condition}</Text>
      )}
      {effect.keywords.map((kw, i) => (
        <Text key={i} style={styles.keyword}>
          {kw.name}{kw.modifier != null ? `: ${kw.modifier}` : ''}
        </Text>
      ))}
      {effect.details && effect.details !== 'N/A' && (
        <Text style={styles.effectDetails}>{effect.details}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.bg },
  content:      { padding: 16, paddingBottom: 40 },
  image:        { width: '100%', height: 280, borderRadius: 10, marginBottom: 16 },
  name:         { color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  row:          { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  colorBadge:   { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  colorText:    { color: '#000', fontSize: 12, fontWeight: '700' },
  rarity:       { fontSize: 16, fontWeight: '800' },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat:         { flex: 1, backgroundColor: theme.surface, borderRadius: 8, padding: 10, alignItems: 'center' },
  statLabel:    { color: theme.textMuted, fontSize: 10, marginBottom: 2 },
  statValue:    { color: theme.text, fontSize: 13, fontWeight: '600' },
  subtypes:     { color: theme.textMuted, fontSize: 12, marginBottom: 12 },
  section:      { marginTop: 16 },
  sectionTitle: { color: theme.accent, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  coreRow:      { flexDirection: 'row', gap: 16, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.border },
  coreLabel:    { color: theme.textMuted, fontSize: 13, width: 40 },
  coreVal:      { color: theme.text, fontSize: 13 },
  effectBlock:  { backgroundColor: theme.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  effectLevels: { color: theme.accent, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  effectSteps:  { color: '#1e88e5', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  effectCondition: { color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  keyword:      { color: '#43a047', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  effectDetails:{ color: theme.text, fontSize: 13, lineHeight: 20 },
});
