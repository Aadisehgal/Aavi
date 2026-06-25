import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Fake News Detector (Feature 182)
// File: src/security/FakeNewsDetect.js
// Generated: 2026-06-25
// Educational Purpose: Demonstrates misinformation detection concepts
// using source verification checks and educational flagging.

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
  AsyncStorage,
} from 'react-native';

const SUSPICIOUS_PATTERNS = [
  'shocking truth', 'doctors hate this', 'one weird trick', 'they dont want you to know',
  'miracle cure', 'big pharma', 'mainstream media wont report', 'secret they',
  'fake news', 'propaganda', 'conspiracy',
];

const TRUSTED_SOURCES = [
  'reuters.com', 'apnews.com', 'bbc.com', 'npr.org', 'pbs.org',
  'factcheck.org', 'snopes.com', 'politifact.com',
];

const UNTRUSTED_PATTERNS = [
  'clickbait', 'sensational', 'unverified', 'anonymous source',
];

const STORAGE_KEY = '@manu_ai_fakenews_alerts';

export default function FakeNewsDetect() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [trustScore, setTrustScore] = useState(100);
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

  const analyzeText = (text) => {
    const lower = text.toLowerCase();
    let score = 100;
    let suspicious = false;

    SUSPICIOUS_PATTERNS.forEach(pattern => {
      if (lower.includes(pattern.toLowerCase())) {
        score -= 15;
        suspicious = true;
      }
    });

    UNTRUSTED_PATTERNS.forEach(pattern => {
      if (lower.includes(pattern.toLowerCase())) {
        score -= 10;
        suspicious = true;
      }
    });

    let trustedFound = false;
    TRUSTED_SOURCES.forEach(src => {
      if (lower.includes(src.toLowerCase())) {
        score += 10;
        trustedFound = true;
      }
    });

    score = Math.max(0, Math.min(100, score));
    setTrustScore(score);

    if (suspicious && score < 60 && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Potential Misinformation Detected',
        `Trust Score: ${score}/100. This content shows patterns common in misinformation.`,
        [{ text: 'Learn More', onPress: () => {} }, { text: 'OK', onPress: () => {} }]
      );
    } else if (score >= 60) {
      setDetected(false);
    }
  };

  const handleChange = (text) => {
    setInputText(text);
    if (text.length > 10) analyzeText(text);
  };

  const getScoreColor = () => {
    if (trustScore >= 80) return '#00ff88';
    if (trustScore >= 50) return '#ffaa00';
    return '#ff3333';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📰 Fake News Detector</Text>
      <Text style={styles.subtitle}>Educational tool to identify misinformation patterns and promote media literacy.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Paste article text or headline:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Paste content to analyze..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={1000}
        />
        <View style={[styles.scoreBar, { borderColor: getScoreColor() }]}>
          <Text style={[styles.scoreText, { color: getScoreColor() }]}>Trust Score: {trustScore}/100</Text>
        </View>
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>⚠️ Potential Misinformation</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Flags: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>✅ Trusted Source Examples</Text>
      <View style={styles.sourceBox}>
        {TRUSTED_SOURCES.map((src, idx) => (
          <Text key={idx} style={styles.sourceText}>✓ {src}</Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📚 Media Literacy Tips</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Check the source: Is it a known, reputable outlet?</Text>
        <Text style={styles.eduText}>• Look for corroboration: Do other sources report the same?</Text>
        <Text style={styles.eduText}>• Beware of emotional manipulation: Sensational headlines often mislead.</Text>
        <Text style={styles.eduText}>• Check dates: Old news is often recycled as new.</Text>
        <Text style={styles.eduText}>• This tool uses pattern matching for educational demonstration.</Text>
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
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#444' },
  scoreBar: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 2, backgroundColor: '#111', alignItems: 'center' },
  scoreText: { fontSize: 18, fontWeight: 'bold' },
  alertBadge: { backgroundColor: '#ffaa00', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  sourceBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  sourceText: { color: '#00ff88', fontSize: 14, marginBottom: 6 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
