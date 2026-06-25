// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/BikeMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { BikeModeBridge, SpatialAudio } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const BikeMode = ({ isActive, onClose }) => {
  const [cycling, setCycling] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [route, setRoute] = useState([]);
  const [autoReply, setAutoReply] = useState(true);
  const [sosReady, setSosReady] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [weather, setWeather] = useState({ temp: 22, condition: 'Sunny', wind: 12 });
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sosAnim = useRef(new Animated.Value(0)).current;
  const cycleIntervalRef = useRef(null);
  const sosTimerRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      startCyclingSimulation();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopCyclingSimulation();
    }
    return () => stopCyclingSimulation();
  }, [isActive]);

  const startCyclingSimulation = () => {
    setTimeout(() => { setCycling(true); if (SpatialAudio) SpatialAudio.playAlert('approach_front').catch(() => {}); }, 1500);
    cycleIntervalRef.current = setInterval(() => {
      setSpeed(prev => Math.max(0, prev + (Math.random() - 0.45) * 8));
      setCadence(prev => Math.max(0, prev + (Math.random() - 0.5) * 10));
      setDistance(prev => prev + (speed / 3600) * 2);
      setDuration(prev => prev + 2);
      setElevation(prev => prev + (Math.random() - 0.5) * 2);
      if (Math.random() > 0.95) {
        const alerts = ['Sharp turn ahead', 'Car approaching from behind', 'Pothole detected', 'Steep descent'];
        setSafetyAlerts(prev => [alerts[Math.floor(Math.random() * alerts.length)], ...prev].slice(0, 3));
      }
    }, 2000);
  };

  const stopCyclingSimulation = () => {
    if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    setCycling(false); setSpeed(0); setCadence(0); setSafetyAlerts([]); cancelSOS();
  };

  const triggerSOS = () => {
    setSosReady(true); setSosCountdown(5);
    Animated.timing(sosAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    let count = 5;
    sosTimerRef.current = setInterval(() => {
      count -= 1; setSosCountdown(count);
      if (count <= 0) { clearInterval(sosTimerRef.current); if (BikeModeBridge) BikeModeBridge.triggerSOS().catch(() => {}); setSosReady(false); sosAnim.setValue(0); }
    }, 1000);
  };

  const cancelSOS = () => { if (sosTimerRef.current) clearInterval(sosTimerRef.current); setSosReady(false); sosAnim.setValue(0); };

  const formatDuration = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; };

  const renderMainStats = () => (
    <View style={styles.statsCard}>
      <View style={styles.mainStat}><Text style={styles.mainStatValue}>{speed.toFixed(1)}</Text><Text style={styles.mainStatLabel}>km/h</Text></View>
      <View style={styles.statRow}>
        <View style={styles.statItem}><Text style={styles.statValue}>{cadence.toFixed(0)}</Text><Text style={styles.statLabel}>RPM</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{distance.toFixed(2)}</Text><Text style={styles.statLabel}>km</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{formatDuration(duration)}</Text><Text style={styles.statLabel}>Time</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{elevation.toFixed(0)}</Text><Text style={styles.statLabel}>m</Text></View>
      </View>
    </View>
  );

  const renderSOS = () => (
    <Animated.View style={[styles.sosContainer, { opacity: sosAnim }]}>
      <View style={styles.sosOverlay}>
        <Text style={styles.sosTitle}>SOS ACTIVATED</Text>
        <Text style={styles.sosCount}>{sosCountdown}</Text>
        <Text style={styles.sosText}>Sending emergency alert...</Text>
        <TouchableOpacity style={styles.sosCancel} onPress={cancelSOS}><Text style={styles.sosCancelText}>CANCEL</Text></TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderControls = () => (
    <View style={styles.controlsRow}>
      <TouchableOpacity style={[styles.controlBtn, autoReply && styles.controlBtnActive]} onPress={() => setAutoReply(!autoReply)}>
        <Text style={styles.controlIcon}>✉️</Text><Text style={styles.controlLabel}>Auto Reply</Text><Text style={styles.controlStatus}>{autoReply ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.controlBtn, musicPlaying && styles.controlBtnActive]} onPress={() => setMusicPlaying(!musicPlaying)}>
        <Text style={styles.controlIcon}>🎵</Text><Text style={styles.controlLabel}>Music</Text><Text style={styles.controlStatus}>{musicPlaying ? '▶' : '⏸'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS}>
        <Text style={styles.sosBtnIcon}>🚨</Text><Text style={styles.sosBtnLabel}>SOS</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWeather = () => (
    <View style={styles.weatherCard}>
      <Text style={styles.weatherEmoji}>{weather.condition === 'Sunny' ? '☀️' : weather.condition === 'Rain' ? '🌧' : '☁️'}</Text>
      <View style={styles.weatherInfo}>
        <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
        <Text style={styles.weatherCondition}>{weather.condition}</Text>
        <Text style={styles.weatherWind}>Wind: {weather.wind} km/h</Text>
      </View>
    </View>
  );

  const renderSafetyAlerts = () => (
    <View style={styles.alertsCard}>
      <Text style={styles.alertsTitle}>Safety Alerts</Text>
      {safetyAlerts.length === 0 ? <Text style={styles.noAlerts}>All clear — ride safe!</Text> : safetyAlerts.map((alert, i) => (
        <View key={i} style={styles.alertRow}><Text style={styles.alertIcon}>⚠️</Text><Text style={styles.alertMsg}>{alert}</Text></View>
      ))}
    </View>
  );

  const renderRouteMini = () => (
    <View style={styles.routeCard}>
      <Text style={styles.routeTitle}>Route</Text>
      <View style={styles.routeVisual}><View style={styles.routeLine} /><View style={styles.routeDot} /><View style={styles.routeDot} /><View style={[styles.routeDot, styles.routeDotActive]} /></View>
      <Text style={styles.routeText}>Continue straight for 1.2 km</Text>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚴 Bike Mode</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: cycling ? '#00ff88' : '#ffaa00' }]} />
          <Text style={styles.statusText}>{cycling ? 'CYCLING' : 'STANDBY'}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderMainStats()}{renderControls()}{renderWeather()}{renderSafetyAlerts()}{renderRouteMini()}
      </ScrollView>
      {sosReady && renderSOS()}
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
  statsCard: { margin: 16, padding: 20, borderRadius: 20, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  mainStat: { alignItems: 'center', marginBottom: 20 },
  mainStatValue: { color: '#00ffff', fontSize: 64, fontWeight: 'bold' },
  mainStatLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#00ffcc', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16, marginTop: 0, gap: 12 },
  controlBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  controlBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  controlIcon: { fontSize: 24, marginBottom: 6 },
  controlLabel: { color: '#ccffff', fontSize: 12 },
  controlStatus: { color: '#00ff88', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  sosBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 30, 30, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 80, 80, 0.4)', alignItems: 'center' },
  sosBtnIcon: { fontSize: 24, marginBottom: 6 },
  sosBtnLabel: { color: '#ff8888', fontSize: 12, fontWeight: 'bold' },
  weatherCard: { flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  weatherEmoji: { fontSize: 40, marginRight: 16 },
  weatherInfo: { flex: 1 },
  weatherTemp: { color: '#00ffff', fontSize: 24, fontWeight: 'bold' },
  weatherCondition: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 14 },
  weatherWind: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  alertsCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  alertsTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  noAlerts: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  alertIcon: { fontSize: 16, marginRight: 8 },
  alertMsg: { color: '#ffcc88', fontSize: 13 },
  routeCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  routeTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  routeVisual: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeLine: { flex: 1, height: 3, backgroundColor: 'rgba(0, 255, 255, 0.2)' },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(0, 255, 255, 0.3)', marginHorizontal: 4 },
  routeDotActive: { backgroundColor: '#00ffff' },
  routeText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 13 },
  sosContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 300 },
  sosOverlay: { width: SCREEN_W - 60, padding: 30, borderRadius: 24, backgroundColor: 'rgba(30, 0, 0, 0.95)', borderWidth: 2, borderColor: '#ff3333', alignItems: 'center' },
  sosTitle: { color: '#ff4444', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  sosCount: { color: '#ff6666', fontSize: 72, fontWeight: 'bold', marginBottom: 8 },
  sosText: { color: 'rgba(255, 100, 100, 0.8)', fontSize: 14, marginBottom: 20 },
  sosCancel: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  sosCancelText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default BikeMode;
