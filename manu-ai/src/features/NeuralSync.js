// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/NeuralSync.js
// Generated: 2026-06-24

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { NeuralSyncModule } = NativeModules;
const neuralSyncEmitter = NeuralSyncModule ? new NativeEventEmitter(NeuralSyncModule) : null;

const STORAGE_KEY = '@manu_neural_voice_patterns';

export default function NeuralSync() {
  const [isListening, setIsListening] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [syncLevel, setSyncLevel] = useState(0);
  const [lastCommand, setLastCommand] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    loadPatterns();
    startPulseAnimation();
    return () => {
      stopListening();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const loadPatterns = async () => {
    try {
      if (global.StorageBridge) {
        const data = await global.StorageBridge.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          setPatterns(parsed);
          setSyncLevel(Math.min(parsed.length * 10, 100));
        }
      }
    } catch (e) {
      console.warn('NeuralSync load error:', e);
    }
  };

  const savePatterns = async (newPatterns) => {
    try {
      if (global.StorageBridge) {
        await global.StorageBridge.setItem(STORAGE_KEY, JSON.stringify(newPatterns));
      }
    } catch (e) {
      console.warn('NeuralSync save error:', e);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const startListening = async () => {
    if (isListening) return;
    setIsListening(true);

    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        analyzeVoice();
      } else if (NeuralSyncModule) {
        NeuralSyncModule.startVoiceSync();
        neuralSyncEmitter?.addListener('onVoicePattern', handleVoicePattern);
      }
    } catch (e) {
      console.warn('NeuralSync start error:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (NeuralSyncModule) {
      NeuralSyncModule.stopVoiceSync();
      neuralSyncEmitter?.removeAllListeners('onVoicePattern');
    }
  };

  const analyzeVoice = useCallback(() => {
    if (!isListening || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    let peakIndex = 0;
    let peakValue = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
      if (dataArray[i] > peakValue) {
        peakValue = dataArray[i];
        peakIndex = i;
      }
    }
    const avg = sum / dataArray.length;
    const dominantFreq = (peakIndex * analyser.context.sampleRate) / analyser.fftSize;

    if (avg > 30) {
      const pattern = {
        timestamp: Date.now(),
        frequency: Math.round(dominantFreq),
        amplitude: Math.round(avg),
        peakFreq: Math.round(peakValue),
      };
      handleVoicePattern(pattern);
    }

    rafRef.current = requestAnimationFrame(analyzeVoice);
  }, [isListening]);

  const handleVoicePattern = (pattern) => {
    setPatterns((prev) => {
      const updated = [...prev, pattern].slice(-50);
      savePatterns(updated);
      setSyncLevel(Math.min(updated.length * 2, 100));
      return updated;
    });

    const command = detectCommand(pattern);
    if (command) {
      setLastCommand(command);
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  const detectCommand = (pattern) => {
    if (pattern.amplitude > 120) return 'LOUD_COMMAND';
    if (pattern.frequency > 800) return 'HIGH_PITCH';
    if (pattern.frequency < 300) return 'LOW_PITCH';
    return null;
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.orb,
          {
            transform: [{ scale: pulseAnim }, { rotate: rotateInterpolate }],
            borderColor: isListening ? '#00FF88' : '#00F0FF',
            shadowColor: isListening ? '#00FF88' : '#00F0FF',
          },
        ]}
      >
        <Text style={styles.orbText}>{syncLevel}%</Text>
      </Animated.View>

      <Text style={styles.title}>Neural Voice Sync</Text>
      <Text style={styles.subtitle}>
        {isListening ? 'Listening...' : 'Tap to sync voice patterns'}
      </Text>

      {lastCommand ? (
        <View style={styles.commandBox}>
          <Text style={styles.commandText}>Last: {lastCommand}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: isListening ? '#FF0055' : '#00F0FF' }]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? 'Stop Sync' : 'Start Sync'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.patternsText}>Patterns stored: {patterns.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 24,
  },
  orbText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 20,
  },
  commandBox: {
    backgroundColor: 'rgba(0,255,136,0.1)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  commandText: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 16,
  },
  buttonText: {
    color: '#0A0A0F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patternsText: {
    color: '#666666',
    fontSize: 12,
  },
});
