// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/ReadingMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { ReadingBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const ReadingMode = ({ isActive, onClose }) => {
  const [blueLightFilter, setBlueLightFilter] = useState(50);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.6);
  const [margin, setMargin] = useState(20);
  const [theme, setTheme] = useState('dark');
  const [speedReading, setSpeedReading] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [currentWord, setCurrentWord] = useState(0);
  const [readingActive, setReadingActive] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [textContent, setTextContent] = useState(
    "The future of artificial intelligence lies not in replacing human thought, but in augmenting it. As we stand at the precipice of a new technological era, the integration of AI into daily life promises to reshape how we work, learn, and connect with one another. The key challenge ahead is ensuring that these powerful tools serve humanity's best interests while preserving the dignity and autonomy of every individual."
  );
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wordAnim = useRef(new Animated.Value(0)).current;
  const readingIntervalRef = useRef(null);

  const words = textContent.split(' ');
  const THEMES = { dark: { bg: '#000810', text: '#ccffff', accent: '#00ffff' }, light: { bg: '#f5f0e8', text: '#333333', accent: '#0066cc' }, sepia: { bg: '#e8d5b5', text: '#5c4033', accent: '#8b6914' }, midnight: { bg: '#0a0a1a', text: '#aaaaff', accent: '#6666ff' } };
  const FONTS = ['serif', 'sans-serif', 'monospace'];

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); stopSpeedReading(); }
    return () => stopSpeedReading();
  }, [isActive]);

  const startSpeedReading = () => {
    setSpeedReading(true); setReadingActive(true); setCurrentWord(0);
    const interval = Math.ceil(60000 / wpm);
    readingIntervalRef.current = setInterval(() => {
      setCurrentWord(prev => { if (prev >= words.length - 1) { stopSpeedReading(); return prev; } setReadingProgress(((prev + 1) / words.length) * 100); return prev + 1; });
    }, interval);
  };

  const stopSpeedReading = () => { setSpeedReading(false); setReadingActive(false); if (readingIntervalRef.current) clearInterval(readingIntervalRef.current); };
  const getThemeColors = () => THEMES[theme] || THEMES.dark;
  const colors = getThemeColors();

  const renderPreview = () => (
    <View style={[styles.previewCard, { backgroundColor: colors.bg, borderColor: colors.accent + '30' }]}>
      <Text style={[styles.previewText, { color: colors.text, fontSize: fontSize, lineHeight: fontSize * lineHeight, fontFamily: fontFamily, marginHorizontal: margin }]}>{textContent}</Text>
    </View>
  );

  const renderSpeedReader = () => (
    <View style={[styles.speedReader, { backgroundColor: colors.bg, borderColor: colors.accent + '30' }]}>
      <Text style={[styles.speedWord, { color: colors.accent, fontSize: fontSize * 2 }]}>{words[currentWord] || ''}</Text>
      <View style={styles.speedProgress}><View style={[styles.speedProgressFill, { width: `${readingProgress}%`, backgroundColor: colors.accent }]} /></View>
      <Text style={[styles.speedCounter, { color: colors.text }]}>{currentWord + 1} / {words.length}</Text>
      <View style={styles.speedControls}>
        {!readingActive ? <TouchableOpacity style={[styles.speedBtn, { borderColor: colors.accent }]} onPress={startSpeedReading}><Text style={[styles.speedBtnText, { color: colors.accent }]}>▶ Start</Text></TouchableOpacity>
          : <TouchableOpacity style={[styles.speedBtn, { borderColor: colors.accent }]} onPress={stopSpeedReading}><Text style={[styles.speedBtnText, { color: colors.accent }]}>⏸ Pause</Text></TouchableOpacity>}
      </View>
      <View style={styles.wpmPresets}>
        {[200, 300, 400, 500, 600].map((speed) => (
          <TouchableOpacity key={speed} style={[styles.wpmBtn, wpm === speed && { backgroundColor: colors.accent + '30', borderColor: colors.accent }]} onPress={() => setWpm(speed)}>
            <Text style={[styles.wpmText, { color: colors.text }]}>{speed}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBlueLight = () => (
    <View style={styles.controlCard}>
      <Text style={[styles.controlTitle, { color: colors.accent }]}>Blue Light Filter</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderIcon}>🌙</Text>
        <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${blueLightFilter}%`, backgroundColor: '#ffaa00' }]} /></View>
        <Text style={styles.sliderIcon}>☀️</Text>
      </View>
      <View style={styles.sliderPresets}>
        {[0, 25, 50, 75, 100].map((v) => (
          <TouchableOpacity key={v} style={[styles.sliderPreset, blueLightFilter === v && { borderColor: colors.accent }]} onPress={() => setBlueLightFilter(v)}>
            <Text style={[styles.sliderPresetText, { color: colors.text }]}>{v}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFontControls = () => (
    <View style={styles.controlCard}>
      <Text style={[styles.controlTitle, { color: colors.accent }]}>Font</Text>
      <View style={styles.fontRow}>
        <TouchableOpacity style={[styles.fontBtn, fontSize > 12 && { borderColor: colors.accent }]} onPress={() => setFontSize(prev => Math.max(12, prev - 2))}><Text style={[styles.fontBtnText, { color: colors.text }]}>A-</Text></TouchableOpacity>
        <Text style={[styles.fontSizeText, { color: colors.text }]}>{fontSize}px</Text>
        <TouchableOpacity style={[styles.fontBtn, fontSize < 32 && { borderColor: colors.accent }]} onPress={() => setFontSize(prev => Math.min(32, prev + 2))}><Text style={[styles.fontBtnText, { color: colors.text }]}>A+</Text></TouchableOpacity>
      </View>
      <View style={styles.fontFamilyRow}>
        {FONTS.map((f) => (
          <TouchableOpacity key={f} style={[styles.fontFamilyBtn, fontFamily === f && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }]} onPress={() => setFontFamily(f)}>
            <Text style={[styles.fontFamilyText, { color: colors.text }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderThemeSelector = () => (
    <View style={styles.controlCard}>
      <Text style={[styles.controlTitle, { color: colors.accent }]}>Theme</Text>
      <View style={styles.themeRow}>
        {Object.entries(THEMES).map(([key, t]) => (
          <TouchableOpacity key={key} style={[styles.themeBtn, theme === key && { borderColor: t.accent, borderWidth: 2 }]} onPress={() => setTheme(key)}>
            <View style={[styles.themePreview, { backgroundColor: t.bg }]} /><Text style={[styles.themeText, { color: colors.text }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTTS = () => (
    <View style={styles.controlCard}>
      <Text style={[styles.controlTitle, { color: colors.accent }]}>Text to Speech</Text>
      <TouchableOpacity style={[styles.ttsToggle, ttsEnabled && { borderColor: colors.accent }]} onPress={() => setTtsEnabled(!ttsEnabled)}>
        <Text style={[styles.ttsText, { color: colors.text }]}>{ttsEnabled ? '🔊 TTS ON' : '🔇 TTS OFF'}</Text>
      </TouchableOpacity>
      {ttsEnabled && (
        <View style={styles.ttsSpeedRow}>
          <Text style={[styles.ttsLabel, { color: colors.text }]}>Speed:</Text>
          {[0.5, 1.0, 1.5, 2.0].map((s) => (
            <TouchableOpacity key={s} style={[styles.ttsSpeedBtn, ttsSpeed === s && { borderColor: colors.accent }]} onPress={() => setTtsSpeed(s)}>
              <Text style={[styles.ttsSpeedText, { color: colors.text }]}>{s}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 Reading</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderPreview()}{renderSpeedReader()}{renderBlueLight()}{renderFontControls()}{renderThemeSelector()}{renderTTS()}
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
  previewCard: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  previewText: { fontSize: 18, lineHeight: 28 },
  speedReader: { margin: 16, marginTop: 0, padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  speedWord: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', minHeight: 50 },
  speedProgress: { width: '100%', height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden' },
  speedProgressFill: { height: '100%', borderRadius: 2 },
  speedCounter: { fontSize: 12, marginTop: 8, opacity: 0.6 },
  speedControls: { marginTop: 16 },
  speedBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  speedBtnText: { fontSize: 14, fontWeight: '600' },
  wpmPresets: { flexDirection: 'row', gap: 8, marginTop: 12 },
  wpmBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  wpmText: { fontSize: 12 },
  controlCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  controlTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sliderIcon: { fontSize: 18 },
  sliderTrack: { flex: 1, height: 8, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 4 },
  sliderPresets: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderPreset: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  sliderPresetText: { fontSize: 11 },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  fontBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  fontBtnText: { fontSize: 16, fontWeight: 'bold' },
  fontSizeText: { fontSize: 14, minWidth: 50, textAlign: 'center' },
  fontFamilyRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  fontFamilyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  fontFamilyText: { fontSize: 12 },
  themeRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  themeBtn: { alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  themePreview: { width: 40, height: 40, borderRadius: 8, marginBottom: 4 },
  themeText: { fontSize: 10 },
  ttsToggle: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)', alignItems: 'center' },
  ttsText: { fontSize: 14 },
  ttsSpeedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  ttsLabel: { fontSize: 12 },
  ttsSpeedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  ttsSpeedText: { fontSize: 12 },
});

export default ReadingMode;
