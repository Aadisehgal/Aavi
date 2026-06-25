// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/DevMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { DevBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const DevMode = ({ isActive, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState({ used: 120, total: 512 });
  const [cpu, setCpu] = useState(15);
  const [networkRequests, setNetworkRequests] = useState(0);
  const [testFeatures, setTestFeatures] = useState([
    { id: 'mock', name: 'Mock Data', enabled: false },
    { id: 'crash', name: 'Crash Test', enabled: false },
    { id: 'slow', name: 'Slow Network', enabled: false },
    { id: 'leak', name: 'Memory Leak Sim', enabled: false },
  ]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [logLevel, setLogLevel] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      // Simulate logs
      const sampleLogs = [
        { level: 'info', time: '10:00:01', msg: 'App initialized' },
        { level: 'debug', time: '10:00:02', msg: 'Loading config...' },
        { level: 'info', time: '10:00:03', msg: 'Config loaded' },
        { level: 'warn', time: '10:00:04', msg: 'Deprecated API usage' },
        { level: 'error', time: '10:00:05', msg: 'Network timeout' },
      ];
      setLogs(sampleLogs);
      statsIntervalRef.current = setInterval(() => {
        setFps(Math.floor(55 + Math.random() * 10));
        setMemory({ used: 100 + Math.floor(Math.random() * 50), total: 512 });
        setCpu(Math.floor(10 + Math.random() * 30));
        setNetworkRequests(prev => prev + Math.floor(Math.random() * 3));
      }, 1000);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    }
    return () => { if (statsIntervalRef.current) clearInterval(statsIntervalRef.current); };
  }, [isActive]);

  const toggleFeature = (id) => { setTestFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)); };
  const clearLogs = () => setLogs([]);
  const addLog = (level, msg) => setLogs(prev => [{ level, time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 100));

  const getLogColor = (level) => { switch (level) { case 'error': return '#ff4444'; case 'warn': return '#ffaa00'; case 'debug': return '#66aaff'; default: return '#00ff88'; } };

  const renderStats = () => (
    <View style={styles.statsCard}>
      <View style={styles.statGrid}>
        <View style={styles.statBox}><Text style={styles.statValue}>{fps}</Text><Text style={styles.statLabel}>FPS</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{memory.used}</Text><Text style={styles.statLabel}>MB Used</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{cpu}%</Text><Text style={styles.statLabel}>CPU</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{networkRequests}</Text><Text style={styles.statLabel}>Requests</Text></View>
      </View>
    </View>
  );

  const renderTestFeatures = () => (
    <View style={styles.featuresCard}>
      <Text style={styles.cardTitle}>Test Features</Text>
      {testFeatures.map((f) => (
        <View key={f.id} style={styles.featureRow}>
          <Text style={styles.featureName}>{f.name}</Text>
          <TouchableOpacity style={[styles.featureToggle, f.enabled && styles.featureToggleActive]} onPress={() => toggleFeature(f.id)}>
            <Text style={styles.featureToggleText}>{f.enabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderConsole = () => (
    <View style={styles.consoleCard}>
      <View style={styles.consoleHeader}>
        <Text style={styles.cardTitle}>Console</Text>
        <View style={styles.consoleActions}>
          {['all', 'info', 'warn', 'error'].map((l) => (
            <TouchableOpacity key={l} style={[styles.levelBtn, logLevel === l && styles.levelBtnActive]} onPress={() => setLogLevel(l)}>
              <Text style={styles.levelText}>{l}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearBtn} onPress={clearLogs}><Text style={styles.clearText}>Clear</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.logContainer}>
        {logs.filter(l => logLevel === 'all' || l.level === logLevel).map((log, i) => (
          <View key={i} style={styles.logRow}>
            <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>{log.level.toUpperCase()}</Text>
            <Text style={styles.logTime}>{log.time}</Text>
            <Text style={styles.logMsg}>{log.msg}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsCard}>
      <Text style={styles.cardTitle}>Debug Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => addLog('info', 'Manual log entry')}><Text style={styles.actionText}>Log Test</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => addLog('error', 'Simulated error')}><Text style={styles.actionText}>Sim Error</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setMemory(prev => ({ ...prev, used: prev.used + 50 })); }}><Text style={styles.actionText}>Alloc Mem</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setNetworkRequests(0)}><Text style={styles.actionText}>Reset Net</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐛 Dev Mode</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStats()}{renderTestFeatures()}{renderConsole()}{renderActions()}
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
  statsCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: (SCREEN_W - 56) / 2, padding: 14, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)', alignItems: 'center' },
  statValue: { color: '#00ffcc', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 4 },
  featuresCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  featureName: { color: '#ccffff', fontSize: 13 },
  featureToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  featureToggleActive: { backgroundColor: 'rgba(0, 255, 100, 0.15)', borderColor: 'rgba(0, 255, 100, 0.3)' },
  featureToggleText: { color: '#ccffff', fontSize: 11 },
  consoleCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  consoleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  consoleActions: { flexDirection: 'row', gap: 6 },
  levelBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  levelBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  levelText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 10 },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255, 100, 100, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)', marginLeft: 6 },
  clearText: { color: '#ff8888', fontSize: 10 },
  logContainer: { maxHeight: 200 },
  logRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.03)' },
  logLevel: { fontSize: 9, fontWeight: 'bold', width: 40 },
  logTime: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 9, width: 60 },
  logMsg: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 11, flex: 1 },
  actionsCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { width: (SCREEN_W - 56) / 2, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  actionText: { color: '#ccffff', fontSize: 12 },
});

export default DevMode;
