import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 19/20 — Violence Detection (Feature 179)
// File: src/security/ViolenceDetect.js
// Generated: 2026-06-25
// Educational Purpose: Detects violent content keywords in local text
// and provides educational resources about conflict resolution.

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

const VIOLENCE_KEYWORDS = [
  'kill you', 'hurt you', 'stab', 'shoot', 'bomb making',
  'weapon buy', 'gun dealer', 'assault plan', 'revenge attack',
  'violent video', 'gore', 'beheading', 'torture',
];

const RESOURCES = [
  { name: 'National Domestic Violence Hotline', contact: '1-800-799-7233', desc: '24/7 support for abuse victims' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Crisis counseling via text' },
  { name: 'StopBullying.gov', contact: 'stopbullying.gov', desc: 'Federal anti-bullying resources' },
];

const STORAGE_KEY = '@manu_ai_violence_alerts';

export default function ViolenceDetect() {
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
    const found = VIOLENCE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (found && !detected) {
      setDetected(true);
      const now = new Date().toISOString();
      const newStats = { count: stats.count + 1, lastAlert: now };
      setStats(newStats);
      saveStats(newStats);
      Alert.alert(
        '⚠️ Violent Content Detected',
        'Potentially violent language detected. This is an educational awareness alert.',
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
      <Text style={styles.header}>⚔️ Violence Detection</Text>
      <Text style={styles.subtitle}>Educational tool to detect violent content keywords and promote non-violent conflict resolution.</Text>

      <View style={styles.demoBox}>
        <Text style={styles.demoLabel}>🔍 Text Scanner:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type text to scan for violent keywords..."
          value={inputText}
          onChangeText={handleChange}
          maxLength={500}
        />
        {detected && (
          <Animated.View style={[styles.alertBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.alertText}>⚠️ Violent Content Detected</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.sectionTitle}>📊 Stats</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Alerts: <Text style={styles.statNum}>{stats.count}</Text></Text>
        <Text style={styles.statText}>Last: {stats.lastAlert ? new Date(stats.lastAlert).toLocaleString() : 'Never'}</Text>
      </View>

      <Text style={styles.sectionTitle}>🆘 Support Resources</Text>
      {RESOURCES.map((res, idx) => (
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

      <Text style={styles.sectionTitle}>📚 Educational Notes</Text>
      <View style={styles.eduBox}>
        <Text style={styles.eduText}>• Exposure to violent content can desensitize individuals to real harm.</Text>
        <Text style={styles.eduText}>• Conflict resolution skills are learnable and effective.</Text>
        <Text style={styles.eduText}>• If you feel unsafe, contact authorities or a trusted adult immediately.</Text>
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
  alertBadge: { backgroundColor: '#cc0000', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4ff', marginTop: 20, marginBottom: 10 },
  statsBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00d4ff' },
  statText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  statNum: { color: '#00d4ff', fontWeight: 'bold' },
  resourceCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#cc0000' },
  resName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resContact: { color: '#ff6666', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  resDesc: { color: '#aaa', fontSize: 13 },
  eduBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#00ff88' },
  eduText: { color: '#ccc', fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
