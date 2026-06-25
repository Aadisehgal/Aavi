import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — NFC Skimming Detection (Feature 195)
// File: src/security/NFCSkim.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about NFC skimming/fraud and
// demonstrates detection awareness for contactless payment security.

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

const NFC_RISKS = [
  { risk: 'Card skimming via NFC reader', severity: 'high', desc: 'Criminals use hidden NFC readers to steal card data' },
  { risk: 'Relay attack', severity: 'high', desc: 'Intercepting and relaying NFC signals remotely' },
  { risk: 'Eavesdropping', severity: 'medium', desc: 'Listening to NFC communication between devices' },
  { risk: 'Data corruption', severity: 'low', desc: 'Intentionally corrupting NFC data transmissions' },
  { risk: 'Unauthorized payment', severity: 'high', desc: 'Making payments without cardholder consent' },
];

const PROTECTION_TIPS = [
  'Use RFID-blocking wallets or card sleeves',
  'Keep NFC disabled when not in use',
  'Monitor bank statements for unauthorized transactions',
  'Use contactless payment limits',
  'Be wary of crowded places where skimming is common',
];

const STORAGE_KEY = '@manu_ai_nfc_alerts';

export default function NFCSkim() {
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [simulatedThreat, setSimulatedThreat] = useState(false);
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

  const simulateDetection = () => {
    setSimulatedThreat(true);
    const now = new Date().toISOString();
    const newStats = { count: stats.count + 1, lastAlert: now };
    setStats(newStats);
    saveStats(newStats);
    Alert.alert(
      '⚠️ NFC Threat Simulation',
      'Anomalous NFC activity detected. In a real scenario, disable NFC immediately.',
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📶 NFC Skimming Detection</Text>
      <Text style={styles.subtitle}>Educational tool to raise awareness about NFC fraud and contactless payment security.</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>NFC Status:</Text>
        <Text style={[styles.statusValue, { color: nfcEnabled ? '#ffaa00' : '#00ff88' }]}>
          {nfcEnabled ? 'ENABLED (Risk)' : 'DISABLED (Safe)'}
        </Text>
      </View>

      <TouchableOpacity style={styles.simButton} onPress={simulateDetection}>
        <Text style={styles.simButtonText}>🧪 Simulate NFC Threat Detection</Text>
      </TouchableOpacity>

      {simulatedThreat && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>⚠️ NFC Anomaly Simulated</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>⚠️ NFC Threat Types</Text>
      <View style={styles.riskBox}>
        {NFC_RISKS.map((risk, idx) => (
          <View key={idx} style={styles.riskRow}>
            <Text style={[styles.riskName, { color: risk.severity === 'high' ? '#ff3333' : risk.severity === 'medium' ? '#ffaa00' : '#00ff88' }]}>
              {risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟠' : '🟡'} {risk.risk}
            </Text>
            <Text style={styles.riskDesc}>{risk.desc}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Simulations: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Protection Tips</Text>
      <View style={styles.eduBox}>
        {PROTECTION_TIPS.map((tip, idx) => (
          <Text key={idx} style={styles.eduText}>• {tip}</Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• NFC skimming requires close proximity (usually < 10cm).</Text>
        <Text style={styles.eduText}>• RFID-blocking materials prevent unauthorized NFC reads.</Text>
        <Text style={styles.eduText}>• Mobile payment apps (Apple Pay, Google Pay) are generally safer than cards.</Text>
        <Text style={styles.eduText}>• This is an educational simulation, not real-time NFC monitoring.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  statusBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: '#aaa', fontSize: 16 },
  statusValue: { fontSize: 16, fontWeight: 'bold' },
  simButton: { backgroundColor: '#ffaa00', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  simButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginBottom: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  riskBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ff3333' },
  riskRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  riskName: { fontWeight: 'bold', fontSize: 14 },
  riskDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
