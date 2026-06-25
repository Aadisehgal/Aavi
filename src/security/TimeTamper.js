import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Time Tamper Detection (Feature 199)
// File: src/security/TamperDetect.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about time tampering attacks and
// demonstrates NTP verification concepts for system integrity.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';

const NTP_SERVERS = [
  { name: 'pool.ntp.org', status: 'trusted', time: '2026-06-25 10:00:00 UTC' },
  { name: 'time.google.com', status: 'trusted', time: '2026-06-25 10:00:00 UTC' },
  { name: 'time.windows.com', status: 'trusted', time: '2026-06-25 10:00:00 UTC' },
  { name: 'rogue.ntp.local', status: 'suspicious', time: '2025-01-01 00:00:00 UTC' },
];

const TIME_ATTACKS = [
  { attack: 'NTP spoofing', desc: 'Falsifying time to bypass certificate validation', severity: 'high' },
  { attack: 'Replay attack', desc: 'Reusing old valid messages by manipulating time', severity: 'high' },
  { attack: 'Log tampering', desc: 'Hiding attack traces by changing system time', severity: 'medium' },
  { attack: 'License bypass', desc: 'Extending trial periods by rolling back time', severity: 'low' },
];

const STORAGE_KEY = '@manu_ai_timetamper_alerts';

export default function TimeTamper() {
  const [servers, setServers] = useState([]);
  const [stats, setStats] = useState({ count: 0, lastCheck: null });
  const [scanning, setScanning] = useState(false);
  const [tamperDetected, setTamperDetected] = useState(false);
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

  const runCheck = () => {
    setScanning(true);
    setTimeout(() => {
      setServers(NTP_SERVERS);
      setScanning(false);
      const hasSuspicious = NTP_SERVERS.some(s => s.status === 'suspicious');
      setTamperDetected(hasSuspicious);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastCheck: now };
      setStats(newStats);
      saveStats(newStats);
      if (hasSuspicious) {
        Alert.alert(
          '🚨 Time Tampering Detected',
          'NTP server discrepancy detected. System time may be compromised.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>⏰ Time Tamper Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect time tampering and teach NTP security concepts.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runCheck} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Checking...' : '🔍 Verify Time Integrity'}</Text>
      </TouchableOpacity>

      {servers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🌐 NTP Server Status</Text>
          {servers.map((srv, idx) => (
            <View key={idx} style={[styles.serverCard, { borderLeftColor: srv.status === 'suspicious' ? '#ff3333' : '#00ff88' }]}>
              <View style={styles.serverHeader}>
                <Text style={styles.serverName}>{srv.name}</Text>
                <Text style={[styles.serverStatus, { color: srv.status === 'suspicious' ? '#ff3333' : '#00ff88' }]}>
                  {srv.status === 'suspicious' ? '⚠️ SUSPICIOUS' : '✓ TRUSTED'}
                </Text>
              </View>
              <Text style={styles.serverTime}>Time: {srv.time}</Text>
            </View>
          ))}
        </>
      )}

      {tamperDetected && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🚨 Time Tampering Detected</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>⚠️ Time-Based Attacks</Text>
      <View style={styles.attackBox}>
        {TIME_ATTACKS.map((atk, idx) => (
          <View key={idx} style={styles.attackRow}>
            <Text style={[styles.attackName, { color: atk.severity === 'high' ? '#ff3333' : atk.severity === 'medium' ? '#ffaa00' : '#00ff88' }]}>
              {atk.severity === 'high' ? '🔴' : atk.severity === 'medium' ? '🟠' : '🟡'} {atk.attack}
            </Text>
            <Text style={styles.attackDesc}>{atk.desc}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Checks: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastCheck ? new Date(stats.lastCheck).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Time is critical for certificate validation and security protocols.</Text>
        <Text style={styles.eduText}>• NTP attacks can bypass HTTPS certificate expiration checks.</Text>
        <Text style={styles.eduText}>• Use authenticated NTP (NTS) where possible.</Text>
        <Text style={styles.eduText}>• Monitor for sudden large time jumps on your systems.</Text>
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
  serverCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  serverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serverName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  serverStatus: { fontSize: 13, fontWeight: 'bold' },
  serverTime: { color: '#888', fontSize: 13 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  attackBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ffaa00' },
  attackRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  attackName: { fontWeight: 'bold', fontSize: 14 },
  attackDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
