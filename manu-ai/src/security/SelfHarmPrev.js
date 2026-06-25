import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Self-Harm Prevention (Feature 175)
// File: src/security/SelfHarmPrev.js
// Generated: 2026-06-25
// Educational Purpose: Detects self-harm related keywords in local text input
// and provides immediate mental health resources. Purely educational/awareness.

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
  AsyncStorage,
} from 'react-native';

const SELF_HARM_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die',
  'self harm', 'self-harm', 'cutting myself', 'overdose',
  'no reason to live', 'better off dead', 'hurt myself',
];

const HELP_RESOURCES = [
  { name: 'National Suicide Prevention Lifeline', number: '988', desc: '24/7 free confidential support' },
  { name: 'Crisis Text Line', number: 'Text HOME to 741741', desc: 'Free crisis counseling via text' },
  { name: 'SAMHSA Helpline', number: '1-800-662-4357', desc: 'Treatment referral and info' },
];

const STORAGE_KEY = '@manu_ai_selfharm_alerts';

export default function SelfHarmPrev() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [lastAlert, setLastAlert] = useState(null);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadHistory();
    startPulse();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setAlertCount(parsed.count || 0);
        setLastAlert(parsed.lastAlert || null);
      }
    } catch (e) { /* silent */ }
  };

  const saveHistory = async (count, alert) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ count, lastAlert: alert }));
    } catch (e) { /* silent */ }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const scanText = useCallback((text) => {
    const lower = text.toLowerCase();
    const found = SELF_HARM_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newCount = alertCount + 1;
      setAlertCount(newCount);
      setLastAlert(now);
      saveHistory(newCount, now);
      Alert.alert(
        '⚠️ Self-Harm Content Detected',
        'We noticed concerning language. You are not alone. Help is available 24/7.',
        [
          { text: 'View Resources', onPress: () => {} },
          { text: 'Call 988 Now', onPress: () => Linking.openURL('tel:988') },
        ]
      );
    } else if (!found) {
      setDetected(false);
    }
  }, [detected, alertCount]);

  const handleTextChange = (text) => {
    setInputText(text);
    if (text.length > 3) scanText(text);
  };

  const callHelpline = (number) => {
    Linking.openURL(`tel:${number.replace(/\D/g, '')}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🛡️ Self-Harm Prevention</Text>
      <Text style={styles.subtitle}>Educational tool to detect concerning language and provide immediate help resources.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Demo Scanner (Type below to test detection):</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for concerning keywords..."
          value={inputText}
          onChangeText={handleTextChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>🚨 Concerning Language Detected</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Detection History</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts Triggered: <Text style={styles.statNum}>{alertCount}</Text></Text>
        <Text style={styles.statText}>Last Alert: {lastAlert ? new Date(lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Immediate Help Resources</Text>
      {HELP_RESOURCES.map((res, idx) => (
        <TouchableOpacity key={idx} style={styles.resourceCard} onPress={() => callHelpline(res.number)}>
          <Text style={styles.resName}>{res.name}</Text>
          <Text style={styles.resNumber}>{res.number}</Text>
          <Text style={styles.resDesc}>{res.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• This module scans LOCAL text only (never uploads data).</Text>
        <Text style={styles.eduText}>• Detection is keyword-based for educational demonstration.</Text>
        <Text style={styles.eduText}>• If you or someone you know is struggling, reach out immediately.</Text>
        <Text style={styles.eduText}>• Mental health is just as important as physical health.</Text>
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
  alertBadge: { backgroundColor: '#ff3333', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ff3333' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resNumber: { color: '#ff6666', fontSize: 16, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
