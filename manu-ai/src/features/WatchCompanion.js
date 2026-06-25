// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/WatchCompanion.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView,
  NativeModules, NativeEventEmitter, Platform,
} from 'react-native';

const { WatchBridge } = NativeModules;
const watchEmitter = WatchBridge ? new NativeEventEmitter(WatchBridge) : null;

const WatchCompanion = ({ isActive, onClose }) => {
  const [watchConnected, setWatchConnected] = useState(false);
  const [watchBattery, setWatchBattery] = useState(0);
  const [watchModel, setWatchModel] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [notifications, setNotifications] = useState([]);
  const [remoteActions, setRemoteActions] = useState([]);
  const [healthData, setHealthData] = useState({ steps: 0, heartRate: 0, calories: 0, distance: 0 });
  const [quickReplies, setQuickReplies] = useState(['On my way', 'Running late', 'Call you back', 'In a meeting', 'Yes', 'No']);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      checkWatchConnection(); startHealthSync();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopHealthSync();
    }
    return () => stopHealthSync();
  }, [isActive]);

  const checkWatchConnection = async () => {
    try {
      if (WatchBridge) {
        const connected = await WatchBridge.isWatchConnected();
        setWatchConnected(connected);
        if (connected) {
          const info = await WatchBridge.getWatchInfo();
          setWatchModel(info.model || 'WearOS Device'); setWatchBattery(info.battery || 0);
        }
      } else {
        setTimeout(() => { setWatchConnected(true); setWatchModel('Galaxy Watch 6'); setWatchBattery(78); }, 1000);
      }
    } catch (e) { setWatchConnected(false); }
  };

  const startHealthSync = () => {
    syncIntervalRef.current = setInterval(() => {
      setHealthData(prev => ({
        steps: prev.steps + Math.floor(Math.random() * 10),
        heartRate: 60 + Math.floor(Math.random() * 40),
        calories: prev.calories + Math.floor(Math.random() * 3),
        distance: prev.distance + (Math.random() * 0.01),
      }));
      setSyncStatus('syncing'); setTimeout(() => setSyncStatus('idle'), 500);
    }, 3000);
  };

  const stopHealthSync = () => { if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; } };

  const sendRemoteCommand = async (command) => {
    try {
      setSyncStatus('sending');
      if (WatchBridge) await WatchBridge.sendCommand(command);
      setRemoteActions(prev => [{ id: Date.now(), command, timestamp: new Date().toLocaleTimeString(), status: 'sent' }, ...prev].slice(0, 20));
      setSyncStatus('idle');
    } catch (e) { setSyncStatus('error'); }
  };

  const pushNotification = async (title, body) => {
    try {
      if (WatchBridge) await WatchBridge.sendNotification({ title, body });
      setNotifications(prev => [{ id: Date.now(), title, body, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    } catch (e) {}
  };

  const renderConnectionStatus = () => (
    <View style={styles.connectionCard}>
      <Animated.View style={[styles.connectionDot, { transform: [{ scale: pulseAnim }], backgroundColor: watchConnected ? '#00ff88' : '#ff4444' }]} />
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionTitle}>{watchConnected ? 'Watch Connected' : 'No Watch Found'}</Text>
        {watchConnected && (<><Text style={styles.connectionDetail}>{watchModel}</Text><Text style={styles.connectionDetail}>Battery: {watchBattery}%</Text></>)}
      </View>
      <TouchableOpacity style={styles.refreshBtn} onPress={checkWatchConnection}><Text style={styles.refreshText}>↻</Text></TouchableOpacity>
    </View>
  );

  const renderHealthCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Health Sync</Text>
      <View style={styles.healthGrid}>
        <View style={styles.healthItem}><Text style={styles.healthValue}>{healthData.steps.toLocaleString()}</Text><Text style={styles.healthLabel}>Steps</Text></View>
        <View style={styles.healthItem}><Text style={styles.healthValue}>{healthData.heartRate}</Text><Text style={styles.healthLabel}>BPM</Text></View>
        <View style={styles.healthItem}><Text style={styles.healthValue}>{healthData.calories}</Text><Text style={styles.healthLabel}>Kcal</Text></View>
        <View style={styles.healthItem}><Text style={styles.healthValue}>{healthData.distance.toFixed(2)}</Text><Text style={styles.healthLabel}>km</Text></View>
      </View>
      <View style={styles.syncBar}><View style={[styles.syncIndicator, { opacity: syncStatus === 'syncing' ? 1 : 0.3 }]} /><Text style={styles.syncText}>Sync: {syncStatus}</Text></View>
    </View>
  );

  const renderRemoteControls = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Remote Controls</Text>
      <View style={styles.remoteGrid}>
        {['Find Phone', 'Camera Shutter', 'Music Play', 'Music Next', 'Voice Cmd', 'SOS'].map((cmd) => (
          <TouchableOpacity key={cmd} style={styles.remoteBtn} onPress={() => sendRemoteCommand(cmd)}><Text style={styles.remoteBtnText}>{cmd}</Text></TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuickReplies = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Quick Replies</Text>
      <View style={styles.replyList}>
        {quickReplies.map((reply) => (
          <TouchableOpacity key={reply} style={styles.replyBtn} onPress={() => pushNotification('Quick Reply', reply)}><Text style={styles.replyText}>{reply}</Text></TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderActionLog = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Action Log</Text>
      <ScrollView style={styles.logScroll} showsVerticalScrollIndicator={false}>
        {remoteActions.length === 0 ? <Text style={styles.emptyText}>No actions sent yet</Text> : remoteActions.map((action) => (
          <View key={action.id} style={styles.logItem}><Text style={styles.logTime}>{action.timestamp}</Text><Text style={styles.logCommand}>{action.command}</Text><Text style={styles.logStatus}>{action.status}</Text></View>
        ))}
      </ScrollView>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⌚ Watch Companion</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderConnectionStatus()}
        {watchConnected && (<>{renderHealthCard()}{renderRemoteControls()}{renderQuickReplies()}{renderActionLog()}</>)}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 150 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  connectionCard: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  connectionDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  connectionInfo: { flex: 1 },
  connectionTitle: { color: '#00ffff', fontSize: 15, fontWeight: 'bold' },
  connectionDetail: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  refreshText: { color: '#00ffff', fontSize: 16 },
  card: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)', marginBottom: 12 },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  healthGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  healthItem: { alignItems: 'center', flex: 1 },
  healthValue: { color: '#00ffcc', fontSize: 20, fontWeight: 'bold' },
  healthLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  syncBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0, 255, 255, 0.1)' },
  syncIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00ff88', marginRight: 8 },
  syncText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11 },
  remoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remoteBtn: { width: '30%', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 40, 80, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  remoteBtnText: { color: '#ccffff', fontSize: 11, fontWeight: '500' },
  replyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  replyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(0, 60, 100, 0.4)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  replyText: { color: '#aaddff', fontSize: 12 },
  logScroll: { maxHeight: 150 },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  logTime: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10, width: 60 },
  logCommand: { color: '#ccffff', fontSize: 12, flex: 1, textAlign: 'center' },
  logStatus: { color: '#00ff88', fontSize: 10, width: 40, textAlign: 'right' },
  emptyText: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 12, textAlign: 'center', paddingVertical: 20 },
});

export default WatchCompanion;
