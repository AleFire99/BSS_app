import React, { useState } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, Image,
} from 'react-native';
import { Deck, DeckCard, Card } from '../types';
import { theme } from '../theme';

interface Props {
  deck: Deck & { cards: DeckCard[] };
  cardMap: Record<string, Card>;
  onClose: () => void;
}

type Phase = 'idle' | 'hand' | 'final';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HandTester({ deck, cardMap, onClose }: Props) {
  const [phase, setPhase]         = useState<Phase>('idle');
  const [hand, setHand]           = useState<string[]>([]);
  const [pool, setPool]           = useState<string[]>([]);
  const [mulligans, setMulligans] = useState(0);

  const drawHand = (mull: number) => {
    const expanded = deck.cards.flatMap(dc => Array(dc.count).fill(dc.card_id));
    const shuffled = shuffle(expanded);
    setHand(shuffled.slice(0, 4));
    setPool(shuffled.slice(4));
    setMulligans(mull);
    setPhase('hand');
  };

  const handleAccept = () => {
    setPool(prev => {
      if (prev.length > 0) {
        setHand(h => [...h, prev[0]]);
        return prev.slice(1);
      }
      return prev;
    });
    setPhase('final');
  };

  const handleDrawMore = () => {
    setPool(prev => {
      if (prev.length > 0) {
        setHand(h => [...h, prev[0]]);
        return prev.slice(1);
      }
      return prev;
    });
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Hand Test</Text>
              {mulligans > 0 && (
                <Text style={styles.mulliganCount}>
                  {mulligans} mulligan{mulligans !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {phase === 'idle' && (
            <View style={styles.center}>
              <Text style={styles.deckInfo}>{deck.card_count} cards in deck</Text>
              <TouchableOpacity style={styles.btn} onPress={() => drawHand(0)}>
                <Text style={styles.btnText}>Draw Opening Hand</Text>
              </TouchableOpacity>
            </View>
          )}

          {(phase === 'hand' || phase === 'final') && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cardScroll}
                contentContainerStyle={styles.cardRow}
              >
                {hand.map((cardId, i) => {
                  const card = cardMap[cardId];
                  const imageUri = `https://www.bssdb.dev/cards/bss/${cardId}.png`;
                  return (
                    <View key={`${cardId}-${i}`} style={styles.cardWrapper}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.cardImage}
                        resizeMode="contain"
                      />
                      {card && (
                        <Text style={styles.cardName} numberOfLines={2}>
                          {card.name}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <Text style={styles.handCount}>{hand.length} cards in hand</Text>

              <View style={styles.actions}>
                {phase === 'hand' && (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnSecondary, mulligans >= 1 && styles.btnDisabled]}
                      onPress={() => mulligans < 1 && drawHand(mulligans + 1)}
                      disabled={mulligans >= 1}
                    >
                      <Text style={[styles.btnSecondaryText, mulligans >= 1 && styles.btnTextDisabled]}>
                        Mulligan
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btn} onPress={handleAccept}>
                      <Text style={styles.btnText}>Accept + Draw 5th</Text>
                    </TouchableOpacity>
                  </>
                )}
                {phase === 'final' && (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnSecondary, pool.length === 0 && styles.btnDisabled]}
                      onPress={handleDrawMore}
                      disabled={pool.length === 0}
                    >
                      <Text style={styles.btnSecondaryText}>Draw 1 More</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btn} onPress={() => drawHand(0)}>
                      <Text style={styles.btnText}>New Hand</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title:         { color: theme.text, fontSize: 18, fontWeight: '700' },
  mulliganCount: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  closeBtn:      { padding: 4 },
  closeBtnText:  { color: theme.textMuted, fontSize: 20 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 20, padding: 24,
  },
  deckInfo: { color: theme.textMuted, fontSize: 15 },
  cardScroll:  { maxHeight: 220 },
  cardRow:     { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  cardWrapper: { width: 110, alignItems: 'center', gap: 6 },
  cardImage:   { width: 110, height: 154, borderRadius: 6, backgroundColor: theme.border },
  cardName: {
    color: theme.textMuted, fontSize: 11,
    textAlign: 'center', width: 110,
  },
  handCount: {
    color: theme.textMuted, fontSize: 12,
    textAlign: 'center', marginBottom: 4,
  },
  actions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
  },
  btn: {
    flex: 1, backgroundColor: theme.accent,
    borderRadius: 8, padding: 14, alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.accent,
  },
  btnDisabled:     { opacity: 0.4 },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondaryText:{ color: theme.accent, fontWeight: '700', fontSize: 14 },
  btnTextDisabled: { color: theme.textMuted },
});
