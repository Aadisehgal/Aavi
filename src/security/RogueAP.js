import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Rogue AP Detection (Feature 193)
// File: src/security/RogueAP.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about fake WiFi access points
// and demonstrates rogue AP detection concepts.

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

const MOCK_NETWORKS = [
  { ssid: 'Starbucks_Free_WiFi', bssid: '00:11:22:33:44:55', security: 'Open', signal: -45, rogue: false },
  { ssid: 'Starbucks_Free_WiFi', bssid: 'AA:BB:CC:DD:EE:FF', security: 'Open', signal: -50, rogue: true },
  { ssid: 'Airport_WiFi', bssid: '11:22:33:44:55:66', security: 'WPA2', signal: -60, rogue: false },
  { ssid: 'Hotel_Guest', bssid: '22:33:44:55:66:77', security: 'Open', signal: -55, rogue: false },
  { ssid: 'Hotel_Guest', bssid: '33:44:55:66:77:88', security: 'Open', signal: -52, rogue: true },
];

const ROGUE_INDICATORS = [
  'Duplicate SSID with different MAC address',
  'Open network with strong signal in unexpected location',
  'SSID mimicking legitimate business name',
  'No encryption on public network clone',
  'Captive portal asking for personal info',
];

const STORAGE_KEY = '@manu_ai_rogueap_alerts';

export default function RogueAP() {
  const [networks, setNetworks] = useState([]);
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
    setTimeout(() => {
      setNetworks(MOCK_NETWORKS);
      setScanning(false);
      const rogueCount = MOCK_NETWORKS.filter(n => n.rogue).length;
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      if (rogueCount > 0) {
        Alert.alert(
          `⚠️ ${rogueCount} Rogue AP(s) Detected`,
          'Fake WiFi networks detected. Do not connect to them.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📡 Rogue AP Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect fake WiFi access points and teach wireless security.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Scanning...' : '🔍 Scan WiFi Networks'}</Text>
      </TouchableOpacity>

      {networks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📡 Nearby Networks</Text>
          {networks.map((net, idx) => (
            <View key={idx} style={[styles.netCard, { borderLeftColor: net.rogue ? '#ff3333' : '#00ff88' }]}>
              <View style={styles.netHeader}>
                <Text style={styles.netSsid}>{net.ssid}</Text>
                <Text style={[styles.netStatus, { color: net.rogue ? '#ff3333' : '#00ff88' }]}>
                  {net.rogue ? '⚠️ ROGUE' : '✓ SAFE'}
                </Text>
              </View>
              <Text style={styles.netInfo}>BSSID: {net.bssid}</Text>
              <Text style={styles.netInfo}>Security: {net.security}</Text>
              <Text style={styles.netInfo}>Signal: {net.signal} dBm</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>⚠️ Rogue AP Indicators</Text>
      <View style={styles.indicatorBox}>
        {ROGUE_INDICATORS.map((ind, idx) => (
          <Text key={idx} style={styles.indicatorText}>• {ind}</Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Scans: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Rogue APs (evil twins) mimic legitimate networks to steal data.</Text>
        <Text style={styles.eduText}>• Always verify with staff before connecting to public WiFi.</Text>
        <Text style={styles.eduText}>• Use a VPN on all public WiFi networks.</Text>
        <Text style={styles.eduText}>• Disable auto-connect to open networks in your device settings.</Text>
        <Text style={styles.eduText}>• This demo uses mock data for educational purposes.</Text>
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
  netCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  netHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  netSsid: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  netStatus: { fontSize: 13, fontWeight: 'bold' },
  netInfo: { color: '#888', fontSize: 13, marginBottom: 2 },
  indicatorBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ffaa00' },
  indicatorText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
