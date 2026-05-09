import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Deck, DeckCard, Card } from '../types';
import { theme } from '../theme';
import { buildJSON, buildTXT, buildCSV, shareTextExport } from '../utils/deckExport';
import DeckExportImage from './DeckExportImage';

type ExportState = 'idle' | 'preparing-image' | 'sharing' | 'error';

interface Props {
  visible: boolean;
  deck: Deck & { cards: DeckCard[] };
  cardMap: Record<string, Card>;
  onClose: () => void;
}

export default function DeckExportModal({ visible, deck, cardMap, onClose }: Props) {
  const [state, setState] = useState<ExportState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturingImage, setCapturingImage] = useState(false);
  const imageViewRef = useRef<View>(null);

  const safeName = deck.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  const reset = () => { setState('idle'); setErrorMsg(null); setCapturingImage(false); };

  const handleClose = () => { reset(); onClose(); };

  const wrap = async (fn: () => Promise<void>) => {
    try {
      setState('sharing');
      await fn();
      setState('idle');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Export failed.');
      setState('error');
    }
  };

  const exportTXT = () => wrap(async () => {
    await shareTextExport(buildTXT(deck, cardMap), `${safeName}.txt`, 'text/plain');
  });

  const exportCSV = () => wrap(async () => {
    await shareTextExport(buildCSV(deck, cardMap), `${safeName}.csv`, 'text/csv');
  });

  const exportJSON = () => wrap(async () => {
    await shareTextExport(buildJSON(deck), `${safeName}.json`, 'application/json');
  });

  const exportImage = () => {
    setState('preparing-image');
    setCapturingImage(true);
  };

  const handleImageReady = async (ref: React.RefObject<View | null>) => {
    try {
      await new Promise(res => setTimeout(res, 200));
      const uri = await captureRef(ref, { format: 'png', quality: 1.0 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${safeName}.png` });
      setState('idle');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Image capture failed.');
      setState('error');
    } finally {
      setCapturingImage(false);
    }
  };

  const busy = state === 'sharing' || state === 'preparing-image';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* Off-screen image render target — mounted only when capturing */}
      {capturingImage && (
        <View style={styles.offscreen} pointerEvents="none">
          <DeckExportImage deck={deck} cardMap={cardMap} onReady={handleImageReady} />
        </View>
      )}

      <Pressable style={styles.overlay} onPress={busy ? undefined : handleClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>Export Deck</Text>

          {state === 'error' ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : busy ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.accent} size="large" />
              <Text style={styles.loadingText}>
                {state === 'preparing-image' ? 'Preparing image…' : 'Opening share sheet…'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              <TouchableOpacity style={styles.exportBtn} onPress={exportImage}>
                <Text style={styles.exportBtnIcon}>🖼</Text>
                <Text style={styles.exportBtnLabel}>Image</Text>
                <Text style={styles.exportBtnSub}>PNG · card grid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={exportTXT}>
                <Text style={styles.exportBtnIcon}>📄</Text>
                <Text style={styles.exportBtnLabel}>TXT</Text>
                <Text style={styles.exportBtnSub}>plain text list</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
                <Text style={styles.exportBtnIcon}>📊</Text>
                <Text style={styles.exportBtnLabel}>CSV</Text>
                <Text style={styles.exportBtnSub}>spreadsheet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={exportJSON}>
                <Text style={styles.exportBtnIcon}>🔁</Text>
                <Text style={styles.exportBtnLabel}>JSON</Text>
                <Text style={styles.exportBtnSub}>import-ready</Text>
              </TouchableOpacity>
            </View>
          )}

          {!busy && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    zIndex: -1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exportBtn: {
    width: '47%',
    backgroundColor: theme.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  exportBtnIcon: {
    fontSize: 28,
  },
  exportBtnLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  exportBtnSub: {
    color: theme.textMuted,
    fontSize: 11,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    color: theme.textMuted,
    fontSize: 14,
  },
  errorWrap: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: {
    color: theme.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});
