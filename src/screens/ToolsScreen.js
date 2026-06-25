// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 11/20 — Tools Arsenal (ToolsScreen.js)
// File: src/screens/ToolsScreen.js
// Generated: 2026-06-24

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
  NativeModules,
  ActivityIndicator,
} from 'react-native';

// Feature Imports
import SmartClipboard from '../features/SmartClipboard';
import ScreenshotAI from '../features/ScreenshotAI';
import PrivacyScan from '../features/PrivacyScan';
import PatternExport from '../features/PatternExport';
import VoiceTranscribe from '../features/VoiceTranscribe';
import ScreenAnalyzer from '../features/ScreenAnalyzer';
import StorageAdvisor from '../features/StorageAdvisor';
import DataPredictor from '../features/DataPredictor';
import UpdateIntel from '../features/UpdateIntel';
import AutoScript from '../features/AutoScript';
import ReasoningEngine from '../features/ReasoningEngine';
import QRIntel from '../self/QRIntel';
import RootDetect from '../self/RootDetect';
import EmulatorDetect from '../self/EmulatorDetect';
import TamperDetect from '../self/TamperDetect';
import PermissionTracker from '../self/PermissionTracker';
import PrivacyScore from '../self/PrivacyScore';
import CertPinning from '../self/CertPinning';
import SecureErase from '../self/SecureErase';
import PasswordAI from '../self/PasswordAI';
import PassphraseGen from '../self/PassphraseGen';
// Security Tools
import BTAttack from '../security/BTAttack';
import PhishingScan from '../security/PhishingScan';
import FraudShield from '../security/FraudShield';
import FakeNewsDetect from '../security/FakeNewsDetect';
import DeepfakeDetect from '../security/DeepfakeDetect';
import NetIntrusion from '../security/NetIntrusion';
import IDGuard from '../security/IDGuard';
import EvidenceLog from '../security/EvidenceLog';

const { width, height } = Dimensions.get('window');
const COLS = 3;
const CARD_SIZE = (width - 40) / COLS;

// =============================================================================
// TOOL DEFINITIONS — 5 Categories, 30+ Tools
// =============================================================================

