import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — USB Data Block (Feature 196)
// File: src/security/USBDataBlock.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about USB-based threats (BadUSB,
// data exfiltration) and demonstrates USB security awareness.

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

const USB_THREATS = [
  { name: 'BadUSB', desc: 'USB device disguised as keyboard injects malicious commands', severity: 'critical' },
  { name: 'USB Data Exfiltration', desc: 'Unauthorized copying of data to USB drive', severity: 'high' },
  { name: 'Juice Jacking', desc: 'Compromised charging station steals data or installs malware', severity: 'high' },
  { name: 'USB Killer', desc: 'Device that physically destroys USB ports via electrical surge', severity: 'medium' },
  { name: 'AutoRun Exploit', desc: 'Malware executes automatically when USB is inserted', severity: 'high' },
];

const PROTECTION_STEPS = [
  'Disable USB auto-run/autoplay on all devices',
  'Use USB data blockers (charge-only adapters) in public places',
  'Never plug in unknown USB drives',
  'Physically secure USB ports on sensitive systems',
  'Use endpoint protection with USB control policies',
  'Regularly audit USB device connections',
];

const STORAGE_KEY = '@manu_ai_usb_alerts';

export default function USBDataBlock() {
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [usbConnected, setUsbConnected] = useState(false);
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

  const simulateConnection = () => {
    setUsbConnected(true);
    const now = new Date().toISOString();
    const newStats = { count: stats.count + 1, lastAlert: now };
    setStats(newStats);
    saveStats(newStats);
    Alert.alert(
      '⚠️ USB Connection Detected',
      'A USB device has been connected. Verify it is trusted before allowing data access.',
      [{ text: 'Block Data', onPress: () => setUsbConnected(false) }, { text: 'Allow (Educational)', onPress: () => {} }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔌 USB Data Block</Text>
      <Text style={styles.subtitle}>Educational tool to raise awareness about USB-based threats and data protection.</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>USB Status:</Text>
        <Text style={[styles.statusValue, { color: usbConnected ? '#ff3333' : '#00ff88' }]}>
          {usbConnected ? '⚠️ CONNECTED' : '✓ NO USB'}
        </Text>
      </View>

      <TouchableOpacity style={styles.simButton} onPress={simulateConnection}>
        <Text style={styles.simButtonText}>🧪 Simulate USB Connection</Text>
      </TouchableOpacity>

      {usbConnected && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>⚠️ USB Device Connected</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>⚠️ USB Threat Types</Text>
      <View style={styles.threatBox}>
        {USB_THREATS.map((threat, idx) => (
          <View key={idx} style={styles.threatRow}>
            <Text style={[styles.threatName, { color: threat.severity === 'critical' ? '#ff0000' : threat.severity === 'high' ? '#ff3333' : '#ffaa00' }]}>
              {threat.severity === 'critical' ? '🔴' : threat.severity === 'high' ? '🟠' : '🟡'} {threat.name}
            </Text>
            <Text style={styles.threatDesc}>{threat.desc}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Protection Steps</Text>
      <View style={styles.eduBox}>
        {PROTECTION_STEPS.map((step, idx) => (
          <Text key={idx} style={styles.eduText}>• {step}</Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• USB devices can be more dangerous than they appear.</Text>
        <Text style={styles.eduText}>• Never use USB drives found in parking lots or public areas.</Text>
        <Text style={styles.eduText}>• Charge-only adapters (data blockers) prevent juice jacking.</Text>
        <Text style={styles.eduText}>• This is an educational simulation, not actual USB monitoring.</Text>
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
  threatBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ff3333' },
  threatRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  threatName: { fontWeight: 'bold', fontSize: 14 },
  threatDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
