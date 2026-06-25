// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/KidsMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { KidsBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const KidsMode = ({ isActive, onClose }) => {
  const [active, setActive] = useState(false);
  const [approvedApps, setApprovedApps] = useState([
    { id: 'drawing', name: 'Drawing', icon: '🎨', color: '#ff66aa' },
    { id: 'math', name: 'Math Fun', icon: '🔢', color: '#66aaff' },
    { id: 'stories', name: 'Stories', icon: '📚', color: '#ffaa66' },
    { id: 'music', name: 'Music', icon: '🎵', color: '#66ffaa' },
    { id: 'puzzle', name: 'Puzzles', icon: '🧩', color: '#aa66ff' },
  ]);
  const [timeLimit, setTimeLimit] = useState(30);
  const [timeUsed, setTimeUsed] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [parentOverride, setParentOverride] = useState(false);
  const [colorTheme, setColorTheme] = useState('rainbow');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(); setActive(true); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); setActive(false); stopTimer(); }
    return () => stopTimer();
  }, [isActive]);

  const startTimer = () => { if (!timerInterval) { const interval = setInterval(() => setTimeUsed(prev => prev + 1), 60000); setTimerInterval(interval); } };
  const stopTimer = () => { if (timerInterval) { clearInterval(timerInterval); setTimerInterval(null); } };

  const launchApp = (app) => {
    setSelectedApp(app);
    Animated.sequence([Animated.timing(bounceAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }), Animated.timing(bounceAnim, { toValue: 1, duration: 150, useNativeDriver: true })]).start();
    startTimer();
  };

  const formatTime = (minutes) => { const m = Math.floor(minutes); return `${m}m`; };

  const renderAppGrid = () => (
    <View style={styles.appGrid}>
      {approvedApps.map((app) => (
        <TouchableOpacity key={app.id} style={[styles.appCard, { backgroundColor: app.color + '25', borderColor: app.color + '60' }]} onPress={() => launchApp(app)}>
          <Animated.View style={{ transform: [{ scale: selectedApp?.id === app.id ? bounceAnim : 1 }] }}>
            <Text style={styles.appIcon}>{app.icon}</Text>
            <Text style={[styles.appName, { color: app.color }]}>{app.name}</Text>
          </Animated.View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTimer = () => (
    <View style={styles.timerCard}>
      <Text style={styles.timerEmoji}>⏰</Text>
      <Text style={styles.timerText}>{formatTime(timeLimit - timeUsed)} left</Text>
      <View style={styles.timerBar}><View style={[styles.timerFill, { width: `${Math.min(100, (timeUsed / timeLimit) * 100)}%`, backgroundColor: timeUsed > timeLimit * 0.8 ? '#ff4444' : '#ffaa00' }]} /></View>
    </View>
  );

  const renderActiveApp = () => {
    if (!selectedApp) return null;
    return (
      <View style={[styles.activeAppCard, { borderColor: selectedApp.color + '60' }]}>
        <Text style={styles.activeAppIcon}>{selectedApp.icon}</Text>
        <Text style={[styles.activeAppName, { color: selectedApp.color }]}>{selectedApp.name}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedApp(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <View style={styles.appPlaceholder}><Text style={styles.placeholderText}>App content would appear here</Text></View>
      </View>
    );
  };

  const renderExitButton = () => (
    <TouchableOpacity style={styles.exitBtn} onPress={onClose}>
      <Text style={styles.exitText}>👋 Exit Kids Mode</Text>
    </TouchableOpacity>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧒 Kids Mode</Text>
        <Text style={styles.headerSub}>Safe & Fun</Text>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderTimer()}
        {!selectedApp ? renderAppGrid() : renderActiveApp()}
        {renderExitButton()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a2e', zIndex: 200 },
  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitle: { color: '#ffdd00', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, marginTop: 4 },
  scroll: { flex: 1 },
  timerCard: { margin: 16, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center' },
  timerEmoji: { fontSize: 28 },
  timerText: { color: '#ffdd00', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  timerBar: { width: SCREEN_W - 80, height: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 5, marginTop: 8, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 5 },
  appGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12, justifyContent: 'center' },
  appCard: { width: (SCREEN_W - 60) / 2, padding: 20, borderRadius: 20, borderWidth: 2, alignItems: 'center' },
  appIcon: { fontSize: 40, marginBottom: 8 },
  appName: { fontSize: 14, fontWeight: 'bold' },
  activeAppCard: { margin: 16, padding: 24, borderRadius: 20, borderWidth: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center' },
  activeAppIcon: { fontSize: 48, marginBottom: 8 },
  activeAppName: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  backText: { color: '#ffffff', fontSize: 13 },
  appPlaceholder: { marginTop: 20, padding: 40, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center' },
  placeholderText: { color: 'rgba(255, 255, 255, 0.3)', fontSize: 13 },
  exitBtn: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 100, 100, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)', alignItems: 'center' },
  exitText: { color: '#ff8888', fontSize: 14, fontWeight: '600' },
});

export default KidsMode;
