// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/WorkoutCompanion.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { WorkoutBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const WorkoutCompanion = ({ isActive, onClose }) => {
  const [workoutActive, setWorkoutActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState('pushups');
  const [repCount, setRepCount] = useState(0);
  const [setCount, setSetCount] = useState(1);
  const [targetReps, setTargetReps] = useState(15);
  const [restTimer, setRestTimer] = useState(0);
  const [resting, setResting] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [calories, setCalories] = useState(0);
  const [heartRate, setHeartRate] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [workoutType, setWorkoutType] = useState('strength');
  const [exercises, setExercises] = useState([]);
  const [completedSets, setCompletedSets] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const repAnim = useRef(new Animated.Value(1)).current;
  const timerIntervalRef = useRef(null);
  const restIntervalRef = useRef(null);

  const EXERCISE_DB = {
    pushups: { name: 'Push-ups', muscle: 'Chest', difficulty: 'Medium', calories: 0.5 },
    squats: { name: 'Squats', muscle: 'Legs', difficulty: 'Easy', calories: 0.6 },
    lunges: { name: 'Lunges', muscle: 'Legs', difficulty: 'Medium', calories: 0.7 },
    planks: { name: 'Planks', muscle: 'Core', difficulty: 'Hard', calories: 0.3 },
    burpees: { name: 'Burpees', muscle: 'Full Body', difficulty: 'Hard', calories: 1.2 },
    jumping: { name: 'Jumping Jacks', muscle: 'Cardio', difficulty: 'Easy', calories: 0.8 },
  };

  const WORKOUTS = {
    strength: ['pushups', 'squats', 'lunges', 'planks'],
    cardio: ['jumping', 'burpees', 'jumping', 'burpees'],
    hiit: ['burpees', 'pushups', 'jumping', 'squats'],
    yoga: ['planks', 'lunges', 'planks', 'squats'],
  };

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); setExercises(WORKOUTS[workoutType]); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); stopWorkout(); }
    return () => stopWorkout();
  }, [isActive]);

  const startWorkout = () => {
    setWorkoutActive(true); setWorkoutTime(0); setRepCount(0); setSetCount(1); setCalories(0); setCompletedSets([]); setCurrentExercise(exercises[0]);
    timerIntervalRef.current = setInterval(() => { setWorkoutTime(prev => prev + 1); setHeartRate(prev => { const target = workoutActive ? 120 + Math.random() * 40 : 70; return prev + (target - prev) * 0.1; }); }, 1000);
  };

  const stopWorkout = () => { setWorkoutActive(false); setResting(false); if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); if (restIntervalRef.current) clearInterval(restIntervalRef.current); };

  const addRep = () => {
    setRepCount(prev => {
      const newCount = prev + 1;
      Animated.sequence([Animated.timing(repAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }), Animated.timing(repAnim, { toValue: 1, duration: 100, useNativeDriver: true })]).start();
      setCalories(c => c + (EXERCISE_DB[currentExercise]?.calories || 0.5));
      if (newCount >= targetReps) completeSet();
      return newCount;
    });
  };

  const completeSet = () => {
    setCompletedSets(prev => [...prev, { exercise: currentExercise, reps: repCount, set: setCount }]);
    setResting(true); setRestTimer(60);
    restIntervalRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) { clearInterval(restIntervalRef.current); setResting(false); setRepCount(0); setSetCount(s => s + 1); const idx = exercises.indexOf(currentExercise); setCurrentExercise(exercises[(idx + 1) % exercises.length]); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const renderWorkoutHeader = () => {
    const ex = EXERCISE_DB[currentExercise] || EXERCISE_DB.pushups;
    return (
      <View style={styles.workoutHeader}>
        <Text style={styles.exerciseName}>{ex.name}</Text><Text style={styles.exerciseMeta}>{ex.muscle} • {ex.difficulty}</Text>
        <View style={styles.repCounter}>
          <Animated.Text style={[styles.repCount, { transform: [{ scale: repAnim }] }]}>{repCount}</Animated.Text>
          <Text style={styles.repTarget}>/ {targetReps}</Text>
        </View>
        <Text style={styles.setInfo}>Set {setCount}</Text>
      </View>
    );
  };

  const renderTimer = () => (
    <View style={styles.timerCard}>
      <Text style={styles.timerValue}>{formatTime(workoutTime)}</Text><Text style={styles.timerLabel}>Workout Time</Text>
      {resting && <View style={styles.restOverlay}><Text style={styles.restText}>REST</Text><Text style={styles.restTime}>{restTimer}s</Text></View>}
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsRow}>
      {!workoutActive ? <TouchableOpacity style={styles.controlBtn} onPress={startWorkout}><Text style={styles.controlBtnText}>▶ Start Workout</Text></TouchableOpacity>
        : (<><TouchableOpacity style={styles.repBtn} onPress={addRep}><Text style={styles.repBtnText}>+ Rep</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.controlBtnStop]} onPress={stopWorkout}><Text style={styles.controlBtnText}>⏹ End</Text></TouchableOpacity></>)}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}><Text style={styles.statValue}>{calories.toFixed(0)}</Text><Text style={styles.statLabel}>Kcal</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{heartRate.toFixed(0)}</Text><Text style={styles.statLabel}>BPM</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{completedSets.length}</Text><Text style={styles.statLabel}>Sets</Text></View>
      </View>
    </View>
  );

  const renderWorkoutType = () => (
    <View style={styles.typeCard}>
      <Text style={styles.cardTitle}>Workout Type</Text>
      <View style={styles.typeRow}>
        {Object.keys(WORKOUTS).map((type) => (
          <TouchableOpacity key={type} style={[styles.typeBtn, workoutType === type && styles.typeBtnActive]} onPress={() => { if (!workoutActive) { setWorkoutType(type); setExercises(WORKOUTS[type]); } }}>
            <Text style={[styles.typeText, workoutType === type && styles.typeTextActive]}>{type.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMusic = () => (
    <View style={styles.musicCard}>
      <TouchableOpacity style={[styles.musicBtn, musicPlaying && styles.musicBtnActive]} onPress={() => setMusicPlaying(!musicPlaying)}>
        <Text style={styles.musicBtnText}>{musicPlaying ? '⏸ Pause Music' : '▶ Workout Music'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyCard}>
      <Text style={styles.cardTitle}>Session History</Text>
      {completedSets.length === 0 ? <Text style={styles.historyEmpty}>No sets completed yet</Text> : completedSets.map((set, i) => (
        <View key={i} style={styles.historyItem}><Text style={styles.historyExercise}>{EXERCISE_DB[set.exercise]?.name || set.exercise}</Text><Text style={styles.historyReps}>Set {set.set}: {set.reps} reps</Text></View>
      ))}
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💪 Workout</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderWorkoutType()}{workoutActive && renderWorkoutHeader()}{renderTimer()}{renderControls()}{renderStats()}{renderMusic()}{renderHistory()}
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
  typeCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  typeBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  typeText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 11, fontWeight: '600' },
  typeTextActive: { color: '#00ffff' },
  workoutHeader: { alignItems: 'center', paddingVertical: 24 },
  exerciseName: { color: '#00ffff', fontSize: 28, fontWeight: 'bold' },
  exerciseMeta: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 13, marginTop: 4 },
  repCounter: { flexDirection: 'row', alignItems: 'baseline', marginTop: 16 },
  repCount: { color: '#00ff88', fontSize: 72, fontWeight: 'bold' },
  repTarget: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 24, marginLeft: 8 },
  setInfo: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 16, marginTop: 8 },
  timerCard: { margin: 16, marginTop: 0, padding: 20, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center', position: 'relative' },
  timerValue: { color: '#00ffff', fontSize: 42, fontWeight: '200', fontFamily: 'monospace' },
  timerLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  restOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 10, 30, 0.95)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  restText: { color: '#ffaa00', fontSize: 24, fontWeight: 'bold', letterSpacing: 4 },
  restTime: { color: '#ffaa00', fontSize: 48, fontWeight: 'bold', marginTop: 8 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, margin: 16, marginTop: 0 },
  controlBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  controlBtnStop: { backgroundColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.3)' },
  controlBtnText: { color: '#00ffff', fontSize: 15, fontWeight: '600' },
  repBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(0, 255, 100, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 100, 0.3)' },
  repBtnText: { color: '#00ff88', fontSize: 15, fontWeight: '600' },
  statsCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#00ffcc', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  musicCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  musicBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  musicBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  musicBtnText: { color: '#ccffff', fontSize: 14 },
  historyCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  historyEmpty: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  historyExercise: { color: '#ccffff', fontSize: 13 },
  historyReps: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12 },
});

export default WorkoutCompanion;
