// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/CarMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { CarModeBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const CarMode = ({ isActive, onClose }) => {
  const [drivingDetected, setDrivingDetected] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [navigationActive, setNavigationActive] = useState(false);
  const [currentRoute, setCurrentRoute] = useState({ destination: 'Home', distance: '12.4 km', eta: '18 min', nextTurn: 'Right in 200m' });
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({ title: 'Highway Star', artist: 'Deep Purple', progress: 45 });
  const [voiceActive, setVoiceActive] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(true);
  const [fuelLevel, setFuelLevel] = useState(65);
  const [tirePressure, setTirePressure] = useState([32, 31, 32, 31]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const speedAnim = useRef(new Animated.Value(0)).current;
  const voicePulse = useRef(new Animated.Value(1)).current;
  const driveIntervalRef = useRef(null);
  const alertIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      startDrivingSimulation();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopDrivingSimulation();
    }
    return () => stopDrivingSimulation();
  }, [isActive]);

  useEffect(() => {
    Animated.timing(speedAnim, { toValue: speed, duration: 500, useNativeDriver: true }).start();
  }, [speed]);

  const startDrivingSimulation = () => {
    setTimeout(() => { setDrivingDetected(true); if (SpatialAudio) SpatialAudio.playAlert('approach_front').catch(() => {}); }, 2000);
    driveIntervalRef.current = setInterval(() => {
      setSpeed(prev => Math.max(0, Math.min(120, prev + (Math.random() - 0.4) * 15)));
      setFuelLevel(prev => Math.max(0, prev - 0.1));
    }, 2000);
    alertIntervalRef.current = setInterval(() => {
      const alertTypes = [
        { type: 'speed', message: 'Speed limit: 80 km/h' },
        { type: 'traffic', message: 'Traffic ahead in 2 km' },
        { type: 'weather', message: 'Rain detected, roads may be slippery' },
      ];
      if (Math.random() > 0.7) {
        const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        setAlerts(prev => [alert, ...prev].slice(0, 5));
      }
    }, 8000);
  };

  const stopDrivingSimulation = () => {
    if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    setDrivingDetected(false); setSpeed(0); setAlerts([]);
  };

  const toggleVoice = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(voicePulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(voicePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])).start();
    } else { voicePulse.setValue(1); }
  };

  const renderSpeedometer = () => (
    <View style={styles.speedometer}>
      <View style={styles.speedCircle}>
        <Text style={styles.speedValue}>{Math.round(speed)}</Text><Text style={styles.speedUnit}>km/h</Text>
      </View>
      <View style={styles.speedBar}>
        <Animated.View style={[styles.speedFill, {
          width: speedAnim.interpolate({ inputRange: [0, 120], outputRange: ['0%', '100%'] }),
          backgroundColor: speed > 80 ? '#ff4444' : speed > 60 ? '#ffaa00' : '#00ff88',
        }]} />
      </View>
    </View>
  );

  const renderNavigation = () => (
    <View style={styles.navCard}>
      <View style={styles.navHeader}><Text style={styles.navIcon}>🧭</Text><Text style={styles.navDestination}>{currentRoute.destination}</Text></View>
      <Text style={styles.navTurn}>{currentRoute.nextTurn}</Text>
      <View style={styles.navStats}>
        <Text style={styles.navStat}>📍 {currentRoute.distance}</Text><Text style={styles.navStat}>⏱️ {currentRoute.eta}</Text>
      </View>
      <TouchableOpacity style={[styles.navBtn, navigationActive && styles.navBtnActive]} onPress={() => setNavigationActive(!navigationActive)}>
        <Text style={styles.navBtnText}>{navigationActive ? 'Stop Navigation' : 'Start Navigation'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMusic = () => (
    <View style={styles.musicCard}>
      <View style={styles.musicInfo}>
        <Text style={styles.musicEmoji}>🎵</Text>
        <View style={styles.musicMeta}><Text style={styles.trackTitle}>{currentTrack.title}</Text><Text style={styles.trackArtist}>{currentTrack.artist}</Text></View>
      </View>
      <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${currentTrack.progress}%` }]} /></View>
      <View style={styles.musicControls}>
        <TouchableOpacity><Text style={styles.musicControl}>⏮</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMusicPlaying(!musicPlaying)}><Text style={styles.musicControl}>{musicPlaying ? '⏸' : '▶'}</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.musicControl}>⏭</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderVoiceButton = () => (
    <TouchableOpacity style={styles.voiceBtn} onPress={toggleVoice}>
      <Animated.View style={[styles.voiceInner, { transform: [{ scale: voicePulse }] }]}><Text style={styles.voiceIcon}>🎤</Text></Animated.View>
      <Text style={styles.voiceLabel}>{voiceActive ? 'Listening...' : 'Tap to Speak'}</Text>
    </TouchableOpacity>
  );

  const renderAlerts = () => (
    <View style={styles.alertsContainer}>
      {alerts.map((alert, index) => (
        <View key={index} style={[styles.alertItem, alert.type === 'speed' && styles.alertSpeed, alert.type === 'traffic' && styles.alertTraffic, alert.type === 'weather' && styles.alertWeather]}>
          <Text style={styles.alertText}>{alert.message}</Text>
        </View>
      ))}
    </View>
  );

  const renderVehicleStats = () => (
    <View style={styles.vehicleCard}>
      <Text style={styles.cardTitle}>Vehicle</Text>
      <View style={styles.vehicleGrid}>
        <View style={styles.vehicleItem}><Text style={styles.vehicleEmoji}>⛽</Text><Text style={styles.vehicleValue}>{fuelLevel.toFixed(0)}%</Text><Text style={styles.vehicleLabel}>Fuel</Text></View>
        {tirePressure.map((tp, i) => (<View key={i} style={styles.vehicleItem}><Text style={styles.vehicleEmoji}>🛞</Text><Text style={styles.vehicleValue}>{tp}</Text><Text style={styles.vehicleLabel}>Tire {i + 1}</Text></View>))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsRow}>
      <TouchableOpacity style={[styles.settingToggle, autoReplyEnabled && styles.settingToggleActive]} onPress={() => setAutoReplyEnabled(!autoReplyEnabled)}>
        <Text style={styles.settingText}>Auto Reply</Text><Text style={styles.settingStatus}>{autoReplyEnabled ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.settingToggle, doNotDisturb && styles.settingToggleActive]} onPress={() => setDoNotDisturb(!doNotDisturb)}>
        <Text style={styles.settingText}>Do Not Disturb</Text><Text style={styles.settingStatus}>{doNotDisturb ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚗 Car Mode</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: drivingDetected ? '#00ff88' : '#ffaa00' }]} />
          <Text style={styles.statusText}>{drivingDetected ? 'DRIVING' : 'DETECTING...'}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderSpeedometer()}{renderVoiceButton()}{renderNavigation()}{renderMusic()}{renderAlerts()}{renderVehicleStats()}{renderSettings()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 30, 60, 0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 11, fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  speedometer: { alignItems: 'center', paddingVertical: 24 },
  speedCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: 'rgba(0, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  speedValue: { color: '#00ffff', fontSize: 48, fontWeight: 'bold' },
  speedUnit: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 14 },
  speedBar: { width: SCREEN_W - 80, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' },
  speedFill: { height: '100%', borderRadius: 3 },
  voiceBtn: { alignItems: 'center', paddingVertical: 20 },
  voiceInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 2, borderColor: '#00ffff', justifyContent: 'center', alignItems: 'center' },
  voiceIcon: { fontSize: 32 },
  voiceLabel: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12, marginTop: 8 },
  navCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  navHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  navIcon: { fontSize: 20, marginRight: 8 },
  navDestination: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' },
  navTurn: { color: '#66ccff', fontSize: 18, fontWeight: '600', marginVertical: 8 },
  navStats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  navStat: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 13 },
  navBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 60, 100, 0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  navBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  navBtnText: { color: '#00ffff', fontSize: 14, fontWeight: '600' },
  musicCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  musicInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  musicEmoji: { fontSize: 28, marginRight: 12 },
  musicMeta: { flex: 1 },
  trackTitle: { color: '#00ffff', fontSize: 15, fontWeight: 'bold' },
  trackArtist: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 2, marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  musicControls: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  musicControl: { color: '#00ffff', fontSize: 24 },
  alertsContainer: { margin: 16, marginTop: 0 },
  alertItem: { padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  alertSpeed: { backgroundColor: 'rgba(255, 100, 0, 0.15)', borderColor: 'rgba(255, 150, 0, 0.3)' },
  alertTraffic: { backgroundColor: 'rgba(255, 200, 0, 0.15)', borderColor: 'rgba(255, 220, 0, 0.3)' },
  alertWeather: { backgroundColor: 'rgba(0, 150, 255, 0.15)', borderColor: 'rgba(0, 180, 255, 0.3)' },
  alertText: { color: '#ffcc88', fontSize: 13, fontWeight: '500' },
  vehicleCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vehicleItem: { alignItems: 'center', width: '18%' },
  vehicleEmoji: { fontSize: 20, marginBottom: 4 },
  vehicleValue: { color: '#00ffcc', fontSize: 14, fontWeight: 'bold' },
  vehicleLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 9 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16, marginTop: 0, marginBottom: 32, gap: 12 },
  settingToggle: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  settingToggleActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  settingText: { color: '#ccffff', fontSize: 12 },
  settingStatus: { color: '#00ff88', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
});

export default CarMode;