const TOOL_CATEGORIES = [
  {
    id: 'system',
    name: 'System & Utility',
    icon: '⚙️',
    color: '#4FC3F7',
    tools: [
      { id: 'busybox', name: 'BusyBox', icon: '📦', desc: 'Swiss Army Knife of Embedded Linux', cmd: 'busybox', args: '--help' },
      { id: 'curl', name: 'cURL', icon: '🌐', desc: 'Transfer data with URLs', cmd: 'curl', args: '-V' },
      { id: 'wget', name: 'Wget', icon: '⬇️', desc: 'Network file downloader', cmd: 'wget', args: '--version' },
      { id: 'python3', name: 'Python3', icon: '🐍', desc: 'Python interpreter', cmd: 'python3', args: '--version' },
      { id: 'git', name: 'Git', icon: '🌿', desc: 'Distributed version control', cmd: 'git', args: '--version' },
      { id: 'vim', name: 'Vim', icon: '📝', desc: 'Vi IMproved text editor', cmd: 'vim', args: '--version' },
      { id: 'nano', name: 'Nano', icon: '📄', desc: 'Simple text editor', cmd: 'nano', args: '--version' },
      { id: 'tmux', name: 'Tmux', icon: '🪟', desc: 'Terminal multiplexer', cmd: 'tmux', args: '-V' },
    ],
  },
  {
    id: 'network',
    name: 'Networking & Recon',
    icon: '🌐',
    color: '#66BB6A',
    tools: [
      { id: 'nmap', name: 'Nmap', icon: '🔍', desc: 'Network scanner & mapper', cmd: 'nmap', args: '--help' },
      { id: 'masscan', name: 'Masscan', icon: '⚡', desc: 'Internet-scale port scanner', cmd: 'masscan', args: '--help' },
      { id: 'hydra', name: 'Hydra', icon: '🔓', desc: 'Login brute-forcer', cmd: 'hydra', args: '-h' },
      { id: 'sqlmap', name: 'SQLMap', icon: '💉', desc: 'SQL injection automation', cmd: 'sqlmap', args: '-h' },
      { id: 'nikto', name: 'Nikto', icon: '🕸️', desc: 'Web server scanner', cmd: 'nikto', args: '-H' },
      { id: 'gobuster', name: 'Gobuster', icon: '🚪', desc: 'Directory/file brute-forcer', cmd: 'gobuster', args: '-h' },
      { id: 'dirb', name: 'Dirb', icon: '📂', desc: 'Web content scanner', cmd: 'dirb', args: '' },
      { id: 'netcat', name: 'Netcat', icon: '📡', desc: 'Network swiss army knife', cmd: 'nc', args: '-h' },
      { id: 'arp_scan', name: 'ARP-Scan', icon: '📶', desc: 'ARP scanning tool', cmd: 'arp-scan', args: '--help' },
    ],
  },
  {
    id: 'wireless',
    name: 'Wireless & Radio',
    icon: '📡',
    color: '#FFA726',
    tools: [
      { id: 'aircrack_ng', name: 'Aircrack-ng', icon: '🔑', desc: '802.11 WEP/WPA cracking', cmd: 'aircrack-ng', args: '--help', root: true },
      { id: 'wifite', name: 'Wifite', icon: '📶', desc: 'Automated WiFi auditor', cmd: 'wifite', args: '--help', root: true },
      { id: 'bluetoothctl', name: 'Bluetoothctl', icon: '🔵', desc: 'Bluetooth controller', cmd: 'bluetoothctl', args: '--help' },
      { id: 'hcitool', name: 'Hcitool', icon: '🦷', desc: 'Bluetooth config utility', cmd: 'hcitool', args: '--help' },
      { id: 'iw', name: 'IW', icon: '📻', desc: 'Wireless device config', cmd: 'iw', args: '--help' },
      { id: 'iwconfig', name: 'Iwconfig', icon: '🔧', desc: 'Wireless interface config', cmd: 'iwconfig', args: '--help' },
    ],
  },
  {
    id: 'stego',
    name: 'Steganography & Forensics',
    icon: '🔎',
    color: '#AB47BC',
    tools: [
      { id: 'steghide', name: 'Steghide', icon: '🖼️', desc: 'Hide data in images/audio', cmd: 'steghide', args: '--help' },
      { id: 'zsteg', name: 'Zsteg', icon: '🦓', desc: 'PNG/BMP stego detector', cmd: 'zsteg', args: '-h' },
      { id: 'exiftool', name: 'ExifTool', icon: '📷', desc: 'Metadata reader/writer', cmd: 'exiftool', args: '-ver' },
      { id: 'binwalk', name: 'Binwalk', icon: '🧩', desc: 'Firmware analysis tool', cmd: 'binwalk', args: '--help' },
      { id: 'foremost', name: 'Foremost', icon: '🗂️', desc: 'File carver & recovery', cmd: 'foremost', args: '-h' },
      { id: 'strings', name: 'Strings', icon: '🧵', desc: 'Print printable strings', cmd: 'strings', args: '--help' },
    ],
  },
  {
    id: 'crypto',
    name: 'Cryptography & Hashing',
    icon: '🔐',
    color: '#EF5350',
    tools: [
      { id: 'john', name: 'John', icon: '👤', desc: 'John the Ripper password cracker', cmd: 'john', args: '--help' },
      { id: 'hashcat', name: 'Hashcat', icon: '💻', desc: 'World fastest password cracker', cmd: 'hashcat', args: '--help' },
      { id: 'openssl', name: 'OpenSSL', icon: '🔒', desc: 'Cryptography toolkit', cmd: 'openssl', args: 'version' },
      { id: 'gpg', name: 'GPG', icon: '✉️', desc: 'GNU Privacy Guard', cmd: 'gpg', args: '--version' },
      { id: 'md5sum', name: 'MD5Sum', icon: '#️⃣', desc: 'MD5 checksum utility', cmd: 'md5sum', args: '--help' },
      { id: 'sha256sum', name: 'SHA256Sum', icon: '##', desc: 'SHA256 checksum utility', cmd: 'sha256sum', args: '--help' },
    ],
  },
];

// =============================================================================
// TOOL EXECUTION HELPERS
// =============================================================================

