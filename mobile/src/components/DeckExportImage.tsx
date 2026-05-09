import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Deck, DeckCard, Card } from '../types';
import { theme, COLOR_MAP } from '../theme';

const TYPE_ORDER = ['SPIRIT', 'NEXUS', 'MAGIC'];
const CARD_W = 108;
const CARD_H = 151;
const COLS = 3;
const EXPORT_WIDTH = 360;

interface Props {
  deck: Deck & { cards: DeckCard[] };
  cardMap: Record<string, Card>;
  onReady: (ref: React.RefObject<View | null>) => void;
}

const DeckExportImage = React.forwardRef<View, Props>(({ deck, cardMap, onReady }, _) => {
  const viewRef = useRef<View>(null);
  const uniqueCards = deck.cards.length;
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (uniqueCards === 0 || loadedCount >= uniqueCards) {
      onReady(viewRef);
    }
  }, [loadedCount, uniqueCards]);

  const onImageSettle = () => setLoadedCount(c => c + 1);

  const sections = TYPE_ORDER.map(type => ({
    type,
    cards: deck.cards.filter(dc => cardMap[dc.card_id]?.type === type),
  })).filter(s => s.cards.length > 0);

  const colorEntries = Object.entries(deck.colors).sort((a, b) => b[1] - a[1]);

  return (
    <View ref={viewRef} style={styles.root} collapsable={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appLabel}>BSS COMPANION</Text>
        <Text style={styles.deckName} numberOfLines={2}>{deck.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{deck.card_count} cards</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>Avg ⬡ {deck.avg_cost.toFixed(1)}</Text>
        </View>
        {colorEntries.length > 0 && (
          <View style={styles.colorRow}>
            {colorEntries.map(([color, count]) => (
              <View key={color} style={styles.colorChip}>
                <View style={[styles.colorDot, { backgroundColor: COLOR_MAP[color] ?? '#999' }]} />
                <Text style={styles.colorLabel}>{color} {count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Card sections */}
      {sections.map(({ type, cards }) => {
        const total = cards.reduce((s, c) => s + c.count, 0);
        // Pad to multiple of COLS for even grid
        const padded = [...cards];
        while (padded.length % COLS !== 0) padded.push({ card_id: '__pad__', count: 0 });

        return (
          <View key={type} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{type}</Text>
              <Text style={styles.sectionCount}>{total}</Text>
            </View>
            <View style={styles.grid}>
              {padded.map((dc, i) => {
                if (dc.card_id === '__pad__') return <View key={`pad-${i}`} style={styles.cardSlot} />;
                return (
                  <View key={dc.card_id} style={styles.cardSlot}>
                    <Image
                      source={{ uri: `https://www.bssdb.dev/cards/bss/${dc.card_id}.png` }}
                      style={styles.cardImage}
                      resizeMode="cover"
                      onLoad={onImageSettle}
                      onError={onImageSettle}
                    />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>×{dc.count}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Exported {new Date().toLocaleDateString()} · BSS Companion
        </Text>
      </View>
    </View>
  );
});

export default DeckExportImage;

const styles = StyleSheet.create({
  root: {
    width: EXPORT_WIDTH,
    backgroundColor: theme.bg,
  },
  header: {
    backgroundColor: theme.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 6,
  },
  appLabel: {
    color: theme.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  deckName: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  metaText: {
    color: theme.textMuted,
    fontSize: 13,
  },
  metaDot: {
    color: theme.border,
    fontSize: 13,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorLabel: {
    color: theme.textMuted,
    fontSize: 12,
  },
  section: {
    marginTop: 12,
    marginHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 6,
  },
  sectionTitle: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardSlot: {
    width: (EXPORT_WIDTH - 16) / COLS,
    height: CARD_H + 8,
    padding: 3,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: CARD_H,
    borderRadius: 6,
    backgroundColor: theme.border,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 12,
  },
  footerText: {
    color: theme.textMuted,
    fontSize: 10,
  },
});
