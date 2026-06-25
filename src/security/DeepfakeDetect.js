import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Deepfake Detection (Feature 184)
// File: src/security/DeepfakeDetect.js
// Generated: 2026-06-25
// Educational Purpose: Educates users about deepfake indicators and
// demonstrates detection concepts without actual ML inference.

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

const DEEPFAKE_INDICATORS = [
  'unnatural blinking', 'mismatched lip sync', 'weird lighting on face',
  'blurry edges around face', 'inconsistent skin texture', 'strange eye reflections',
  'unnatural head movements', 'audio doesnt match video', 'robotic voice',
  'artifacts around jawline', 'weird teeth', 'asymmetric facial features',
];

const STORAGE_KEY = '@manu_ai_deepfake_alerts';

export default function DeepfakeDetect() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [checklist, setChecklist] = useState(
    DEEPFAKE_INDICATORS.map(ind => ({ indicator: ind, checked: false }))
  );
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

  const toggleCheck = (idx) => {
    const updated = [...checklist];
    updated[idx].checked = !updated[idx].checked;
    setChecklist(updated);
    const checkedCount = updated.filter(i => i.checked).length;
    if (checkedCount >= 3 && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Multiple Deepfake Indicators',
        'You have checked multiple indicators. This media may be manipulated.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } else if (checkedCount < 3) {
      setDetected(false);
    }
  };

  const checkedCount = checklist.filter(i => i.checked).length;
  const riskPercent = Math.min(100, (checkedCount / DEEPFAKE_INDICATORS.length) * 100 * 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🎭 Deepfake Detection</Text>
      <Text style={styles.subtitle}>Educational tool to identify deepfake indicators and promote media literacy.</Text>

      <View style={styles.progressBox}>
        <Text style={styles.progressLabel}>Suspicion Level: {Math.round(riskPercent)}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${riskPercent}%`, backgroundColor: riskPercent > 60 ? '#ff3333' : riskPercent > 30 ? '#ffaa00' : '#00ff88' }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>✅ Checklist: Indicators to Look For</Text>
      <View style={styles.checklistBox}>
        {checklist.map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.checkRow} onPress={() => toggleCheck(idx)}>
            <Text style={styles.checkBox}>{item.checked ? '☑️' : '⬜️'}</Text>
            <Text style={[styles.checkText, item.checked && styles.checkedText]}>{item.indicator}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {detected && (
        <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertText}>🎭 Potential Deepfake Detected</Text>
        </Animated.View>
      )}

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Deepfakes use AI to create realistic but fake media.</Text>
        <Text style={styles.eduText}>• Always verify shocking videos through trusted news sources.</Text>
        <Text style={styles.eduText}>• Look for inconsistencies in lighting, audio, and facial movements.</Text>
        <Text style={styles.eduText}>• Reverse image search can help find original sources.</Text>
        <Text style={styles.eduText}>• This is an educational checklist, not a guaranteed detection tool.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  progressBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  progressLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  progressBar: { height: 12, backgroundColor: '#333', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  checklistBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#aa00ff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  checkBox: { fontSize: 18, marginRight: 10 },
  checkText: { color: '#ccc', fontSize: 14, flex: 1 },
  checkedText: { color: '#00ff88', textDecorationLine: 'line-through' },
  alertBadge: { backgroundColor: '#aa00ff', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
