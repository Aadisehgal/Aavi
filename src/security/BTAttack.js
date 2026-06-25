import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Bluetooth Attack Detection (Feature 194)
// File: src/security/BTAttack.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about Bluetooth attacks (Bluejacking,
// Bluebugging, Bluesnarfing) and demonstrates detection concepts.

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

const BT_ATTACK_TYPES = [
  { name: 'Bluejacking', desc: 'Sending unsolicited messages to Bluetooth devices', risk: 'low' },
  { name: 'Bluebugging', desc: 'Taking control of a device without authorization', risk: 'high' },
  { name: 'Bluesnarfing', desc: 'Stealing data from Bluetooth devices', risk: 'high' },
  { name: 'BlueBorne', desc: 'Remote code execution via Bluetooth vulnerabilities', risk: 'critical' },
  { name: 'KNOB Attack', desc: 'Key Negotiation of Bluetooth attack', risk: 'high' },
  { name: 'BLURtooth', desc: 'Cross-transport key derivation vulnerability', risk: 'medium' },
];

const MOCK_DEVICES = [
  { name: 'My Headphones', mac: 'AA:BB:CC:11:22:33', paired: true, suspicious: false },
  { name: 'Unknown Device', mac: 'DE:AD:BE:EF:00:01', paired: false, suspicious: true },
  { name: 'Car Bluetooth', mac: '11:22:33:44:55:66', paired: true, suspicious: false },
  { name: 'Unknown Device', mac: 'CA:FE:BA:BE:00:02', paired: false, suspicious: true },
];

const STORAGE_KEY = '@manu_ai_btattack_alerts';

export default function BTAttack() {
  const [devices, setDevices] = useState([]);
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
      setDevices(MOCK_DEVICES);
      setScanning(false);
      const suspiciousCount = MOCK_DEVICES.filter(d => d.suspicious).length;
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      if (suspiciousCount > 0) {
        Alert.alert(
          `⚠️ ${suspiciousCount} Suspicious Device(s)`,
          'Unknown Bluetooth devices detected nearby. Disable Bluetooth if not needed.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔵 Bluetooth Attack Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect suspicious Bluetooth devices and teach BT security.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Scanning...' : '🔍 Scan Bluetooth'}</Text>
      </TouchableOpacity>

      {devices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔵 Nearby Devices</Text>
          {devices.map((device, idx) => (
            <View key={idx} style={[styles.deviceCard, { borderLeftColor: device.suspicious ? '#ff3333' : '#00ff88' }]}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={[styles.deviceStatus, { color: device.suspicious ? '#ff3333' : '#00ff88' }]}>
                  {device.suspicious ? '⚠️ SUSPICIOUS' : '✓ TRUSTED'}
                </Text>
              </View>
              <Text style={styles.deviceInfo}>MAC: {device.mac}</Text>
              <Text style={styles.deviceInfo}>Status: {device.paired ? 'Paired' : 'Unpaired'}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>⚠️ Attack Types</Text>
      <View style={styles.attackBox}>
        {BT_ATTACK_TYPES.map((attack, idx) => (
          <View key={idx} style={styles.attackRow}>
            <Text style={[styles.attackName, { color: attack.risk === 'critical' ? '#ff0000' : attack.risk === 'high' ? '#ff3333' : '#ffaa00' }]}>
              {attack.risk === 'critical' ? '🔴' : attack.risk === 'high' ? '🟠' : '🟡'} {attack.name}
            </Text>
            <Text style={styles.attackDesc}>{attack.desc}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Scans: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Keep Bluetooth disabled when not in use.</Text>
        <Text style={styles.eduText}>• Set Bluetooth to non-discoverable mode.</Text>
        <Text style={styles.eduText}>• Do not accept pairing requests from unknown devices.</Text>
        <Text style={styles.eduText}>• Update your OS to patch Bluetooth vulnerabilities.</Text>
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
  deviceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deviceName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deviceStatus: { fontSize: 13, fontWeight: 'bold' },
  deviceInfo: { color: '#888', fontSize: 13, marginBottom: 2 },
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
