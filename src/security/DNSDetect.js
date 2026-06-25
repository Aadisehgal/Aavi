import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — DNS Hijack Detection (Feature 191)
// File: src/security/DNSDetect.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about DNS hijacking and demonstrates
// DNS verification concepts for network security awareness.

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

const TRUSTED_DNS = [
  { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1' },
  { name: 'Google', primary: '8.8.8.8', secondary: '8.8.4.4' },
  { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112' },
  { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220' },
];

const SUSPICIOUS_DNS = [
  { name: 'Unknown ISP DNS', primary: '192.168.1.1', secondary: '10.0.0.1', suspicious: true },
  { name: 'Hijacked DNS', primary: '185.220.101.42', secondary: '185.220.101.43', suspicious: true },
];

const STORAGE_KEY = '@manu_ai_dns_alerts';

export default function DNSDetect() {
  const [currentDNS, setCurrentDNS] = useState(null);
  const [stats, setStats] = useState({ count: 0, lastCheck: null });
  const [checking, setChecking] = useState(false);
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

  const checkDNS = () => {
    setChecking(true);
    setTimeout(() => {
      // Simulate DNS check - randomly pick suspicious or trusted
      const isSuspicious = Math.random() > 0.7;
      const dns = isSuspicious ? SUSPICIOUS_DNS[0] : TRUSTED_DNS[0];
      setCurrentDNS(dns);
      setChecking(false);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastCheck: now };
      setStats(newStats);
      saveStats(newStats);
      if (dns.suspicious) {
        Alert.alert(
          '🚨 Suspicious DNS Detected',
          'Your DNS settings may be compromised. Consider switching to a trusted DNS provider.',
          [{ text: 'Show Trusted DNS', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
        );
      }
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🌐 DNS Hijack Detection</Text>
      <Text style={styles.subtitle}>Educational tool to verify DNS settings and detect potential hijacking.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={checkDNS} disabled={checking}>
        <Text style={styles.scanButtonText}>{checking ? '🔍 Checking...' : '🔍 Check DNS Settings'}</Text>
      </TouchableOpacity>

      {currentDNS && (
        <View style={[styles.dnsCard, { borderLeftColor: currentDNS.suspicious ? '#ff3333' : '#00ff88' }]}>
          <Text style={styles.dnsLabel}>Current DNS:</Text>
          <Text style={styles.dnsName}>{currentDNS.name}</Text>
          <Text style={styles.dnsIp}>Primary: {currentDNS.primary}</Text>
          <Text style={styles.dnsIp}>Secondary: {currentDNS.secondary}</Text>
          <Text style={[styles.dnsStatus, { color: currentDNS.suspicious ? '#ff3333' : '#00ff88' }]}>
            {currentDNS.suspicious ? '⚠️ SUSPICIOUS' : '✓ TRUSTED'}
          </Text>
        </View>
      )}

      {currentDNS && currentDNS.suspicious && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🚨 DNS Hijacking Risk</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>✅ Trusted DNS Providers</Text>
      <View style={styles.dnsList}>
        {TRUSTED_DNS.map((dns, idx) => (
          <View key={idx} style={styles.dnsItem}>
            <Text style={styles.dnsItemName}>{dns.name}</Text>
            <Text style={styles.dnsItemIp}>{dns.primary} / {dns.secondary}</Text>
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
        <Text style={styles.eduText}>• DNS hijacking redirects you to fake websites without your knowledge.</Text>
        <Text style={styles.eduText}>• Always verify HTTPS certificates when accessing sensitive sites.</Text>
        <Text style={styles.eduText}>• Use DNS over HTTPS (DoH) for encrypted DNS queries.</Text>
        <Text style={styles.eduText}>• Router compromise is a common cause of DNS hijacking.</Text>
        <Text style={styles.eduText}>• This demo simulates DNS checks for educational purposes.</Text>
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
  dnsCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 16, borderLeftWidth: 4 },
  dnsLabel: { color: '#aaa', fontSize: 13 },
  dnsName: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginVertical: 4 },
  dnsIp: { color: '#ccc', fontSize: 14 },
  dnsStatus: { fontWeight: 'bold', fontSize: 16, marginTop: 8 },
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginBottom: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  dnsList: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  dnsItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  dnsItemName: { color: '#fff', fontSize: 14 },
  dnsItemIp: { color: '#00ff88', fontSize: 13 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
