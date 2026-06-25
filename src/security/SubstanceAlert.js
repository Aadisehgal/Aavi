import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Substance Abuse Alert (Feature 176)
// File: src/security/SubstanceAlert.js
// Generated: 2026-06-25
// Educational Purpose: Detects substance-related keywords in local text
// and provides educational resources about addiction and recovery.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Linking,
  TextInput,
} from 'react-native';

const SUBSTANCE_KEYWORDS = [
  'buy drugs', 'drug dealer', 'cocaine', 'heroin', 'meth',
  'pill mill', 'fentanyl', 'oxycontin', 'xanax dealer',
  'dark web drugs', 'synthetic drugs', 'ketamine buy',
];

const RECOVERY_RESOURCES = [
  { name: 'SAMHSA National Helpline', contact: '1-800-662-4357', desc: 'Free confidential treatment referral 24/7' },
  { name: 'Narcotics Anonymous', contact: 'na.org', desc: 'Community-based recovery support' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Text-based crisis support' },
];

const STORAGE_KEY = '@manu_ai_substance_alerts';

export default function SubstanceAlert() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
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

  const scanText = useCallback((text) => {
    const lower = text.toLowerCase();
    const found = SUBSTANCE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Substance-Related Content Detected',
        'This content may indicate substance abuse or illegal drug activity. Educational resources are available.',
        [
          { text: 'View Resources', onPress: () => {} },
          { text: 'Call SAMHSA', onPress: () => Linking.openURL('tel:18006624357') },
        ]
      );
    } else if (!found) {
      setDetected(false);
    }
  }, [detected, stats]);

  const handleChange = (text) => {
    setInputText(text);
    if (text.length > 3) scanText(text);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🧪 Substance Abuse Alert</Text>
      <Text style={styles.subtitle}>Educational tool to detect substance-related keywords and provide recovery resources.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Demo Scanner:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for substance-related keywords..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>⚠️ Substance Content Detected</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Alert History</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Recovery Resources</Text>
      {RECOVERY_RESOURCES.map((res, idx) => (
        <TouchableOpacity key={idx} style={styles.resourceCard} onPress={() => {
          if (res.contact.includes('Text')) Alert.alert('Crisis Text Line', res.contact);
          else if (res.contact.includes('.')) Linking.openURL(`https://${res.contact}`);
          else Linking.openURL(`tel:${res.contact.replace(/\D/g, '')}`);
        }}>
          <Text style={styles.resName}>{res.name}</Text>
          <Text style={styles.resContact}>{res.contact}</Text>
          <Text style={styles.resDesc}>{res.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>📚 Educational Information</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Addiction is a medical condition, not a moral failing.</Text>
        <Text style={styles.eduText}>• Early intervention significantly improves recovery outcomes.</Text>
        <Text style={styles.eduText}>• This tool scans LOCAL text only for educational awareness.</Text>
        <Text style={styles.eduText}>• If you suspect someone is struggling, encourage professional help.</Text>
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
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#444' },
  alertBadge: { backgroundColor: '#ff8800', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ff8800' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resContact: { color: '#ffaa44', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
