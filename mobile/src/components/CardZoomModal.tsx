import React, { useMemo } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeType } from '../theme';
import { useAppSettings } from '../contexts/AppSettingsContext';

interface Props {
  uri: string;
  visible: boolean;
  onClose: () => void;
}

export default function CardZoomModal({ uri, visible, onClose }: Props) {
  const { theme } = useAppSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={16}>
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '90%',
      height: '80%',
    },
    closeBtn: {
      position: 'absolute',
      top: 48,
      right: 20,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 8,
      elevation: 4,
    },
  });
}
