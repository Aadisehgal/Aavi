// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/ParentMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { ParentBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const ParentMode = ({ isActive, onClose }) => {
  const [pinRequired, setPinRequired] = useState(true);
  const [pinEntered, setPinEntered] = useState(false);
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('1234');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [appLocks, setAppLocks] = useState([
    { id: 'youtube', name: 'YouTube', locked: true },
    { id: 'games', name: 'Games', locked: true },
    { id: 'browser', name: 'Browser', locked: false },
    { id: 'social', name: 'Social Media', locked: true },
  ]);
  const [screenTimeLimits, setScreenTimeLimits] = useState([
    { id: 'games', name: 'Games', limit: 60, used: 45 },
    { id: 'videos', name: 'Videos', limit: 90, used: 30 },
  ]);
  const [locationTracking, setLocationTracking] = useState(true);
  const [childLocation, setChildLocation] = useState({ lat: 40.7128, lng: -74.0060, address: 'Near Central Park' });
  const [activityLog, setActivityLog] = useState([
    { time: '10:00', action: 'Opened Games', app: 'Games' },
    { time: '10:30', action: 'Time limit reached', app: 'Games' },
    { time: '11:00', action: 'Opened YouTube', app: 'YouTube' },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); setPinEntered(false); setPin(''); }
  }, [isActive]);

  const handlePin = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) { setPinEntered(true); }
        else { Animated.sequence([Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }), Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }), Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })]).start(); setPin(''); }
      }
    }
  };

  const clearPin = () => setPin('');
  const toggleAppLock = (id) => { setAppLocks(prev => prev.map(app => app.id === id ? { ...app, locked: !app.locked } : app)); };

  const renderPinScreen = () => (
    <Animated.View style={[styles.pinContainer, { transform: [{ translateX: shakeAnim }] }]}>
      <Text style={styles.pinTitle}>🔒 Parent Access</Text>
      <Text style={styles.pinSub}>Enter PIN to access controls</Text>
      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((i) => (<View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />))}
      </View>
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
          <TouchableOpacity key={key} style={styles.keypadBtn} onPress={() => key === 'C' ? clearPin() : key === '⌫' ? setPin(prev => prev.slice(0, -1)) : handlePin(key)}>
            <Text style={styles.keypadText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderControls = () => (
    <>
      <View style={styles.overrideCard}>
        <Text style={styles.cardTitle}>Master Override</Text>
        <TouchableOpacity style={[styles.overrideBtn, overrideEnabled && styles.overrideBtnActive]} onPress={() => setOverrideEnabled(!overrideEnabled)}>
          <Text style={styles.overrideText}>{overrideEnabled ? '🔓 Override Active' : '🔒 Override Disabled'}</Text>
        </TouchableOpacity>
        <Text style={styles.overrideSub}>When active, parent controls override all child settings</Text>
      </View>

      <View style={styles.appsCard}>
        <Text style={styles.cardTitle}>App Locks</Text>
        {appLocks.map((app) => (
          <View key={app.id} style={styles.appRow}>
            <Text style={styles.appName}>{app.name}</Text>
            <TouchableOpacity style={[styles.appToggle, app.locked && styles.appToggleLocked]} onPress={() => toggleAppLock(app.id)}>
              <Text style={styles.appToggleText}>{app.locked ? '🔒 Locked' : '🔓 Open'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.timeCard}>
        <Text style={styles.cardTitle}>Screen Time Limits</Text>
        {screenTimeLimits.map((item) => (
          <View key={item.id} style={styles.timeRow}>
            <Text style={styles.timeName}>{item.name}</Text>
            <View style={styles.timeBar}><View style={[styles.timeFill, { width: `${Math.min(100, (item.used / item.limit) * 100)}%`, backgroundColor: item.used > item.limit ? '#ff4444' : '#00ff88' }]} /></View>
            <Text style={styles.timeText}>{item.used}/{item.limit}m</Text>
          </View>
        ))}
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.cardTitle}>Location</Text>
        <View style={styles.locationRow}>
          <Text style={styles.locationEmoji}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationAddress}>{childLocation.address}</Text>
            <Text style={styles.locationCoords}>{childLocation.lat.toFixed(4)}, {childLocation.lng.toFixed(4)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.locationToggle, locationTracking && styles.locationToggleActive]} onPress={() => setLocationTracking(!locationTracking)}>
          <Text style={styles.locationToggleText}>{locationTracking ? 'Tracking ON' : 'Tracking OFF'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Activity Log</Text>
        {activityLog.map((log, i) => (
          <View key={i} style={styles.logRow}>
            <Text style={styles.logTime}>{log.time}</Text>
            <Text style={styles.logAction}>{log.action}</Text>
            <Text style={styles.logApp}>{log.app}</Text>
          </View>
        ))}
      </View>
    </>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧 Parent Mode</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!pinEntered ? renderPinScreen() : renderControls()}
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
  pinContainer: { alignItems: 'center', paddingVertical: 40 },
  pinTitle: { color: '#00ffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  pinSub: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 13, marginBottom: 24 },
  pinDots: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0, 255, 255, 0.3)' },
  pinDotFilled: { backgroundColor: '#00ffff', borderColor: '#00ffff' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center' },
  keypadBtn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', margin: 5, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  keypadText: { color: '#00ffff', fontSize: 22, fontWeight: '600' },
  overrideCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  overrideBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  overrideBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  overrideText: { color: '#ccffff', fontSize: 15, fontWeight: '600' },
  overrideSub: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 11, marginTop: 8, textAlign: 'center' },
  appsCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  appName: { color: '#ccffff', fontSize: 14 },
  appToggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  appToggleLocked: { backgroundColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.3)' },
  appToggleText: { color: '#ccffff', fontSize: 11 },
  timeCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  timeName: { color: '#ccffff', fontSize: 13, width: 80 },
  timeBar: { flex: 1, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  timeFill: { height: '100%', borderRadius: 3 },
  timeText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, width: 60, textAlign: 'right' },
  locationCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationEmoji: { fontSize: 24, marginRight: 12 },
  locationInfo: { flex: 1 },
  locationAddress: { color: '#ccffff', fontSize: 14 },
  locationCoords: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 2 },
  locationToggle: { paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  locationToggleActive: { backgroundColor: 'rgba(0, 255, 100, 0.15)', borderColor: 'rgba(0, 255, 100, 0.3)' },
  locationToggleText: { color: '#ccffff', fontSize: 12 },
  logCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  logRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  logTime: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10, width: 50 },
  logAction: { color: '#ccffff', fontSize: 12, flex: 1 },
  logApp: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, width: 80, textAlign: 'right' },
});

export default ParentMode;
