import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/screens/EmergencyScreen.js
// Purpose: Emergency contacts, SOS dispatch, and incident log

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Linking, NativeModules,
} from 'react-native';

const { EmergencyModule } = NativeModules;

const DEFAULT_CONTACTS = [
  { id: '1', name: 'Emergency Services', number: '911',    relation: 'Police/Fire/Medical', color: '#ff1744' },
  { id: '2', name: 'Contact 1',          number: '',       relation: 'Family',               color: '#00bcd4' },
  { id: '3', name: 'Contact 2',          number: '',       relation: 'Friend',               color: '#00bcd4' },
];

export default function EmergencyScreen({ navigation }) {
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS);
  const [lastSOS, setLastSOS] = useState(null);
  const [incidentLog, setIncidentLog] = useState([]);


  // Load saved contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const saved = await AsyncStorage.getItem("@manu_emergency_contacts");
        if (saved) setContacts(JSON.parse(saved));
        const log = await AsyncStorage.getItem("@manu_incident_log");
        if (log) setIncidentLog(JSON.parse(log));
      } catch (_) {}
    };
    loadContacts();
  }, []);

  const saveContacts = async (updated) => {
    setContacts(updated);
    try { await AsyncStorage.setItem("@manu_emergency_contacts", JSON.stringify(updated)); } catch (_) {}
  };

  const saveLog = async (log) => {
    setIncidentLog(log);
    try { await AsyncStorage.setItem("@manu_incident_log", JSON.stringify(log)); } catch (_) {}
  };
  const callNumber = (num) => {
    if (!num) { Alert.alert('No number', 'Please set a phone number for this contact.'); return; }
    Linking.openURL(`tel:${num}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const sendSOS = async () => {
    Alert.alert('🚨 SOS ALERT', 'This will notify all emergency contacts with your location.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'SEND SOS', style: 'destructive',
        onPress: async () => {
          const ts = new Date().toLocaleTimeString();
          setLastSOS(ts);
          setIncidentLog(prev => [{ id: String(Date.now()), ts, type: 'SOS', detail: 'Manual SOS triggered' }, ...prev]);
          try { await EmergencyModule?.triggerSOS?.({ type: 'manual', contacts }); }
          catch (e) { console.warn('[EmergencyScreen] EmergencyModule:', e.message); }
          Alert.alert('✅ SOS Sent', `Alert dispatched at ${ts}`);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚨 EMERGENCY</Text>
        {lastSOS && <Text style={styles.lastSOS}>Last: {lastSOS}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Big SOS */}
        <TouchableOpacity style={styles.sosBtn} onPress={sendSOS}>
          <Text style={styles.sosBtnIcon}>🆘</Text>
          <Text style={styles.sosBtnText}>SEND SOS ALERT</Text>
          <Text style={styles.sosBtnSub}>Notifies all emergency contacts</Text>
        </TouchableOpacity>

        {/* Emergency contacts */}
        <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
        {contacts.map(c => (
          <View key={c.id} style={[styles.contactCard, { borderLeftColor: c.color }]}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactRelation}>{c.relation}</Text>
              <Text style={styles.contactNumber}>{c.number || 'No number set'}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => callNumber(c.number)}>
              <Text style={styles.callBtnText}>📞 CALL</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          {[
            { label: 'Call 911',      action: () => callNumber('911'),   color: '#ff1744' },
            { label: 'Share Location',action: () => Alert.alert('Location', 'Location shared with contacts'), color: '#00bcd4' },
            { label: 'Fake Call',     action: () => Alert.alert('Fake Call', 'Incoming call simulation starting…'), color: '#546e7a' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={[styles.actionBtn, { borderColor: a.color }]} onPress={a.action}>
              <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Incident log */}
        {incidentLog.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>INCIDENT LOG</Text>
            {incidentLog.map(i => (
              <View key={i.id} style={styles.logRow}>
                <Text style={styles.logTs}>{i.ts}</Text>
                <Text style={styles.logType}>{i.type}</Text>
                <Text style={styles.logDetail}>{i.detail}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#050a0f' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 40,
                    paddingBottom: 10, paddingHorizontal: 14,
                    borderBottomWidth: 1, borderBottomColor: '#ff174433' },
  backBtn:        { padding: 6 },
  backText:       { color: '#ff1744', fontSize: 18 },
  headerTitle:    { flex: 1, textAlign: 'center', color: '#ff5252', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  lastSOS:        { color: '#546e7a', fontSize: 10 },
  body:           { padding: 16, paddingBottom: 40 },
  sosBtn:         { backgroundColor: '#b71c1c', borderRadius: 16, padding: 24,
                    alignItems: 'center', marginBottom: 24 },
  sosBtnIcon:     { fontSize: 48 },
  sosBtnText:     { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  sosBtnSub:      { color: '#ef9a9a', fontSize: 12, marginTop: 4 },
  sectionTitle:   { color: '#546e7a', fontSize: 10, letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  contactCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a1929',
                    borderRadius: 10, padding: 14, marginBottom: 10,
                    borderLeftWidth: 3 },
  contactInfo:    { flex: 1 },
  contactName:    { color: '#e0f7fa', fontSize: 14, fontWeight: 'bold' },
  contactRelation:{ color: '#546e7a', fontSize: 11, marginTop: 2 },
  contactNumber:  { color: '#90a4ae', fontSize: 13, marginTop: 2 },
  callBtn:        { backgroundColor: '#1a3040', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  callBtnText:    { color: '#00e5ff', fontSize: 12, fontWeight: 'bold' },
  actionsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionBtn:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, margin: 3 },
  actionBtnText:  { fontSize: 13, fontWeight: 'bold' },
  logRow:         { flexDirection: 'row', gap: 10, paddingVertical: 6,
                    borderBottomWidth: 1, borderBottomColor: '#0d2136' },
  logTs:          { color: '#546e7a', fontSize: 10, width: 60 },
  logType:        { color: '#ff5252', fontSize: 10, width: 40 },
  logDetail:      { color: '#90a4ae', fontSize: 10, flex: 1 },
});
