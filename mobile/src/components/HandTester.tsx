import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Image,
} from 'react-native';
import { Deck, DeckCard, Card } from '../types';
import { theme } from '../theme';

interface Props {
  deck: Deck & { cards: DeckCard[] };
  cardMap: Record<string, Card>;
  onClose: () => void;
}

type Phase = 'hand' | 'final';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HandTester({ deck, cardMap, onClose }: Props) {
  const [phase, setPhase]         = useState<Phase>('hand');
  const [hand, setHand]           = useState<string[]>([]);
  const [pool, setPool]           = useState<string[]>([]);
  const [mulligans, setMulligans] = useState(0);

  const drawHand = () => {
    const expanded = deck.cards.flatMap(dc => Array(dc.count).fill(dc.card_id));
    const shuffled = shuffle(expanded);
    setHand(shuffled.slice(0, 4));
    setPool(shuffled.slice(4));
    setPhase('hand');
  };

  const handleMulligan = () => {
    setMulligans(m => m + 1);
    drawHand();
  };

  useEffect(() => { drawHand(); }, []);

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
    <Modal visible animationType="fade" transparent>
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

          {/* Card grid */}
          <View style={styles.cardGrid}>
            {hand.map((cardId, i) => (
              <View key={`${cardId}-${i}`} style={styles.cardWrapper}>
                <Image
                  source={{ uri: `https://www.bssdb.dev/cards/bss/${cardId}.png` }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {phase === 'hand' && (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleMulligan}>
                  <Text style={styles.btnSecondaryText}>Mulligan</Text>
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
                <TouchableOpacity style={styles.btn} onPress={drawHand}>
                  <Text style={styles.btnText}>New Hand</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: theme.bg,
    borderRadius: 16,
    paddingBottom: 20,
    maxHeight: '85%',
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  cardWrapper: { width: 80 },
  cardImage:   { width: 80, height: 112, borderRadius: 6, backgroundColor: theme.border },
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
});
