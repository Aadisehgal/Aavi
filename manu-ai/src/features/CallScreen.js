// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/CallScreen.js
// Feature 42 — AI-enhanced incoming call handler with caller intelligence

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, NativeModules,
} from 'react-native';

const { EmergencyModule } = NativeModules;

/**
 * CallScreen — rendered by the app when an incoming call is intercepted.
 *
 * Props:
 *   caller     {object}  — { name, number, relation, trustScore }
 *   onAccept   {fn}
 *   onDecline  {fn}
 *   onSilence  {fn}
 */
export default function CallScreen({ caller = {}, onAccept, onDecline, onSilence }) {
  const [duration, setDuration]   = useState(0);
  const [silenced, setSilenced]   = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!silenced) Vibration.vibrate([500, 500], true);
    return () => Vibration.cancel();
  }, [silenced]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => { clearInterval(interval); Animated.stopAnimation(); };
  }, []);

  const trust = caller.trustScore ?? 50;
  const trustColor = trust >= 70 ? '#00e676' : trust >= 40 ? '#ffea00' : '#ff1744';
  const trustLabel = trust >= 70 ? 'TRUSTED' : trust >= 40 ? 'UNKNOWN' : 'SUSPICIOUS';

  const handleSilence = () => {
    setSilenced(true);
    Vibration.cancel();
    onSilence?.();
  };

  return (
    <View style={styles.container}>
      {/* Caller info */}
      <View style={styles.callerSection}>
        <Animated.View style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.avatarText}>{(caller.name || '?')[0]?.toUpperCase()}</Text>
        </Animated.View>
        <Text style={styles.callerName}>{caller.name || 'Unknown Caller'}</Text>
        <Text style={styles.callerNumber}>{caller.number || ''}</Text>
        <Text style={styles.callerRelation}>{caller.relation || 'No contact info'}</Text>

        {/* Trust score */}
        <View style={[styles.trustBadge, { borderColor: trustColor }]}>
          <Text style={[styles.trustText, { color: trustColor }]}>▲ {trustLabel} · {trust}%</Text>
        </View>
      </View>

      {/* J.A.R.V.I.S. analysis */}
      <View style={styles.analysisCard}>
        <Text style={styles.analysisTitle}>J.A.R.V.I.S. ANALYSIS</Text>
        <Text style={styles.analysisText}>
          {trust >= 70
            ? 'Recognised contact. Safe to answer.'
            : trust >= 40
            ? 'Unknown caller. Proceed with caution.'
            : 'Potentially spam or robocall. Consider declining.'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineBtnText}>✕ DECLINE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.silenceBtn} onPress={handleSilence}>
          <Text style={styles.silenceBtnText}>{silenced ? '🔇 SILENCED' : '🔇 SILENCE'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>✓ ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#050a0f', justifyContent: 'space-between', padding: 24 },
  callerSection:  { alignItems: 'center', marginTop: 60 },
  avatar:         { width: 96, height: 96, borderRadius: 48, backgroundColor: '#003d5c',
                    borderWidth: 2, borderColor: '#00bcd4', justifyContent: 'center', alignItems: 'center',
                    marginBottom: 16 },
  avatarText:     { color: '#00e5ff', fontSize: 40, fontWeight: 'bold' },
  callerName:     { color: '#e0f7fa', fontSize: 24, fontWeight: 'bold' },
  callerNumber:   { color: '#90a4ae', fontSize: 16, marginTop: 4 },
  callerRelation: { color: '#546e7a', fontSize: 13, marginTop: 4 },
  trustBadge:     { marginTop: 16, paddingHorizontal: 14, paddingVertical: 6,
                    borderWidth: 1, borderRadius: 20 },
  trustText:      { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  analysisCard:   { backgroundColor: '#0a1929', borderRadius: 12, padding: 16,
                    borderWidth: 1, borderColor: '#00bcd422' },
  analysisTitle:  { color: '#00bcd4', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  analysisText:   { color: '#90a4ae', fontSize: 13, lineHeight: 18 },
  actions:        { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  declineBtn:     { flex: 1, backgroundColor: '#b71c1c', borderRadius: 16, padding: 16, alignItems: 'center' },
  declineBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  silenceBtn:     { flex: 1, backgroundColor: '#1a2a3a', borderRadius: 16, padding: 16, alignItems: 'center' },
  silenceBtnText: { color: '#90a4ae', fontSize: 13, fontWeight: 'bold' },
  acceptBtn:      { flex: 1, backgroundColor: '#1b5e20', borderRadius: 16, padding: 16, alignItems: 'center' },
  acceptBtnText:  { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
