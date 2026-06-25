import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 9/20 — 3D Avatar and Dashboard HUD Interface
// File: src/screens/DashboardScreen.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import Avatar3D from '../components/Avatar3D';
import DynamicHUD from '../components/DynamicHUD';
import VoiceVisualizer from '../components/VoiceVisualizer';
import FloatingBubble from '../components/FloatingBubble';
import BatteryPredictor from '../features/BatteryPredictor';
import ThermalManager from '../features/ThermalManager';
import NetworkAdapt from '../features/NetworkAdapt';
import SecurityMonitor from '../features/SecurityMonitor';
import MemoryHandler from '../features/MemoryHandler';
import AmbientAwareness from '../features/AmbientAwareness';
import WellnessIndex from '../features/WellnessIndex';
import SleepPredictor from '../features/SleepPredictor';
import ThreatShield from '../features/ThreatShield';
import ArmorMode from '../security/ArmorMode';
import CyberShield from '../security/CyberShield';

const { width, height } = Dimensions.get('window');

const DashboardScreen = () => {
  const [isListening, setIsListening] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emotion, setEmotion] = useState('idle');
  const [glitchActive, setGlitchActive] = useState(false);
  const [batteryInfo, setBatteryInfo] = useState({ level: 0, charging: false, eta: '' });
  const [thermalState, setThermalState] = useState('normal');
  const [networkInfo, setNetworkInfo] = useState({ type: 'unknown', strength: 0 });
  const [securityScore, setSecurityScore] = useState(100);
  const [threatCount, setThreatCount] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [wellnessScore, setWellnessScore] = useState(100);
  const [ambientMode, setAmbientMode] = useState('normal');
  const [armorActive, setArmorActive] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const glitchOffset = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;
  const floatWidget1 = useRef(new Animated.Value(0)).current;
  const floatWidget2 = useRef(new Animated.Value(0)).current;

  // Pre-generated digital rain drops
  const digitalRainDrops = useMemo(() => {
    const drops = [];
    const chars = '01アイウエオカキクケコサシスセソタチツテト';
    for (let i = 0; i < 25; i++) {
      drops.push({
        id: i,
        left: Math.floor(Math.random() * width * 0.9),
        top: Math.floor(Math.random() * height * 0.8),
        delay: Math.floor(Math.random() * 5000),
        duration: 2000 + Math.floor(Math.random() * 3000),
        char: chars[Math.floor(Math.random() * chars.length)],
        size: 10 + Math.floor(Math.random() * 8),
      });
    }
    return drops;
  }, []);

  useEffect(() => {
    // Voice button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Waveform rings
    const startRing = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startRing(ring1Anim, 0);
    startRing(ring2Anim, 800);
    startRing(ring3Anim, 1600);

    // Scanline
    Animated.loop(
      Animated.timing(scanlineAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Floating widgets
    const startFloat = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startFloat(floatWidget1, 0);
    startFloat(floatWidget2, 1200);

    // Glitch transitions
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitchActive(true);
        Animated.sequence([
          Animated.timing(glitchOffset, {
            toValue: Math.random() > 0.5 ? 5 : -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(glitchOffset, {
            toValue: Math.random() > 0.5 ? -3 : 3,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(glitchOffset, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start(() => setGlitchActive(false));
      }
    }, 3000);

    return () => clearInterval(glitchInterval);
  }, []);

  // Feature engines polling
  useEffect(() => {
    const pollFeatures = async () => {
      try {
        const bat = await BatteryPredictor.getBatteryInfo?.();
        if (bat) setBatteryInfo(bat);
      } catch (_) {}
      try {
        const thermal = await ThermalManager.getState?.();
        if (thermal) setThermalState(thermal);
      } catch (_) {}
      try {
        const net = await NetworkAdapt.getNetworkInfo?.();
        if (net) setNetworkInfo(net);
      } catch (_) {}
      try {
        const sec = await SecurityMonitor.getScore?.();
        if (sec !== undefined) setSecurityScore(sec);
        const threats = await ThreatShield.getActiveThreats?.();
        if (threats) setThreatCount(threats.length || 0);
      } catch (_) {}
      try {
        const mem = await MemoryHandler.getUsage?.();
        if (mem !== undefined) setMemoryUsage(mem);
      } catch (_) {}
      try {
        const wellness = await WellnessIndex.getScore?.();
        if (wellness !== undefined) setWellnessScore(wellness);
      } catch (_) {}
      try {
        const ambient = await AmbientAwareness.getMode?.();
        if (ambient) setAmbientMode(ambient);
      } catch (_) {}
      try {
        const armor = await ArmorMode.isActive?.();
        if (armor !== undefined) setArmorActive(armor);
      } catch (_) {}
    };
    pollFeatures();
    const interval = setInterval(pollFeatures, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVoicePress = () => {
    if (isListening) {
      setIsListening(false);
      setIsVerifying(true);
      setEmotion('processing');
      setTimeout(() => {
        setIsVerifying(false);
        setEmotion('idle');
      }, 2500);
    } else {
      setIsListening(true);
      setEmotion('listening');
    }
  };

  const handleButtonPress = (screen) => {
    console.log('Navigate to:', screen);
  };

  const renderWaveformRing = (anim, size, color, borderWidth) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 0.3, 0],
    });

    return (
      <Animated.View
        style={[
          styles.waveformRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            borderWidth: borderWidth,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const scanlineTranslate = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height],
  });

  const widget1Translate = floatWidget1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const widget2Translate = floatWidget2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const getStatusColor = () => {
    if (isListening) return '#FF0044';
    if (isVerifying) return '#FFD700';
    return '#00D4FF';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />

      <View style={styles.backgroundOverlay} />

      {/* Digital rain effect */}
      <View style={styles.digitalRainContainer} pointerEvents="none">
        {digitalRainDrops.map((drop) => (
          <Animated.Text
            key={drop.id}
            style={[
              styles.digitalRain,
              {
                left: drop.left,
                top: drop.top,
                fontSize: drop.size,
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.05, 0.15],
                }),
              },
            ]}
          >
            {drop.char}
          </Animated.Text>
        ))}
      </View>

      {/* Scanline */}
      <Animated.View
        style={[styles.scanline, { transform: [{ translateY: scanlineTranslate }] }]}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with glitch */}
        <Animated.View
          style={[
            styles.header,
            glitchActive && { transform: [{ translateX: glitchOffset }] },
          ]}
        >
          <Text style={styles.title}>MANU AI</Text>
          <Text style={styles.subtitle}>Personal Automation Engine</Text>
          <View style={styles.headerLine} />
        </Animated.View>

        {/* Avatar with waveform rings */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {renderWaveformRing(ring1Anim, 180, '#00D4FF', 2)}
            {renderWaveformRing(ring2Anim, 180, '#00D4FF', 1.5)}
            {renderWaveformRing(ring3Anim, 180, '#00D4FF', 1)}

            {/* Corner brackets */}
            <View style={[styles.cornerBracket, styles.topLeft]} />
            <View style={[styles.cornerBracket, styles.topRight]} />
            <View style={[styles.cornerBracket, styles.bottomLeft]} />
            <View style={[styles.cornerBracket, styles.bottomRight]} />

            <Avatar3D emotion={emotion} />
          </View>
        </View>

        {/* Status indicators */}
        <View style={styles.statusContainer}>
          {isListening && (
            <View style={styles.statusIndicator}>
              <View style={styles.listeningDot}>
                <Animated.View
                  style={[
                    styles.listeningDotInner,
                    { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                  ]}
                />
              </View>
              <Text style={[styles.statusText, { color: '#FF0044' }]}>● LISTENING</Text>
            </View>
          )}
          {isVerifying && (
            <View style={styles.statusIndicator}>
              <Animated.Text
                style={[
                  styles.verifyingIcon,
                  {
                    transform: [{
                      rotate: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }],
                  },
                ]}
              >
                ⟳
              </Animated.Text>
              <Text style={[styles.statusText, { color: '#FFD700' }]}>VERIFYING VOICE</Text>
            </View>
          )}
          {!isListening && !isVerifying && (
            <View style={styles.statusIndicator}>
              <View style={[styles.readyDot, { backgroundColor: '#00D4FF' }]} />
              <Text style={styles.statusText}>READY</Text>
            </View>
          )}
        </View>

        {/* Holographic floating widgets */}
        <View style={styles.widgetsContainer}>
          <Animated.View
            style={[styles.floatingWidget, { transform: [{ translateY: widget1Translate }] }]}
          >
            <View style={styles.widgetCornerTL} />
            <View style={styles.widgetCornerTR} />
            <View style={styles.widgetCornerBL} />
            <View style={styles.widgetCornerBR} />
            <Text style={styles.widgetIcon}>◉</Text>
            <Text style={styles.widgetLabel}>SYSTEM</Text>
            <Text style={styles.widgetValue}>ONLINE</Text>
          </Animated.View>

          <Animated.View
            style={[styles.floatingWidget, { transform: [{ translateY: widget2Translate }] }]}
          >
            <View style={styles.widgetCornerTL} />
            <View style={styles.widgetCornerTR} />
            <View style={styles.widgetCornerBL} />
            <View style={styles.widgetCornerBR} />
            <Text style={styles.widgetIcon}>⚡</Text>
            <Text style={styles.widgetLabel}>CPU</Text>
            <Text style={styles.widgetValue}>42%</Text>
          </Animated.View>
        </View>

        {/* HUD Buttons */}
        <View style={styles.hudButtonsContainer}>
          <TouchableOpacity style={styles.hudButton} onPress={() => handleButtonPress('AIChat')} activeOpacity={0.7}>
            <View style={styles.hudButtonBorder} />
            <Text style={styles.hudButtonIcon}>◈</Text>
            <Text style={styles.hudButtonText}>AI Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudButton} onPress={() => handleButtonPress('Terminal')} activeOpacity={0.7}>
            <View style={styles.hudButtonBorder} />
            <Text style={styles.hudButtonIcon}>▣</Text>
            <Text style={styles.hudButtonText}>Terminal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudButton} onPress={() => handleButtonPress('Tools')} activeOpacity={0.7}>
            <View style={styles.hudButtonBorder} />
            <Text style={styles.hudButtonIcon}>◉</Text>
            <Text style={styles.hudButtonText}>Tools</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudButton} onPress={() => handleButtonPress('Settings')} activeOpacity={0.7}>
            <View style={styles.hudButtonBorder} />
            <Text style={styles.hudButtonIcon}>⚙</Text>
            <Text style={styles.hudButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Button */}
        <View style={styles.voiceButtonContainer}>
          <Animated.View
            style={[
              styles.voiceButtonPulse,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.voiceButton, { backgroundColor: getStatusColor() }]}
            onPress={handleVoicePress}
            activeOpacity={0.8}
          >
            <Text style={styles.voiceButtonIcon}>🎤</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>J.A.R.V.I.S. Edition v2.0</Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0E27',
  },
  digitalRainContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  digitalRain: {
    position: 'absolute',
    color: '#00D4FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00D4FF',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 212, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 12,
    color: '#00D4FF',
    opacity: 0.6,
    marginTop: 6,
    letterSpacing: 3,
    fontWeight: '500',
  },
  headerLine: {
    width: 100,
    height: 1,
    backgroundColor: '#00D4FF',
    opacity: 0.3,
    marginTop: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformRing: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00D4FF',
    opacity: 0.5,
  },
  topLeft: {
    top: 10,
    left: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRight: {
    top: 10,
    right: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeft: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRight: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  statusContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listeningDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  listeningDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0044',
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  verifyingIcon: {
    color: '#FFD700',
    fontSize: 18,
    marginRight: 10,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#00D4FF',
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '700',
  },
  widgetsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    width: '100%',
  },
  floatingWidget: {
    width: 100,
    height: 80,
    marginHorizontal: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  widgetCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#00D4FF',
  },
  widgetCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: '#00D4FF',
  },
  widgetCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 10,
    height: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#00D4FF',
  },
  widgetCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#00D4FF',
  },
  widgetIcon: {
    color: '#00D4FF',
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.8,
  },
  widgetLabel: {
    color: '#00D4FF',
    fontSize: 10,
    opacity: 0.5,
    letterSpacing: 1,
  },
  widgetValue: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  hudButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 35,
    width: '100%',
  },
  hudButton: {
    width: (width - 90) / 2,
    height: 85,
    margin: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  hudButtonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 10,
  },
  hudButtonIcon: {
    color: '#00D4FF',
    fontSize: 24,
    marginBottom: 6,
    opacity: 0.9,
  },
  hudButtonText: {
    color: '#00D4FF',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    opacity: 0.8,
  },
  voiceButtonContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 35,
  },
  voiceButtonPulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  voiceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0E27',
    zIndex: 1,
  },
  voiceButtonIcon: {
    fontSize: 28,
    color: '#0A0E27',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#00D4FF',
    opacity: 0.25,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 8,
  },
  footerLine: {
    width: 60,
    height: 1,
    backgroundColor: '#00D4FF',
    opacity: 0.2,
  },
});

export default DashboardScreen;
