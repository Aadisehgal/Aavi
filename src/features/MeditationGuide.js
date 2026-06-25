// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/MeditationGuide.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { MeditationBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const MeditationGuide = ({ isActive, onClose }) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('idle');
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState('box');
  const [breathCount, setBreathCount] = useState(0);
  const [calmScore, setCalmScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(12);
  const [totalMinutes, setTotalMinutes] = useState(45);
  const [streak, setStreak] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [guidanceVoice, setGuidanceVoice] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(1)).current;
  const breathIntervalRef = useRef(null);
  const sessionTimerRef = useRef(null);

  const EXERCISES = {
    box: { name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, hold2: 4, desc: '4-4-4-4 pattern for focus' },
    relax: { name: 'Relaxing Breath', inhale: 4, hold: 7, exhale: 8, hold2: 0, desc: '4-7-8 for deep relaxation' },
    energy: { name: 'Energizing', inhale: 6, hold: 2, exhale: 4, hold2: 0, desc: '6-2-4 for morning energy' },
    calm: { name: 'Calm Mind', inhale: 5, hold: 0, exhale: 5, hold2: 0, desc: '5-5 for anxiety relief' },
  };

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(); stopSession(); }
    return () => stopSession();
  }, [isActive]);

  const startSession = () => {
    setSessionActive(true); setSessionTime(0); setBreathCount(0); setCalmScore(0); runBreathCycle();
    sessionTimerRef.current = setInterval(() => { setSessionTime(prev => prev + 1); setCalmScore(prev => Math.min(100, prev + 0.5)); }, 1000);
  };

  const stopSession = () => { setSessionActive(false); setBreathPhase('idle'); if (breathIntervalRef.current) clearTimeout(breathIntervalRef.current); if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); circleAnim.setValue(1); };

  const runBreathCycle = () => {
    const exercise = EXERCISES[selectedExercise];
    const cycle = [
      { phase: 'inhale', duration: exercise.inhale * 1000, scale: 1.6 },
      { phase: 'hold', duration: exercise.hold * 1000, scale: 1.6 },
      { phase: 'exhale', duration: exercise.exhale * 1000, scale: 1.0 },
    ];
    if (exercise.hold2 > 0) cycle.push({ phase: 'hold', duration: exercise.hold2 * 1000, scale: 1.0 });
    let step = 0;
    const runStep = () => {
      if (!sessionActive) return;
      const current = cycle[step % cycle.length]; setBreathPhase(current.phase);
      Animated.timing(circleAnim, { toValue: current.scale, duration: current.duration, useNativeDriver: true }).start(() => {
        if (current.phase === 'exhale') setBreathCount(prev => prev + 1);
        step++; runStep();
      });
    };
    runStep();
  };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };
  const getPhaseText = () => { switch (breathPhase) { case 'inhale': return 'Breathe In'; case 'hold': return 'Hold'; case 'exhale': return 'Breathe Out'; default: return 'Ready'; } };
  const getPhaseColor = () => { switch (breathPhase) { case 'inhale': return '#00ff88'; case 'hold': return '#ffaa00'; case 'exhale': return '#00aaff'; default: return '#00ffff'; } };

  const renderBreathVisual = () => (
    <View style={styles.breathContainer}>
      <Animated.View style={[styles.breathCircle, { transform: [{ scale: circleAnim }], borderColor: getPhaseColor(), shadowColor: getPhaseColor() }]} />
      <Text style={[styles.breathPhase, { color: getPhaseColor() }]}>{getPhaseText()}</Text>
      <Text style={styles.breathCount}>Breaths: {breathCount}</Text>
    </View>
  );

  const renderSessionInfo = () => (
    <View style={styles.sessionInfo}>
      <Text style={styles.sessionTime}>{formatTime(sessionTime)}</Text>
      <View style={styles.calmBar}><View style={[styles.calmFill, { width: `${calmScore}%` }]} /></View>
      <Text style={styles.calmText}>Calm: {calmScore.toFixed(0)}%</Text>
    </View>
  );

  const renderExerciseSelector = () => (
    <View style={styles.exerciseCard}>
      <Text style={styles.cardTitle}>Exercise</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Object.entries(EXERCISES).map(([key, ex]) => (
          <TouchableOpacity key={key} style={[styles.exerciseBtn, selectedExercise === key && styles.exerciseBtnActive]} onPress={() => { if (!sessionActive) setSelectedExercise(key); }}>
            <Text style={styles.exerciseName}>{ex.name}</Text><Text style={styles.exerciseDesc}>{ex.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsRow}>
      {!sessionActive ? <TouchableOpacity style={styles.controlBtn} onPress={startSession}><Text style={styles.controlBtnText}>▶ Start Session</Text></TouchableOpacity>
        : <TouchableOpacity style={[styles.controlBtn, styles.controlBtnStop]} onPress={stopSession}><Text style={styles.controlBtnText}>⏹ End Session</Text></TouchableOpacity>}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsRow}>
      <TouchableOpacity style={[styles.settingToggle, soundEnabled && styles.settingToggleActive]} onPress={() => setSoundEnabled(!soundEnabled)}>
        <Text style={styles.settingText}>Ambient Sound</Text><Text style={styles.settingStatus}>{soundEnabled ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.settingToggle, guidanceVoice && styles.settingToggleActive]} onPress={() => setGuidanceVoice(!guidanceVoice)}>
        <Text style={styles.settingText}>Voice Guide</Text><Text style={styles.settingStatus}>{guidanceVoice ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsCard}>
      <Text style={styles.cardTitle}>Progress</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}><Text style={styles.statValue}>{totalSessions}</Text><Text style={styles.statLabel}>Sessions</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{totalMinutes}</Text><Text style={styles.statLabel}>Minutes</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{streak}</Text><Text style={styles.statLabel}>Day Streak</Text></View>
      </View>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧘 Meditation</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderBreathVisual()}{sessionActive && renderSessionInfo()}{renderExerciseSelector()}{renderControls()}{renderSettings()}{renderStats()}
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
  breathContainer: { alignItems: 'center', paddingVertical: 40 },
  breathCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.5 },
  breathPhase: { fontSize: 22, fontWeight: '300', marginTop: 24, letterSpacing: 3 },
  breathCount: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 14, marginTop: 8 },
  sessionInfo: { alignItems: 'center', marginBottom: 20 },
  sessionTime: { color: '#00ffff', fontSize: 28, fontWeight: '200', fontFamily: 'monospace' },
  calmBar: { width: SCREEN_W - 80, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  calmFill: { height: '100%', backgroundColor: '#00ff88', borderRadius: 3 },
  calmText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 8 },
  exerciseCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  exerciseBtn: { width: 140, padding: 14, borderRadius: 14, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)', marginRight: 10 },
  exerciseBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  exerciseName: { color: '#ccffff', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  exerciseDesc: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10 },
  controlsRow: { margin: 16, marginTop: 0 },
  controlBtn: { paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)', alignItems: 'center' },
  controlBtnStop: { backgroundColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.3)' },
  controlBtnText: { color: '#00ffff', fontSize: 16, fontWeight: '600' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16, marginTop: 0, gap: 12 },
  settingToggle: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  settingToggleActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  settingText: { color: '#ccffff', fontSize: 12 },
  settingStatus: { color: '#00ff88', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  statsCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#00ffcc', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
});

export default MeditationGuide;
