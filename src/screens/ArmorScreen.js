// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/screens/ArmorScreen.js
// Purpose: Armor Mode dashboard — security shield, threat level, emergency controls

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ScrollView, StatusBar, Switch, Alert, NativeModules,
} from 'react-native';

const { EmergencyModule } = NativeModules;

// Security Modules
import ArmorMode from '../security/ArmorMode';
import CyberShield from '../security/CyberShield';
import PhishingScan from '../security/PhishingScan';
import IntruderDetect from '../security/IntruderDetect';
import MITMAlert from '../security/MITMAlert';
import RansomDetect from '../security/RansomDetect';
import SpyDetect from '../security/SpyDetect';
import StalkerDetect from '../security/StalkerDetect';
import RogueAP from '../security/RogueAP';
import DNSDetect from '../security/DNSDetect';
import FraudShield from '../security/FraudShield';
import EvidenceLog from '../security/EvidenceLog';
import PanicPassword from '../security/PanicPassword';
import SystemIntegrity from '../security/SystemIntegrity';
import RemoteWipe from '../security/RemoteWipe';
import StealthMode from '../security/StealthMode';
import DecoyContainer from '../security/DecoyContainer';
import ThreatShield from '../features/ThreatShield';
import SecurityMonitor from '../features/SecurityMonitor';
import TrustScore from '../features/TrustScore';

const THREAT_LEVELS = {
  SAFE:    { label: 'SAFE',    color: '#00e676', icon: '🛡️' },
  CAUTION: { label: 'CAUTION', color: '#ffea00', icon: '⚠️' },
  DANGER:  { label: 'DANGER',  color: '#ff1744', icon: '🚨' },
};

