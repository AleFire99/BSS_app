import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Deck, DeckCard, Card } from '../types';
import { theme } from '../theme';
import CardZoomModal from './CardZoomModal';

const MAX_HAND = 7;

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
  const [phase, setPhase]                   = useState<Phase>('hand');
  const [hand, setHand]                     = useState<string[]>([]);
  const [pool, setPool]                     = useState<string[]>([]);
  const [handMulliganed, setHandMulliganed] = useState(false);
  const [handsAccepted, setHandsAccepted]   = useState(0);
  const [mulligansUsed, setMulligansUsed]   = useState(0);
  const [zoomedUri, setZoomedUri]           = useState<string | null>(null);

  const drawHand = () => {
    const expanded = deck.cards.flatMap(dc => Array(dc.count).fill(dc.card_id));
    const shuffled = shuffle(expanded);
    setHand(shuffled.slice(0, 4));
    setPool(shuffled.slice(4));
    setPhase('hand');
    setHandMulliganed(false);
  };

  const handleMulligan = () => {
    setMulligansUsed(m => m + 1);
    setHandMulliganed(true);
    const expanded = deck.cards.flatMap(dc => Array(dc.count).fill(dc.card_id));
    const shuffled = shuffle(expanded);
    setHand(shuffled.slice(0, 4));
    setPool(shuffled.slice(4));
    setPhase('hand');
  };

  useEffect(() => { drawHand(); }, []);

  const handleAccept = () => {
    setHandsAccepted(h => h + 1);
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

  const cleanPct = handsAccepted > 0
    ? Math.round((handsAccepted - mulligansUsed) / handsAccepted * 100)
    : 0;

  return (
    <Modal visible animationType="fade" transparent>
      <CardZoomModal uri={zoomedUri ?? ''} visible={!!zoomedUri} onClose={() => setZoomedUri(null)} />
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Opening Hand</Text>
              {handsAccepted > 0 && (
                <Text style={styles.stats}>
                  {handsAccepted} hand{handsAccepted !== 1 ? 's' : ''} · {cleanPct}% kept
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={drawHand} style={styles.headerBtn}>
              <Feather name="rotate-ccw" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Feather name="x" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Card grid */}
          <View style={styles.cardGrid}>
            {hand.map((cardId, i) => (
              <TouchableOpacity
                key={`${cardId}-${i}`}
                style={styles.cardWrapper}
                onPress={() => setZoomedUri(`https://www.bssdb.dev/cards/bss/${cardId}.png`)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: `https://www.bssdb.dev/cards/bss/${cardId}.png` }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {phase === 'hand' && (
              <>
                {!handMulliganed && (
                  <TouchableOpacity style={[styles.pill, styles.pillSecondary]} onPress={handleMulligan}>
                    <Text style={styles.pillSecondaryText}>Mulligan</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.pill} onPress={handleAccept}>
                  <Text style={styles.pillText}>+1</Text>
                </TouchableOpacity>
              </>
            )}
            {phase === 'final' && hand.length < MAX_HAND && pool.length > 0 && (
              <TouchableOpacity style={styles.pill} onPress={handleDrawMore}>
                <Text style={styles.pillText}>+1</Text>
              </TouchableOpacity>
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
    alignItems: 'center',
    padding: 16,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 4,
  },
  title:     { color: theme.text, fontSize: 18, fontWeight: '700' },
  stats:     { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  headerBtn: { padding: 6 },
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
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    justifyContent: 'flex-end',
  },
  pill: {
    backgroundColor: theme.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  pillText:          { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillSecondaryText: { color: theme.accent, fontWeight: '700', fontSize: 14 },
});
