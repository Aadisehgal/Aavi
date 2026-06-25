// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/DesktopMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { DesktopBridge } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const DesktopMode = ({ isActive, onClose }) => {
  const [displayConnected, setDisplayConnected] = useState(false);
  const [displayInfo, setDisplayInfo] = useState({ width: 0, height: 0, dpi: 0 });
  const [desktopLayout, setDesktopLayout] = useState('standard');
  const [windowList, setWindowList] = useState([]);
  const [taskbarApps, setTaskbarApps] = useState([
    { id: 'browser', name: 'Browser', icon: '🌐', active: true },
    { id: 'files', name: 'Files', icon: '📁', active: false },
    { id: 'terminal', name: 'Terminal', icon: '💻', active: false },
    { id: 'media', name: 'Media', icon: '🎵', active: false },
    { id: 'settings', name: 'Settings', icon: '⚙️', active: false },
  ]);
  const [activeWindow, setActiveWindow] = useState('browser');
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, storage: 0, network: 0 });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const statsIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      checkDisplayConnection(); startStatsSimulation();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopStatsSimulation();
    }
    return () => stopStatsSimulation();
  }, [isActive]);

  const checkDisplayConnection = async () => {
    try {
      if (DesktopBridge) {
        const connected = await DesktopBridge.isExternalDisplayConnected();
        setDisplayConnected(connected);
        if (connected) { const info = await DesktopBridge.getDisplayInfo(); setDisplayInfo(info); }
      } else {
        setTimeout(() => { setDisplayConnected(true); setDisplayInfo({ width: 1920, height: 1080, dpi: 160 }); }, 800);
      }
    } catch (e) { setDisplayConnected(false); }
  };

  const startStatsSimulation = () => {
    statsIntervalRef.current = setInterval(() => {
      setSystemStats({ cpu: Math.floor(Math.random() * 40) + 10, memory: Math.floor(Math.random() * 30) + 40, storage: 68, network: Math.floor(Math.random() * 100) });
    }, 2000);
  };

  const stopStatsSimulation = () => { if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; } };

  const switchLayout = (layout) => { setDesktopLayout(layout); if (DesktopBridge) DesktopBridge.setDisplayMode(layout).catch(() => {}); };

  const launchApp = (appId) => {
    setActiveWindow(appId);
    setTaskbarApps(prev => prev.map(app => ({ ...app, active: app.id === appId })));
    setWindowList(prev => {
      const exists = prev.find(w => w.id === appId);
      if (!exists) return [...prev, { id: appId, title: appId, minimized: false }];
      return prev.map(w => w.id === appId ? { ...w, minimized: false } : w);
    });
  };

  const minimizeWindow = (appId) => { setWindowList(prev => prev.map(w => w.id === appId ? { ...w, minimized: true } : w)); };
  const closeWindow = (appId) => {
    setWindowList(prev => prev.filter(w => w.id !== appId));
    if (activeWindow === appId) { const remaining = windowList.filter(w => w.id !== appId && !w.minimized); setActiveWindow(remaining.length > 0 ? remaining[0].id : null); }
  };

  const renderDesktopArea = () => (
    <View style={styles.desktopArea}>
      <View style={styles.wallpaper}><View style={styles.wallpaperGradient} /></View>
      <View style={styles.desktopIcons}>
        {taskbarApps.map((app) => (
          <TouchableOpacity key={app.id} style={styles.desktopIcon} onPress={() => launchApp(app.id)}>
            <Text style={styles.desktopIconEmoji}>{app.icon}</Text><Text style={styles.desktopIconLabel}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {windowList.filter(w => !w.minimized).map((window) => (
        <View key={window.id} style={[styles.window, activeWindow === window.id && styles.windowActive]}>
          <View style={styles.windowTitleBar}>
            <Text style={styles.windowTitle}>{window.title}</Text>
            <View style={styles.windowControls}>
              <TouchableOpacity onPress={() => minimizeWindow(window.id)}><Text style={styles.windowControl}>─</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => closeWindow(window.id)}><Text style={[styles.windowControl, styles.windowClose]}>✕</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.windowContent}><Text style={styles.windowPlaceholder}>{window.title} content area</Text></View>
        </View>
      ))}
    </View>
  );

  const renderTaskbar = () => (
    <View style={styles.taskbar}>
      <TouchableOpacity style={styles.startBtn}><Text style={styles.startText}>◉ MANU</Text></TouchableOpacity>
      <View style={styles.taskbarApps}>
        {taskbarApps.map((app) => (
          <TouchableOpacity key={app.id} style={[styles.taskbarApp, app.active && styles.taskbarAppActive]} onPress={() => launchApp(app.id)}>
            <Text style={styles.taskbarAppIcon}>{app.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.systemTray}>
        <Text style={styles.trayText}>CPU {systemStats.cpu}%</Text>
        <Text style={styles.trayText}>MEM {systemStats.memory}%</Text>
        <Text style={styles.trayText}>{new Date().toLocaleTimeString()}</Text>
      </View>
    </View>
  );

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <Text style={styles.topBarTitle}>🖥️ Desktop Mode</Text>
      <View style={styles.layoutSwitcher}>
        {['standard', 'extended', 'mirror'].map((layout) => (
          <TouchableOpacity key={layout} style={[styles.layoutBtn, desktopLayout === layout && styles.layoutBtnActive]} onPress={() => switchLayout(layout)}>
            <Text style={[styles.layoutText, desktopLayout === layout && styles.layoutTextActive]}>{layout}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
    </View>
  );

  const renderDisplayInfo = () => (
    <View style={styles.displayInfo}>
      <Text style={styles.displayInfoText}>{displayConnected ? `External Display: ${displayInfo.width}x${displayInfo.height} @ ${displayInfo.dpi}DPI` : 'No external display detected. Connect via HDMI/USB-C.'}</Text>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {renderTopBar()}{renderDisplayInfo()}{renderDesktopArea()}{renderTaskbar()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a1a', zIndex: 200 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: 'rgba(0, 10, 30, 0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  topBarTitle: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' },
  layoutSwitcher: { flexDirection: 'row', gap: 8 },
  layoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  layoutBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  layoutText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 11 },
  layoutTextActive: { color: '#00ffff' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 14, fontWeight: 'bold' },
  displayInfo: { padding: 8, backgroundColor: 'rgba(0, 20, 50, 0.6)', alignItems: 'center' },
  displayInfoText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11 },
  desktopArea: { flex: 1, position: 'relative' },
  wallpaper: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0d0d2b' },
  wallpaperGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  desktopIcons: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 20 },
  desktopIcon: { width: 70, alignItems: 'center' },
  desktopIconEmoji: { fontSize: 32, marginBottom: 4 },
  desktopIconLabel: { color: 'rgba(200, 220, 255, 0.8)', fontSize: 11, textAlign: 'center' },
  window: { position: 'absolute', top: 60, left: 40, width: SCREEN_W - 80, height: 300, backgroundColor: 'rgba(10, 15, 35, 0.95)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', overflow: 'hidden' },
  windowActive: { borderColor: 'rgba(0, 255, 255, 0.4)', shadowColor: '#00ffff', shadowOffset: { width: 0, height: 0 }, shadowRadius: 15, shadowOpacity: 0.3 },
  windowTitleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0, 20, 50, 0.8)', borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  windowTitle: { color: '#00ffff', fontSize: 13, fontWeight: '600' },
  windowControls: { flexDirection: 'row', gap: 12 },
  windowControl: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 14 },
  windowClose: { color: '#ff6666' },
  windowContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  windowPlaceholder: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 14 },
  taskbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0, 10, 30, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0, 255, 255, 0.1)' },
  startBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  startText: { color: '#00ffff', fontSize: 12, fontWeight: 'bold' },
  taskbarApps: { flexDirection: 'row', flex: 1, marginLeft: 12, gap: 6 },
  taskbarApp: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(0, 30, 60, 0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  taskbarAppActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: 'rgba(0, 255, 255, 0.4)' },
  taskbarAppIcon: { fontSize: 18 },
  systemTray: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  trayText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 10 },
});

export default DesktopMode;
