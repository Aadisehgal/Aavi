// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/FocusEnvironments.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { FocusBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const FocusEnvironments = ({ isActive, onClose }) => {
  const [activeEnvironment, setActiveEnvironment] = useState(null);
  const [volume, setVolume] = useState(70);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [focusSessions, setFocusSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [mixMode, setMixMode] = useState(false);
  const [mixedSounds, setMixedSounds] = useState([]);
  const [intensity, setIntensity] = useState(50);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const ENVIRONMENTS = [
    { id: 'rain', name: 'Rain', icon: '🌧️', color: '#4488cc', desc: 'Gentle rainfall on pavement' },
    { id: 'forest', name: 'Forest', icon: '🌲', color: '#44aa44', desc: 'Birds and rustling leaves' },
    { id: 'cafe', name: 'Cafe', icon: '☕', color: '#aa8844', desc: 'Murmured conversations and clinking cups' },
    { id: 'ocean', name: 'Ocean', icon: '🌊', color: '#44aacc', desc: 'Waves crashing on shore' },
    { id: 'fire', name: 'Fireplace', icon: '🔥', color: '#cc6644', desc: 'Crackling fire and warmth' },
    { id: 'thunder', name: 'Thunder', icon: '⛈️', color: '#8866cc', desc: 'Distant thunder and rain' },
    { id: 'wind', name: 'Wind', icon: '💨', color: '#88cccc', desc: 'Soft breeze through trees' },
    { id: 'night', name: 'Night', icon: '🌙', color: '#6666aa', desc: 'Crickets and calm night air' },
  ];

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isActive]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: timerDuration > 0 ? (timerDuration * 60 - timeRemaining) / (timerDuration * 60) : 0, duration: 500, useNativeDriver: true }).start();
  }, [timeRemaining, timerDuration]);

  const startTimer = () => {
    setTimerActive(true); setTimeRemaining(timerDuration * 60);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(timerIntervalRef.current); setTimerActive(false); setFocusSessions(s => s + 1); setTotalFocusTime(t => t + timerDuration); if (SpatialAudio) SpatialAudio.playAlert('notification').catch(() => {}); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => { setTimerActive(false); if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  const resetTimer = () => { pauseTimer(); setTimeRemaining(timerDuration * 60); };
  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const selectEnvironment = (id) => {
    if (mixMode) { setMixedSounds(prev => prev.includes(id) ? prev.filter(s => s !== id) : prev.length >= 3 ? prev : [...prev, id]); }
    else { setActiveEnvironment(activeEnvironment === id ? null : id); setMixedSounds([]); }
  };

  const renderEnvironmentGrid = () => (
    <View style={styles.grid}>
      {ENVIRONMENTS.map((env) => {
        const isActive = mixMode ? mixedSounds.includes(env.id) : activeEnvironment === env.id;
        return (
          <TouchableOpacity key={env.id} style={[styles.envCard, isActive && { borderColor: env.color, backgroundColor: env.color + '20' }]} onPress={() => selectEnvironment(env.id)}>
            <Text style={styles.envIcon}>{env.icon}</Text>
            <Text style={[styles.envName, isActive && { color: env.color }]}>{env.name}</Text>
            <Text style={styles.envDesc}>{env.desc}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTimer = () => (
    <View style={styles.timerCard}>
      <Text style={styles.cardTitle}>Focus Timer</Text>
      <View style={styles.timerDisplay}>
        <Text style={styles.timerTime}>{formatTime(timeRemaining)}</Text>
        <View style={styles.timerProgress}>
          <Animated.View style={[styles.timerProgressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
      <View style={styles.timerControls}>
        {!timerActive ? <TouchableOpacity style={styles.timerBtn} onPress={startTimer}><Text style={styles.timerBtnText}>▶ Start</Text></TouchableOpacity>
          : <TouchableOpacity style={styles.timerBtn} onPress={pauseTimer}><Text style={styles.timerBtnText}>⏸ Pause</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.timerBtn} onPress={resetTimer}><Text style={styles.timerBtnText}>↻ Reset</Text></TouchableOpacity>
      </View>
      <View style={styles.durationPresets}>
        {[15, 25, 45, 60].map((min) => (
          <TouchableOpacity key={min} style={[styles.durationBtn, timerDuration === min && styles.durationBtnActive]} onPress={() => { setTimerDuration(min); setTimeRemaining(min * 60); }}>
            <Text style={styles.durationText}>{min}m</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderVolume = () => (
    <View style={styles.volumeCard}>
      <Text style={styles.cardTitle}>Volume</Text>
      <View style={styles.volumeRow}>
        <Text style={styles.volumeIcon}>🔇</Text>
        <View style={styles.volumeTrack}><View style={[styles.volumeFill, { width: `${volume}%` }]} /></View>
        <Text style={styles.volumeIcon}>🔊</Text>
      </View>
      <View style={styles.volumePresets}>
        {[25, 50, 75, 100].map((v) => (
          <TouchableOpacity key={v} style={[styles.volumePreset, volume === v && styles.volumePresetActive]} onPress={() => setVolume(v)}>
            <Text style={styles.volumePresetText}>{v}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMixMode = () => (
    <View style={styles.mixCard}>
      <TouchableOpacity style={[styles.mixToggle, mixMode && styles.mixToggleActive]} onPress={() => { setMixMode(!mixMode); if (!mixMode) setActiveEnvironment(null); else setMixedSounds([]); }}>
        <Text style={styles.mixText}>Mix Mode {mixMode ? 'ON' : 'OFF'}</Text>
        <Text style={styles.mixSub}>{mixMode ? 'Select up to 3 sounds' : 'Select one environment'}</Text>
      </TouchableOpacity>
      {mixMode && mixedSounds.length > 0 && <Text style={styles.mixSelected}>Mixed: {mixedSounds.map(s => ENVIRONMENTS.find(e => e.id === s)?.name).join(' + ')}</Text>}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsCard}>
      <Text style={styles.cardTitle}>Focus Stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}><Text style={styles.statValue}>{focusSessions}</Text><Text style={styles.statLabel}>Sessions</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{totalFocusTime}</Text><Text style={styles.statLabel}>Minutes</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{(totalFocusTime / 60).toFixed(1)}</Text><Text style={styles.statLabel}>Hours</Text></View>
      </View>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Focus</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderTimer()}{renderMixMode()}{renderVolume()}{renderEnvironmentGrid()}{renderStats()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  timerCard: { margin: 16, padding: 20, borderRadius: 20, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 16, alignSelf: 'flex-start' },
  timerDisplay: { alignItems: 'center', marginBottom: 16 },
  timerTime: { color: '#00ffff', fontSize: 56, fontWeight: '200', fontFamily: 'monospace' },
  timerProgress: { width: SCREEN_W - 80, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  timerProgressFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 3 },
  timerControls: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  timerBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  timerBtnText: { color: '#00ffff', fontSize: 14, fontWeight: '600' },
  durationPresets: { flexDirection: 'row', gap: 10 },
  durationBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  durationBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  durationText: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 12 },
  mixCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  mixToggle: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  mixToggleActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  mixText: { color: '#ccffff', fontSize: 14, fontWeight: '600' },
  mixSub: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  mixSelected: { color: '#00ffcc', fontSize: 12, marginTop: 10, textAlign: 'center' },
  volumeCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  volumeIcon: { fontSize: 18 },
  volumeTrack: { flex: 1, height: 8, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  volumeFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 4 },
  volumePresets: { flexDirection: 'row', justifyContent: 'space-between' },
  volumePreset: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  volumePresetActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  volumePresetText: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingTop: 0, gap: 10 },
  envCard: { width: (SCREEN_W - 52) / 2, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)', alignItems: 'center' },
  envIcon: { fontSize: 32, marginBottom: 8 },
  envName: { color: '#ccffff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  envDesc: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10, textAlign: 'center' },
  statsCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#00ffcc', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
});

export default FocusEnvironments;
