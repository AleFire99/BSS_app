import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Deck } from '../types';
import { COLOR_MAP, theme } from '../theme';

interface Props {
  deck: Deck;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function DeckItem({ deck, onPress, onLongPress }: Props) {
  const colorEntries = Object.entries(deck.colors).sort((a, b) => b[1] - a[1]);
  const spirit = deck.type_counts?.['SPIRIT'] ?? 0;
  const magic  = deck.type_counts?.['MAGIC']  ?? 0;
  const nexus  = deck.type_counts?.['NEXUS']  ?? 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}>
      {/* Top row: name + card count + date */}
      <View style={styles.header}>
        <Text style={styles.name}>{deck.name}</Text>
        <Text style={styles.count}>
          {deck.card_count} cards{deck.sideboard_count > 0 ? ` · ${deck.sideboard_count} SB` : ''}
        </Text>
      </View>

      {/* Color chips */}
      {colorEntries.length > 0 && (
        <View style={styles.colorRow}>
          {colorEntries.map(([color, qty]) => (
            <View key={color} style={styles.colorChip}>
              <View style={[styles.dot, { backgroundColor: COLOR_MAP[color] ?? '#999' }]} />
              <Text style={styles.colorText}>{qty}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats row: avg cost + type breakdown */}
      {deck.card_count > 0 && (
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>⬡ {deck.avg_cost}</Text>
          {spirit > 0 && <Text style={styles.statItem}>Spirit {spirit}</Text>}
          {magic  > 0 && <Text style={styles.statItem}>Magic {magic}</Text>}
          {nexus  > 0 && <Text style={styles.statItem}>Nexus {nexus}</Text>}
        </View>
      )}

      <Text style={styles.date}>{new Date(deck.updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:      { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
  count:     { color: theme.accent, fontSize: 14, fontWeight: '600' },
  colorRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:       { width: 12, height: 12, borderRadius: 6 },
  colorText: { color: theme.textMuted, fontSize: 12 },
  statsRow:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statItem:  { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  date:      { color: theme.border, fontSize: 11, textAlign: 'right' },
});
