import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Ransomware Detection (Feature 187)
// File: src/security/RansomDetect.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about ransomware indicators and
// demonstrates detection of suspicious encryption-like behavior patterns.

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

const RANSOMWARE_SIGNS = [
  { sign: 'Files renamed with strange extensions', severity: 'critical' },
  { sign: 'Ransom note on desktop', severity: 'critical' },
  { sign: 'Unable to open documents', severity: 'critical' },
  { sign: 'Programs wont launch', severity: 'high' },
  { sign: 'Antivirus disabled', severity: 'high' },
  { sign: 'High CPU/disk usage unexpectedly', severity: 'medium' },
  { sign: 'Network traffic spikes', severity: 'medium' },
  { sign: 'Shadow copies deleted', severity: 'high' },
];

const PREVENTION_STEPS = [
  'Keep regular offline backups',
  'Update OS and software promptly',
  'Use reputable antivirus',
  'Disable macros in Office documents',
  'Be cautious with email attachments',
  'Enable file extensions visibility',
  'Use application whitelisting',
];

const STORAGE_KEY = '@manu_ai_ransom_alerts';

export default function RansomDetect() {
  const [checklist, setChecklist] = useState(
    RANSOMWARE_SIGNS.map(s => ({ ...s, checked: false }))
  );
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [detected, setDetected] = useState(false);
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

  const toggleCheck = (idx) => {
    const updated = [...checklist];
    updated[idx].checked = !updated[idx].checked;
    setChecklist(updated);
    const criticalCount = updated.filter(i => i.checked && i.severity === 'critical').length;
    if (criticalCount >= 2 && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '🚨 RANSOMWARE DETECTED',
        'Multiple critical indicators present. Disconnect from network immediately and seek professional help.',
        [{ text: 'Show Steps', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
      );
    } else if (criticalCount < 2) {
      setDetected(false);
    }
  };

  const criticalCount = checklist.filter(i => i.checked && i.severity === 'critical').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔒 Ransomware Detection</Text>
      <Text style={styles.subtitle}>Educational tool to identify ransomware indicators and teach prevention.</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Threat Level:</Text>
        <Text style={[styles.statusValue, { color: criticalCount >= 2 ? '#ff3333' : criticalCount >= 1 ? '#ffaa00' : '#00ff88' }]}>
          {criticalCount >= 2 ? 'CRITICAL' : criticalCount >= 1 ? 'ELEVATED' : 'NORMAL'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>✅ Symptom Checklist</Text>
      <View style={styles.checklistBox}>
        {checklist.map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.checkRow} onPress={() => toggleCheck(idx)}>
            <Text style={styles.checkBox}>{item.checked ? '☑️' : '⬜️'}</Text>
            <Text style={[styles.checkText, item.checked && styles.checkedText]}>{item.sign}</Text>
            <Text style={[styles.severityBadge, { color: item.severity === 'critical' ? '#ff3333' : item.severity === 'high' ? '#ffaa00' : '#00ff88' }]}>
              {item.severity.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {detected && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🚨 RANSOMWARE INDICATORS PRESENT</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Prevention Steps</Text>
      <View style={styles.eduBox}>
        {PREVENTION_STEPS.map((step, idx) => (
          <Text key={idx} style={styles.eduText}>• {step}</Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Ransomware encrypts your files and demands payment for decryption.</Text>
        <Text style={styles.eduText}>• NEVER pay the ransom — it funds criminals and decryption is not guaranteed.</Text>
        <Text style={styles.eduText}>• Offline backups are the only reliable recovery method.</Text>
        <Text style={styles.eduText}>• This is an educational checklist, not a real-time system monitor.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  statusBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: '#aaa', fontSize: 16 },
  statusValue: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  checklistBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ff3333' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  checkBox: { fontSize: 18, marginRight: 10 },
  checkText: { color: '#ccc', fontSize: 14, flex: 1 },
  checkedText: { color: '#00ff88', textDecorationLine: 'line-through' },
  severityBadge: { fontSize: 10, fontWeight: 'bold', marginLeft: 8 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
