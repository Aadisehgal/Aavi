// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/components/HolographicWidget.js
// Purpose: Floating holographic info widget with animated HUD frame

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * HolographicWidget — a translucent HUD panel with animated corner brackets
 * and optional scanline effect. Used as a floating overlay widget.
 *
 * Props:
 *   title     {string}  — widget title
 *   value     {string}  — primary display value
 *   unit      {string}  — unit label (e.g. "dB", "%", "°C")
 *   subtitle  {string}  — secondary label
 *   color     {string}  — accent colour (default cyan)
 *   pulse     {boolean} — enable pulse animation
 */
export default function HolographicWidget({
  title    = 'SYSTEM',
  value    = '—',
  unit     = '',
  subtitle = '',
  color    = '#00e5ff',
  pulse    = false,
}) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scanAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  }, []);

  const scanTranslate = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 80] });

  return (
    <Animated.View style={[styles.container, { borderColor: color, opacity: opacityAnim }]}>
      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />

      {/* Scanline */}
      <Animated.View style={[styles.scanline, { backgroundColor: color, transform: [{ translateY: scanTranslate }] }]} />

      {/* Content */}
      <Text style={[styles.title, { color }]}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {!!unit && <Text style={[styles.unit, { color }]}>{unit}</Text>}
      </View>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:  {
    minWidth: 110, minHeight: 70, padding: 10,
    backgroundColor: 'rgba(0,20,30,0.82)',
    borderWidth: 1, borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  corner:     { position: 'absolute', width: 10, height: 10, borderWidth: 1.5 },
  cornerTL:   { top: 2, left: 2, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR:   { top: 2, right: 2, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL:   { bottom: 2, left: 2, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR:   { bottom: 2, right: 2, borderLeftWidth: 0, borderTopWidth: 0 },
  scanline:   { position: 'absolute', left: 0, right: 0, height: 1, opacity: 0.18 },
  title:      { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  valueRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  value:      { fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  unit:       { fontSize: 11, marginBottom: 4 },
  subtitle:   { color: '#546e7a', fontSize: 9, marginTop: 4, letterSpacing: 0.5 },
});