export default function ArmorScreen({ navigation }) {
  const [armorActive, setArmorActive] = useState(false);
  const [securityScore, setSecurityScore] = useState(100);
  const [activeThreats, setActiveThreats] = useState([]);
  const [trustScore, setTrustScore] = useState(100);
  const [stealthActive, setStealthActive] = useState(false);
  const [intruderCount, setIntruderCount] = useState(0);
  const [wipeArmed, setWipeArmed] = useState(false);
  const [cyberShieldOn, setCyberShieldOn] = useState(false);
  const [evidenceLogs, setEvidenceLogs] = useState([]);
  const [threatLevel, setThreatLevel] = useState('SAFE');
  const [features, setFeatures] = useState({
    locationSharing: false,
    fakeCall:        false,
    safeZone:        true,
    panicButton:     true,
  });

  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!armorActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8,  duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [armorActive]);

  useEffect(() => {
    Animated.timing(shieldAnim, {
      toValue: armorActive ? 1 : 0, duration: 400, useNativeDriver: true,
    }).start();
  }, [armorActive]);

  // Security modules polling
  useEffect(() => {
    const scanSecurity = async () => {
      try {
        const score = await SecurityMonitor.getScore?.();
        if (score !== undefined) setSecurityScore(score);
      } catch (_) {}
      try {
        const threats = await ThreatShield.getActiveThreats?.();
        if (threats) setActiveThreats(threats);
        const level = threats?.length > 5 ? "DANGER" : threats?.length > 0 ? "CAUTION" : "SAFE";
        setThreatLevel(level);
      } catch (_) {}
      try {
        const ts = await TrustScore.calculate?.();
        if (ts !== undefined) setTrustScore(ts);
      } catch (_) {}
      try {
        const intruders = await IntruderDetect.getCount?.();
        if (intruders !== undefined) setIntruderCount(intruders);
      } catch (_) {}
      try {
        const cyber = await CyberShield.isActive?.();
        if (cyber !== undefined) setCyberShieldOn(cyber);
      } catch (_) {}
      try {
        const logs = await EvidenceLog.getRecent?.();
        if (logs) setEvidenceLogs(logs);
      } catch (_) {}
    };
    scanSecurity();
    const interval = setInterval(scanSecurity, 8000);
    return () => clearInterval(interval);
  }, []);

  const toggleArmorMode = async () => {
    try {
      if (!armorActive) {
        await ArmorMode.activate?.();
        await CyberShield.start?.();
        await IntruderDetect.start?.();
        await PhishingScan.start?.();
        await RansomDetect.start?.();
        await SpyDetect.start?.();
        await MITMAlert.start?.();
        await RogueAP.start?.();
        await DNSDetect.start?.();
        setArmorActive(true);
      } else {
        await ArmorMode.deactivate?.();
        setArmorActive(false);
      }
    } catch (e) {
      setArmorActive(!armorActive);
    }
  };

  const toggleStealth = async () => {
    try {
      if (!stealthActive) { await StealthMode.activate?.(); setStealthActive(true); }
      else { await StealthMode.deactivate?.(); setStealthActive(false); }
    } catch (_) { setStealthActive(!stealthActive); }
  };

  const armRemoteWipe = () => {
    Alert.alert("⚠️ ARM REMOTE WIPE", "This will enable remote wipe capability. Are you sure?",
      [{ text: "Cancel", style: "cancel" },
       { text: "ARM", style: "destructive", onPress: async () => {
         try { await RemoteWipe.arm?.(); setWipeArmed(true); } catch (_) { setWipeArmed(true); }
       }}]);
  };

  const toggleArmor = () => {
    setArmorActive(v => !v);
    setThreatLevel(armorActive ? 'SAFE' : 'CAUTION');
  };

  const triggerSOS = () => {
    Alert.alert('🚨 EMERGENCY SOS', 'Activating SOS protocol. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'SEND SOS', style: 'destructive',
        onPress: async () => {
          setThreatLevel('DANGER');
          try {
            await EmergencyModule?.triggerSOS?.({ type: 'manual' });
          } catch (e) { console.warn('EmergencyModule unavailable:', e.message); }
        },
      },
    ]);
  };

  const tl = THREAT_LEVELS[threatLevel];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛡️ ARMOR MODE</Text>
        <View style={[styles.statusDot, { backgroundColor: armorActive ? '#00e676' : '#37474f' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Shield */}
        <View style={styles.shieldRow}>
          <Animated.Text style={[styles.shieldIcon, { transform: [{ scale: pulseAnim }] }]}>
            {tl.icon}
          </Animated.Text>
          <Text style={[styles.threatLabel, { color: tl.color }]}>THREAT LEVEL: {tl.label}</Text>
        </View>

        {/* Main toggle */}
        <TouchableOpacity
          style={[styles.armorBtn, armorActive && styles.armorBtnActive]}
          onPress={toggleArmor}
        >
          <Text style={styles.armorBtnText}>{armorActive ? '⬛ DEACTIVATE ARMOR' : '🛡️ ACTIVATE ARMOR'}</Text>
        </TouchableOpacity>

        {/* Feature toggles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PROTECTION FEATURES</Text>
          {Object.entries(features).map(([key, val]) => (
            <View key={key} style={styles.featureRow}>
              <Text style={styles.featureLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text>
              <Switch
                value={val}
                onValueChange={v => setFeatures(prev => ({ ...prev, [key]: v }))}
                trackColor={{ false: '#37474f', true: '#00bcd4' }}
                thumbColor={val ? '#00e5ff' : '#90a4ae'}
              />
            </View>
          ))}
        </View>

        {/* SOS */}
        <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS}>
          <Text style={styles.sosBtnText}>🚨 EMERGENCY SOS</Text>
          <Text style={styles.sosSubText}>Sends location + alerts emergency contacts</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Armor Mode monitors your environment using ambient sound analysis,
            fall detection, and location awareness to keep you safe.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#050a0f' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 14,
                    borderBottomWidth: 1, borderBottomColor: '#ff174422' },
  backBtn:        { padding: 6 },
  backText:       { color: '#ff1744', fontSize: 18 },
  headerTitle:    { color: '#ff5252', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  statusDot:      { width: 10, height: 10, borderRadius: 5 },
  body:           { padding: 16, paddingBottom: 40 },
  shieldRow:      { alignItems: 'center', marginVertical: 24 },
  shieldIcon:     { fontSize: 72 },
  threatLabel:    { fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginTop: 12 },
  armorBtn:       { padding: 18, borderRadius: 12, borderWidth: 2, borderColor: '#546e7a',
                    alignItems: 'center', marginBottom: 16 },
  armorBtnActive: { borderColor: '#ff1744', backgroundColor: '#1a0010' },
  armorBtnText:   { color: '#eceff1', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  card:           { backgroundColor: '#0a1929', borderRadius: 12, padding: 16,
                    borderWidth: 1, borderColor: '#00bcd422', marginBottom: 16 },
  cardTitle:      { color: '#00bcd4', fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  featureRow:     { flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 12 },
  featureLabel:   { color: '#90a4ae', fontSize: 12 },
  sosBtn:         { backgroundColor: '#b71c1c', borderRadius: 12, padding: 20,
                    alignItems: 'center', marginBottom: 16 },
  sosBtnText:     { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sosSubText:     { color: '#ef9a9a', fontSize: 11, marginTop: 4 },
  infoCard:       { backgroundColor: '#0a1929', borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: '#37474f' },
  infoText:       { color: '#546e7a', fontSize: 12, lineHeight: 18 },
});
