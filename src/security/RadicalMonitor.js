import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Radicalization Monitor (Feature 181)
// File: src/security/RadicalMonitor.js
// Generated: 2026-06-25
// Educational Purpose: Detects extremist content keywords in local text
// and provides educational resources about deradicalization and reporting.

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

const RADICAL_KEYWORDS = [
  'jihadist', 'isis recruitment', 'terrorist training', 'extremist manifesto',
  'lone wolf attack', 'radicalization', 'violent extremism', 'holy war',
  'martyrdom operation', 'terror cell', 'extremist propaganda',
];

const RESOURCES = [
  { name: 'FBI Report Extremism', contact: 'tips.fbi.gov', desc: 'Report suspicious activity' },
  { name: 'Life After Hate', contact: 'lifeafterhate.org', desc: 'Helping people leave extremism' },
  { name: 'Parents for Peace', contact: 'parents4peace.org', desc: 'Family support for extremism' },
];

const STORAGE_KEY = '@manu_ai_radical_alerts';

export default function RadicalMonitor() {
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

  const scanText = (text) => {
    const lower = text.toLowerCase();
    const found = RADICAL_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Extremist Content Detected',
        'Potentially extremist language detected. Educational awareness only.',
        [{ text: 'View Resources', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
      );
    } else if (!found) {
      setDetected(false);
    }
  };

  const handleChange = (text) => {
    setInputText(text);
    if (text.length > 3) scanText(text);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🚨 Radicalization Monitor</Text>
      <Text style={styles.subtitle}>Educational tool to detect extremist content keywords and provide deradicalization resources.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Text Scanner:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for extremist keywords..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>🚨 Extremist Content Detected</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Resources</Text>
      {RESOURCES.map((res, idx) => (
        <TouchableOpacity key={idx} style={styles.resourceCard} onPress={() => {
          if (res.contact.includes('.')) Linking.openURL(`https://${res.contact}`);
          else Alert.alert(res.name, res.contact);
        }}>
          <Text style={styles.resName}>{res.name}</Text>
          <Text style={styles.resContact}>{res.contact}</Text>
          <Text style={styles.resDesc}>{res.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Radicalization is a process, not an event. Early intervention works.</Text>
        <Text style={styles.eduText}>• If you suspect someone is being radicalized, seek professional guidance.</Text>
        <Text style={styles.eduText}>• Report credible threats to law enforcement immediately.</Text>
        <Text style={styles.eduText}>• This tool scans LOCAL text only for educational awareness.</Text>
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
  alertBadge: { backgroundColor: '#cc3300', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#cc3300' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resContact: { color: '#ff8844', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
