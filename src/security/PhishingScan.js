import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Phishing Link Scanner (Feature 183)
// File: src/security/PhishingScan.js
// Generated: 2026-06-25
// Educational Purpose: Analyzes URLs for phishing indicators and
// educates users about safe browsing practices.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  TextInput,
} from 'react-native';

const PHISHING_INDICATORS = [
  { pattern: 'http://', risk: 'medium', desc: 'Unencrypted connection' },
  { pattern: '@', risk: 'high', desc: 'URL contains @ symbol (credential trick)' },
  { pattern: 'bit.ly', risk: 'medium', desc: 'URL shortener hides destination' },
  { pattern: 'tinyurl', risk: 'medium', desc: 'URL shortener hides destination' },
  { pattern: 'login-', risk: 'high', desc: 'Hyphenated login domain' },
  { pattern: 'secure-', risk: 'medium', desc: 'Fake security prefix' },
  { pattern: 'verify-', risk: 'high', desc: 'Verification scam pattern' },
  { pattern: 'account-update', risk: 'high', desc: 'Account update scam' },
  { pattern: 'paypal.com.', risk: 'high', desc: 'Domain spoofing with dot' },
  { pattern: 'amazon.com.', risk: 'high', desc: 'Domain spoofing with dot' },
  { pattern: 'bank', risk: 'low', desc: 'Contains bank keyword' },
  { pattern: 'urgent', risk: 'medium', desc: 'Urgency tactic' },
  { pattern: 'suspend', risk: 'high', desc: 'Account suspension threat' },
];

const STORAGE_KEY = '@manu_ai_phishing_alerts';

export default function PhishingScan() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState([]);
  const [riskLevel, setRiskLevel] = useState('safe');
  const [stats, setStats] = useState({ count: 0, lastScan: null });
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

  const scanUrl = () => {
    if (!url.trim()) return;
    const lower = url.toLowerCase();
    const found = [];
    let maxRisk = 'safe';

    PHISHING_INDICATORS.forEach(ind => {
      if (lower.includes(ind.pattern.toLowerCase())) {
        found.push(ind);
        if (ind.risk === 'high') maxRisk = 'high';
        else if (ind.risk === 'medium' && maxRisk !== 'high') maxRisk = 'medium';
      }
    });

    setResults(found);
    setRiskLevel(maxRisk);

    const now = new Date().toISOString();
    const newStats = { count: stats.count + 1, lastScan: now };
    setStats(newStats);
    saveStats(newStats);

    if (maxRisk === 'high') {
      Alert.alert(
        '🚨 HIGH RISK: Potential Phishing',
        'This URL shows multiple phishing indicators. Do not enter credentials.',
        [{ text: 'Understood', onPress: () => {} }]
      );
    }
  };

  const getRiskColor = () => {
    if (riskLevel === 'high') return '#ff3333';
    if (riskLevel === 'medium') return '#ffaa00';
    return '#00ff88';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔗 Phishing Link Scanner</Text>
      <Text style={styles.subtitle}>Educational tool to analyze URLs for phishing indicators and teach safe browsing.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Enter URL to scan:</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/login"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.scanButton} onPress={scanUrl}>
          <Text style={styles.scanButtonText}>🔍 Scan URL</Text>
        </TouchableOpacity>

        <View style={[styles.riskBar, { borderColor: getRiskColor() }]}>
          <Text style={[styles.riskText, { color: getRiskColor() }]}>Risk Level: {riskLevel.toUpperCase()}</Text>
        </View>

        {results.length > 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.foundTitle}>⚠️ Indicators Found:</Text>
            {results.map((res, idx) => (
              <View key={idx} style={styles.resultRow}>
                <Text style={[styles.resultPattern, { color: res.risk === 'high' ? '#ff3333' : res.risk === 'medium' ? '#ffaa00' : '#00ff88' }]}>
                  {res.risk === 'high' ? '🔴' : res.risk === 'medium' ? '🟡' : '🟢'} {res.pattern}
                </Text>
                <Text style={styles.resultDesc}>{res.desc}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Scan History</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Scans: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Anti-Phishing Tips</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Always check the domain carefully before entering credentials.</Text>
        <Text style={styles.eduText}>• Look for HTTPS and a valid certificate (padlock icon).</Text>
        <Text style={styles.eduText}>• Be suspicious of urgent emails demanding immediate action.</Text>
        <Text style={styles.eduText}>• Never click links in unexpected emails; type the URL manually.</Text>
        <Text style={styles.eduText}>• Use multi-factor authentication (MFA) on all accounts.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  demoBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  demoLabel: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#444', marginBottom: 10 },
  scanButton: { backgroundColor: '#00d4ff', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  scanButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  riskBar: { padding: 10, borderRadius: 8, borderWidth: 2, backgroundColor: '#111', alignItems: 'center', marginBottom: 12 },
  riskText: { fontSize: 18, fontWeight: 'bold' },
  foundTitle: { color: '#ffaa00', fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  resultRow: { backgroundColor: '#222', borderRadius: 6, padding: 10, marginBottom: 6 },
  resultPattern: { fontWeight: 'bold', fontSize: 14 },
  resultDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
