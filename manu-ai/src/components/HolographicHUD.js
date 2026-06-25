// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/components/HolographicHUD.js
// Generated: 2026-06-24

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Platform,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const WIDGETS = [
  { id: 'cpu', label: 'CPU', value: '42%', color: '#00F0FF', x: 20, y: 100 },
  { id: 'ram', label: 'RAM', value: '3.2 GB', color: '#00FF88', x: SCREEN_W - 140, y: 100 },
  { id: 'net', label: 'NET', value: '↓ 12 Mbps', color: '#FFAA00', x: 20, y: 300 },
  { id: 'bat', label: 'BAT', value: '87%', color: '#FF0055', x: SCREEN_W - 140, y: 300 },
];

export default function HolographicHUD() {
  const [visible, setVisible] = useState(true);
  const animations = useRef(
    WIDGETS.map(() => ({
      pan: new Animated.ValueXY(),
      float: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      rotateX: new Animated.Value(0),
      rotateY: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const anims = animations.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim.float, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.float, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());

    const scaleAnims = animations.map((anim) =>
      Animated.timing(anim.scale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    );
    Animated.stagger(150, scaleAnims).start();

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, []);

  const createPanResponder = (index) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const anim = animations[index];
        anim.rotateY.setValue(gesture.dx / 20);
        anim.rotateX.setValue(-gesture.dy / 20);
        anim.pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        const anim = animations[index];
        Animated.parallel([
          Animated.spring(anim.pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.spring(anim.rotateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(anim.rotateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    });

  if (!visible) {
    return (
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setVisible(true)}>
        <Text style={styles.toggleText}>HUD</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
      {WIDGETS.map((widget, i) => {
        const anim = animations[i];
        const translateY = anim.float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        });
        const opacity = anim.float.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.7, 1, 0.7],
        });
        const panResponder = createPanResponder(i);

        return (
          <Animated.View
            key={widget.id}
            {...panResponder.panHandlers}
            style={[
              styles.widget,
              {
                left: widget.x,
                top: widget.y,
                borderColor: widget.color,
                shadowColor: widget.color,
                transform: [
                  { translateX: anim.pan.x },
                  { translateY: Animated.add(translateY, anim.pan.y) },
                  { scale: anim.scale },
                  { perspective: 800 },
                  { rotateX: anim.rotateX.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) },
                  { rotateY: anim.rotateY.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) },
                ],
                opacity,
              },
            ]}
          >
            <View style={[styles.corner, styles.cornerTL, { borderColor: widget.color }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: widget.color }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: widget.color }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: widget.color }]} />
            <Text style={[styles.label, { color: widget.color }]}>{widget.label}</Text>
            <Text style={[styles.value, { color: widget.color }]}>{widget.value}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  widget: {
    position: 'absolute',
    width: 120,
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    ...Platform.select({
      android: { elevation: 10 },
    }),
  },
  corner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderWidth: 2,
  },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,0,85,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  closeText: {
    color: '#FF0055',
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,240,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  toggleText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
