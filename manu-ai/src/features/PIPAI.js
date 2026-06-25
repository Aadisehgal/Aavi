// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/PIPAI.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { PIPAIModule } = NativeModules;
const pipEmitter = PIPAIModule ? new NativeEventEmitter(PIPAIModule) : null;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PIP_WIDTH = 180;
const PIP_HEIGHT = 120;

export default function PIPAI({ videoComponent, chatComponent }) {
  const [pipMode, setPipMode] = useState(false);
  const [activeApps, setActiveApps] = useState([]);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - PIP_WIDTH - 20, y: 100 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    PIPAIModule?.startMonitoring?.().catch(() => {});
    const sub1 = pipEmitter?.addListener('onAppSwitch', (data) => {
      setActiveApps((prev) => {
        const updated = [...prev, data.packageName].slice(-5);
        checkPIPTrigger(updated, data.packageName);
        return updated;
      });
    });

    const sub2 = pipEmitter?.addListener('onVideoDetected', () => {
      activatePIP();
    });

    return () => {
      sub1?.remove();
      sub2?.remove();
    };
  }, []);

  const checkPIPTrigger = (apps, currentApp) => {
    const videoApps = ['com.youtube.android', 'com.netflix.mediaclient', 'com.spotify.music'];
    const chatApps = ['com.whatsapp', 'com.instagram.android', 'com.telegram.messenger'];
    const hasVideo = apps.some((a) => videoApps.includes(a));
    const hasChat = chatApps.includes(currentApp);
    if (hasVideo && hasChat && !pipMode) {
      activatePIP();
    }
  };

  const activatePIP = () => {
    setPipMode(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const deactivatePIP = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setPipMode(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const finalX = pan.x._value + gesture.dx;
        const finalY = pan.y._value + gesture.dy;
        const snapX = finalX < SCREEN_W / 2 ? 20 : SCREEN_W - PIP_WIDTH - 20;
        Animated.spring(pan, {
          toValue: { x: snapX, y: Math.max(50, Math.min(finalY, SCREEN_H - 200)) },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  if (!pipMode) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.pipContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.pipTitle}>PIP</Text>
        <TouchableOpacity onPress={deactivatePIP}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {videoComponent}
      </View>
      <View style={styles.chatOverlay}>
        {chatComponent}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    backgroundColor: 'rgba(10,10,20,0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    overflow: 'hidden',
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pipTitle: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  close: {
    color: '#FF0055',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
