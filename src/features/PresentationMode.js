// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/PresentationMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { PresentationBridge } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PresentationMode = ({ isActive, onClose }) => {
  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(12);
  const [timer, setTimer] = useState(0);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: SCREEN_W / 2, y: SCREEN_H / 2 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [notes, setNotes] = useState('Welcome to the presentation. Today we will discuss AI integration.');
  const [slideNotes, setSlideNotes] = useState([
    'Welcome and introduction',
    'Agenda overview',
    'Current state of AI',
    'Future possibilities',
    'Q&A session',
  ]);
  const [presentationMode, setPresentationMode] = useState('speaker'); // speaker, audience, laser

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const laserPulse = useRef(new Animated.Value(1)).current;
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); stopPresentation(); }
    return () => stopPresentation();
  }, [isActive]);

  useEffect(() => {
    if (laserActive) { Animated.loop(Animated.sequence([Animated.timing(laserPulse, { toValue: 1.5, duration: 300, useNativeDriver: true }), Animated.timing(laserPulse, { toValue: 1, duration: 300, useNativeDriver: true })])).start(); }
    else { laserPulse.setValue(1); }
  }, [laserActive]);

  const startPresentation = () => { setPresenting(true); setTimer(0); timerIntervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000); };
  const stopPresentation = () => { setPresenting(false); if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); setLaserActive(false); };
  const nextSlide = () => { if (currentSlide < totalSlides) setCurrentSlide(prev => prev + 1); };
  const prevSlide = () => { if (currentSlide > 1) setCurrentSlide(prev => prev - 1); };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const renderSlideView = () => (
    <View style={styles.slideCard}>
      <View style={styles.slideHeader}>
        <Text style={styles.slideCounter}>Slide {currentSlide} / {totalSlides}</Text>
        <View style={styles.slideProgress}><View style={[styles.slideProgressFill, { width: `${(currentSlide / totalSlides) * 100}%` }]} /></View>
      </View>
      <View style={styles.slideContent}>
        <Text style={styles.slidePlaceholder}>📊 Slide {currentSlide} Content</Text>
        <Text style={styles.slideSub}>Presentation content would render here</Text>
      </View>
      {laserActive && (
        <Animated.View style={[styles.laserDot, { left: laserPos.x - 10, top: laserPos.y - 10, transform: [{ scale: laserPulse }] }]}>
          <View style={styles.laserInner} /><View style={styles.laserGlow} />
        </Animated.View>
      )}
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsCard}>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={prevSlide} disabled={currentSlide === 1}>
          <Text style={[styles.navText, currentSlide === 1 && styles.navDisabled]}>◀ Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={nextSlide} disabled={currentSlide === totalSlides}>
          <Text style={[styles.navText, currentSlide === totalSlides && styles.navDisabled]}>Next ▶</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, laserActive && styles.actionBtnActive]} onPress={() => setLaserActive(!laserActive)}>
          <Text style={styles.actionText}>🔴 Laser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, autoRotate && styles.actionBtnActive]} onPress={() => setAutoRotate(!autoRotate)}>
          <Text style={styles.actionText}>🔄 Auto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTimer = () => (
    <View style={styles.timerCard}>
      <Text style={styles.timerValue}>{formatTime(timer)}</Text>
      <Text style={styles.timerLabel}>Elapsed Time</Text>
      {!presenting ? <TouchableOpacity style={styles.startBtn} onPress={startPresentation}><Text style={styles.startText}>▶ Start</Text></TouchableOpacity>
        : <TouchableOpacity style={[styles.startBtn, styles.stopBtn]} onPress={stopPresentation}><Text style={styles.startText}>⏹ Stop</Text></TouchableOpacity>}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.notesCard}>
      <Text style={styles.cardTitle}>Speaker Notes</Text>
      <Text style={styles.notesText}>{slideNotes[Math.min(currentSlide - 1, slideNotes.length - 1)] || 'No notes for this slide'}</Text>
    </View>
  );

  const renderModeSelector = () => (
    <View style={styles.modeCard}>
      <Text style={styles.cardTitle}>Mode</Text>
      <View style={styles.modeRow}>
        {['speaker', 'audience', 'laser'].map((m) => (
          <TouchableOpacity key={m} style={[styles.modeBtn, presentationMode === m && styles.modeBtnActive]} onPress={() => setPresentationMode(m)}>
            <Text style={[styles.modeText, presentationMode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📽️ Presentation</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderSlideView()}{renderControls()}{renderTimer()}{renderNotes()}{renderModeSelector()}
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
  slideCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', minHeight: 200, position: 'relative' },
  slideHeader: { marginBottom: 12 },
  slideCounter: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12 },
  slideProgress: { height: 3, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  slideProgressFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  slidePlaceholder: { color: '#00ffff', fontSize: 24, marginBottom: 8 },
  slideSub: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 12 },
  laserDot: { position: 'absolute', width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  laserInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff0000' },
  laserGlow: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255, 0, 0, 0.3)' },
  controlsCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  navText: { color: '#00ffff', fontSize: 13, fontWeight: '600' },
  navDisabled: { color: 'rgba(0, 255, 255, 0.2)' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  actionBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  actionText: { color: '#ccffff', fontSize: 12 },
  timerCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  timerValue: { color: '#00ffff', fontSize: 36, fontWeight: '200', fontFamily: 'monospace' },
  timerLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  startBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  stopBtn: { backgroundColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.3)' },
  startText: { color: '#00ffff', fontSize: 14, fontWeight: '600' },
  notesCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  notesText: { color: '#ccffff', fontSize: 14, lineHeight: 22 },
  modeCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  modeText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 11, fontWeight: '600' },
  modeTextActive: { color: '#00ffff' },
});

export default PresentationMode;
