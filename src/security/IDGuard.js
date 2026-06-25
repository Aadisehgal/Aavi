import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Identity Theft Guard (Feature 185)
// File: src/security/IDGuard.js
// Generated: 2026-06-25
// Educational Purpose: Scans text for personal information patterns
// (SSN, credit card, etc.) and educates users about data protection.

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

const PII_PATTERNS = [
  { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/, desc: 'Social Security Number format' },
  { name: 'Credit Card', regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, desc: 'Credit card number format' },
  { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, desc: 'Email address' },
  { name: 'Phone', regex: /\b\d{3}-\d{3}-\d{4}\b/, desc: 'Phone number format' },
  { name: 'DOB', regex: /\b\d{2}\/\d{2}\/\d{4}\b/, desc: 'Date of birth format' },
  { name: 'Password', regex: /password[:\s]*\S+/i, desc: 'Password in plain text' },
];

const STORAGE_KEY = '@manu_ai_idguard_alerts';

export default function IDGuard() {
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
    const found = [];
    PII_PATTERNS.forEach(pattern => {
      if (pattern.regex.test(inputText)) {
        found.push(pattern);
      }
    });
    setFindings(found);

    if (found.length > 0) {
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastScan: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Personal Information Detected',
        `Found ${found.length} type(s) of PII in the text. Be careful sharing this.`,
        [{ text: 'Understood', onPress: () => {} }]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🛡️ Identity Theft Guard</Text>
      <Text style={styles.subtitle}>Educational tool to detect personal information in text and teach data protection.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Paste text to scan for PII:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Paste text that might contain personal info..."
          value={inputText}
          onChangeText={setInputText}
          maxLength={1000}
        />
        <TouchableOpacity style={styles.scanButton} onPress={scanText}>
          <Text style={styles.scanButtonText}>🔍 Scan for PII</Text>
        </TouchableOpacity>

        {findings.length > 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.foundTitle}>⚠️ PII Detected:</Text>
            {findings.map((f, idx) => (
              <View key={idx} style={styles.resultRow}>
                <Text style={styles.resultName}>🔴 {f.name}</Text>
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

      <Text style={styles.sectionTitle}>🛡️ Protection Tips</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Never share SSN or credit card numbers via email or chat.</Text>
        <Text style={styles.eduText}>• Use password managers instead of writing passwords in plain text.</Text>
        <Text style={styles.eduText}>• Shred documents containing PII before discarding.</Text>
        <Text style={styles.eduText}>• Monitor credit reports regularly for unauthorized accounts.</Text>
        <Text style={styles.eduText}>• Enable fraud alerts with credit bureaus if you suspect identity theft.</Text>
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
  resultName: { color: '#ff3333', fontWeight: 'bold', fontSize: 14 },
  resultDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
