import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/screens/PersonalityScreen.js
// Purpose: Customize J.A.R.V.I.S. AI personality, voice, and behaviour settings

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Switch, TextInput, Alert,
} from 'react-native';

const STORAGE_KEY = '@manu_ai_personality';

const VOICES = [
  { id: 'jarvis',    label: 'J.A.R.V.I.S.',  desc: 'Calm, professional, British' },
  { id: 'friday',   label: 'F.R.I.D.A.Y.',   desc: 'Warm, friendly, upbeat' },
  { id: 'edith',    label: 'E.D.I.T.H.',      desc: 'Precise, analytical' },
  { id: 'custom',   label: 'Custom',           desc: 'Define your own persona' },
];

const TONES = ['Professional', 'Friendly', 'Sarcastic', 'Formal', 'Casual'];

const DEFAULT_STATE = {
  selectedVoice: 'jarvis',
  selectedTone:  'Professional',
  ownerName:     '',
  wakeWord:      'Hey MANU',
  verboseMode:   false,
  proactiveMode: true,
  emotionMode:   true,
  darkHumor:     false,
};

export default function PersonalityScreen({ navigation }) {
  const [config, setConfig] = useState(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v) setConfig({ ...DEFAULT_STATE, ...JSON.parse(v) });
    }).catch(() => {});
  }, []);

  const update = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert('Save Error', e.message);
    }
  };

  const reset = () => {
    Alert.alert('Reset Personality', 'Reset all settings to default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { setConfig(DEFAULT_STATE); setSaved(false); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧠 PERSONALITY</Text>
        <TouchableOpacity onPress={save}>
          <Text style={[styles.saveText, saved && styles.savedText]}>{saved ? '✓ SAVED' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Owner name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OWNER IDENTITY</Text>
          <Text style={styles.label}>Your Name (MANU will address you by this)</Text>
          <TextInput
            style={styles.textInput}
            value={config.ownerName}
            onChangeText={v => update('ownerName', v)}
            placeholder="Enter your name…"
            placeholderTextColor="#37474f"
          />
          <Text style={styles.label}>Wake Word</Text>
          <TextInput
            style={styles.textInput}
            value={config.wakeWord}
            onChangeText={v => update('wakeWord', v)}
            placeholder="Hey MANU"
            placeholderTextColor="#37474f"
          />
        </View>

        {/* Voice persona */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI PERSONA</Text>
          {VOICES.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[styles.optionBtn, config.selectedVoice === v.id && styles.optionBtnActive]}
              onPress={() => update('selectedVoice', v.id)}
            >
              <Text style={[styles.optionLabel, config.selectedVoice === v.id && styles.optionLabelActive]}>{v.label}</Text>
              <Text style={styles.optionDesc}>{v.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tone */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESPONSE TONE</Text>
          <View style={styles.toneRow}>
            {TONES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toneBtn, config.selectedTone === t && styles.toneBtnActive]}
                onPress={() => update('selectedTone', t)}
              >
                <Text style={[styles.toneBtnText, config.selectedTone === t && styles.toneBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Behaviour toggles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BEHAVIOUR</Text>
          {[
            { key: 'verboseMode',   label: 'Verbose Mode',     desc: 'Detailed explanations' },
            { key: 'proactiveMode', label: 'Proactive Mode',   desc: 'Suggest actions unprompted' },
            { key: 'emotionMode',   label: 'Emotion Detection',desc: 'Detect user mood from voice' },
            { key: 'darkHumor',     label: 'Dark Humor',       desc: 'Occasional sarcasm / dry wit' },
          ].map(item => (
            <View key={item.key} style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={config[item.key]}
                onValueChange={v => update(item.key, v)}
                trackColor={{ false: '#37474f', true: '#00bcd4' }}
                thumbColor={config[item.key] ? '#00e5ff' : '#90a4ae'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetBtnText}>↺ Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#050a0f' },
  header:             { flexDirection: 'row', alignItems: 'center', paddingTop: 40,
                        paddingBottom: 10, paddingHorizontal: 14,
                        borderBottomWidth: 1, borderBottomColor: '#00bcd422' },
  backBtn:            { padding: 6 },
  backText:           { color: '#00bcd4', fontSize: 18 },
  headerTitle:        { flex: 1, textAlign: 'center', color: '#00e5ff', fontSize: 14,
                        fontWeight: 'bold', letterSpacing: 1 },
  saveText:           { color: '#00bcd4', fontSize: 13, fontWeight: 'bold' },
  savedText:          { color: '#00e676' },
  body:               { padding: 16, paddingBottom: 40 },
  card:               { backgroundColor: '#0a1929', borderRadius: 12, padding: 16,
                        borderWidth: 1, borderColor: '#00bcd422', marginBottom: 14 },
  cardTitle:          { color: '#00bcd4', fontSize: 10, letterSpacing: 2, marginBottom: 14 },
  label:              { color: '#90a4ae', fontSize: 12, marginBottom: 6, marginTop: 10 },
  textInput:          { backgroundColor: '#050a0f', borderWidth: 1, borderColor: '#37474f',
                        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                        color: '#e0f7fa', fontSize: 14 },
  optionBtn:          { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1a3040',
                        marginBottom: 8 },
  optionBtnActive:    { borderColor: '#00bcd4', backgroundColor: '#051a2a' },
  optionLabel:        { color: '#90a4ae', fontSize: 14, fontWeight: 'bold' },
  optionLabelActive:  { color: '#00e5ff' },
  optionDesc:         { color: '#546e7a', fontSize: 11, marginTop: 2 },
  toneRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toneBtn:            { borderWidth: 1, borderColor: '#37474f', borderRadius: 20,
                        paddingHorizontal: 14, paddingVertical: 7, margin: 2 },
  toneBtnActive:      { borderColor: '#00bcd4', backgroundColor: '#051a2a' },
  toneBtnText:        { color: '#546e7a', fontSize: 12 },
  toneBtnTextActive:  { color: '#00e5ff' },
  toggleRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  toggleLabel:        { color: '#b2ebf2', fontSize: 13 },
  toggleDesc:         { color: '#546e7a', fontSize: 11, marginTop: 2 },
  resetBtn:           { alignItems: 'center', padding: 14 },
  resetBtnText:       { color: '#546e7a', fontSize: 13 },
});
