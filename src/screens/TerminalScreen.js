// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/screens/TerminalScreen.js
// Purpose: Interactive terminal UI backed by TerminalModule native bridge

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
} from 'react-native';

const { TerminalModule } = NativeModules;
const { width } = Dimensions.get('window');

const BANNER = `
╔══════════════════════════════════════════╗
║   M A N U  A I  —  J.A.R.V.I.S.        ║
║   Terminal Interface v2.0               ║
║   Type 'help' for available commands    ║
╚══════════════════════════════════════════╝
`.trim();

const HELP_TEXT = `
Available commands:
  ls [path]         — list directory contents
  cat <file>        — read a file
  pwd               — print working directory
  cd <path>         — change directory
  echo <text>       — print text
  whoami            — current user info
  ps                — running processes
  df                — disk usage
  env               — environment variables
  clear             — clear terminal
  help              — show this help
  exit              — close terminal

Tip: Commands run via Termux:API bridge.
`.trim();

export default function TerminalScreen({ navigation }) {
  const [lines, setLines] = useState([
    { id: 0, type: 'banner', text: BANNER },
    { id: 1, type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [cwd, setCwd] = useState('~');
  const scrollRef = useRef(null);
  const lineId = useRef(2);

  const appendLine = useCallback((text, type = 'output') => {
    setLines(prev => [...prev, { id: lineId.current++, type, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const runCommand = useCallback(async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Record history
    setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 50));
    setHistoryIndex(-1);

    // Echo input
    appendLine(`${cwd} $ ${trimmed}`, 'input');

    // Built-in commands
    if (trimmed === 'clear') { setLines([]); return; }
    if (trimmed === 'help')  { appendLine(HELP_TEXT); return; }
    if (trimmed === 'exit')  { navigation?.goBack?.(); return; }

    // Native bridge
    setIsRunning(true);
    try {
      if (!TerminalModule) throw new Error('TerminalModule not available (check native build)');

      const result = await TerminalModule.executeCommand(trimmed);
      const output = result?.stdout || result?.output || result || '';
      const stderr  = result?.stderr || '';
      const newCwd  = result?.cwd;

      if (newCwd) setCwd(newCwd.replace(/^\/data\/data\/[^/]+/, '~'));
      if (output) appendLine(String(output).trimEnd());
      if (stderr) appendLine(String(stderr).trimEnd(), 'error');
      if (!output && !stderr) appendLine('(no output)', 'dim');
    } catch (e) {
      appendLine(`Error: ${e.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [cwd, appendLine, navigation]);

  const handleSubmit = () => {
    if (isRunning) return;
    runCommand(input);
    setInput('');
  };

  const renderLine = ({ id, type, text }) => {
    const color = type === 'error' ? '#ff4444'
                : type === 'input' ? '#00e5ff'
                : type === 'banner' ? '#00bcd4'
                : type === 'dim' ? '#546e7a'
                : '#b2ebf2';
    return (
      <Text key={id} style={[styles.line, { color }]} selectable>
        {text}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⬛ TERMINAL</Text>
        <Text style={styles.cwdText}>{cwd}</Text>
      </View>

      {/* Output area */}
      <ScrollView
        ref={scrollRef}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        keyboardShouldPersistTaps="handled"
      >
        {lines.map(renderLine)}
        {isRunning && <Text style={styles.cursor}>▋ running…</Text>}
      </ScrollView>

      {/* Input row */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputRow}>
          <Text style={styles.prompt}>{cwd} $</Text>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSubmit}
            placeholder="enter command…"
            placeholderTextColor="#37474f"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            editable={!isRunning}
          />
          <TouchableOpacity
            style={[styles.runBtn, isRunning && styles.runBtnDisabled]}
            onPress={handleSubmit}
            disabled={isRunning}
          >
            <Text style={styles.runBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Quick commands */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBar}>
          {['ls', 'pwd', 'ps', 'df', 'env', 'whoami', 'clear', 'help'].map(cmd => (
            <TouchableOpacity
              key={cmd}
              style={styles.quickBtn}
              onPress={() => { setInput(cmd); }}
            >
              <Text style={styles.quickBtnText}>{cmd}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#050a0f' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 12, paddingTop: 40, paddingBottom: 8,
                    borderBottomWidth: 1, borderBottomColor: '#00bcd422' },
  backBtn:        { padding: 6 },
  backText:       { color: '#00bcd4', fontSize: 12, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  headerTitle:    { color: '#00e5ff', fontSize: 14, fontWeight: 'bold',
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  cwdText:        { color: '#546e7a', fontSize: 10,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  output:         { flex: 1 },
  outputContent:  { padding: 12, paddingBottom: 24 },
  line:           { fontSize: 12, lineHeight: 18,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  cursor:         { color: '#00e5ff', fontSize: 12,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  inputRow:       { flexDirection: 'row', alignItems: 'center', padding: 8,
                    borderTopWidth: 1, borderTopColor: '#00bcd422', backgroundColor: '#080d12' },
  prompt:         { color: '#00e5ff', fontSize: 12, marginRight: 6,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  textInput:      { flex: 1, color: '#b2ebf2', fontSize: 13, paddingVertical: 6,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  runBtn:         { paddingHorizontal: 12, paddingVertical: 8,
                    backgroundColor: '#00bcd4', borderRadius: 4, marginLeft: 6 },
  runBtnDisabled: { backgroundColor: '#37474f' },
  runBtnText:     { color: '#000', fontWeight: 'bold', fontSize: 14 },
  quickBar:       { backgroundColor: '#080d12', paddingVertical: 6, paddingHorizontal: 8 },
  quickBtn:       { paddingHorizontal: 12, paddingVertical: 5, marginRight: 6,
                    borderWidth: 1, borderColor: '#00bcd444', borderRadius: 4 },
  quickBtnText:   { color: '#00bcd4', fontSize: 11,
                    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
});
