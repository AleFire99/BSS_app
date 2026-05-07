import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card } from '../types';
import { COLOR_MAP, theme } from '../theme';

interface Props {
  card: Card;
  onPress: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function CardItem({ card, onPress, actionLabel, onAction }: Props) {
  const imageUrl = `https://www.bssdb.dev/cards/bss/${card.id}.png`;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{card.name}</Text>
        <View style={styles.row}>
          <Text style={styles.cost}>⬡ {card.cost}</Text>
          <Text style={styles.rarity}>{card.rarity}</Text>
          <View style={styles.colors}>
            {card.color.map(c => (
              <View key={c} style={[styles.dot, { backgroundColor: COLOR_MAP[c] ?? '#999' }]} />
            ))}
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {card.type} · {card.id}
        </Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 8,
    gap: 10,
  },
  image: {
    width: 50,
    height: 70,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
  info: { flex: 1 },
  name: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cost: { color: theme.textMuted, fontSize: 12 },
  rarity: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  colors: { flexDirection: 'row', gap: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sub: { color: theme.textMuted, fontSize: 11 },
  action: {
    backgroundColor: theme.accent,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
