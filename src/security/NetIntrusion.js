import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Network Intrusion Detection (Feature 190)
// File: src/security/NetIntrusion.js
// Generated: 2026-06-25
// Educational Purpose: Demonstrates network monitoring concepts and
// educates users about detecting unknown devices on their network.

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

const MOCK_DEVICES = [
  { name: 'iPhone-12', ip: '192.168.1.105', mac: 'A4:5E:60:XX:XX:01', known: true },
  { name: 'Samsung-TV', ip: '192.168.1.110', mac: 'B8:27:EB:XX:XX:02', known: true },
  { name: 'UNKNOWN-DEVICE', ip: '192.168.1.150', mac: 'DE:AD:BE:EF:00:01', known: false },
  { name: 'Laptop-Windows', ip: '192.168.1.120', mac: '00:1A:2B:XX:XX:03', known: true },
  { name: 'UNKNOWN-DEVICE', ip: '192.168.1.155', mac: 'CA:FE:BA:BE:00:02', known: false },
];

const STORAGE_KEY = '@manu_ai_netintrusion_alerts';

export default function NetIntrusion() {
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
      const unknownCount = MOCK_DEVICES.filter(d => !d.known).length;
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      if (unknownCount > 0) {
        Alert.alert(
          `⚠️ ${unknownCount} Unknown Device(s) Found`,
          'Unknown devices detected on your network. Review and secure your router.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  const unknownDevices = devices.filter(d => !d.known);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🌐 Network Intrusion Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect unknown devices on your network and teach router security.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Scanning...' : '🔍 Scan Network'}</Text>
      </TouchableOpacity>

      {devices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📱 Connected Devices</Text>
          {devices.map((device, idx) => (
            <View key={idx} style={[styles.deviceCard, { borderLeftColor: device.known ? '#00ff88' : '#ff3333' }]}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={[styles.deviceStatus, { color: device.known ? '#00ff88' : '#ff3333' }]}>
                  {device.known ? '✓ Known' : '⚠️ Unknown'}
                </Text>
              </View>
              <Text style={styles.deviceInfo}>IP: {device.ip}</Text>
              <Text style={styles.deviceInfo}>MAC: {device.mac}</Text>
            </View>
          ))}
        </>
      )}

      {unknownDevices.length > 0 && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>⚠️ {unknownDevices.length} Unknown Device(s) Detected</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Scans: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Network Security Tips</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Change default router admin passwords immediately.</Text>
        <Text style={styles.eduText}>• Use WPA3 or WPA2 encryption, never WEP or open.</Text>
        <Text style={styles.eduText}>• Disable WPS (Wi-Fi Protected Setup) — it has known vulnerabilities.</Text>
        <Text style={styles.eduText}>• Regularly check connected devices in router admin panel.</Text>
        <Text style={styles.eduText}>• Enable MAC address filtering for additional control.</Text>
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
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