const MANU_SHELL = NativeModules.ManuShell || null;

const executeCommand = async (command, args = '') => {
  try {
    if (MANU_SHELL && MANU_SHELL.execute) {
      const result = await MANU_SHELL.execute(`${command} ${args}`);
      return result;
    }
    // Fallback: simulate execution for demo/development
    return {
      stdout: `[SIMULATED] Executed: ${command} ${args}\nCommand not available in this environment. Install via Termux or proot-distro.`,
      stderr: '',
      exitCode: 0,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: `Error: ${error.message}`,
      exitCode: 1,
    };
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ToolsScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('system');
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolOutput, setToolOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [customArgs, setCustomArgs] = useState('');
  const [showRootDialog, setShowRootDialog] = useState(false);
  const [rootTool, setRootTool] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerResults, setScannerResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showProotDialog, setShowProotDialog] = useState(false);
  const [showFamilyMode, setShowFamilyMode] = useState(false);
  const [familyResults, setFamilyResults] = useState([]);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [activeCategory]);

  const currentCategory = TOOL_CATEGORIES.find((c) => c.id === activeCategory);

  // Feature module executor — maps tool IDs to actual feature modules
  const executeFeatureTool = useCallback(async (toolId) => {
    const featureMap = {
      "smart_clipboard":  () => SmartClipboard.analyze?.(),
      "screenshot_ai":    () => ScreenshotAI.capture?.(),
      "privacy_scan":     () => PrivacyScan.scan?.(),
      "pattern_export":   () => PatternExport.export?.(),
      "voice_transcribe": () => VoiceTranscribe.start?.(),
      "screen_analyzer":  () => ScreenAnalyzer.analyze?.(),
      "storage_advisor":  () => StorageAdvisor.analyze?.(),
      "data_predictor":   () => DataPredictor.predict?.(),
      "update_intel":     () => UpdateIntel.check?.(),
      "auto_script":      () => AutoScript.run?.(),
      "reasoning":        () => ReasoningEngine.reason?.(),
      "qr_intel":         () => QRIntel.scan?.(),
      "root_detect":      () => RootDetect.check?.(),
      "emulator_detect":  () => EmulatorDetect.check?.(),
      "tamper_detect":    () => TamperDetect.check?.(),
      "perm_tracker":     () => PermissionTracker.audit?.(),
      "privacy_score":    () => PrivacyScore.calculate?.(),
      "cert_pinning":     () => CertPinning.verify?.(),
      "secure_erase":     () => SecureErase.wipe?.(),
      "password_ai":      () => PasswordAI.generate?.(),
      "passphrase_gen":   () => PassphraseGen.generate?.(),
      "bt_attack":        () => BTAttack.scan?.(),
      "phishing_scan":    () => PhishingScan.scan?.(),
      "fraud_shield":     () => FraudShield.check?.(),
      "fake_news":        () => FakeNewsDetect.analyze?.(),
      "deepfake_detect":  () => DeepfakeDetect.analyze?.(),
      "net_intrusion":    () => NetIntrusion.monitor?.(),
      "id_guard":         () => IDGuard.protect?.(),
      "evidence_log":     () => EvidenceLog.getRecent?.(),
    };
    const fn = featureMap[toolId];
    if (fn) {
      try {
        const result = await fn();
        return JSON.stringify(result || { status: "ok" }, null, 2);
      } catch (e) {
        return `Feature error: ${e.message}`;
      }
    }
    return null;
  }, []);
  const handleToolPress = useCallback((tool) => {
    if (tool.root) {
      setRootTool(tool);
      setShowRootDialog(true);
      return;
    }
    setSelectedTool(tool);
    setCustomArgs(tool.args || '');
    setToolOutput('');
    setShowOutputModal(true);
  }, []);

  const runTool = useCallback(async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setToolOutput(`$ ${selectedTool.cmd} ${customArgs}\n\nExecuting...\n`);
    const result = await executeCommand(selectedTool.cmd, customArgs);
    const output = result.stdout || result.stderr || 'No output';
    setToolOutput((prev) => prev + output + `\n\n[Exit Code: ${result.exitCode}]`);
    setIsExecuting(false);
  }, [selectedTool, customArgs]);

  const runRootTool = useCallback(async () => {
    if (!rootTool) return;
    setShowRootDialog(false);
    setSelectedTool(rootTool);
    setCustomArgs(rootTool.args || '');
    setToolOutput('');
    setShowOutputModal(true);
    // Attempt execution anyway; user may have root
    setIsExecuting(true);
    const result = await executeCommand(rootTool.cmd, rootTool.args);
    const output = result.stdout || result.stderr || 'No output';
    setToolOutput(`$ ${rootTool.cmd} ${rootTool.args}\n\n` + output + `\n\n[Exit Code: ${result.exitCode}]`);
    setIsExecuting(false);
  }, [rootTool]);

  // =============================================================================
  // J.A.R.V.I.S. UPGRADE: WiFi Security Scanner (Feature 13)
  // nmap + arp-scan integration, detect unknown devices
  // =============================================================================

  const runWiFiSecurityScanner = useCallback(async () => {
    setShowScanner(true);
    setScanning(true);
    setScannerResults([]);

    const results = [];

    // Step 1: ARP Scan for local devices
    results.push({ step: 'ARP Scan', status: 'running', detail: 'Discovering local network devices...' });
    setScannerResults([...results]);

    const arpResult = await executeCommand('arp-scan', '-l');
    const arpLines = arpResult.stdout.split('\n').filter((l) => l.includes('.'));
    const devices = arpLines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return { ip: parts[0], mac: parts[1] || 'Unknown', vendor: parts.slice(2).join(' ') || 'Unknown' };
    });

    results[0] = { step: 'ARP Scan', status: 'done', devices: devices.length, detail: `Found ${devices.length} devices` };
    setScannerResults([...results]);

    // Step 2: Nmap quick port scan on gateway
    results.push({ step: 'Nmap Gateway', status: 'running', detail: 'Scanning gateway ports...' });
    setScannerResults([...results]);

    const nmapResult = await executeCommand('nmap', '-sn 192.168.1.0/24');
    const nmapHosts = nmapResult.stdout.split('\n').filter((l) => l.includes('Nmap scan report'));

    results[1] = { step: 'Nmap Gateway', status: 'done', hosts: nmapHosts.length, detail: `Discovered ${nmapHosts.length} hosts` };
    setScannerResults([...results]);

    // Step 3: Detect unknown devices (compare with known MACs from AsyncStorage)
    results.push({ step: 'Device Analysis', status: 'running', detail: 'Checking for unknown devices...' });
    setScannerResults([...results]);

    let knownDevices = [];
    try {
      const stored = await AsyncStorage.getItem('manu_known_devices');
      if (stored) knownDevices = JSON.parse(stored);
    } catch (e) {
      knownDevices = [];
    }

    const unknownDevices = devices.filter((d) => !knownDevices.some((k) => k.mac === d.mac));
    const knownCount = devices.length - unknownDevices.length;

    results[2] = {
      step: 'Device Analysis',
      status: unknownDevices.length > 0 ? 'warning' : 'done',
      unknown: unknownDevices.length,
      known: knownCount,
      detail: unknownDevices.length > 0 ? `${unknownDevices.length} unknown device(s) detected!` : 'All devices recognized',
      devices: unknownDevices,
    };
    setScannerResults([...results]);
    setScanning(false);
  }, []);

  const saveKnownDevices = useCallback(async () => {
    const allDevices = scannerResults
      .find((r) => r.step === 'ARP Scan')
      ?.devices?.map((d) => ({ mac: d.mac, ip: d.ip, vendor: d.vendor })) || [];
    await AsyncStorage.setItem('manu_known_devices', JSON.stringify(allDevices));
    Alert.alert('Saved', 'Current devices marked as known. Future scans will flag new devices.');
  }, [scannerResults]);

  // =============================================================================
  // FAMILY USE: Monitor network activity, check for unauthorized apps
  // =============================================================================

  const runFamilyMonitor = useCallback(async () => {
    setShowFamilyMode(true);
    setFamilyResults([]);

    const results = [];

    // Check running network processes
    results.push({ check: 'Active Network Connections', status: 'running' });
    setFamilyResults([...results]);

    const netstatResult = await executeCommand('netstat', '-tunap');
    const connections = netstatResult.stdout.split('\n').filter((l) => l.includes('ESTABLISHED') || l.includes('LISTEN'));

    results[0] = {
      check: 'Active Network Connections',
      status: 'done',
      count: connections.length,
      detail: `${connections.length} active connections`,
      items: connections.slice(0, 20),
    };
    setFamilyResults([...results]);

    // Check installed packages for suspicious apps
    results.push({ check: 'Installed Packages', status: 'running' });
    setFamilyResults([...results]);

    const pkgResult = await executeCommand('pm', 'list packages -f');
    const packages = pkgResult.stdout.split('\n').filter((l) => l.includes('package:'));
    const suspicious = packages.filter((p) =>
      /spy|keylogger|trojan|rat|backdoor|malware/i.test(p)
    );

    results[1] = {
      check: 'Installed Packages',
      status: suspicious.length > 0 ? 'warning' : 'done',
      count: packages.length,
      suspicious: suspicious.length,
      detail: suspicious.length > 0 ? `${suspicious.length} suspicious app(s) found!` : 'No suspicious apps detected',
      items: suspicious,
    };
    setFamilyResults([...results]);

    // Check for unauthorized listening ports
    results.push({ check: 'Unauthorized Ports', status: 'running' });
    setFamilyResults([...results]);

    const portsResult = await executeCommand('ss', '-tlnp');
    const unusualPorts = portsResult.stdout.split('\n').filter((l) => {
      const match = l.match(/:(\d+)/);
      if (!match) return false;
      const port = parseInt(match[1]);
      return port > 50000 || (port < 1024 && port !== 22 && port !== 80 && port !== 443);
    });

    results[2] = {
      check: 'Unauthorized Ports',
      status: unusualPorts.length > 0 ? 'warning' : 'done',
      count: unusualPorts.length,
      detail: unusualPorts.length > 0 ? `${unusualPorts.length} unusual port(s) detected` : 'No unusual ports found',
      items: unusualPorts,
    };
    setFamilyResults([...results]);
  }, []);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderCategoryTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
      {TOOL_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => setActiveCategory(cat.id)}
          style={[
            styles.tabButton,
            activeCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
          ]}
        >
          <Text style={styles.tabIcon}>{cat.icon}</Text>
          <Text
            style={[
              styles.tabText,
              activeCategory === cat.id && styles.tabTextActive,
            ]}
            numberOfLines={1}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderToolGrid = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.gridContainer}>
        {currentCategory.tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            onPress={() => handleToolPress(tool)}
            onLongPress={() => {
              Alert.alert(tool.name, tool.desc, [
                { text: 'Run', onPress: () => handleToolPress(tool) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            style={styles.toolCard}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconContainer}>
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              {tool.root && (
                <View style={styles.rootBadge}>
                  <Text style={styles.rootBadgeText}>ROOT</Text>
                </View>
              )}
            </View>
            <Text style={styles.toolName} numberOfLines={1}>{tool.name}</Text>
            <Text style={styles.toolDesc} numberOfLines={2}>{tool.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 Tools Arsenal</Text>
        <Text style={styles.headerSubtitle}>5 Categories • 30+ Cybersecurity Tools</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={runWiFiSecurityScanner}>
          <Text style={styles.quickBtnIcon}>📡</Text>
          <Text style={styles.quickBtnText}>WiFi Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={runFamilyMonitor}>
          <Text style={styles.quickBtnIcon}>👨‍👩‍👧</Text>
          <Text style={styles.quickBtnText}>Family Monitor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setShowProotDialog(true)}>
          <Text style={styles.quickBtnIcon}>🐉</Text>
          <Text style={styles.quickBtnText}>Kali (proot)</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      {renderCategoryTabs()}

      {/* Tool Grid */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        <Text style={styles.categoryTitle}>
          {currentCategory.icon} {currentCategory.name}
        </Text>
        {renderToolGrid()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ================================================================= */}
      {/* ROOT REQUIRED DIALOG */}
      {/* ================================================================= */}
      <Modal visible={showRootDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Root Access Required</Text>
            <Text style={styles.modalBody}>
              <Text style={{ fontWeight: 'bold' }}>{rootTool?.name}</Text> requires root (superuser) privileges to function correctly.{'\n\n'}
              Why? This tool needs direct access to wireless interfaces, raw sockets, or system-level hardware that Android restricts for security reasons.{'\n\n'}
              <Text style={{ color: '#EF5350' }}>Without root, the command will likely fail or return limited results.</Text>
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setShowRootDialog(false)}>
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={runRootTool}>
                <Text style={styles.modalBtnTextPrimary}>Try Anyway</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setShowRootDialog(false); setShowProotDialog(true); }}>
              <Text style={styles.modalLink}>💡 Use proot-distro Kali Linux instead (no root needed)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* TOOL OUTPUT MODAL */}
      {/* ================================================================= */}
      <Modal visible={showOutputModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: height * 0.85 }]}>
            <View style={styles.outputHeader}>
              <Text style={styles.outputTitle}>{selectedTool?.icon} {selectedTool?.name}</Text>
              <TouchableOpacity onPress={() => setShowOutputModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.outputLabel}>Command Arguments:</Text>
            <TextInput
              style={styles.argsInput}
              value={customArgs}
              onChangeText={setCustomArgs}
              placeholder="Enter custom arguments..."
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.runBtn, isExecuting && styles.runBtnDisabled]}
              onPress={runTool}
              disabled={isExecuting}
            >
              <Text style={styles.runBtnText}>
                {isExecuting ? '⏳ Executing...' : '▶ Run Command'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.outputLabel}>Terminal Output:</Text>
            <ScrollView style={styles.terminalOutput}>
              <Text style={styles.terminalText}>{toolOutput || 'Press "Run Command" to execute...'}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* WiFi SECURITY SCANNER MODAL */}
      {/* ================================================================= */}
      <Modal visible={showScanner} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: height * 0.9 }]}>
            <View style={styles.outputHeader}>
              <Text style={styles.outputTitle}>📡 WiFi Security Scanner</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.scannerSubtitle}>J.A.R.V.I.S. Upgrade — Feature 13</Text>

            {scanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color="#4FC3F7" />
                <Text style={styles.scanningText}>Scanning network... Please wait</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: height * 0.55 }}>
              {scannerResults.map((result, idx) => (
                <View key={idx} style={styles.scanResultCard}>
                  <View style={styles.scanResultHeader}>
                    <Text style={styles.scanResultStep}>{result.step}</Text>
                    <View style={[
                      styles.statusBadge,
                      result.status === 'done' && styles.statusDone,
                      result.status === 'warning' && styles.statusWarning,
                      result.status === 'running' && styles.statusRunning,
                    ]}>
                      <Text style={styles.statusBadgeText}>{result.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.scanResultDetail}>{result.detail}</Text>
                  {result.devices && result.devices.length > 0 && (
                    <View style={styles.deviceList}>
                      {result.devices.map((dev, dIdx) => (
                        <View key={dIdx} style={styles.deviceItem}>
                          <Text style={styles.deviceText}>🖥️ {dev.ip} | {dev.mac} | {dev.vendor}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            {!scanning && scannerResults.length > 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={saveKnownDevices}>
                <Text style={styles.saveBtnText}>💾 Mark All as Known Devices</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* FAMILY MONITOR MODAL */}
      {/* ================================================================= */}
      <Modal visible={showFamilyMode} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: height * 0.9 }]}>
            <View style={styles.outputHeader}>
              <Text style={styles.outputTitle}>👨‍👩‍👧 Family Network Monitor</Text>
              <TouchableOpacity onPress={() => setShowFamilyMode(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.scannerSubtitle}>Monitor network activity & check for unauthorized apps</Text>

            <ScrollView style={{ maxHeight: height * 0.55 }}>
              {familyResults.map((result, idx) => (
                <View key={idx} style={styles.scanResultCard}>
                  <View style={styles.scanResultHeader}>
                    <Text style={styles.scanResultStep}>{result.check}</Text>
                    <View style={[
                      styles.statusBadge,
                      result.status === 'done' && styles.statusDone,
                      result.status === 'warning' && styles.statusWarning,
                      result.status === 'running' && styles.statusRunning,
                    ]}>
                      <Text style={styles.statusBadgeText}>{result.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.scanResultDetail}>{result.detail}</Text>
                  {result.items && result.items.length > 0 && (
                    <View style={styles.deviceList}>
                      {result.items.slice(0, 10).map((item, iIdx) => (
                        <View key={iIdx} style={styles.deviceItem}>
                          <Text style={styles.deviceText} numberOfLines={1}>• {item}</Text>
                        </View>
                      ))}
                      {result.items.length > 10 && (
                        <Text style={styles.moreText}>...and {result.items.length - 10} more</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* PROOT-DISTRO KALI LINUX DIALOG */}
      {/* ================================================================= */}
      <Modal visible={showProotDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🐉 proot-distro Kali Linux</Text>
            <Text style={styles.modalBody}>
              Run a full Kali Linux environment <Text style={{ fontWeight: 'bold' }}>without root access</Text> using proot-distro.{'\n\n'}
              <Text style={{ color: '#66BB6A' }}>✓ No root required</Text>{'\n'}
              <Text style={{ color: '#66BB6A' }}>✓ All tools pre-installed</Text>{'\n'}
              <Text style={{ color: '#66BB6A' }}>✓ Isolated environment</Text>{'\n\n'}
              To install:{\n'}
              <Text style={styles.codeBlock}>pkg install proot-distro{'\n'}proot-distro install kali{'\n'}proot-distro login kali</Text>
              {'\n'}Once inside Kali, all tools (including aircrack-ng, wifite, etc.) work out of the box.
            </Text>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={() => setShowProotDialog(false)}>
              <Text style={styles.modalBtnTextPrimary}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E6EDF3',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B949E',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B22',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  quickBtnIcon: {
    fontSize: 22,
  },
  quickBtnText: {
    fontSize: 11,
    color: '#C9D1D9',
    marginTop: 4,
    fontWeight: '600',
  },
  tabContainer: {
    maxHeight: 70,
    backgroundColor: '#0D1117',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    color: '#8B949E',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  toolCard: {
    width: CARD_SIZE - 8,
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 10,
    margin: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
    minHeight: 110,
    justifyContent: 'center',
  },
  toolIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  toolIcon: {
    fontSize: 28,
  },
  rootBadge: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: '#EF5350',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rootBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  toolName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E6EDF3',
    textAlign: 'center',
  },
  toolDesc: {
    fontSize: 10,
    color: '#8B949E',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: '#C9D1D9',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalBtnPrimary: {
    backgroundColor: '#238636',
  },
  modalBtnSecondary: {
    backgroundColor: '#21262D',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalBtnTextSecondary: {
    color: '#C9D1D9',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalLink: {
    color: '#58A6FF',
    fontSize: 13,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  codeBlock: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0D1117',
    color: '#7EE787',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
    paddingBottom: 10,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E6EDF3',
  },
  closeBtn: {
    fontSize: 20,
    color: '#8B949E',
    padding: 4,
  },
  outputLabel: {
    fontSize: 13,
    color: '#8B949E',
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '600',
  },
  argsInput: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E6EDF3',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  runBtn: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  runBtnDisabled: {
    backgroundColor: '#1F4D2E',
  },
  runBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  terminalOutput: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 12,
    maxHeight: 200,
    marginTop: 4,
  },
  terminalText: {
    color: '#7EE787',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  scannerSubtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scanningIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scanningText: {
    color: '#C9D1D9',
    marginTop: 10,
    fontSize: 14,
  },
  scanResultCard: {
    backgroundColor: '#0D1117',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  scanResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scanResultStep: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E6EDF3',
  },
  scanResultDetail: {
    fontSize: 13,
    color: '#C9D1D9',
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDone: {
    backgroundColor: '#238636',
  },
  statusWarning: {
    backgroundColor: '#D29922',
  },
  statusRunning: {
    backgroundColor: '#1F6FEB',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deviceList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  deviceItem: {
    paddingVertical: 4,
  },
  deviceText: {
    fontSize: 12,
    color: '#C9D1D9',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  moreText: {
    fontSize: 12,
    color: '#8B949E',
    fontStyle: 'italic',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#1F6FEB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
import AsyncStorage from '@react-native-async-storage/async-storage';
