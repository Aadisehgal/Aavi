// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/components/VoiceVisualizer.js
// Generated: 2026-06-24

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { AmbientSound } = NativeModules;
const ambientSoundEmitter = AmbientSound ? new NativeEventEmitter(AmbientSound) : null;

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_COUNT = 40;
const BAR_WIDTH = (SCREEN_W - 40) / BAR_COUNT;

export default function VoiceVisualizer({ active = true }) {
  const [bars] = useState(() =>
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(4))
  );
  const [isActive, setIsActive] = useState(active);
  const animRefs = useRef([]);

  useEffect(() => {
    if (!isActive) return;

    let subscription;
    if (Platform.OS === 'android' && AmbientSound) {
      AmbientSound.startAnalysis().catch(() => {});
      subscription = ambientSoundEmitter?.addListener('onSoundAnalysis', (data) => {
        updateBars(data.db || -100);
      });
    } else {
      const interval = setInterval(() => {
        const simulatedDb = -80 + Math.random() * 60;
        updateBars(simulatedDb);
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      subscription?.remove();
      if (Platform.OS === 'android' && AmbientSound) {
        AmbientSound.stopAnalysis().catch(() => {});
      }
    };
  }, [isActive]);

  const updateBars = (db) => {
    const normalized = Math.max(0, Math.min(1, (db + 80) / 80));
    bars.forEach((bar, i) => {
      const variation = Math.sin(Date.now() / 200 + i * 0.5) * 0.3 + 0.7;
      const targetHeight = 4 + normalized * 80 * variation;
      Animated.spring(bar, {
        toValue: targetHeight,
        friction: 3,
        tension: 40,
        useNativeDriver: false,
      }).start();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {bars.map((bar, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                width: BAR_WIDTH - 2,
                height: bar,
                backgroundColor: getBarColor(i, BAR_COUNT),
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.centerLine} />
    </View>
  );
}

const getBarColor = (index, total) => {
  const ratio = index / total;
  if (ratio < 0.33) return '#00F0FF';
  if (ratio < 0.66) return '#00FF88';
  return '#FFAA00';
};

const styles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.8)',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: SCREEN_W - 40,
    height: 100,
  },
  bar: {
    borderRadius: 2,
    opacity: 0.9,
  },
  centerLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: '50%',
  },
});
