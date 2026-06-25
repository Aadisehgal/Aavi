// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/SleepAmbient.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { SleepBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SleepAmbient = ({ isActive, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sleepStarted, setSleepStarted] = useState(false);
  const [sleepDuration, setSleepDuration] = useState(0);
  const [alarmSet, setAlarmSet] = useState(false);
  const [alarmTime, setAlarmTime] = useState({ hour: 7, minute: 0 });
  const [alarmActive, setAlarmActive] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState('rain');
  const [brightness, setBrightness] = useState(20);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [sleepStage, setSleepStage] = useState('awake');
  const [dreamJournal, setDreamJournal] = useState([]);
  const [snoozeCount, setSnoozeCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const clockPulse = useRef(new Animated.Value(1)).current;
  const alarmPulse = useRef(new Animated.Value(1)).current;
  const timeIntervalRef = useRef(null);
  const sleepIntervalRef = useRef(null);
  const alarmTimeoutRef = useRef(null);

  const SOUNDS = [
    { id: 'rain', name: 'Rain', icon: '🌧️' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'forest', name: 'Forest', icon: '🌲' },
    { id: 'white', name: 'White Noise', icon: '🌫️' },
    { id: 'fire', name: 'Fireplace', icon: '🔥' },
    { id: 'wind', name: 'Wind', icon: '💨' },
  ];

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
      timeIntervalRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    }
    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current); if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current); };
  }, [isActive]);

  useEffect(() => {
    if (alarmActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(alarmPulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(alarmPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])).start();
      if (SpatialAudio) SpatialAudio.playAlert('approach_front').catch(() => {});
    } else { alarmPulse.setValue(1); }
  }, [alarmActive]);

  const startSleep = () => {
    setSleepStarted(true); setSleepDuration(0); setSleepStage('light');
    sleepIntervalRef.current = setInterval(() => {
      setSleepDuration(prev => prev + 1);
      const total = sleepDuration + 1;
      if (total % 90 < 20) setSleepStage('light'); else if (total % 90 < 50) setSleepStage('deep'); else setSleepStage('rem');
      setSleepQuality(prev => Math.min(100, prev + 0.5));
    }, 1000);
  };

  const stopSleep = () => { setSleepStarted(false); if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); setSleepStage('awake'); };

  const setAlarm = () => {
    setAlarmSet(true);
    alarmTimeoutRef.current = setTimeout(() => triggerAlarm(), 15000);
  };

  const triggerAlarm = () => { setAlarmActive(true); };
  const dismissAlarm = () => { setAlarmActive(false); setAlarmSet(false); setSnoozeCount(0); if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current); };
  const snoozeAlarm = () => { setAlarmActive(false); setSnoozeCount(prev => prev + 1); alarmTimeoutRef.current = setTimeout(() => triggerAlarm(), 5000); };

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDuration = (seconds) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); return `${h}h ${m}m`; };

  const renderClock = () => (
    <Animated.View style={[styles.clockContainer, { transform: [{ scale: alarmActive ? alarmPulse : clockPulse }] }]}>
      <Text style={styles.clockTime}>{formatTime(currentTime)}</Text>
      <Text style={styles.clockDate}>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
    </Animated.View>
  );

  const renderAlarmSection = () => (
    <View style={styles.alarmCard}>
      <Text style={styles.cardTitle}>Alarm</Text>
      <View style={styles.alarmDisplay}>
        <Text style={styles.alarmTime}>{alarmTime.hour.toString().padStart(2, '0')}:{alarmTime.minute.toString().padStart(2, '0')}</Text>
        <View style={styles.alarmControls}>
          <TouchableOpacity onPress={() => setAlarmTime(prev => ({ ...prev, hour: (prev.hour + 1) % 24 }))}><Text style={styles.alarmArrow}>▲</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAlarmTime(prev => ({ ...prev, minute: (prev.minute + 5) % 60 }))}><Text style={styles.alarmArrow}>▲</Text></TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={[styles.alarmBtn, alarmSet && styles.alarmBtnActive]} onPress={alarmSet ? dismissAlarm : setAlarm}>
        <Text style={styles.alarmBtnText}>{alarmActive ? 'Dismiss' : alarmSet ? 'Cancel Alarm' : 'Set Alarm'}</Text>
      </TouchableOpacity>
      {alarmActive && <TouchableOpacity style={styles.snoozeBtn} onPress={snoozeAlarm}><Text style={styles.snoozeText}>Snooze ({snoozeCount})</Text></TouchableOpacity>}
    </View>
  );

  const renderSleepTracker = () => (
    <View style={styles.sleepCard}>
      <Text style={styles.cardTitle}>Sleep</Text>
      <View style={styles.sleepStats}>
        <View style={styles.sleepStat}><Text style={styles.sleepValue}>{sleepStarted ? formatDuration(sleepDuration) : '--'}</Text><Text style={styles.sleepLabel}>Duration</Text></View>
        <View style={styles.sleepStat}><Text style={styles.sleepValue}>{sleepQuality.toFixed(0)}%</Text><Text style={styles.sleepLabel}>Quality</Text></View>
        <View style={styles.sleepStat}><Text style={styles.sleepValue}>{sleepStage}</Text><Text style={styles.sleepLabel}>Stage</Text></View>
      </View>
      <TouchableOpacity style={[styles.sleepBtn, sleepStarted && styles.sleepBtnActive]} onPress={sleepStarted ? stopSleep : startSleep}>
        <Text style={styles.sleepBtnText}>{sleepStarted ? 'Stop Sleep' : 'Start Sleep'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSoundSelector = () => (
    <View style={styles.soundCard}>
      <Text style={styles.cardTitle}>Dream Sounds</Text>
      <View style={styles.soundGrid}>
        {SOUNDS.map((sound) => (
          <TouchableOpacity key={sound.id} style={[styles.soundBtn, selectedSound === sound.id && styles.soundBtnActive]} onPress={() => setSelectedSound(sound.id)}>
            <Text style={styles.soundIcon}>{sound.icon}</Text><Text style={styles.soundName}>{sound.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.playBtn, soundPlaying && styles.playBtnActive]} onPress={() => setSoundPlaying(!soundPlaying)}>
        <Text style={styles.playBtnText}>{soundPlaying ? '⏸ Pause' : '▶ Play'} {selectedSound}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBrightness = () => (
    <View style={styles.brightnessCard}>
      <Text style={styles.cardTitle}>Night Brightness</Text>
      <View style={styles.brightnessRow}>
        <Text style={styles.brightnessIcon}>🌙</Text>
        <View style={styles.brightnessTrack}><View style={[styles.brightnessFill, { width: `${brightness}%` }]} /></View>
        <Text style={styles.brightnessIcon}>☀️</Text>
      </View>
      <View style={styles.brightnessPresets}>
        {[10, 20, 40, 60, 100].map((level) => (
          <TouchableOpacity key={level} style={[styles.brightnessPreset, brightness === level && styles.brightnessPresetActive]} onPress={() => setBrightness(level)}>
            <Text style={styles.brightnessPresetText}>{level}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDreamJournal = () => (
    <View style={styles.journalCard}>
      <Text style={styles.cardTitle}>Dream Journal</Text>
      {dreamJournal.length === 0 ? <Text style={styles.journalEmpty}>No dreams recorded yet</Text> : dreamJournal.map((entry, i) => (
        <View key={i} style={styles.journalEntry}><Text style={styles.journalTime}>{entry.time}</Text><Text style={styles.journalText}>{entry.text}</Text></View>
      ))}
      <TouchableOpacity style={styles.journalBtn} onPress={() => setDreamJournal(prev => [{ time: formatTime(currentTime), text: 'Dream recorded...' }, ...prev])}>
        <Text style={styles.journalBtnText}>+ Record Dream</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌙 Sleep Mode</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderClock()}{renderAlarmSection()}{renderSleepTracker()}{renderSoundSelector()}{renderBrightness()}{renderDreamJournal()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000510', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(100, 100, 255, 0.1)' },
  headerTitle: { color: '#aaaaff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  clockContainer: { alignItems: 'center', paddingVertical: 30 },
  clockTime: { color: '#aaaaff', fontSize: 64, fontWeight: '200', letterSpacing: 4 },
  clockDate: { color: 'rgba(170, 170, 255, 0.5)', fontSize: 14, marginTop: 8 },
  alarmCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(10, 10, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.15)' },
  cardTitle: { color: '#aaaaff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  alarmDisplay: { alignItems: 'center', marginBottom: 16 },
  alarmTime: { color: '#aaaaff', fontSize: 48, fontWeight: 'bold' },
  alarmControls: { flexDirection: 'row', gap: 40, marginTop: 8 },
  alarmArrow: { color: 'rgba(170, 170, 255, 0.5)', fontSize: 20 },
  alarmBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(100, 100, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.2)' },
  alarmBtnActive: { backgroundColor: 'rgba(255, 100, 100, 0.2)', borderColor: 'rgba(255, 100, 100, 0.4)' },
  alarmBtnText: { color: '#aaaaff', fontSize: 15, fontWeight: '600' },
  snoozeBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(100, 100, 255, 0.1)', alignItems: 'center' },
  snoozeText: { color: 'rgba(170, 170, 255, 0.6)', fontSize: 13 },
  sleepCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(10, 10, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.15)' },
  sleepStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sleepStat: { alignItems: 'center', flex: 1 },
  sleepValue: { color: '#aaaaff', fontSize: 20, fontWeight: 'bold' },
  sleepLabel: { color: 'rgba(170, 170, 255, 0.5)', fontSize: 11, marginTop: 4 },
  sleepBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(100, 100, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.2)' },
  sleepBtnActive: { backgroundColor: 'rgba(100, 255, 100, 0.15)', borderColor: 'rgba(100, 255, 100, 0.3)' },
  sleepBtnText: { color: '#aaaaff', fontSize: 15, fontWeight: '600' },
  soundCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(10, 10, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.15)' },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  soundBtn: { width: '30%', padding: 12, borderRadius: 12, backgroundColor: 'rgba(20, 20, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.1)', alignItems: 'center' },
  soundBtnActive: { backgroundColor: 'rgba(100, 100, 255, 0.2)', borderColor: '#aaaaff' },
  soundIcon: { fontSize: 24, marginBottom: 4 },
  soundName: { color: 'rgba(170, 170, 255, 0.7)', fontSize: 11 },
  playBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(100, 100, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.2)' },
  playBtnActive: { backgroundColor: 'rgba(100, 255, 100, 0.15)', borderColor: 'rgba(100, 255, 100, 0.3)' },
  playBtnText: { color: '#aaaaff', fontSize: 14 },
  brightnessCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(10, 10, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.15)' },
  brightnessRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brightnessIcon: { fontSize: 18 },
  brightnessTrack: { flex: 1, height: 8, backgroundColor: 'rgba(100, 100, 255, 0.1)', borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  brightnessFill: { height: '100%', backgroundColor: '#aaaaff', borderRadius: 4 },
  brightnessPresets: { flexDirection: 'row', justifyContent: 'space-between' },
  brightnessPreset: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(20, 20, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.1)' },
  brightnessPresetActive: { backgroundColor: 'rgba(100, 100, 255, 0.2)', borderColor: '#aaaaff' },
  brightnessPresetText: { color: 'rgba(170, 170, 255, 0.7)', fontSize: 11 },
  journalCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(10, 10, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.15)' },
  journalEmpty: { color: 'rgba(170, 170, 255, 0.3)', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  journalEntry: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(100, 100, 255, 0.05)' },
  journalTime: { color: 'rgba(170, 170, 255, 0.4)', fontSize: 10 },
  journalText: { color: 'rgba(170, 170, 255, 0.7)', fontSize: 13, marginTop: 2 },
  journalBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(100, 100, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100, 100, 255, 0.2)' },
  journalBtnText: { color: '#aaaaff', fontSize: 14 },
});

export default SleepAmbient;
