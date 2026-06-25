// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/components/HolographicKeyboard.js
// Generated: 2026-06-24

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Vibration,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const SPECIAL_KEYS = ['SPACE', 'BACK', 'ENTER'];

export default function HolographicKeyboard({ onKeyPress, onClose, visible = true }) {
  const [text, setText] = useState('');
  const [tiltX] = useState(new Animated.Value(0));
  const [tiltY] = useState(new Animated.Value(0));
  const [keyAnimations] = useState(() =>
    ROWS.flat().reduce((acc, key) => {
      acc[key] = new Animated.Value(1);
      return acc;
    }, {})
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        tiltX.setValue(gesture.dx / 30);
        tiltY.setValue(-gesture.dy / 30);
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(tiltX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(tiltY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const handleKeyPress = useCallback(
    (key) => {
      Vibration.vibrate(20);
      Animated.sequence([
        Animated.timing(keyAnimations[key], { toValue: 0.7, duration: 50, useNativeDriver: true }),
        Animated.timing(keyAnimations[key], { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      let newText = text;
      switch (key) {
        case 'BACK':
          newText = text.slice(0, -1);
          break;
        case 'SPACE':
          newText = text + ' ';
          break;
        case 'ENTER':
          newText = text + '\n';
          break;
        default:
          newText = text + key;
      }
      setText(newText);
      onKeyPress?.(newText, key);
    },
    [text, keyAnimations, onKeyPress]
  );

  if (!visible) return null;

  const rotateX = tiltY.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] });
  const rotateY = tiltX.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] });

  return (
    <View style={styles.overlay} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { perspective: 800 },
              { rotateX },
              { rotateY },
            ],
          },
        ]}
      >
        <View style={styles.previewBar}>
          <Text style={styles.previewText} numberOfLines={1}>
            {text || 'Type something...'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>×</Text>
          </TouchableOpacity>
        </View>

        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.6}
                onPress={() => handleKeyPress(key)}
              >
                <Animated.View
                  style={[
                    styles.key,
                    {
                      transform: [{ scale: keyAnimations[key] }],
                      borderColor: getKeyColor(rowIndex),
                      shadowColor: getKeyColor(rowIndex),
                    },
                  ]}
                >
                  <Text style={[styles.keyText, { color: getKeyColor(rowIndex) }]}>
                    {key}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.specialRow}>
          {SPECIAL_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.6}
              onPress={() => handleKeyPress(key)}
            >
              <View style={[styles.specialKey, { borderColor: '#FFAA00' }]}>
                <Text style={[styles.keyText, { color: '#FFAA00' }]}>
                  {key === 'SPACE' ? '␣' : key === 'BACK' ? '←' : '↵'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const getKeyColor = (rowIndex) => {
  const colors = ['#00F0FF', '#00FF88', '#FFAA00'];
  return colors[rowIndex % colors.length];
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 10000,
    elevation: 10000,
  },
  container: {
    backgroundColor: 'rgba(10,10,20,0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 8,
    paddingBottom: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  closeBtn: {
    color: '#FF0055',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    width: (SCREEN_W - 40) / 10 - 4,
    height: 44,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  keyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  specialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  specialKey: {
    width: (SCREEN_W - 40) / 3 - 8,
    height: 44,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
