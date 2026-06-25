import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Man-in-the-Middle Alert (Feature 192)
// File: src/security/MITMAlert.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about certificate anomalies and
// MITM attack concepts for network security awareness.

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

const CERTIFICATE_CHECKS = [
  { check: 'Certificate expired', risk: 'high', desc: 'Expired certs may indicate interception' },
  { check: 'Self-signed certificate', risk: 'high', desc: 'Not issued by trusted CA' },
  { check: 'Wrong domain name', risk: 'critical', desc: 'Certificate does not match site' },
  { check: 'Weak cipher (RC4/MD5)', risk: 'medium', desc: 'Outdated encryption algorithms' },
  { check: 'Certificate revoked', risk: 'high', desc: 'Previously valid but now revoked' },
  { check: 'Unknown issuer', risk: 'medium', desc: 'Issuer not in trusted root store' },
];

const MOCK_SITES = [
  { url: 'bankofamerica.com', status: 'secure', cert: 'DigiCert EV', expires: '2026-12-01' },
  { url: 'suspicious-bank.com', status: 'warning', cert: 'Self-signed', expires: '2025-01-01' },
  { url: 'google.com', status: 'secure', cert: 'Google Trust Services', expires: '2027-03-15' },
  { url: 'fake-paypal.net', status: 'critical', cert: 'Unknown', expires: 'Expired' },
];

const STORAGE_KEY = '@manu_ai_mitm_alerts';

export default function MITMAlert() {
  const [sites, setSites] = useState([]);
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
      setSites(MOCK_SITES);
      setScanning(false);
      const criticalCount = MOCK_SITES.filter(s => s.status === 'critical').length;
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      if (criticalCount > 0) {
        Alert.alert(
          '🚨 Certificate Anomalies Detected',
          'Some sites have suspicious certificates. Do not enter credentials.',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  const getStatusColor = (status) => {
    if (status === 'critical') return '#ff0000';
    if (status === 'warning') return '#ffaa00';
    return '#00ff88';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔐 MITM Alert</Text>
      <Text style={styles.subtitle}>Educational tool to detect certificate anomalies and teach MITM attack awareness.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={runScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? '🔍 Scanning...' : '🔍 Check Certificates'}</Text>
      </TouchableOpacity>

      {sites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔒 Site Certificate Status</Text>
          {sites.map((site, idx) => (
            <View key={idx} style={[styles.siteCard, { borderLeftColor: getStatusColor(site.status) }]}>
              <View style={styles.siteHeader}>
                <Text style={styles.siteUrl}>{site.url}</Text>
                <Text style={[styles.siteStatus, { color: getStatusColor(site.status) }]}>
                  {site.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.siteInfo}>Cert: {site.cert}</Text>
              <Text style={styles.siteInfo}>Expires: {site.expires}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>⚠️ Certificate Checks</Text>
      <View style={styles.checkBox}>
        {CERTIFICATE_CHECKS.map((check, idx) => (
          <View key={idx} style={styles.checkRow}>
            <Text style={[styles.checkName, { color: check.risk === 'critical' ? '#ff0000' : check.risk === 'high' ? '#ff3333' : '#ffaa00' }]}>
              {check.risk === 'critical' ? '🔴' : check.risk === 'high' ? '🟠' : '🟡'} {check.check}
            </Text>
            <Text style={styles.checkDesc}>{check.desc}</Text>
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
        <Text style={styles.eduText}>• MITM attacks intercept communications between you and websites.</Text>
        <Text style={styles.eduText}>• Always verify HTTPS and certificate details on sensitive sites.</Text>
        <Text style={styles.eduText}>• Public Wi-Fi is especially vulnerable to MITM attacks.</Text>
        <Text style={styles.eduText}>• Certificate pinning helps apps detect fake certificates.</Text>
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
  siteCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  siteUrl: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  siteStatus: { fontSize: 13, fontWeight: 'bold' },
  siteInfo: { color: '#888', fontSize: 13, marginBottom: 2 },
  checkBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ffaa00' },
  checkRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  checkName: { fontWeight: 'bold', fontSize: 14 },
  checkDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
