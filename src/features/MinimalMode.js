// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/MinimalMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { MinimalBridge } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MinimalMode = ({ isActive, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [battery, setBattery] = useState(85);
  const [signal, setSignal] = useState(4);
  const [essentialApps, setEssentialApps] = useState([
    { id: 'phone', name: 'Phone', icon: '📞' },
    { id: 'messages', name: 'Messages', icon: '💬' },
    { id: 'camera', name: 'Camera', icon: '📷' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ]);
  const [brightness, setBrightness] = useState(30);
  const [fontSizeLarge, setFontSizeLarge] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [dnd, setDnd] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      timeIntervalRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    }
    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current); };
  }, [isActive]);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const renderClock = () => (
    <View style={styles.clockContainer}>
      <Text style={[styles.clockTime, fontSizeLarge && styles.clockTimeLarge]}>{formatTime(currentTime)}</Text>
      <Text style={styles.clockDate}>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
    </View>
  );

  const renderStatus = () => (
    <View style={styles.statusRow}>
      <Text style={styles.statusText}>🔋 {battery}%</Text>
      <Text style={styles.statusText}>📶 {'▮'.repeat(signal)}{'▯'.repeat(5 - signal)}</Text>
      <Text style={styles.statusText}>{dnd ? '🔕' : '🔔'}</Text>
    </View>
  );

  const renderEssentialApps = () => (
    <View style={styles.appsContainer}>
      {essentialApps.map((app) => (
        <TouchableOpacity key={app.id} style={[styles.essentialApp, highContrast && styles.essentialAppHighContrast]}>
          <Text style={styles.essentialIcon}>{app.icon}</Text>
          <Text style={styles.essentialName}>{app.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickBtn} onPress={() => setDnd(!dnd)}>
        <Text style={styles.quickIcon}>{dnd ? '🔕' : '🔔'}</Text>
        <Text style={styles.quickLabel}>{dnd ? 'DND On' : 'DND Off'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickBtn} onPress={() => setFontSizeLarge(!fontSizeLarge)}>
        <Text style={styles.quickIcon}>🔤</Text>
        <Text style={styles.quickLabel}>{fontSizeLarge ? 'Large' : 'Normal'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickBtn} onPress={() => setHighContrast(!highContrast)}>
        <Text style={styles.quickIcon}>◐</Text>
        <Text style={styles.quickLabel}>{highContrast ? 'High' : 'Normal'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickBtn} onPress={() => setBrightness(prev => prev === 30 ? 80 : 30)}>
        <Text style={styles.quickIcon}>🔆</Text>
        <Text style={styles.quickLabel}>{brightness > 50 ? 'Bright' : 'Dim'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBatteryInfo = () => (
    <View style={styles.batteryCard}>
      <Text style={styles.batteryText}>Battery Saver Active</Text>
      <Text style={styles.batterySub}>Background sync disabled. Non-essential apps paused.</Text>
      <View style={styles.batteryBar}><View style={[styles.batteryFill, { width: `${battery}%`, backgroundColor: battery > 20 ? '#00ff88' : '#ff4444' }]} /></View>
    </View>
  );

  const renderExit = () => (
    <TouchableOpacity style={styles.exitBtn} onPress={onClose}>
      <Text style={styles.exitText}>Exit Minimal Mode</Text>
    </TouchableOpacity>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {renderStatus()}{renderClock()}{renderEssentialApps()}{renderQuickActions()}{renderBatteryInfo()}{renderExit()}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a15', zIndex: 200 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  statusRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  statusText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 },
  clockContainer: { alignItems: 'center', marginBottom: 40 },
  clockTime: { color: '#ffffff', fontSize: 56, fontWeight: '200', letterSpacing: 2 },
  clockTimeLarge: { fontSize: 72 },
  clockDate: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 14, marginTop: 8 },
  appsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 32 },
  essentialApp: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  essentialAppHighContrast: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 2 },
  essentialIcon: { fontSize: 28, marginBottom: 4 },
  essentialName: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 10 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  quickBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center' },
  quickIcon: { fontSize: 18, marginBottom: 2 },
  quickLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 10 },
  batteryCard: { alignItems: 'center', marginBottom: 24, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', width: SCREEN_W - 80 },
  batteryText: { color: '#00ff88', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  batterySub: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, textAlign: 'center', marginBottom: 10 },
  batteryBar: { width: '100%', height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 3 },
  exitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  exitText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 },
});

export default MinimalMode;
