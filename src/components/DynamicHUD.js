// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/components/DynamicHUD.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const HUD_STATES = {
  IDLE: { height: 40, color: '#00F0FF' },
  VOICE: { height: 80, color: '#00FF88' },
  ALERT: { height: 60, color: '#FF0055' },
  NAVIGATION: { height: 50, color: '#FFAA00' },
};

export default function DynamicHUD() {
  const [hudState, setHudState] = useState('IDLE');
  const [content, setContent] = useState({ title: '', subtitle: '' });
  const heightAnim = useRef(new Animated.Value(HUD_STATES.IDLE.height)).current;
  const widthAnim = useRef(new Animated.Value(200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    const interval = setInterval(() => {
      const states = Object.keys(HUD_STATES);
      const randomState = states[Math.floor(Math.random() * states.length)];
      const stateConfig = HUD_STATES[randomState];

      setHudState(randomState);
      setContent(generateContent(randomState));

      Animated.parallel([
        Animated.spring(heightAnim, { toValue: stateConfig.height, friction: 6, useNativeDriver: false }),
        Animated.spring(widthAnim, {
          toValue: randomState === 'IDLE' ? 200 : SCREEN_W - 40,
          friction: 6,
          useNativeDriver: false,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateContent = (state) => {
    switch (state) {
      case 'VOICE':
        return { title: 'Listening...', subtitle: 'Say a command' };
      case 'ALERT':
        return { title: 'Notification', subtitle: 'New message received' };
      case 'NAVIGATION':
        return { title: 'Navigating', subtitle: 'Turn left in 200m' };
      default:
        return { title: 'MANU', subtitle: 'System Active' };
    }
  };

  const stateConfig = HUD_STATES[hudState];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: heightAnim,
          width: widthAnim,
          borderColor: stateConfig.color,
          shadowColor: stateConfig.color,
          shadowOpacity: glowAnim,
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={[styles.indicator, { backgroundColor: stateConfig.color }]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: stateConfig.color }]}>{content.title}</Text>
          {hudState !== 'IDLE' && (
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.expandBtn}>
          <Text style={[styles.expandText, { color: stateConfig.color }]}>▾</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,20,0.95)',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    zIndex: 99999,
    elevation: 99999,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 11,
    marginTop: 2,
  },
  expandBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandText: {
    fontSize: 12,
  },
});
