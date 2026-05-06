import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Animated, PanResponder, Text, TouchableOpacity, StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const REVEAL = 80;
const SNAP_THRESHOLD = 24;
const CARD_RADIUS = 10;

interface Props {
  children: React.ReactNode;
  onDeletePress: () => void;
  collapsing?: boolean;
  onCollapseEnd?: () => void;
  borderRadius?: number;
}

export default function SwipeableRow({ children, onDeletePress, collapsing, onCollapseEnd, borderRadius = CARD_RADIUS }: Props) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const snapOffset = useRef(0);
  const lockedAxis = useRef<'x' | 'y' | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const measuredHeight = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [isCollapsing, setIsCollapsing] = useState(false);

  const onCollapseEndRef = useRef(onCollapseEnd);
  useEffect(() => { onCollapseEndRef.current = onCollapseEnd; }, [onCollapseEnd]);

  const snapTo = useCallback((x: number) => {
    snapOffset.current = x;
    setIsOpen(x > 0);
    Animated.spring(swipeX, { toValue: x, useNativeDriver: true, bounciness: 3 }).start();
  }, [swipeX]);

  useEffect(() => {
    if (!collapsing) return;
    const h = measuredHeight.current;
    if (h > 0) {
      heightAnim.setValue(h);
      setIsCollapsing(true);
      Animated.timing(heightAnim, { toValue: 0, duration: 220, useNativeDriver: false })
        .start(() => onCollapseEndRef.current?.());
    } else {
      onCollapseEndRef.current?.();
    }
  }, [collapsing]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (measuredHeight.current === 0 && h > 0) measuredHeight.current = h;
  }, []);

  const deleteOpacity = swipeX.interpolate({
    inputRange: [0, SNAP_THRESHOLD, REVEAL],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6,
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
        lockedAxis.current = 'x';
      },
      onPanResponderMove: (_, { dx }) => {
        let next = Math.max(0, snapOffset.current + dx);
        if (next > REVEAL) next = REVEAL + (next - REVEAL) * 0.3;
        swipeX.setValue(next);
      },
      onPanResponderRelease: (_, { dx }) => {
        lockedAxis.current = null;
        snapTo(snapOffset.current + dx >= SNAP_THRESHOLD ? REVEAL : 0);
      },
      onPanResponderTerminate: () => {
        lockedAxis.current = null;
        snapTo(0);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.outer, { borderRadius }, isCollapsing && { height: heightAnim, overflow: 'hidden' }]}
      onLayout={onLayout}
    >
      {/* Red background — same shape as the card, revealed as card slides right */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.deleteBg, { opacity: deleteOpacity, borderRadius }]}>
        {isOpen && (
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => { snapTo(0); onDeletePress(); }}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={20} color="#fff" />
            <Text style={styles.deleteLbl}>Delete</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Card slides right over the background */}
      <Animated.View
        style={{ transform: [{ translateX: swipeX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer:        { overflow: 'hidden' },
  deleteBg:     { backgroundColor: '#c62828', justifyContent: 'center' },
  deleteAction: { position: 'absolute', left: 0, top: 0, bottom: 0, width: REVEAL, justifyContent: 'center', alignItems: 'center', gap: 3 },
  deleteLbl:    { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});
