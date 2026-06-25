import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Camera/Mic Indicator (Feature 197)
// File: src/security/CamMicIndicator.js
// Generated: 2026-06-25
// Educational Purpose: Simulates privacy indicators for camera/mic usage
// similar to Android 12+ privacy dots, for educational awareness.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  AsyncStorage,
} from 'react-native';

const MOCK_APPS = [
  { name: 'Camera', usingCamera: true, usingMic: false, package: 'com.android.camera' },
  { name: 'WhatsApp', usingCamera: false, usingMic: true, package: 'com.whatsapp' },
  { name: 'Zoom', usingCamera: true, usingMic: true, package: 'us.zoom.videomeetings' },
  { name: 'Instagram', usingCamera: false, usingMic: false, package: 'com.instagram.android' },
  { name: 'SpyApp', usingCamera: true, usingMic: true, package: 'com.unknown.spy', suspicious: true },
];

const STORAGE_KEY = '@manu_ai_cammic_alerts';

export default function CamMicIndicator() {
  const [apps, setApps] = useState(MOCK_APPS);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [activeCamera, setActiveCamera] = useState(false);
  const [activeMic, setActiveMic] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadStats();
    startPulse();
    checkActiveSensors();
  }, []);

  const loadStats = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setStats(JSON.parse(data));
    } catch (e) {}
  };

  const saveStats = async (newStats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
    } catch (e) {}
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const checkActiveSensors = () => {
    const cam = apps.some(a => a.usingCamera);
    const mic = apps.some(a => a.usingMic);
    setActiveCamera(cam);
    setActiveMic(mic);
    const suspicious = apps.some(a => a.suspicious && (a.usingCamera || a.usingMic));
    if (suspicious) {
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
    }
  };

  const toggleSensor = (idx, sensor) => {
    const updated = [...apps];
    if (sensor === 'camera') updated[idx].usingCamera = !updated[idx].usingCamera;
    if (sensor === 'mic') updated[idx].usingMic = !updated[idx].usingMic;
    setApps(updated);
    checkActiveSensors();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📷 Camera/Mic Indicator</Text>
      <Text style={styles.subtitle}>Educational privacy indicator simulating Android 12+ camera/mic usage dots.</Text>

      <View style={styles.indicatorBox}>
        <View style={styles.indicatorRow}>
          <View style={[styles.dot, { backgroundColor: activeCamera ? '#ff3333' : '#333' }]} />
          <Text style={styles.indicatorText}>Camera {activeCamera ? 'ACTIVE' : 'Inactive'}</Text>
        </View>
        <View style={styles.indicatorRow}>
          <View style={[styles.dot, { backgroundColor: activeMic ? '#ffaa00' : '#333' }]} />
          <Text style={styles.indicatorText}>Microphone {activeMic ? 'ACTIVE' : 'Inactive'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>📱 App Sensor Usage (Educational)</Text>
      <View style={styles.appBox}>
        {apps.map((app, idx) => (
          <View key={idx} style={[styles.appRow, app.suspicious && styles.suspiciousApp]}>
            <Text style={styles.appName}>{app.name} {app.suspicious ? '⚠️' : ''}</Text>
            <View style={styles.sensorControls}>
              <TouchableOpacity onPress={() => toggleSensor(idx, 'camera')}>
                <Text style={[styles.sensorBtn, app.usingCamera && styles.sensorActive]}>📷</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleSensor(idx, 'mic')}>
                <Text style={[styles.sensorBtn, app.usingMic && styles.sensorActive]}>🎤</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {apps.some(a => a.suspicious && (a.usingCamera || a.usingMic)) && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🚨 Suspicious App Using Camera/Mic</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Android 12+ shows green dots when camera/mic is in use.</Text>
        <Text style={styles.eduText}>• iOS shows orange (mic) and green (camera) status bar indicators.</Text>
        <Text style={styles.eduText}>• If indicators appear unexpectedly, check which app is active.</Text>
        <Text style={styles.eduText}>• Review app permissions regularly in Settings {'>'} Privacy.</Text>
        <Text style={styles.eduText}>• This is an educational simulation, not actual system monitoring.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  indicatorBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  indicatorText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  appBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  suspiciousApp: { backgroundColor: '#331111', borderRadius: 6, paddingHorizontal: 8 },
  appName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  sensorControls: { flexDirection: 'row' },
  sensorBtn: { fontSize: 24, marginLeft: 12, opacity: 0.3 },
  sensorActive: { opacity: 1 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
