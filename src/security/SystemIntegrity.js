import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Complete System Integrity (Feature 200)
// File: src/security/SystemIntegrity.js
// Generated: 2026-06-25
// Educational Purpose: Comprehensive system integrity checker that
// demonstrates security audit concepts for educational awareness.

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

const INTEGRITY_CHECKS = [
  { name: 'OS Version', status: 'pass', desc: 'Android 14 — Latest security patches installed' },
  { name: 'Root Detection', status: 'pass', desc: 'Device is not rooted' },
  { name: 'Bootloader', status: 'pass', desc: 'Bootloader is locked' },
  { name: 'Unknown Sources', status: 'warning', desc: 'Install from unknown sources is enabled' },
  { name: 'USB Debugging', status: 'warning', desc: 'USB debugging is enabled' },
  { name: 'Screen Lock', status: 'pass', desc: 'Strong screen lock (PIN/Password) is set' },
  { name: 'Encryption', status: 'pass', desc: 'Device storage is encrypted' },
  { name: 'Security Patch', status: 'pass', desc: 'Security patch level: June 2026' },
  { name: 'VPN Status', status: 'warning', desc: 'No VPN active — consider using one on public WiFi' },
  { name: 'Developer Options', status: 'warning', desc: 'Developer options are enabled' },
  { name: 'App Verification', status: 'pass', desc: 'Play Protect is active' },
  { name: 'Network Security', status: 'pass', desc: 'Certificate pinning enabled for system apps' },
];

const STORAGE_KEY = '@manu_ai_integrity_alerts';

export default function SystemIntegrity() {
  const [checks, setChecks] = useState([]);
  const [stats, setStats] = useState({ count: 0, lastScan: null });
  const [scanning, setScanning] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
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
      setChecks(INTEGRITY_CHECKS);
      setScanning(false);
      const passCount = INTEGRITY_CHECKS.filter(c => c.status === 'pass').length;
      const score = Math.round((passCount / INTEGRITY_CHECKS.length) * 100);
      setOverallScore(score);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      if (score < 80) {
        Alert.alert(
          '⚠️ System Integrity Warning',
          `Score: ${score}%. Some security settings need attention.`,
          [{ text: 'View Issues', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
        );
      } else {
        Alert.alert('✅ System Integrity Good', `Score: ${score}%. Your device is reasonably secure.`);
      }
    }, 2000);
  };

  const getStatusColor = (status) => {
    if (status === 'pass') return '#00ff88';
    if (status === 'warning') return '#ffaa00';
    return '#ff3333';
  };

  const getScoreColor = () => {
    if (overallScore >= 90) return '#00ff88';
    if (overallScore >= 70) return '#ffaa00';
    return '#ff3333';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔒 System Integrity</Text>
      <Text style={styles.subtitle}>Comprehensive educational security audit demonstrating device integrity checks.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Auditing...' : '🔍 Run Full Security Audit'}</Text>
      </TouchableOpacity>

      {checks.length > 0 && (
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Overall Security Score</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor() }]}>{overallScore}%</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${overallScore}%`, backgroundColor: getScoreColor() }]} />
          </View>
        </View>
      )}

      {checks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📋 Integrity Checks</Text>
          {checks.map((check, idx) => (
            <View key={idx} style={[styles.checkCard, { borderLeftColor: getStatusColor(check.status) }]}>
              <View style={styles.checkHeader}>
                <Text style={styles.checkName}>{check.name}</Text>
                <Text style={[styles.checkStatus, { color: getStatusColor(check.status) }]}>
                  {check.status === 'pass' ? '✓ PASS' : check.status === 'warning' ? '⚠️ WARN' : '✗ FAIL'}
                </Text>
              </View>
              <Text style={styles.checkDesc}>{check.desc}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Audits: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• System integrity is foundational to device security.</Text>
        <Text style={styles.eduText}>• Rooting/jailbreaking removes critical security protections.</Text>
        <Text style={styles.eduText}>• Keep OS and apps updated with latest security patches.</Text>
        <Text style={styles.eduText}>• Disable unnecessary developer options and USB debugging.</Text>
        <Text style={styles.eduText}>• This is an educational demonstration using mock data.</Text>
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
  scoreBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  scoreLabel: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  scoreBar: { width: '100%', height: 12, backgroundColor: '#333', borderRadius: 6, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 6 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  checkCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  checkName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  checkStatus: { fontSize: 13, fontWeight: 'bold' },
  checkDesc: { color: '#888', fontSize: 13 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
