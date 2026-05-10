import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { Deck, DeckCard, Card } from '../types';
import { theme } from '../theme';
import * as FileSystem from 'expo-file-system/legacy';
import { buildTXT, buildCSV, shareTextExport, saveTextToDevice } from '../utils/deckExport';
import DeckExportImage from './DeckExportImage';

type ExportState = 'idle' | 'sharing' | 'error';

interface Props {
  visible: boolean;
  deck: Deck & { cards: DeckCard[] };
  cardMap: Record<string, Card>;
  onClose: () => void;
}

export default function DeckExportModal({ visible, deck, cardMap, onClose }: Props) {
  const [state, setState] = useState<ExportState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const imageRef = useRef<View | null>(null);

  const safeName = deck.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  const reset = () => { setState('idle'); setErrorMsg(null); };
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

  const exportTXT = () => wrap(() =>
    shareTextExport(buildTXT(deck, cardMap), `${safeName}.txt`, 'text/plain'),
  );
  const exportCSV = () => wrap(() =>
    shareTextExport(buildCSV(deck, cardMap), `${safeName}.csv`, 'text/csv'),
  );
  const saveTXT = () => wrap(() =>
    saveTextToDevice(buildTXT(deck, cardMap), `${safeName}.txt`, 'text/plain'),
  );
  const saveCSV = () => wrap(() =>
    saveTextToDevice(buildCSV(deck, cardMap), `${safeName}.csv`, 'text/csv'),
  );

  const handleImageReady = useCallback((ref: React.RefObject<View | null>) => {
    imageRef.current = ref.current;
  }, []);

  const shareImage = () => wrap(async () => {
    if (!imageRef.current) throw new Error('Image not ready yet.');
    const uri = await captureRef(imageRef.current, { format: 'png', quality: 1 });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Deck Image' });
  });

  const saveImage = () => wrap(async () => {
    if (!imageRef.current) throw new Error('Image not ready yet.');
    const b64 = await captureRef(imageRef.current, { format: 'png', quality: 1, result: 'base64' });
    const dir = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!dir.granted) return;
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(dir.directoryUri, `${safeName}.png`, 'image/png');
    await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  });

  const busy = state === 'sharing';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      {/* Hidden off-screen render of export image so it's ready to capture */}
      {visible && (
        <View style={styles.offscreen} pointerEvents="none">
          <DeckExportImage deck={deck} cardMap={cardMap} onReady={handleImageReady} />
        </View>
      )}

      <Pressable style={styles.overlay} onPress={busy ? undefined : handleClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Export Deck</Text>
            <TouchableOpacity onPress={busy ? undefined : handleClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

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
              <Text style={styles.loadingText}>Opening share sheet…</Text>
            </View>
          ) : (
            <View style={styles.btnList}>
              <View style={styles.exportBtn}>
                <Feather name="image" size={22} color={theme.accent} />
                <View style={styles.exportBtnText}>
                  <Text style={styles.exportBtnLabel}>Image</Text>
                  <Text style={styles.exportBtnSub}>deck card preview</Text>
                </View>
                <TouchableOpacity style={styles.exportAction} onPress={shareImage} disabled={busy}>
                  <Feather name="share-2" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportAction} onPress={saveImage} disabled={busy}>
                  <Feather name="download" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
              </View>
              <View style={styles.exportBtn}>
                <Feather name="file-text" size={22} color={theme.accent} />
                <View style={styles.exportBtnText}>
                  <Text style={styles.exportBtnLabel}>Text</Text>
                  <Text style={styles.exportBtnSub}>plain text list</Text>
                </View>
                <TouchableOpacity style={styles.exportAction} onPress={exportTXT} disabled={busy}>
                  <Feather name="share-2" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportAction} onPress={saveTXT} disabled={busy}>
                  <Feather name="download" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
              </View>
              <View style={styles.exportBtn}>
                <Feather name="grid" size={22} color={theme.accent} />
                <View style={styles.exportBtnText}>
                  <Text style={styles.exportBtnLabel}>CSV</Text>
                  <Text style={styles.exportBtnSub}>spreadsheet format</Text>
                </View>
                <TouchableOpacity style={styles.exportAction} onPress={exportCSV} disabled={busy}>
                  <Feather name="share-2" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportAction} onPress={saveCSV} disabled={busy}>
                  <Feather name="download" size={20} color={busy ? theme.border : theme.accent} />
                </TouchableOpacity>
              </View>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: 0,
    opacity: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn:  { padding: 4 },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  btnList: {
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 14,
  },
  exportAction: { padding: 6 },
  exportBtnText: {
    flex: 1,
    gap: 2,
  },
  exportBtnLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  exportBtnSub: {
    color: theme.textMuted,
    fontSize: 12,
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
});
