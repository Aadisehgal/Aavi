// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/components/FloatingBubble.js
// Generated: 2026-06-24

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BUBBLE_SIZE = 60;

export default function FloatingBubble({ onPress, children }) {
  const [expanded, setExpanded] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - 80, y: SCREEN_H / 2 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        const finalX = pan.x._value + gesture.dx;
        const finalY = pan.y._value + gesture.dy;
        const snapX = finalX < SCREEN_W / 2 ? 20 : SCREEN_W - BUBBLE_SIZE - 20;
        Animated.spring(pan, {
          toValue: { x: snapX, y: Math.max(50, Math.min(finalY, SCREEN_H - 150)) },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    setExpanded(true);
    onPress?.();
  }, [onPress]);

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bubble,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
            shadowOpacity: glowAnim,
          },
        ]}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
          <View style={styles.inner}>
            <Text style={styles.icon}>🤖</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        transparent
        visible={expanded}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setExpanded(false)} />
          <View style={styles.expandedPanel}>
            <Text style={styles.panelTitle}>MANU Quick Access</Text>
            {children}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setExpanded(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderWidth: 2,
    borderColor: '#00F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
  },
  inner: {
    width: BUBBLE_SIZE - 8,
    height: BUBBLE_SIZE - 8,
    borderRadius: (BUBBLE_SIZE - 8) / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  expandedPanel: {
    width: SCREEN_W * 0.8,
    backgroundColor: 'rgba(15,15,25,0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 30,
  },
  panelTitle: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 2,
  },
  closeBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,85,0.2)',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  closeText: {
    color: '#FF0055',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
