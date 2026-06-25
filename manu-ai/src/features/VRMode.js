// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/VRMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity,
  ScrollView, NativeModules, DeviceEventEmitter,
} from 'react-native';

const { SpatialAudio } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const EYE_WIDTH = SCREEN_W / 2;

const VRMode = ({ isActive, onClose, content }) => {
  const [vrReady, setVrReady] = useState(false);
  const [ipdOffset, setIpdOffset] = useState(0);
  const [lensDistortion, setLensDistortion] = useState(0.5);
  const [fov, setFov] = useState(90);
  const [headTracking, setHeadTracking] = useState(false);
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [selectedMenu, setSelectedMenu] = useState('main');
  const [vrMenus] = useState({
    main: ['Dashboard', 'Media', 'Navigation', 'Settings', 'Exit VR'],
    media: ['Movies', 'Photos', 'Music', '360 Videos', 'Back'],
    navigation: ['Map', 'Directions', 'POI Search', 'Back'],
    settings: ['IPD', 'Distortion', 'FOV', 'Tracking', 'Back'],
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const gyroIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      setTimeout(() => setVrReady(true), 1500);
      gyroIntervalRef.current = setInterval(() => {
        setGyroData({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 0.5 });
      }, 100);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      setVrReady(false);
    }
    return () => { if (gyroIntervalRef.current) clearInterval(gyroIntervalRef.current); };
  }, [isActive]);

  const handleMenuSelect = (item) => {
    if (item === 'Exit VR') { onClose(); return; }
    if (item === 'Back') { setSelectedMenu('main'); return; }
    if (['Dashboard', 'Media', 'Navigation', 'Settings'].includes(item)) {
      setSelectedMenu(item.toLowerCase());
    }
  };

  const renderEyeView = (isLeft) => {
    const offset = isLeft ? -ipdOffset : ipdOffset;
    const menuItems = vrMenus[selectedMenu] || vrMenus.main;
    return (
      <View style={[styles.eyeContainer, { transform: [{ translateX: offset }] }]}>
        <View style={styles.eyeInner}>
          <View style={styles.lensOverlay} pointerEvents="none">
            <View style={[styles.lensVignette, { opacity: lensDistortion * 0.4 }]} />
          </View>
          <View style={styles.contentArea}>
            {!vrReady ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={[styles.loadingRing, {
                  transform: [{ rotate: menuAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }]
                }]} />
                <Text style={styles.loadingText}>Initializing VR...</Text>
                <Text style={styles.loadingSub}>Insert phone into headset</Text>
              </View>
            ) : (
              <>
                {headTracking && (
                  <View style={styles.gyroIndicator}>
                    <Text style={styles.gyroText}>X:{gyroData.x.toFixed(1)} Y:{gyroData.y.toFixed(1)}</Text>
                  </View>
                )}
                <View style={styles.vrHeader}>
                  <Text style={styles.vrTitle}>MANU AI VR</Text>
                  <Text style={styles.vrSubtitle}>{isLeft ? 'LEFT EYE' : 'RIGHT EYE'}</Text>
                </View>
                <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                  {menuItems.map((item) => (
                    <TouchableOpacity key={item} style={styles.menuItem} onPress={() => handleMenuSelect(item)}>
                      <Text style={styles.menuItemText}>{item}</Text>
                      <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.vrStatusBar}>
                  <Text style={styles.vrStatusText}>FOV: {fov}°</Text>
                  <Text style={styles.vrStatusText}>IPD: {ipdOffset}mm</Text>
                  <Text style={styles.vrStatusText}>BAT: 85%</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.centerMarker} pointerEvents="none"><View style={styles.centerDot} /></View>
        </View>
      </View>
    );
  };

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.stereoContainer}>
        {renderEyeView(true)}<View style={styles.divider} />{renderEyeView(false)}
      </View>
      <TouchableOpacity style={styles.exitBtn} onPress={onClose}><Text style={styles.exitText}>EXIT VR</Text></TouchableOpacity>
      <View style={styles.setupHints}>
        <Text style={styles.hintText}>📱 Place phone in Cardboard/VR headset</Text>
        <Text style={styles.hintText}>👆 Use gaze to select items</Text>
        <Text style={styles.hintText}>🔊 Spatial audio enabled</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000510', zIndex: 200 },
  stereoContainer: { flex: 1, flexDirection: 'row' },
  eyeContainer: { width: EYE_WIDTH, height: SCREEN_H, overflow: 'hidden' },
  eyeInner: { flex: 1, margin: 8, borderRadius: 16, backgroundColor: '#000a1a', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)', overflow: 'hidden' },
  divider: { width: 2, backgroundColor: 'rgba(0, 255, 255, 0.2)' },
  lensOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  lensVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'radial-gradient(circle, transparent 40%, black 100%)' },
  contentArea: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: '#00ffff', borderTopColor: 'transparent', marginBottom: 20 },
  loadingText: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' },
  loadingSub: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 8 },
  gyroIndicator: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)' },
  gyroText: { color: '#00ffff', fontSize: 10, fontFamily: 'monospace' },
  vrHeader: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  vrTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },
  vrSubtitle: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10, marginTop: 4, letterSpacing: 2 },
  menuScroll: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.4)', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.1)' },
  menuItemText: { color: '#ccffff', fontSize: 14, fontWeight: '500' },
  menuArrow: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 18 },
  vrStatusBar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0, 255, 255, 0.1)' },
  vrStatusText: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 10 },
  centerMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -4, marginTop: -4 },
  centerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0, 255, 255, 0.3)' },
  exitBtn: { position: 'absolute', top: 48, left: SCREEN_W / 2 - 50, width: 100, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255, 50, 50, 0.3)', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.4)', alignItems: 'center' },
  exitText: { color: '#ff8888', fontSize: 12, fontWeight: 'bold' },
  setupHints: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 11, marginVertical: 2 },
});

export default VRMode;
