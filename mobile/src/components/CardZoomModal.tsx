import React from 'react';
import { Modal, View, Image, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

interface Props {
  uri: string;
  visible: boolean;
  onClose: () => void;
}

export default function CardZoomModal({ uri, visible, onClose }: Props) {
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

const styles = StyleSheet.create({
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
