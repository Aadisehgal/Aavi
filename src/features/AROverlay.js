// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/AROverlay.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity,
  ScrollView, CameraRoll, Platform, NativeModules, DeviceEventEmitter,
} from 'react-native';

const { SpatialAudio } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const AROverlay = ({ isActive, onClose, cameraRef }) => {
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [arMode, setArMode] = useState('info');
  const [scanProgress, setScanProgress] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [flashlight, setFlashlight] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef({}).current;
  const scanIntervalRef = useRef(null);

  const OBJECT_DB = {
    'person': { label: 'Person', distance: '2.4m', info: 'Human detected. Heart rate estimate: 72 bpm.' },
    'car': { label: 'Vehicle', distance: '8.5m', info: 'Four-door sedan. License plate obscured.' },
    'dog': { label: 'Dog', distance: '4.1m', info: 'Medium-sized canine. Breed: Labrador mix.' },
    'cat': { label: 'Cat', distance: '3.2m', info: 'Domestic cat. Appears relaxed.' },
    'chair': { label: 'Chair', distance: '1.5m', info: 'Standard office chair. Ergonomic rating: 7/10.' },
    'laptop': { label: 'Laptop', distance: '0.8m', info: 'Computing device. Battery level unknown.' },
    'bottle': { label: 'Bottle', distance: '1.2m', info: 'Plastic bottle. Capacity: 500ml.' },
    'book': { label: 'Book', distance: '0.6m', info: 'Printed book. Language: English.' },
  };

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      startSimulation();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      stopSimulation();
    }
    return () => stopSimulation();
  }, [isActive]);

  const startSimulation = () => {
    const objectKeys = Object.keys(OBJECT_DB);
    let progress = 0;
    scanIntervalRef.current = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      if (progress >= 100) {
        progress = 0;
        const count = Math.floor(Math.random() * 3) + 1;
        const newObjects = [];
        for (let i = 0; i < count; i++) {
          const key = objectKeys[Math.floor(Math.random() * objectKeys.length)];
          const dbEntry = OBJECT_DB[key];
          const id = `${key}_${Date.now()}_${i}`;
          newObjects.push({
            id, type: key, ...dbEntry,
            x: Math.random() * (SCREEN_W - 120) + 60,
            y: Math.random() * (SCREEN_H - 300) + 100,
            confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
          });
          pulseAnims[id] = new Animated.Value(1);
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnims[id], { toValue: 1.3, duration: 800, useNativeDriver: true }),
              Animated.timing(pulseAnims[id], { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
          ).start();
        }
        setDetectedObjects(newObjects);
      }
      Animated.timing(scanAnim, { toValue: progress / 100, duration: 100, useNativeDriver: true }).start();
    }, 200);
  };

  const stopSimulation = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setDetectedObjects([]); setScanProgress(0);
  };

  const handleObjectPress = useCallback((obj) => {
    setSelectedObject(selectedObject?.id === obj.id ? null : obj);
    if (SpatialAudio) SpatialAudio.hapticDirection(0).catch(() => {});
  }, [selectedObject]);

  const takeSnapshot = async () => {
    const snapshot = {
      id: Date.now().toString(), timestamp: new Date().toISOString(),
      objects: detectedObjects.length, mode: arMode,
    };
    setSavedSnapshots(prev => [snapshot, ...prev].slice(0, 20));
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    for (let i = 1; i < 4; i++) {
      lines.push(<View key={`v${i}`} style={[styles.gridLine, { left: (SCREEN_W / 4) * i }]} />);
      lines.push(<View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: (SCREEN_H / 4) * i }]} />);
    }
    return <View style={StyleSheet.absoluteFill}>{lines}</View>;
  };

  const renderCrosshair = () => (
    <View style={styles.crosshairContainer} pointerEvents="none">
      <View style={styles.crosshairH} /><View style={styles.crosshairV} /><View style={styles.crosshairCenter} />
    </View>
  );

  const renderScanLine = () => (
    <Animated.View style={[styles.scanLine, {
      transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_H] }) }]
    }]} pointerEvents="none" />
  );

  const renderObjectMarkers = () => detectedObjects.map((obj) => (
    <TouchableOpacity key={obj.id} activeOpacity={0.8} onPress={() => handleObjectPress(obj)}
      style={[styles.objectMarker, { left: obj.x - 40, top: obj.y - 40 }]}>
      <Animated.View style={[styles.markerPulse, { transform: [{ scale: pulseAnims[obj.id] || new Animated.Value(1) }] }]} />
      <View style={styles.markerDot}>
        <Text style={styles.markerLabel}>{obj.label}</Text>
        <Text style={styles.markerConfidence}>{(obj.confidence * 100).toFixed(0)}%</Text>
      </View>
      {selectedObject?.id === obj.id && (
        <View style={styles.objectInfoCard}>
          <Text style={styles.infoTitle}>{obj.label}</Text>
          <Text style={styles.infoDistance}>Distance: {obj.distance}</Text>
          <Text style={styles.infoText}>{obj.info}</Text>
          <Text style={styles.infoConfidence}>Confidence: {obj.confidence}</Text>
        </View>
      )}
    </TouchableOpacity>
  ));

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.modeSelector}>
        {['info', 'scan', 'measure', 'translate'].map((mode) => (
          <TouchableOpacity key={mode} style={[styles.modeBtn, arMode === mode && styles.modeBtnActive]}
            onPress={() => setArMode(mode)}>
            <Text style={[styles.modeBtnText, arMode === mode && styles.modeBtnTextActive]}>{mode.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setFlashlight(!flashlight)}>
        <Text style={styles.iconText}>{flashlight ? '🔦' : '⚫'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setShowGrid(!showGrid)}>
        <Text style={styles.iconText}>⊞</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBottomBar = () => (
    <View style={styles.bottomBar}>
      <View style={styles.scanProgressContainer}>
        <View style={[styles.scanProgressBar, { width: `${scanProgress}%` }]} />
      </View>
      <Text style={styles.statusText}>{detectedObjects.length} objects detected | Mode: {arMode}</Text>
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={takeSnapshot}>
          <Text style={styles.actionBtnText}>📷 Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setDetectedObjects([])}>
          <Text style={styles.actionBtnText}>🔄 Clear</Text>
        </TouchableOpacity>
      </View>
      {savedSnapshots.length > 0 && (
        <ScrollView horizontal style={styles.snapshotStrip} showsHorizontalScrollIndicator={false}>
          {savedSnapshots.map((snap) => (
            <View key={snap.id} style={styles.snapshotThumb}>
              <Text style={styles.snapshotText}>{snap.objects} obj</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {renderGrid()}{renderCrosshair()}{renderScanLine()}{renderObjectMarkers()}{renderTopBar()}{renderBottomBar()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 100 },
  gridLine: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'rgba(0, 255, 255, 0.15)' },
  gridLineH: { width: '100%', height: 1 },
  crosshairContainer: { position: 'absolute', left: SCREEN_W / 2 - 30, top: SCREEN_H / 2 - 30, width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  crosshairH: { position: 'absolute', width: 40, height: 1, backgroundColor: 'rgba(0, 255, 255, 0.6)' },
  crosshairV: { position: 'absolute', width: 1, height: 40, backgroundColor: 'rgba(0, 255, 255, 0.6)' },
  crosshairCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0, 255, 255, 0.8)' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(0, 255, 255, 0.5)', shadowColor: '#00ffff', shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, shadowOpacity: 0.8 },
  objectMarker: { position: 'absolute', width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  markerPulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(0, 255, 255, 0.4)' },
  markerDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 20, 40, 0.85)', borderWidth: 2, borderColor: '#00ffff', justifyContent: 'center', alignItems: 'center' },
  markerLabel: { color: '#00ffff', fontSize: 10, fontWeight: 'bold' },
  markerConfidence: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 8 },
  objectInfoCard: { position: 'absolute', top: 50, left: -60, width: 200, backgroundColor: 'rgba(0, 15, 30, 0.95)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)', padding: 12 },
  infoTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  infoDistance: { color: '#66ccff', fontSize: 12, marginBottom: 6 },
  infoText: { color: '#aaddff', fontSize: 11, lineHeight: 16, marginBottom: 6 },
  infoConfidence: { color: 'rgba(170, 221, 255, 0.6)', fontSize: 10 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 48, paddingBottom: 12, backgroundColor: 'rgba(0, 10, 20, 0.6)' },
  modeSelector: { flexDirection: 'row', flex: 1 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 6, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  modeBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: '#00ffff' },
  modeBtnText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 10, fontWeight: '600' },
  modeBtnTextActive: { color: '#00ffff' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 30, 60, 0.6)', justifyContent: 'center', alignItems: 'center', marginLeft: 6, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  iconText: { color: '#00ffff', fontSize: 14 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.4)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16, backgroundColor: 'rgba(0, 10, 20, 0.7)' },
  scanProgressContainer: { height: 3, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  scanProgressBar: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  statusText: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bottomActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  actionBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  actionBtnText: { color: '#00ffff', fontSize: 13, fontWeight: '600' },
  snapshotStrip: { marginTop: 12, maxHeight: 50 },
  snapshotThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(0, 30, 60, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  snapshotText: { color: '#00ffff', fontSize: 9 },
});

export default AROverlay;
