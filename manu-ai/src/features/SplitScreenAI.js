// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/SplitScreenAI.js
// Generated: 2026-06-24

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { ScreenAwareness } = NativeModules;
const screenAwarenessEmitter = ScreenAwareness ? new NativeEventEmitter(ScreenAwareness) : null;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SPLIT_PAIRS = [
  { primary: 'com.whatsapp', secondary: 'com.google.android.apps.maps', reason: 'Share location while chatting' },
  { primary: 'com.youtube.android', secondary: 'com.whatsapp', reason: 'Watch and chat simultaneously' },
  { primary: 'com.chrome.android', secondary: 'com.google.android.keep', reason: 'Research and take notes' },
  { primary: 'com.spotify.music', secondary: 'com.instagram.android', reason: 'Listen while browsing' },
];

export default function SplitScreenAI() {
  const [currentApp, setCurrentApp] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    ScreenAwareness?.startTracking?.().catch(() => {});
    const subscription = screenAwarenessEmitter?.addListener('onAppChange', (data) => {
      if (data?.packageName) {
        setCurrentApp(data.packageName);
        analyzeContext(data.packageName);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const analyzeContext = useCallback((packageName) => {
    const match = SPLIT_PAIRS.find(
      (pair) => pair.primary === packageName || pair.secondary === packageName
    );
    if (match) {
      setSuggestion(match);
      showSuggestionPanel();
    } else {
      hideSuggestionPanel();
    }
  }, []);

  const showSuggestionPanel = () => {
    setShowSuggestion(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const hideSuggestionPanel = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowSuggestion(false));
  };

  const acceptSuggestion = () => {
    if (Platform.OS === 'android' && ScreenAwareness) {
      ScreenAwareness.triggerSplitScreen?.(suggestion.primary, suggestion.secondary).catch(() => {});
    }
    hideSuggestionPanel();
  };

  if (!showSuggestion || !suggestion) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.aiLabel}>🤖 AI Suggestion</Text>
        <TouchableOpacity onPress={hideSuggestionPanel}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.reason}>{suggestion.reason}</Text>
      <View style={styles.appsRow}>
        <View style={[styles.appBadge, { borderColor: '#00F0FF' }]}>
          <Text style={styles.appText}>{suggestion.primary.split('.').pop()}</Text>
        </View>
        <Text style={styles.plus}>+</Text>
        <View style={[styles.appBadge, { borderColor: '#00FF88' }]}>
          <Text style={styles.appText}>{suggestion.secondary.split('.').pop()}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.acceptBtn} onPress={acceptSuggestion}>
        <Text style={styles.acceptText}>Enable Split Screen</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15,15,30,0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    padding: 16,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiLabel: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dismiss: {
    color: '#888888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reason: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  appsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  appText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  plus: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  acceptBtn: {
    backgroundColor: 'rgba(0,255,136,0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF88',
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptText: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
