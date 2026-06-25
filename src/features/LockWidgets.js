// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/LockWidgets.js
// Generated: 2026-06-24

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  NativeModules,
  Platform,
} from 'react-native';

const { LockWidgetsModule } = NativeModules;

const { width: SCREEN_W } = Dimensions.get('window');

const WIDGET_DATA = {
  time: () => {
    const now = new Date();
    return {
      label: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sub: now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
      color: '#00F0FF',
    };
  },
  weather: () => ({
    label: '24°C',
    sub: 'Partly Cloudy',
    color: '#FFAA00',
  }),
  battery: () => ({
    label: '87%',
    sub: 'Charging',
    color: '#00FF88',
  }),
  steps: () => ({
    label: '8,432',
    sub: 'Steps Today',
    color: '#FF0055',
  }),
};

export default function LockWidgets() {
  const [isLocked, setIsLocked] = useState(false);
  const [widgets] = useState(['time', 'weather', 'battery', 'steps']);
  const [data, setData] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && LockWidgetsModule) {
      LockWidgetsModule.addListener('onLockStateChange', (state) => {
        setIsLocked(state.isLocked);
        if (state.isLocked) {
          showWidgets();
        } else {
          hideWidgets();
        }
      });
      LockWidgetsModule.startMonitoring().catch(() => {});
    }

    const interval = setInterval(() => {
      const newData = {};
      widgets.forEach((key) => {
        newData[key] = WIDGET_DATA[key]();
      });
      setData(newData);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const showWidgets = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const hideWidgets = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  if (!isLocked && Platform.OS === 'android') return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.header}>MANU Widgets</Text>
      <View style={styles.grid}>
        {widgets.map((key) => {
          const item = data[key] || WIDGET_DATA[key]();
          return (
            <TouchableOpacity key={key} style={styles.widget} activeOpacity={0.8}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.label, { color: item.color }]}>{item.label}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  widget: {
    width: (SCREEN_W - 56) / 2,
    backgroundColor: 'rgba(10,10,20,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sub: {
    color: '#888888',
    fontSize: 11,
  },
});
