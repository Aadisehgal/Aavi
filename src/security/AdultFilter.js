import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Adult Content Filter (Feature 178)
// File: src/security/AdultFilter.js
// Generated: 2026-06-25
// Educational Purpose: Demonstrates content filtering concepts using local
// keyword detection. Educational awareness for parents and users.

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
  Switch,
} from 'react-native';

const ADULT_KEYWORDS = [
  'porn', 'xxx', 'adult video', 'nude', 'sex tape',
  'escort service', 'onlyfans', 'cam girl', 'adult chat',
  'mature content', 'nsfw', 'explicit',
];

const STORAGE_KEY = '@manu_ai_adult_filter';

export default function AdultFilter() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [stats, setStats] = useState({ count: 0, lastAlert: null, enabled: true });
  const [filterEnabled, setFilterEnabled] = useState(true);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadStats();
    startPulse();
  }, []);

  const loadStats = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setStats(parsed);
        setFilterEnabled(parsed.enabled !== false);
      }
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
    if (!filterEnabled) { setDetected(false); return; }
    const lower = text.toLowerCase();
    const found = ADULT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { ...stats, count: stats.count + 1, lastAlert: now, enabled: filterEnabled };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '🔞 Adult Content Detected',
        'This content has been flagged as potentially adult-oriented. Educational awareness only.',
        [{ text: 'Understood', onPress: () => {} }]
      );
    } else if (!found) {
      setDetected(false);
    }
  };

  const handleChange = (text) => {
    setInputText(text);
    if (text.length > 3) scanText(text);
  };

  const toggleFilter = (val) => {
    setFilterEnabled(val);
    const newStats = { ...stats, enabled: val };
    setStats(newStats);
    saveStats(newStats);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>🔞 Adult Content Filter</Text>
      <Text style={styles.subtitle}>Educational content filtering demonstration using local keyword detection.</Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Filter Enabled</Text>
        <Switch value={filterEnabled} onValueChange={toggleFilter} trackColor={{ false: '#444', true: '#00d4ff' }} />
      </View>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Text Scanner:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for adult keywords..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>🔞 Adult Content Flagged</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Flags: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
        <Text style={styles.statText}>Status: {filterEnabled ? 'Active' : 'Paused'}</Text>
      </View>

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• This is a DEMONSTRATION of content filtering concepts.</Text>
        <Text style={styles.eduText}>• Real content filtering uses ML models and image analysis.</Text>
        <Text style={styles.eduText}>• Parents should use dedicated parental control apps for children.</Text>
        <Text style={styles.eduText}>• This tool scans LOCAL text only and never uploads data.</Text>
        <Text style={styles.eduText}>• Open communication with children is the best protection.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#00d4ff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 10, marginBottom: 16 },
  toggleLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  demoBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  demoLabel: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#444' },
  alertBadge: { backgroundColor: '#ff3366', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
