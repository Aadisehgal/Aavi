import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Location Spoof Detection (Feature 198)
// File: src/security/SpoofDetect.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about GPS spoofing and demonstrates
// detection concepts for location integrity awareness.

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

const SPOOF_INDICATORS = [
  { indicator: 'Location jumps unrealistically fast', severity: 'high' },
  { indicator: 'GPS coordinates inside buildings/impossible areas', severity: 'high' },
  { indicator: 'Multiple location sources disagree', severity: 'medium' },
  { indicator: 'Mock location app installed', severity: 'critical' },
  { indicator: 'Location accuracy suddenly drops', severity: 'medium' },
  { indicator: 'Time zone mismatch with location', severity: 'medium' },
];

const MOCK_LOCATIONS = [
  { source: 'GPS', lat: 40.7128, lng: -74.0060, accuracy: 5, time: '2026-06-25 10:00:00' },
  { source: 'Network', lat: 40.7130, lng: -74.0062, accuracy: 50, time: '2026-06-25 10:00:00' },
  { source: 'Mock (Simulated)', lat: 51.5074, lng: -0.1278, accuracy: 3, time: '2026-06-25 10:00:00' },
];

const STORAGE_KEY = '@manu_ai_spoof_alerts';

export default function SpoofDetect() {
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [scanning, setScanning] = useState(false);
  const [spoofDetected, setSpoofDetected] = useState(false);
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
      setLocations(MOCK_LOCATIONS);
      setScanning(false);
      const hasMock = MOCK_LOCATIONS.some(l => l.source.includes('Mock'));
      setSpoofDetected(hasMock);
      if (hasMock) {
        const now = new Date().toISOString();
        const newStats = { count: stats.count + 1, lastAlert: now };
        setStats(newStats);
        saveStats(newStats);
        Alert.alert(
          '🚨 Location Spoofing Detected',
          'Mock location source detected. Location integrity may be compromised.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📍 Location Spoof Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect GPS spoofing and teach location integrity concepts.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Checking...' : '🔍 Check Location Integrity'}</Text>
      </TouchableOpacity>

      {locations.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📍 Location Sources</Text>
          {locations.map((loc, idx) => (
            <View key={idx} style={[styles.locCard, { borderLeftColor: loc.source.includes('Mock') ? '#ff3333' : '#00ff88' }]}>
              <View style={styles.locHeader}>
                <Text style={styles.locSource}>{loc.source}</Text>
                <Text style={[styles.locStatus, { color: loc.source.includes('Mock') ? '#ff3333' : '#00ff88' }]}>
                  {loc.source.includes('Mock') ? '⚠️ SUSPICIOUS' : '✓ TRUSTED'}
                </Text>
              </View>
              <Text style={styles.locInfo}>Lat: {loc.lat}, Lng: {loc.lng}</Text>
              <Text style={styles.locInfo}>Accuracy: {loc.accuracy}m</Text>
              <Text style={styles.locInfo}>Time: {loc.time}</Text>
            </View>
          ))}
        </>
      )}

      {spoofDetected && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🚨 Location Spoofing Detected</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>⚠️ Spoof Indicators</Text>
      <View style={styles.indicatorBox}>
        {SPOOF_INDICATORS.map((ind, idx) => (
          <View key={idx} style={styles.indicatorRow}>
            <Text style={[styles.indicatorName, { color: ind.severity === 'critical' ? '#ff0000' : ind.severity === 'high' ? '#ff3333' : '#ffaa00' }]}>
              {ind.severity === 'critical' ? '🔴' : ind.severity === 'high' ? '🟠' : '🟡'} {ind.indicator}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• GPS spoofing can be done with software or hardware signal generators.</Text>
        <Text style={styles.eduText}>• Cross-reference GPS with WiFi and cell tower location for validation.</Text>
        <Text style={styles.eduText}>• Mock location apps require developer options to be enabled.</Text>
        <Text style={styles.eduText}>• Location spoofing is used in gaming cheats and fraud.</Text>
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
  locCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locSource: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  locStatus: { fontSize: 13, fontWeight: 'bold' },
  locInfo: { color: '#888', fontSize: 13, marginBottom: 2 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  indicatorBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ffaa00' },
  indicatorRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  indicatorName: { fontWeight: 'bold', fontSize: 14 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
