import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Spyware Detection / Privacy Audit Scanner (Feature 188)
// File: src/security/SpyDetect.js
// Generated: 2026-06-25
// Educational Purpose: Privacy audit scanner that checks for apps with
// excessive permissions. Educational awareness, NOT surveillance.

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

const DANGEROUS_PERMISSIONS = [
  { perm: 'READ_SMS', risk: 'high', desc: 'Can read all text messages' },
  { perm: 'READ_CONTACTS', risk: 'medium', desc: 'Access to contact list' },
  { perm: 'RECORD_AUDIO', risk: 'high', desc: 'Can record microphone audio' },
  { perm: 'CAMERA', risk: 'medium', desc: 'Can access camera' },
  { perm: 'ACCESS_FINE_LOCATION', risk: 'medium', desc: 'Precise GPS tracking' },
  { perm: 'READ_CALL_LOG', risk: 'high', desc: 'Can see call history' },
  { perm: 'SYSTEM_ALERT_WINDOW', risk: 'medium', desc: 'Can draw over other apps' },
  { perm: 'BIND_ACCESSIBILITY_SERVICE', risk: 'critical', desc: 'Can read screen content' },
  { perm: 'DEVICE_ADMIN', risk: 'high', desc: 'Device administrator access' },
];

const MOCK_APPS = [
  { name: 'Flashlight App', package: 'com.flashlight', permissions: ['CAMERA', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION'] },
  { name: 'Calculator Pro', package: 'com.calcpro', permissions: ['READ_SMS', 'RECORD_AUDIO'] },
  { name: 'Weather Widget', package: 'com.weather', permissions: ['ACCESS_FINE_LOCATION'] },
  { name: 'Game Launcher', package: 'com.gamelaunch', permissions: ['SYSTEM_ALERT_WINDOW', 'BIND_ACCESSIBILITY_SERVICE'] },
  { name: 'File Manager', package: 'com.filemgr', permissions: ['DEVICE_ADMIN'] },
];

const STORAGE_KEY = '@manu_ai_spy_alerts';

export default function SpyDetect() {
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState({ count: 0, lastScan: null });
  const [scanning, setScanning] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadStats();
    startPulse();
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

  const runScan = () => {
    setScanning(true);
    // Simulate privacy audit scan
    setTimeout(() => {
      const enriched = MOCK_APPS.map(app => {
        const perms = app.permissions.map(p => {
          const match = DANGEROUS_PERMISSIONS.find(dp => dp.perm === p);
          return match || { perm: p, risk: 'low', desc: 'Unknown permission' };
        });
        const maxRisk = perms.reduce((max, p) => {
          const order = { critical: 4, high: 3, medium: 2, low: 1 };
          return order[p.risk] > order[max] ? p.risk : max;
        }, 'low');
        return { ...app, permissions: perms, maxRisk };
      });
      setApps(enriched);
      setScanning(false);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert('✅ Privacy Audit Complete', 'Review apps with excessive permissions below.');
    }, 1500);
  };

  const getRiskColor = (risk) => {
    if (risk === 'critical') return '#ff0000';
    if (risk === 'high') return '#ff3333';
    if (risk === 'medium') return '#ffaa00';
    return '#00ff88';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔍 Privacy Audit Scanner</Text>
      <Text style={styles.subtitle}>Educational tool to audit app permissions and detect excessive access. White-hat only.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Scanning...' : '🔍 Run Privacy Audit'}</Text>
      </TouchableOpacity>

      {apps.length > 0 && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.sectionTitle}>⚠️ Apps with Excessive Permissions</Text>
          {apps.map((app, idx) => (
            <View key={idx} style={[styles.appCard, { borderLeftColor: getRiskColor(app.maxRisk) }]}>
              <View style={styles.appHeader}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={[styles.appRisk, { color: getRiskColor(app.maxRisk) }]}>{app.maxRisk.toUpperCase()}</Text>
              </View>
              <Text style={styles.appPkg}>{app.package}</Text>
              {app.permissions.map((p, pidx) => (
                <View key={pidx} style={styles.permRow}>
                  <Text style={[styles.permName, { color: getRiskColor(p.risk) }]}>• {p.perm}</Text>
                  <Text style={styles.permDesc}>{p.desc}</Text>
                </View>
              ))}
            </View>
          ))}
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Audits: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• A flashlight app should NOT need contacts or location.</Text>
        <Text style={styles.eduText}>• Accessibility services are powerful — only grant to trusted apps.</Text>
        <Text style={styles.eduText}>• Regularly review app permissions in Settings {'>'} Apps.</Text>
        <Text style={styles.eduText}>• Uninstall apps you do not recognize or no longer use.</Text>
        <Text style={styles.eduText}>• This is a DEMONSTRATION using mock data for educational purposes.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  scanButton: { backgroundColor: '#00d4ff', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 20 },
  scanButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  appCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 12, borderLeftWidth: 4 },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  appName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  appRisk: { fontSize: 12, fontWeight: 'bold' },
  appPkg: { color: '#888', fontSize: 12, marginBottom: 8 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#333' },
  permName: { fontSize: 13, fontWeight: 'bold' },
  permDesc: { color: '#aaa', fontSize: 12, flex: 1, textAlign: 'right' },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
