// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/MeetingMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView, TextInput,
} from 'react-native';

const { MeetingBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const MeetingMode = ({ isActive, onClose }) => {
  const [meetingActive, setMeetingActive] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('Team Standup');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [silentMode, setSilentMode] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [participants, setParticipants] = useState(['Alice', 'Bob', 'Charlie', 'Diana']);
  const [speakingTime, setSpeakingTime] = useState({ Alice: 0, Bob: 0, Charlie: 0, Diana: 0 });
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [recording, setRecording] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef(null);
  const speakerIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); stopMeeting(); }
    return () => stopMeeting();
  }, [isActive]);

  const startMeeting = () => {
    setMeetingActive(true); setElapsedTime(0); setSummary('');
    timerIntervalRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    // Simulate speaker rotation
    speakerIntervalRef.current = setInterval(() => {
      const speaker = participants[Math.floor(Math.random() * participants.length)];
      setCurrentSpeaker(speaker);
      setSpeakingTime(prev => ({ ...prev, [speaker]: (prev[speaker] || 0) + 1 }));
    }, 5000);
  };

  const stopMeeting = () => {
    setMeetingActive(false); setCurrentSpeaker('');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    if (elapsedTime > 0) {
      setSummary(`Meeting "${meetingTitle}" completed. Duration: ${formatTime(elapsedTime)}. Action items recorded: ${actionItems.length}.`);
    }
  };

  const addActionItem = () => {
    if (notes.trim()) { setActionItems(prev => [...prev, { id: Date.now(), text: notes.trim(), assignee: currentSpeaker || 'Unassigned', done: false }]); setNotes(''); }
  };

  const toggleActionItem = (id) => { setActionItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item)); };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const renderMeetingHeader = () => (
    <View style={styles.meetingCard}>
      <TextInput style={styles.meetingTitleInput} value={meetingTitle} onChangeText={setMeetingTitle} editable={!meetingActive} />
      <View style={styles.meetingMeta}>
        <Text style={styles.meetingMetaText}>⏱ {formatTime(elapsedTime)}</Text>
        <Text style={styles.meetingMetaText}>👥 {participants.length}</Text>
        <Text style={styles.meetingMetaText}>{recording ? '🔴 REC' : '⚫'}</Text>
      </View>
      {!meetingActive ? <TouchableOpacity style={styles.startBtn} onPress={startMeeting}><Text style={styles.startText}>▶ Start Meeting</Text></TouchableOpacity>
        : <TouchableOpacity style={[styles.startBtn, styles.stopBtn]} onPress={stopMeeting}><Text style={styles.startText}>⏹ End Meeting</Text></TouchableOpacity>}
    </View>
  );

  const renderSilentToggle = () => (
    <View style={styles.silentCard}>
      <TouchableOpacity style={[styles.silentBtn, silentMode && styles.silentBtnActive]} onPress={() => setSilentMode(!silentMode)}>
        <Text style={styles.silentText}>{silentMode ? '🔕 Silent Mode ON' : '🔔 Silent Mode OFF'}</Text>
      </TouchableOpacity>
      <Text style={styles.silentSub}>All notifications muted during meeting</Text>
    </View>
  );

  const renderSpeakerTracker = () => (
    <View style={styles.speakerCard}>
      <Text style={styles.cardTitle}>Speaking Time</Text>
      {participants.map((p) => (
        <View key={p} style={styles.speakerRow}>
          <Text style={[styles.speakerName, currentSpeaker === p && styles.speakerActive]}>{p} {currentSpeaker === p ? '👤' : ''}</Text>
          <View style={styles.speakerBar}><View style={[styles.speakerFill, { width: `${Math.min(100, (speakingTime[p] || 0) * 2)}%` }]} /></View>
          <Text style={styles.speakerTime}>{speakingTime[p] || 0}s</Text>
        </View>
      ))}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.notesCard}>
      <Text style={styles.cardTitle}>Live Notes</Text>
      <TextInput style={styles.notesInput} multiline placeholder="Type notes here..." placeholderTextColor="rgba(0,255,255,0.3)" value={notes} onChangeText={setNotes} />
      <TouchableOpacity style={styles.actionBtn} onPress={addActionItem}><Text style={styles.actionBtnText}>+ Add Action Item</Text></TouchableOpacity>
    </View>
  );

  const renderActionItems = () => (
    <View style={styles.actionCard}>
      <Text style={styles.cardTitle}>Action Items ({actionItems.length})</Text>
      {actionItems.length === 0 ? <Text style={styles.emptyText}>No action items yet</Text> : actionItems.map((item) => (
        <TouchableOpacity key={item.id} style={styles.actionRow} onPress={() => toggleActionItem(item.id)}>
          <Text style={[styles.actionCheck, item.done && styles.actionChecked]}>{item.done ? '✓' : '○'}</Text>
          <Text style={[styles.actionText, item.done && styles.actionTextDone]}>{item.text}</Text>
          <Text style={styles.actionAssignee}>@{item.assignee}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummary = () => (
    summary ? <View style={styles.summaryCard}><Text style={styles.cardTitle}>Summary</Text><Text style={styles.summaryText}>{summary}</Text></View> : null
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤝 Meeting</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderMeetingHeader()}{renderSilentToggle()}{meetingActive && renderSpeakerTracker()}{renderNotes()}{renderActionItems()}{renderSummary()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  meetingCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  meetingTitleInput: { color: '#00ffff', fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.2)', paddingBottom: 8, marginBottom: 12 },
  meetingMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  meetingMetaText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12 },
  startBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  stopBtn: { backgroundColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.3)' },
  startText: { color: '#00ffff', fontSize: 14, fontWeight: '600' },
  silentCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center' },
  silentBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  silentBtnActive: { backgroundColor: 'rgba(0, 255, 255, 0.15)', borderColor: '#00ffff' },
  silentText: { color: '#ccffff', fontSize: 13, fontWeight: '600' },
  silentSub: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 11, marginTop: 8 },
  speakerCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  speakerName: { color: '#ccffff', fontSize: 13, width: 80 },
  speakerActive: { color: '#00ff88', fontWeight: 'bold' },
  speakerBar: { flex: 1, height: 6, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  speakerFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 3 },
  speakerTime: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, width: 40, textAlign: 'right' },
  notesCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  notesInput: { color: '#ccffff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)', borderRadius: 10, padding: 12, marginBottom: 12 },
  actionBtn: { paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0, 255, 255, 0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  actionBtnText: { color: '#00ffff', fontSize: 13, fontWeight: '600' },
  actionCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  emptyText: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  actionCheck: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 16, width: 24 },
  actionChecked: { color: '#00ff88' },
  actionText: { color: '#ccffff', fontSize: 13, flex: 1 },
  actionTextDone: { textDecorationLine: 'line-through', color: 'rgba(0, 255, 255, 0.3)' },
  actionAssignee: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11 },
  summaryCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  summaryText: { color: '#ccffff', fontSize: 14, lineHeight: 22 },
});

export default MeetingMode;
