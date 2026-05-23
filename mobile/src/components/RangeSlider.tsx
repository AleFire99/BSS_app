import React, { useRef, useState, useMemo } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { ThemeType } from '../theme';
import { useAppSettings } from '../contexts/AppSettingsContext';

interface Props {
  min: number;
  max: number;
  values: [number, number];
  onChange: (v: [number, number]) => void;
}

const THUMB = 24;

export default function RangeSlider({ min, max, values, onChange }: Props) {
  const { theme } = useAppSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [trackWidth, setTrackWidth] = useState(0);

  const trackWidthRef = useRef(0);
  const valuesRef     = useRef(values);
  const onChangeRef   = useRef(onChange);
  const minRef        = useRef(min);
  const maxRef        = useRef(max);
  valuesRef.current   = values;
  onChangeRef.current = onChange;
  minRef.current      = min;
  maxRef.current      = max;

  const leftStartX  = useRef(0);
  const rightStartX = useRef(0);

  const posFromVal = (val: number) => {
    const tw = trackWidthRef.current;
    return tw > 0 ? ((val - minRef.current) / (maxRef.current - minRef.current)) * tw : 0;
  };

  const valFromPos = (pos: number) => {
    const tw = trackWidthRef.current;
    if (tw === 0) return minRef.current;
    return Math.round(
      Math.min(maxRef.current, Math.max(minRef.current,
        minRef.current + (pos / tw) * (maxRef.current - minRef.current)
      ))
    );
  };

  const leftPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      leftStartX.current = posFromVal(valuesRef.current[0]);
    },
    onPanResponderMove: (_, gs) => {
      const newVal = valFromPos(leftStartX.current + gs.dx);
      const right  = valuesRef.current[1];
      const clamped = Math.min(newVal, right);
      if (clamped !== valuesRef.current[0]) onChangeRef.current([clamped, right]);
    },
  })).current;

  const rightPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      rightStartX.current = posFromVal(valuesRef.current[1]);
    },
    onPanResponderMove: (_, gs) => {
      const newVal = valFromPos(rightStartX.current + gs.dx);
      const left   = valuesRef.current[0];
      const clamped = Math.max(newVal, left);
      if (clamped !== valuesRef.current[1]) onChangeRef.current([left, clamped]);
    },
  })).current;

  const leftPos  = posFromVal(values[0]);
  const rightPos = posFromVal(values[1]);

  return (
    <View
      style={styles.container}
      onLayout={e => {
        const w = e.nativeEvent.layout.width;
        trackWidthRef.current = w;
        setTrackWidth(w);
      }}
    >
      <View style={styles.track} />
      {trackWidth > 0 && (
        <>
          <View style={[styles.fill, { left: leftPos, width: Math.max(0, rightPos - leftPos) }]} />
          <View style={[styles.thumb, { left: leftPos - THUMB / 2 }]} {...leftPan.panHandlers} />
          <View style={[styles.thumb, { left: rightPos - THUMB / 2 }]} {...rightPan.panHandlers} />
        </>
      )}
    </View>
  );
}

function makeStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { height: THUMB + 8, justifyContent: 'center', marginHorizontal: THUMB / 2 },
    track:     { height: 4, backgroundColor: theme.border, borderRadius: 2 },
    fill:      { position: 'absolute', height: 4, backgroundColor: theme.accent, borderRadius: 2 },
    thumb: {
      position: 'absolute',
      width: THUMB, height: THUMB, borderRadius: THUMB / 2,
      backgroundColor: '#fff',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
    },
  });
}
