import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Gambling Block (Feature 177)
// File: src/security/GamblingBlock.js
// Generated: 2026-06-25
// Educational Purpose: Detects gambling-related keywords/apps and provides
// educational resources about gambling addiction and responsible gaming.

import React, { useState, useEffect } from 'react';
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

const GAMBLING_KEYWORDS = [
  'bet365', 'pokerstars', 'draftkings', 'fanduel', 'casino online',
  'sports betting', 'slot machine', 'roulette online', 'blackjack real money',
  'gambling app', 'bet now', 'wager', 'odds calculator',
];

const GAMBLING_APPS = [
  'com.bet365.bet365', 'com.pokerstars', 'com.fanduel', 'com.draftkings',
  'com.bovada', 'com.888poker', 'com.williamhill',
];

const HELP_RESOURCES = [
  { name: 'National Problem Gambling Helpline', contact: '1-800-522-4700', desc: '24/7 confidential help' },
  { name: 'Gamblers Anonymous', contact: 'gamblersanonymous.org', desc: '12-step recovery program' },
  { name: 'National Council on Problem Gambling', contact: 'ncpgambling.org', desc: 'Education and advocacy' },
];

const STORAGE_KEY = '@manu_ai_gambling_alerts';

export default function GamblingBlock() {
  const [inputText, setInputText] = useState('');
  const [detected, setDetected] = useState(false);
  const [stats, setStats] = useState({ count: 0, lastAlert: null });
  const [installedApps, setInstalledApps] = useState([]);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadStats();
    startPulse();
    simulateAppScan();
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

  const simulateAppScan = () => {
    // Educational simulation: in real app, this would use PackageManager
    // to list installed apps and check against known gambling packages
    const mockApps = [
      { name: 'Bet365', package: 'com.bet365.bet365', detected: false },
      { name: 'PokerStars', package: 'com.pokerstars', detected: false },
      { name: 'FanDuel', package: 'com.fanduel', detected: false },
    ];
    setInstalledApps(mockApps);
  };

  const scanText = (text) => {
    const lower = text.toLowerCase();
    const found = GAMBLING_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Gambling Content Detected',
        'Gambling can be addictive. This is an educational awareness alert.',
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
      <Text style={styles.header}>🎰 Gambling Block</Text>
      <Text style={styles.subtitle}>Educational tool to detect gambling content and raise awareness about gambling addiction.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Text Scanner:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for gambling keywords..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>🎰 Gambling Content Detected</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📱 App Awareness (Educational)</Text>
      <View style={styles.appBox}>
        <Text style={styles.appNote}>Known gambling apps to be aware of:</Text>
        {installedApps.map((app, idx) => (
          <View key={idx} style={styles.appRow}>
            <Text style={styles.appName}>⚠️ {app.name}</Text>
            <Text style={styles.appPkg}>{app.package}</Text>
          </View>
        ))}
        <Text style={styles.appNote} style={{marginTop: 8, color: '#888'}}>Note: Actual detection requires PackageManager permission. This is educational.</Text>
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Help Resources</Text>
      {HELP_RESOURCES.map((res, idx) => (
        <TouchableOpacity key={idx} style={styles.resourceCard} onPress={() => {
          if (res.contact.includes('.')) Linking.openURL(`https://${res.contact}`);
          else Linking.openURL(`tel:${res.contact.replace(/\D/g, '')}`);
        }}>
          <Text style={styles.resName}>{res.name}</Text>
          <Text style={styles.resContact}>{res.contact}</Text>
          <Text style={styles.resDesc}>{res.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Gambling addiction is a recognized behavioral addiction.</Text>
        <Text style={styles.eduText}>• Early warning signs include chasing losses and hiding behavior.</Text>
        <Text style={styles.eduText}>• This tool provides AWARENESS, not enforcement.</Text>
        <Text style={styles.eduText}>• Set personal limits and seek help if gambling affects daily life.</Text>
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
  alertBadge: { backgroundColor: '#ff3366', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  appBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ff3366' },
  appNote: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#333' },
  appName: { color: '#ff6688', fontSize: 14 },
  appPkg: { color: '#888', fontSize: 12 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ff3366' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resContact: { color: '#ff6688', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
