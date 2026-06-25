import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Stalkerware Detection (Feature 189)
// File: src/security/StalkerDetect.js
// Generated: 2026-06-25
// Educational Purpose: Detects potentially unwanted tracking apps
// and educates users about stalkerware removal and safety planning.

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

const STALKERWARE_SIGNS = [
  { sign: 'Unknown app with accessibility access', severity: 'critical' },
  { sign: 'Battery drains unusually fast', severity: 'medium' },
  { sign: 'Phone heats up when not in use', severity: 'medium' },
  { sign: 'Data usage spikes unexpectedly', severity: 'medium' },
  { sign: 'Strange background noise during calls', severity: 'high' },
  { sign: 'GPS icon appears randomly', severity: 'high' },
  { sign: 'Apps you did not install', severity: 'critical' },
  { sign: 'Cannot uninstall certain apps', severity: 'critical' },
  { sign: 'Phone behaves erratically', severity: 'medium' },
  { sign: 'Settings change without your input', severity: 'high' },
];

const SAFETY_RESOURCES = [
  { name: 'National Domestic Violence Hotline', contact: '1-800-799-7233', desc: '24/7 support and safety planning' },
  { name: 'Stalkerware Detection Guide', contact: 'stalkerware.org', desc: 'Technical resources for detection' },
  { name: 'Cyber Civil Rights Initiative', contact: 'cybercivilrights.org', desc: 'Non-consensual image abuse support' },
];

const STORAGE_KEY = '@manu_ai_stalker_alerts';

export default function StalkerDetect() {
  const [checklist, setChecklist] = useState(
    STALKERWARE_SIGNS.map(s => ({ ...s, checked: false }))
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
        '🚨 STALKERWARE INDICATORS DETECTED',
        'Your device may have stalkerware. Seek help from a domestic violence advocate before removing it.',
        [{ text: 'View Resources', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
      );
    } else if (criticalCount < 2) {
      setDetected(false);
    }
  };

  const criticalCount = checklist.filter(i => i.checked && i.severity === 'critical').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>👁️ Stalkerware Detection</Text>
      <Text style={styles.subtitle}>Educational tool to identify stalkerware indicators and provide safety resources.</Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>⚠️ IMPORTANT: If you suspect stalkerware, consult a domestic violence advocate BEFORE removing it, as removal may alert the abuser.</Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Risk Level:</Text>
        <Text style={[styles.statusValue, { color: criticalCount >= 2 ? '#ff3333' : criticalCount >= 1 ? '#ffaa00' : '#00ff88' }]}>
          {criticalCount >= 2 ? 'HIGH RISK' : criticalCount >= 1 ? 'ELEVATED' : 'LOW'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>✅ Indicator Checklist</Text>
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
          <Text style={styles.alertText}>🚨 STALKERWARE INDICATORS PRESENT</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Safety Resources</Text>
      {SAFETY_RESOURCES.map((res, idx) => (
        <TouchableOpacity key={idx} style={styles.resourceCard} onPress={() => {
          if (res.contact.includes('.')) Linking.openURL(`https://${res.contact}`);
          else Linking.openURL(`tel:${res.contact.replace(/\D/g, '')}`);
        }}>
          <Text style={styles.resName}>{res.name}</Text>
          <Text style={styles.resContact}>{res.contact}</Text>
          <Text style={styles.resDesc}>{res.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Stalkerware is often installed by someone with physical access to your device.</Text>
        <Text style={styles.eduText}>• Factory reset may remove stalkerware but also erases evidence.</Text>
        <Text style={styles.eduText}>• Use a trusted friend\'s device to seek help if you suspect monitoring.</Text>
        <Text style={styles.eduText}>• This tool is for educational awareness and safety planning.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  warningBox: { backgroundColor: '#331111', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ff3333' },
  warningText: { color: '#ff8888', fontSize: 13, lineHeight: 18 },
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
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ff3333' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resContact: { color: '#ff6666', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
