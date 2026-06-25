import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Financial Fraud Shield (Feature 186)
// File: src/security/FraudShield.js
// Generated: 2026-06-25
// Educational Purpose: Detects scam patterns in text (SMS/call scripts)
// and educates users about financial fraud prevention.

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

const SCAM_PATTERNS = [
  { pattern: 'irs calling', risk: 'high', desc: 'IRS never calls without prior notice' },
  { pattern: 'social security suspended', risk: 'high', desc: 'SSA never suspends benefits via phone' },
  { pattern: 'warrant for your arrest', risk: 'high', desc: 'Law enforcement does not warn via phone' },
  { pattern: 'gift card', risk: 'high', desc: 'No legitimate agency demands gift cards' },
  { pattern: 'wire transfer', risk: 'high', desc: 'Urgent wire transfer requests are scams' },
  { pattern: 'bitcoin', risk: 'high', desc: 'Crypto payment demands are almost always scams' },
  { pattern: 'lottery winner', risk: 'high', desc: 'You cannot win a lottery you did not enter' },
  { pattern: 'inheritance', risk: 'high', desc: 'Unexpected inheritance claims are fraudulent' },
  { pattern: 'tech support', risk: 'medium', desc: 'Microsoft/Apple never cold-calls for support' },
  { pattern: 'verify account', risk: 'medium', desc: 'Banks never ask for passwords via email' },
  { pattern: 'limited time', risk: 'medium', desc: 'Urgency tactics pressure poor decisions' },
  { pattern: 'act now', risk: 'medium', desc: 'High-pressure sales are often scams' },
];

const STORAGE_KEY = '@manu_ai_fraud_alerts';

export default function FraudShield() {
  const [inputText, setInputText] = useState('');
  const [findings, setFindings] = useState([]);
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

  const scanText = () => {
    if (!inputText.trim()) return;
    const lower = inputText.toLowerCase();
    const found = [];
    SCAM_PATTERNS.forEach(scam => {
      if (lower.includes(scam.pattern.toLowerCase())) {
        found.push(scam);
      }
    });
    setFindings(found);

    if (found.length > 0) {
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '🚨 Scam Patterns Detected',
        `Found ${found.length} scam indicator(s). Do NOT send money or share personal info.`,
        [{ text: 'Report to FTC', onPress: () => {} }, { text: 'Understood', onPress: () => {} }]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🛡️ Financial Fraud Shield</Text>
      <Text style={styles.subtitle}>Educational tool to detect scam patterns and prevent financial fraud.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Paste suspicious message or call script:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Paste suspicious SMS, email, or call transcript..."
          value={inputText}
          onChangeText={setInputText}
          maxLength={1000}
        />
        <TouchableOpacity style={styles.scanButton} onPress={scanText}>
          <Text style={styles.scanButtonText}>🔍 Scan for Scams</Text>
        </TouchableOpacity>

        {findings.length > 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.foundTitle}>🚨 Scam Indicators:</Text>
            {findings.map((f, idx) => (
              <View key={idx} style={styles.resultRow}>
                <Text style={[styles.resultPattern, { color: f.risk === 'high' ? '#ff3333' : '#ffaa00' }]}>
                  {f.risk === 'high' ? '🔴' : '🟡'} {f.pattern}
                </Text>
                <Text style={styles.resultDesc}>{f.desc}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Scans: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Fraud Prevention Rules</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• NEVER send money via gift cards, wire transfers, or crypto to strangers.</Text>
        <Text style={styles.eduText}>• Government agencies NEVER demand immediate payment over the phone.</Text>
        <Text style={styles.eduText}>• If it sounds too good to be true, it is.</Text>
        <Text style={styles.eduText}>• Hang up and call the organization back using their official number.</Text>
        <Text style={styles.eduText}>• Report scams to reportfraud.ftc.gov</Text>
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
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#444', marginBottom: 10 },
  scanButton: { backgroundColor: '#00d4ff', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  scanButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  foundTitle: { color: '#ff3333', fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
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
