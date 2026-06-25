import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/screens/ChatScreen.js
// Purpose: J.A.R.V.I.S. conversational AI chat interface

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  Dimensions, Animated,
} from 'react-native';
import AIManager from '../ai/AIManager';
import { AIChatClient } from '../ai/aiClient';
import MemoryStack from '../features/MemoryStack';
import ConversationStack from '../features/ConversationStack';
import HumorEngine from '../features/HumorEngine';
import ReasoningEngine from '../features/ReasoningEngine';
import ConfidenceScorer from '../features/ConfidenceScorer';
import PersonalityCore from '../self/PersonalityCore';
import ContextReminders from '../features/ContextReminders';
import PredictiveEngine from '../features/PredictiveEngine';

const { width } = Dimensions.get('window');

const SUGGESTIONS = [
  'What can you do?',
  'Set an alarm',
  'System status',
  'Enable Armor mode',
  'Analyze notifications',
];

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '0', role: 'assistant',
      text: "Hello. I am MANU — your J.A.R.V.I.S. AI assistant. How can I help you today?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const flatRef = useRef(null);
  const dotAnim  = useRef(new Animated.Value(0)).current;

  // Thinking dots animation
  useEffect(() => {
    if (!isThinking) { dotAnim.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [isThinking]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || isThinking) return;
    setInput('');

    const userMsg = { id: String(Date.now()), role: 'user', text: userText, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.text }));
      history.push({ role: 'user', content: userText });
      const reply = await AIManager.chat(history);
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1), role: 'assistant',
        text: reply || 'I encountered an issue. Please try again.',
        ts: Date.now(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1), role: 'assistant',
        text: `Error: ${e.message}`,
        ts: Date.now(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages]);

  const renderItem = useCallback(({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        {!isUser && <Text style={styles.botLabel}>▲ MANU</Text>}
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
        <Text style={styles.ts}>{new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💬 J.A.R.V.I.S. CHAT</Text>
          {isThinking && <Text style={styles.thinkingLabel}>thinking…</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isThinking
            ? <View style={styles.thinkingRow}>
                <Animated.Text style={[styles.thinkingDot, { opacity: dotAnim }]}>● ● ●</Animated.Text>
              </View>
            : null
        }
      />

      {/* Suggestions */}
      {messages.length <= 2 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            placeholder="Ask J.A.R.V.I.S. anything…"
            placeholderTextColor="#37474f"
            returnKeyType="send"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isThinking) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isThinking}
          >
            <Text style={styles.sendBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#050a0f' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingTop: 40,
                     paddingBottom: 10, paddingHorizontal: 14,
                     borderBottomWidth: 1, borderBottomColor: '#00bcd422' },
  backBtn:         { padding: 6 },
  backText:        { color: '#00bcd4', fontSize: 18 },
  headerCenter:    { flex: 1, alignItems: 'center' },
  headerTitle:     { color: '#00e5ff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  thinkingLabel:   { color: '#546e7a', fontSize: 10, marginTop: 2 },
  list:            { padding: 14, paddingBottom: 8 },
  bubble:          { maxWidth: width * 0.8, marginBottom: 12, padding: 12, borderRadius: 12 },
  bubbleBot:       { alignSelf: 'flex-start', backgroundColor: '#0a1929',
                     borderWidth: 1, borderColor: '#00bcd433' },
  bubbleUser:      { alignSelf: 'flex-end', backgroundColor: '#003d5c' },
  botLabel:        { color: '#00bcd4', fontSize: 9, marginBottom: 4, letterSpacing: 1 },
  bubbleText:      { color: '#b2ebf2', fontSize: 14, lineHeight: 20 },
  bubbleTextUser:  { color: '#e0f7fa' },
  ts:              { color: '#37474f', fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  thinkingRow:     { paddingHorizontal: 14, paddingBottom: 8 },
  thinkingDot:     { color: '#00bcd4', fontSize: 16 },
  suggestions:     { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionBtn:   { borderWidth: 1, borderColor: '#00bcd444', borderRadius: 16,
                     paddingHorizontal: 12, paddingVertical: 6, margin: 3 },
  suggestionText:  { color: '#00bcd4', fontSize: 12 },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', padding: 10,
                     borderTopWidth: 1, borderTopColor: '#00bcd422', backgroundColor: '#080d12' },
  textInput:       { flex: 1, color: '#e0f7fa', fontSize: 14, paddingVertical: 8,
                     paddingHorizontal: 12, backgroundColor: '#0a1929', borderRadius: 20,
                     borderWidth: 1, borderColor: '#00bcd433', maxHeight: 120 },
  sendBtn:         { marginLeft: 8, width: 42, height: 42, borderRadius: 21,
                     backgroundColor: '#00bcd4', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#37474f' },
  sendBtnText:     { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
