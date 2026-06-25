// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/EdgeGestures.js
// Generated: 2026-06-24

import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const EDGE_WIDTH = 20;
const TRIGGER_DISTANCE = 80;

const QUICK_ACTIONS = [
  { id: 'assistant', label: 'AI', color: '#00F0FF', icon: '🤖' },
  { id: 'camera', label: 'Cam', color: '#00FF88', icon: '📷' },
  { id: 'flashlight', label: 'Light', color: '#FFAA00', icon: '🔦' },
  { id: 'settings', label: 'Set', color: '#FF0055', icon: '⚙' },
];

export default function EdgeGestures({ onAction }) {
  const [leftPanelVisible, setLeftPanelVisible] = React.useState(false);
  const [rightPanelVisible, setRightPanelVisible] = React.useState(false);
  const leftAnim = useRef(new Animated.Value(-200)).current;
  const rightAnim = useRef(new Animated.Value(200)).current;
  const leftOpacity = useRef(new Animated.Value(0)).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;

  const showLeftPanel = useCallback(() => {
    setLeftPanelVisible(true);
    Animated.parallel([
      Animated.spring(leftAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(leftOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const hideLeftPanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(leftAnim, { toValue: -200, duration: 200, useNativeDriver: true }),
      Animated.timing(leftOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setLeftPanelVisible(false));
  }, []);

  const showRightPanel = useCallback(() => {
    setRightPanelVisible(true);
    Animated.parallel([
      Animated.spring(rightAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(rightOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const hideRightPanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(rightAnim, { toValue: 200, duration: 200, useNativeDriver: true }),
      Animated.timing(rightOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setRightPanelVisible(false));
  }, []);

  const leftPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx > TRIGGER_DISTANCE && gesture.moveX < EDGE_WIDTH * 3,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > TRIGGER_DISTANCE) {
          showLeftPanel();
        }
      },
    })
  ).current;

  const rightPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx < -TRIGGER_DISTANCE && gesture.moveX > SCREEN_W - EDGE_WIDTH * 3,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -TRIGGER_DISTANCE) {
          showRightPanel();
        }
      },
    })
  ).current;

  const handleAction = (action) => {
    hideLeftPanel();
    hideRightPanel();
    onAction?.(action.id);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.leftEdge} {...leftPanResponder.panHandlers} />
      <View style={styles.rightEdge} {...rightPanResponder.panHandlers} />

      {leftPanelVisible && (
        <Animated.View
          style={[
            styles.panel,
            styles.leftPanel,
            { transform: [{ translateX: leftAnim }], opacity: leftOpacity },
          ]}
        >
          <Text style={styles.panelTitle}>Quick Actions</Text>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionBtn, { borderColor: action.color }]}
              onPress={() => handleAction(action)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={hideLeftPanel}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {rightPanelVisible && (
        <Animated.View
          style={[
            styles.panel,
            styles.rightPanel,
            { transform: [{ translateX: rightAnim }], opacity: rightOpacity },
          ]}
        >
          <Text style={styles.panelTitle}>Tools</Text>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionBtn, { borderColor: action.color }]}
              onPress={() => handleAction(action)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={hideRightPanel}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    elevation: 9998,
  },
  leftEdge: {
    position: 'absolute',
    left: 0,
    top: 100,
    bottom: 100,
    width: EDGE_WIDTH,
    backgroundColor: 'transparent',
  },
  rightEdge: {
    position: 'absolute',
    right: 0,
    top: 100,
    bottom: 100,
    width: EDGE_WIDTH,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    width: 180,
    backgroundColor: 'rgba(10,10,20,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    padding: 16,
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  leftPanel: {
    left: 10,
  },
  rightPanel: {
    right: 10,
  },
  panelTitle: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,0,85,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  closeText: {
    color: '#FF0055',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
