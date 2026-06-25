// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/AODAI.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  NativeModules,
  Platform,
} from 'react-native';

const { AODAIModule } = NativeModules;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function AODAI() {
  const [active, setActive] = useState(false);
  const [contextInfo, setContextInfo] = useState({
    time: '',
    notifications: 0,
    nextEvent: 'No upcoming events',
    weather: '24°C',
    battery: 87,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const moveAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    if (Platform.OS === 'android' && AODAIModule) {
      AODAIModule.addListener('onAODStateChange', (state) => {
        setActive(state.active);
        if (state.active) {
          startAOD();
        } else {
          stopAOD();
        }
      });
      AODAIModule.startMonitoring().catch(() => {});
    }

    const timeInterval = setInterval(() => {
      const now = new Date();
      setContextInfo((prev) => ({
        ...prev,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const startAOD = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.05, duration: 3000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim.x, { toValue: 20, duration: 10000, useNativeDriver: true }),
        Animated.timing(moveAnim.x, { toValue: -20, duration: 10000, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopAOD = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    breatheAnim.setValue(1);
    moveAnim.setValue({ x: 0, y: 0 });
  };

  if (!active && Platform.OS === 'android') return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: moveAnim.x },
            { scale: breatheAnim },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.time}>{contextInfo.time}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>🔋 {contextInfo.battery}%</Text>
          <Text style={styles.infoText}>🌡 {contextInfo.weather}</Text>
        </View>
        <Text style={styles.event}>{contextInfo.nextEvent}</Text>
        {contextInfo.notifications > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifText}>{contextInfo.notifications} new</Text>
          </View>
        )}
      </View>
      <Text style={styles.brand}>MANU AI</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  content: {
    alignItems: 'center',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoText: {
    color: '#888888',
    fontSize: 14,
    marginHorizontal: 10,
  },
  event: {
    color: '#AAAAAA',
    fontSize: 13,
    marginBottom: 20,
  },
  notifBadge: {
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  notifText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  brand: {
    position: 'absolute',
    bottom: 40,
    color: '#333333',
    fontSize: 10,
    letterSpacing: 4,
  },
});
