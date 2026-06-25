// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/ForceTouch.js
// Generated: 2026-06-24

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Vibration,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const PREVIEW_ITEMS = [
  { id: '1', title: 'Message Preview', content: 'Hey, are you coming to the meeting?', color: '#00F0FF' },
  { id: '2', title: 'Photo Preview', content: 'Image: sunset.jpg', color: '#00FF88' },
  { id: '3', title: 'Link Preview', content: 'https://manu.ai/docs', color: '#FFAA00' },
  { id: '4', title: 'Map Preview', content: 'Location: 37.7749, -122.4194', color: '#FF0055' },
];

export default function ForceTouch() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const scaleAnims = useRef(PREVIEW_ITEMS.map(() => new Animated.Value(1))).current;
  const previewScale = useRef(new Animated.Value(0.8)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef(null);

  const handlePressIn = (index, item) => {
    Animated.spring(scaleAnims[index], { toValue: 0.95, useNativeDriver: true }).start();
    longPressTimer.current = setTimeout(() => {
      Vibration.vibrate(50);
      showPreview(item);
    }, 400);
  };

  const handlePressOut = (index) => {
    clearTimeout(longPressTimer.current);
    Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true }).start();
  };

  const showPreview = (item) => {
    setSelectedItem(item);
    setPreviewVisible(true);
    Animated.parallel([
      Animated.spring(previewScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(previewOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const hidePreview = () => {
    Animated.parallel([
      Animated.timing(previewScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(previewOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setPreviewVisible(false);
      setSelectedItem(null);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>3D Touch / Force Touch</Text>
      <Text style={styles.subtitle}>Long press for preview</Text>

      <View style={styles.grid}>
        {PREVIEW_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={1}
            onPressIn={() => handlePressIn(index, item)}
            onPressOut={() => handlePressOut(index)}
            onPress={hidePreview}
          >
            <Animated.View
              style={[
                styles.item,
                {
                  transform: [{ scale: scaleAnims[index] }],
                  borderColor: item.color,
                  shadowColor: item.color,
                },
              ]}
            >
              <Text style={[styles.itemTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.itemHint}>Hold to peek</Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {previewVisible && selectedItem && (
        <Animated.View
          style={[
            styles.previewOverlay,
            {
              opacity: previewOpacity,
              transform: [{ scale: previewScale }],
            },
          ]}
        >
          <TouchableOpacity style={styles.backdrop} onPress={hidePreview} />
          <View style={[styles.previewCard, { borderColor: selectedItem.color }]}>
            <Text style={[styles.previewTitle, { color: selectedItem.color }]}>
              {selectedItem.title}
            </Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewText}>{selectedItem.content}</Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: selectedItem.color }]}>
                <Text style={[styles.actionText, { color: selectedItem.color }]}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FF0055' }]} onPress={hidePreview}>
                <Text style={[styles.actionText, { color: '#FF0055' }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 20,
  },
  header: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666666',
    fontSize: 13,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: (SCREEN_W - 56) / 2,
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  itemHint: {
    color: '#444444',
    fontSize: 11,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewCard: {
    width: SCREEN_W * 0.8,
    backgroundColor: 'rgba(15,15,25,0.98)',
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 30,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  previewContent: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  previewText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
