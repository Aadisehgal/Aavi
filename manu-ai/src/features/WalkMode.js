// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/WalkMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { WalkModeBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const WalkMode = ({ isActive, onClose }) => {
  const [walking, setWalking] = useState(false);
  const [steps, setSteps] = useState(0);
  const [stepRate, setStepRate] = useState(0);
  const [screenDimmed, setScreenDimmed] = useState(false);
  const [alertLevel, setAlertLevel] = useState('none');
  const [obstacles, setObstacles] = useState([]);
  const [ambientLight, setAmbientLight] = useState(500);
  const [autoDimEnabled, setAutoDimEnabled] = useState(true);
  const [headUpReminder, setHeadUpReminder] = useState(true);
  const [distractionScore, setDistractionScore] = useState(0);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const alertAnim = useRef(new Animated.Value(0)).current;
  const dimAnim = useRef(new Animated.Value(1)).current;
  const walkIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      startWalkingSimulation();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopWalkingSimulation();
    }
    return () => stopWalkingSimulation();
  }, [isActive]);

  useEffect(() => {
    if (alertLevel !== 'none') {
      Animated.timing(alertAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      if (SpatialAudio) SpatialAudio.playAlert('approach_front').catch(() => {});
    } else {
      Animated.timing(alertAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [alertLevel]);

  useEffect(() => {
    if (screenDimmed && autoDimEnabled) {
      Animated.timing(dimAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }).start();
    } else {
      Animated.timing(dimAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [screenDimmed, autoDimEnabled]);

  const startWalkingSimulation = () => {
    setTimeout(() => {
      setWalking(true);
      setNearbyPlaces([
        { name: 'Coffee Shop', distance: '45m', type: 'cafe' },
        { name: 'Bus Stop', distance: '120m', type: 'transport' },
        { name: 'Park', distance: '300m', type: 'park' },
      ]);
    }, 1000);
    walkIntervalRef.current = setInterval(() => {
      setSteps(prev => prev + Math.floor(Math.random() * 3) + 1);
      setStepRate(Math.floor(Math.random() * 40) + 80);
      setAmbientLight(prev => Math.max(10, prev + (Math.random() - 0.5) * 100));
      setDistractionScore(prev => Math.min(100, prev + (Math.random() > 0.7 ? 5 : -2)));
      if (walking && distractionScore > 60 && autoDimEnabled) setScreenDimmed(true);
      else if (distractionScore < 40) setScreenDimmed(false);
      if (Math.random() > 0.92) {
        const obs = ['Pole ahead', 'Curb near', 'Cyclist approaching', 'Crosswalk'];
        setObstacles(prev => [obs[Math.floor(Math.random() * obs.length)], ...prev].slice(0, 3));
        setAlertLevel('caution'); setTimeout(() => setAlertLevel('none'), 4000);
      }
      if (headUpReminder && distractionScore > 70 && Math.random() > 0.8) {
        setAlertLevel('warning'); setTimeout(() => setAlertLevel('none'), 3000);
      }
    }, 1500);
  };

  const stopWalkingSimulation = () => {
    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
    setWalking(false); setSteps(0); setObstacles([]); setAlertLevel('none'); setScreenDimmed(false); setDistractionScore(0);
  };

  const getAlertColor = () => { switch (alertLevel) { case 'warning': return '#ff4444'; case 'caution': return '#ffaa00'; default: return 'transparent'; } };

  const renderAlertBanner = () => (
    <Animated.View style={[styles.alertBanner, { opacity: alertAnim, backgroundColor: getAlertColor() }]}>
      <Text style={styles.alertBannerText}>{alertLevel === 'warning' ? '⚠️ HEADS UP! Look ahead!' : '⚡ Caution ahead'}</Text>
    </Animated.View>
  );

  const renderWalkStats = () => (
    <View style={styles.statsCard}>
      <View style={styles.mainStat}><Text style={styles.mainStatValue}>{steps}</Text><Text style={styles.mainStatLabel}>steps</Text></View>
      <View style={styles.statRow}>
        <View style={styles.statItem}><Text style={styles.statValue}>{stepRate}</Text><Text style={styles.statLabel}>steps/min</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{(steps * 0.0007).toFixed(2)}</Text><Text style={styles.statLabel}>km</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{(steps * 0.04).toFixed(0)}</Text><Text style={styles.statLabel}>kcal</Text></View>
      </View>
    </View>
  );

  const renderDistractionMeter = () => (
    <View style={styles.distractionCard}>
      <Text style={styles.cardTitle}>Distraction Level</Text>
      <View style={styles.meterBar}><View style={[styles.meterFill, { width: `${distractionScore}%`, backgroundColor: distractionScore > 70 ? '#ff4444' : distractionScore > 40 ? '#ffaa00' : '#00ff88' }]} /></View>
      <Text style={styles.meterText}>{distractionScore > 70 ? 'High — Look up!' : distractionScore > 40 ? 'Moderate — Be aware' : 'Low — Safe'}</Text>
    </View>
  );

  const renderObstacles = () => (
    <View style={styles.obstaclesCard}>
      <Text style={styles.cardTitle}>Nearby Obstacles</Text>
      {obstacles.length === 0 ? <Text style={styles.noObstacles}>Path is clear</Text> : obstacles.map((obs, i) => (
        <View key={i} style={styles.obstacleRow}><Text style={styles.obstacleIcon}>⚠️</Text><Text style={styles.obstacleText}>{obs}</Text></View>
      ))}
    </View>
  );

  const renderNearby = () => (
    <View style={styles.nearbyCard}>
      <Text style={styles.cardTitle}>Nearby Places</Text>
      {nearbyPlaces.map((place, i) => (
        <View key={i} style={styles.placeRow}>
          <Text style={styles.placeIcon}>{place.type === 'cafe' ? '☕' : place.type === 'transport' ? '🚌' : '🌳'}</Text>
          <Text style={styles.placeName}>{place.name}</Text><Text style={styles.placeDistance}>{place.distance}</Text>
        </View>
      ))}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsRow}>
      <TouchableOpacity style={[styles.settingToggle, autoDimEnabled && styles.settingToggleActive]} onPress={() => setAutoDimEnabled(!autoDimEnabled)}>
        <Text style={styles.settingText}>Auto Dim</Text><Text style={styles.settingStatus}>{autoDimEnabled ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.settingToggle, headUpReminder && styles.settingToggleActive]} onPress={() => setHeadUpReminder(!headUpReminder)}>
        <Text style={styles.settingText}>Head Up Alert</Text><Text style={styles.settingStatus}>{headUpReminder ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAmbientInfo = () => (
    <View style={styles.ambientCard}>
      <Text style={styles.cardTitle}>Environment</Text>
      <View style={styles.ambientRow}>
        <Text style={styles.ambientText}>Light: {ambientLight.toFixed(0)} lux</Text>
        <Text style={styles.ambientText}>{ambientLight < 50 ? '🌙 Dark' : ambientLight < 300 ? '☁️ Dim' : '☀️ Bright'}</Text>
      </View>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.dimOverlay, { opacity: dimAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 0] }) }]} pointerEvents="none" />
      {renderAlertBanner()}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚶 Walk Mode</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: walking ? '#00ff88' : '#ffaa00' }]} />
          <Text style={styles.statusText}>{walking ? 'WALKING' : 'STANDBY'}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderWalkStats()}{renderDistractionMeter()}{renderObstacles()}{renderNearby()}{renderAmbientInfo()}{renderSettings()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', zIndex: 250 },
  alertBanner: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 48, paddingBottom: 12, alignItems: 'center', zIndex: 260 },
  alertBannerText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 30, 60, 0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 11, fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  statsCard: { margin: 16, padding: 20, borderRadius: 20, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  mainStat: { alignItems: 'center', marginBottom: 16 },
  mainStatValue: { color: '#00ffff', fontSize: 56, fontWeight: 'bold' },
  mainStatLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#00ffcc', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  distractionCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  meterBar: { height: 12, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  meterFill: { height: '100%', borderRadius: 6 },
  meterText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12 },
  obstaclesCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  noObstacles: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  obstacleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  obstacleIcon: { fontSize: 16, marginRight: 8 },
  obstacleText: { color: '#ffcc88', fontSize: 13 },
  nearbyCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  placeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  placeIcon: { fontSize: 18, marginRight: 10 },
  placeName: { color: '#ccffff', fontSize: 14, flex: 1 },
  placeDistance: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12 },
  ambientCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  ambientRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ambientText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 13 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16, marginTop: 0, marginBottom: 32, gap: 12 },
  settingToggle: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  settingToggleActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  settingText: { color: '#ccffff', fontSize: 12 },
  settingStatus: { color: '#00ff88', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
});

export default WalkMode;
