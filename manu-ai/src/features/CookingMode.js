// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/CookingMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { CookingBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const CookingMode = ({ isActive, onClose }) => {
  const [recipe, setRecipe] = useState({ name: 'Pasta Carbonara', time: 25, servings: 2, difficulty: 'Easy' });
  const [currentStep, setCurrentStep] = useState(0);
  const [timers, setTimers] = useState([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [ingredients, setIngredients] = useState([
    { name: 'Spaghetti', amount: '200g', checked: false },
    { name: 'Eggs', amount: '2', checked: false },
    { name: 'Bacon', amount: '100g', checked: false },
    { name: 'Parmesan', amount: '50g', checked: false },
    { name: 'Black Pepper', amount: 'to taste', checked: false },
  ]);
  const [steps, setSteps] = useState([
    'Boil a large pot of salted water.',
    'Cook spaghetti according to package directions.',
    'While pasta cooks, whisk eggs and grated Parmesan in a bowl.',
    'Fry bacon until crispy in a large pan.',
    'Drain pasta, reserving 1 cup of pasta water.',
    'Toss hot pasta with bacon and remove from heat.',
    'Quickly stir in egg mixture, adding pasta water as needed.',
    'Season generously with black pepper and serve immediately.',
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const voicePulse = useRef(new Animated.Value(1)).current;
  const timerIntervalsRef = useRef({});

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); Object.values(timerIntervalsRef.current).forEach(clearInterval); timerIntervalsRef.current = {}; }
    return () => { Object.values(timerIntervalsRef.current).forEach(clearInterval); };
  }, [isActive]);

  useEffect(() => {
    if (voiceActive) { Animated.loop(Animated.sequence([Animated.timing(voicePulse, { toValue: 1.3, duration: 600, useNativeDriver: true }), Animated.timing(voicePulse, { toValue: 1, duration: 600, useNativeDriver: true })])).start(); }
    else { voicePulse.setValue(1); }
  }, [voiceActive]);

  const addTimer = (name, duration) => {
    const id = Date.now().toString();
    const newTimer = { id, name, duration, remaining: duration, active: true };
    setTimers(prev => [...prev, newTimer]);
    timerIntervalsRef.current[id] = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (t.id === id && t.remaining > 0) return { ...t, remaining: t.remaining - 1 };
        if (t.id === id && t.remaining <= 1) { clearInterval(timerIntervalsRef.current[id]); if (SpatialAudio) SpatialAudio.playAlert('notification').catch(() => {}); return { ...t, remaining: 0, active: false }; }
        return t;
      }));
    }, 1000);
  };

  const removeTimer = (id) => { if (timerIntervalsRef.current[id]) { clearInterval(timerIntervalsRef.current[id]); delete timerIntervalsRef.current[id]; } setTimers(prev => prev.filter(t => t.id !== id)); };
  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };
  const toggleIngredient = (index) => { setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, checked: !ing.checked } : ing)); };
  const nextStep = () => { if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1); };
  const prevStep = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };

  const renderRecipeHeader = () => (
    <View style={styles.recipeCard}>
      <Text style={styles.recipeName}>{recipe.name}</Text>
      <View style={styles.recipeMeta}>
        <Text style={styles.recipeMetaText}>⏱ {recipe.time} min</Text>
        <Text style={styles.recipeMetaText}>👥 {recipe.servings} servings</Text>
        <Text style={styles.recipeMetaText}>📊 {recipe.difficulty}</Text>
      </View>
    </View>
  );

  const renderStepCard = () => (
    <View style={styles.stepCard}>
      <Text style={styles.stepCounter}>Step {currentStep + 1} of {steps.length}</Text>
      <View style={styles.stepProgress}><View style={[styles.stepProgressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} /></View>
      <Text style={styles.stepText}>{steps[currentStep]}</Text>
      <View style={styles.stepNav}>
        <TouchableOpacity style={styles.stepNavBtn} onPress={prevStep} disabled={currentStep === 0}><Text style={[styles.stepNavText, currentStep === 0 && styles.stepNavDisabled]}>◀ Prev</Text></TouchableOpacity>
        <TouchableOpacity style={styles.stepNavBtn} onPress={nextStep} disabled={currentStep === steps.length - 1}><Text style={[styles.stepNavText, currentStep === steps.length - 1 && styles.stepNavDisabled]}>Next ▶</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderIngredients = () => (
    <View style={styles.ingredientsCard}>
      <Text style={styles.cardTitle}>Ingredients</Text>
      {ingredients.map((ing, i) => (
        <TouchableOpacity key={i} style={styles.ingredientRow} onPress={() => toggleIngredient(i)}>
          <Text style={[styles.ingredientCheck, ing.checked && styles.ingredientChecked]}>{ing.checked ? '✓' : '○'}</Text>
          <Text style={[styles.ingredientName, ing.checked && styles.ingredientNameChecked]}>{ing.name}</Text>
          <Text style={styles.ingredientAmount}>{ing.amount}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTimers = () => (
    <View style={styles.timersCard}>
      <Text style={styles.cardTitle}>Timers</Text>
      <View style={styles.timerPresets}>
        {[{ name: 'Pasta', duration: 600 }, { name: 'Eggs', duration: 180 }, { name: 'Bacon', duration: 300 }].map((preset) => (
          <TouchableOpacity key={preset.name} style={styles.timerPresetBtn} onPress={() => addTimer(preset.name, preset.duration)}><Text style={styles.timerPresetText}>+ {preset.name}</Text></TouchableOpacity>
        ))}
      </View>
      {timers.map((timer) => (
        <View key={timer.id} style={styles.timerRow}>
          <Text style={styles.timerName}>{timer.name}</Text>
          <Text style={[styles.timerValue, !timer.active && styles.timerDone]}>{formatTime(timer.remaining)}</Text>
          <TouchableOpacity onPress={() => removeTimer(timer.id)}><Text style={styles.timerRemove}>✕</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderVoiceControl = () => (
    <View style={styles.voiceCard}>
      <TouchableOpacity style={styles.voiceBtn} onPress={() => setVoiceActive(!voiceActive)}>
        <Animated.View style={[styles.voiceInner, { transform: [{ scale: voicePulse }] }]}><Text style={styles.voiceIcon}>🎤</Text></Animated.View>
        <Text style={styles.voiceLabel}>{voiceActive ? 'Listening...' : 'Voice Control'}</Text>
      </TouchableOpacity>
      <View style={styles.voiceHints}><Text style={styles.voiceHint}>"Next step" • "Set timer 5 minutes" • "Repeat"</Text></View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsRow}>
      <TouchableOpacity style={[styles.settingToggle, handsFree && styles.settingToggleActive]} onPress={() => setHandsFree(!handsFree)}>
        <Text style={styles.settingText}>Hands-Free</Text><Text style={styles.settingStatus}>{handsFree ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍳 Cooking</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderRecipeHeader()}{renderStepCard()}{renderVoiceControl()}{renderIngredients()}{renderTimers()}{renderSettings()}
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
  recipeCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  recipeName: { color: '#00ffff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  recipeMeta: { flexDirection: 'row', gap: 16 },
  recipeMetaText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12 },
  stepCard: { margin: 16, marginTop: 0, padding: 20, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  stepCounter: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginBottom: 8 },
  stepProgress: { height: 4, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  stepProgressFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  stepText: { color: '#ccffff', fontSize: 18, lineHeight: 28, marginBottom: 20 },
  stepNav: { flexDirection: 'row', justifyContent: 'space-between' },
  stepNavBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  stepNavText: { color: '#00ffff', fontSize: 13, fontWeight: '600' },
  stepNavDisabled: { color: 'rgba(0, 255, 255, 0.2)' },
  voiceCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  voiceBtn: { alignItems: 'center' },
  voiceInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 2, borderColor: '#00ffff', justifyContent: 'center', alignItems: 'center' },
  voiceIcon: { fontSize: 28 },
  voiceLabel: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12, marginTop: 8 },
  voiceHints: { marginTop: 12 },
  voiceHint: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 11, textAlign: 'center' },
  ingredientsCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  ingredientCheck: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 16, width: 24 },
  ingredientChecked: { color: '#00ff88' },
  ingredientName: { color: '#ccffff', fontSize: 14, flex: 1 },
  ingredientNameChecked: { textDecorationLine: 'line-through', color: 'rgba(0, 255, 255, 0.3)' },
  ingredientAmount: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12 },
  timersCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  timerPresets: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  timerPresetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  timerPresetText: { color: '#ccffff', fontSize: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  timerName: { color: '#ccffff', fontSize: 13, flex: 1 },
  timerValue: { color: '#00ff88', fontSize: 16, fontWeight: 'bold', width: 60, textAlign: 'center' },
  timerDone: { color: '#ffaa00' },
  timerRemove: { color: '#ff6666', fontSize: 14, width: 30, textAlign: 'right' },
  settingsRow: { margin: 16, marginTop: 0, marginBottom: 32 },
  settingToggle: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  settingToggleActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  settingText: { color: '#ccffff', fontSize: 12 },
  settingStatus: { color: '#00ff88', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
});

export default CookingMode;
