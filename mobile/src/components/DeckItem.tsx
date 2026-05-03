import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Deck } from '../types';
import { COLOR_MAP, theme } from '../theme';

interface Props {
  deck: Deck;
  onPress: () => void;
}

export default function DeckItem({ deck, onPress }: Props) {
  const colorEntries = Object.entries(deck.colors).sort((a, b) => b[1] - a[1]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.name}>{deck.name}</Text>
        <Text style={styles.count}>{deck.card_count} cards</Text>
      </View>
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
      {deck.notes ? (
        <Text style={styles.notes} numberOfLines={1}>{deck.notes}</Text>
      ) : null}
      <Text style={styles.date}>
        Updated {new Date(deck.updated_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 5,
    padding: 14,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
  count: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  colorText: { color: theme.textMuted, fontSize: 12 },
  notes: { color: theme.textMuted, fontSize: 12 },
  date: { color: theme.border, fontSize: 11 },
});
