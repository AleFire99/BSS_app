import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Deck, DeckCard, Card } from '../types';
import { ThemeType } from '../theme';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useTranslation } from 'react-i18next';
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
  const { theme } = useAppSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [phase, setPhase]                   = useState<Phase>('hand');
  const [hand, setHand]                     = useState<string[]>([]);
  const [pool, setPool]                     = useState<string[]>([]);
  const [handMulliganed, setHandMulliganed] = useState(false);
  const [totalRounds,    setTotalRounds]    = useState(0);
  const [keptHands,      setKeptHands]      = useState(0);
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
    setTotalRounds(r => r + 1);
    setHandMulliganed(true);
    const expanded = deck.cards.flatMap(dc => Array(dc.count).fill(dc.card_id));
    const shuffled = shuffle(expanded);
    setHand(shuffled.slice(0, 4));
    setPool(shuffled.slice(4));
    setPhase('hand');
  };

  useEffect(() => { drawHand(); }, []);

  const handleAccept = () => {
    if (!handMulliganed) {
      setTotalRounds(r => r + 1);
      setKeptHands(k => k + 1);
    }
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

  const cleanPct = totalRounds > 0
    ? Math.round(keptHands / totalRounds * 100)
    : 0;

  return (
    <Modal visible animationType="fade" transparent>
      <CardZoomModal uri={zoomedUri ?? ''} visible={!!zoomedUri} onClose={() => setZoomedUri(null)} />
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('handTester.title')}</Text>
              {totalRounds > 0 && (
                <Text style={styles.stats}>
                  {t('handTester.stats', { count: totalRounds, pct: cleanPct })}
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

          <View style={styles.actions}>
            {phase === 'hand' && (
              <>
                {!handMulliganed && (
                  <TouchableOpacity style={[styles.pill, styles.pillSecondary]} onPress={handleMulligan}>
                    <Text style={styles.pillSecondaryText}>{t('handTester.mulligan')}</Text>
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

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
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
}
