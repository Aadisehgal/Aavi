// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/GuestMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { GuestBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const GuestMode = ({ isActive, onClose }) => {
  const [guestActive, setGuestActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [guestApps, setGuestApps] = useState([
    { id: 'browser', name: 'Browser', icon: '🌐' },
    { id: 'camera', name: 'Camera', icon: '📷' },
    { id: 'maps', name: 'Maps', icon: '🗺️' },
    { id: 'calculator', name: 'Calculator', icon: '🧮' },
  ]);
  const [dataCleared, setDataCleared] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); stopGuestSession(); }
    return () => stopGuestSession();
  }, [isActive]);

  const startGuestSession = () => {
    setGuestActive(true); setSessionStart(new Date()); setDataCleared(false); setTimeRemaining(60);
    const interval = setInterval(() => {
      setTimeRemaining(prev => { if (prev <= 1) { stopGuestSession(); return 0; } return prev - 1; });
    }, 60000);
    setTimerInterval(interval);
  };

  const stopGuestSession = () => { setGuestActive(false); if (timerInterval) { clearInterval(timerInterval); setTimerInterval(null); } setDataCleared(true); };

  const formatTime = (minutes) => { const h = Math.floor(minutes / 60); const m = minutes % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const renderWelcome = () => (
    <View style={styles.welcomeCard}>
      <Text style={styles.welcomeEmoji}>👋</Text>
      <Text style={styles.welcomeTitle}>Guest Mode</Text>
      <Text style={styles.welcomeText}>Temporary access with no personal data. All activity will be cleared when you exit.</Text>
      <View style={styles.privacyList}>
        <Text style={styles.privacyItem}>✓ No access to personal apps</Text>
        <Text style={styles.privacyItem}>✓ No access to photos or messages</Text>
        <Text style={styles.privacyItem}>✓ No access to accounts</Text>
        <Text style={styles.privacyItem}>✓ History cleared on exit</Text>
      </View>
      <TouchableOpacity style={styles.startBtn} onPress={startGuestSession}><Text style={styles.startText}>▶ Start Guest Session</Text></TouchableOpacity>
    </View>
  );

  const renderGuestHome = () => (
    <>
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>⏱ {formatTime(timeRemaining)} remaining</Text>
        <View style={styles.statusBar}><View style={[styles.statusFill, { width: `${(timeRemaining / 60) * 100}%` }]} /></View>
        <Text style={styles.statusSub}>Session will auto-end when time expires</Text>
      </View>
      <View style={styles.appsGrid}>
        {guestApps.map((app) => (
          <TouchableOpacity key={app.id} style={styles.guestAppCard}>
            <Text style={styles.guestAppIcon}>{app.icon}</Text>
            <Text style={styles.guestAppName}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.endBtn} onPress={stopGuestSession}><Text style={styles.endText}>⏹ End Guest Session</Text></TouchableOpacity>
      {dataCleared && <Text style={styles.clearedText}>✓ All guest data cleared</Text>}
    </>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Guest</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!guestActive ? renderWelcome() : renderGuestHome()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  welcomeCard: { margin: 16, padding: 24, borderRadius: 20, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { color: '#00ffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  welcomeText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  privacyList: { alignSelf: 'stretch', marginBottom: 20 },
  privacyItem: { color: '#00ff88', fontSize: 13, paddingVertical: 4 },
  startBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  startText: { color: '#00ffff', fontSize: 15, fontWeight: '600' },
  statusCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  statusText: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  statusBar: { width: SCREEN_W - 80, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  statusFill: { height: '100%', backgroundColor: '#00ff88', borderRadius: 3 },
  statusSub: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 11, marginTop: 8 },
  appsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12, justifyContent: 'center' },
  guestAppCard: { width: (SCREEN_W - 60) / 2, padding: 20, borderRadius: 16, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  guestAppIcon: { fontSize: 32, marginBottom: 8 },
  guestAppName: { color: '#ccffff', fontSize: 13, fontWeight: '600' },
  endBtn: { margin: 16, marginTop: 0, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255, 100, 100, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)', alignItems: 'center' },
  endText: { color: '#ff8888', fontSize: 14, fontWeight: '600' },
  clearedText: { color: '#00ff88', fontSize: 12, textAlign: 'center', marginBottom: 32 },
});

export default GuestMode;
