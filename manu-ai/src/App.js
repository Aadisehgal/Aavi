import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, SafeAreaView,
  Animated, TouchableOpacity, Dimensions, ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from './theme';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import ToolsScreen from './screens/ToolsScreen';
import ArmorScreen from './screens/ArmorScreen';
import SettingsScreen from './screens/SettingsScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import PersonalityScreen from './screens/PersonalityScreen';
import TerminalScreen from './screens/TerminalScreen';

// Background Services
import AmbientAwareness from './features/AmbientAwareness';
import SecurityMonitor from './features/SecurityMonitor';
import ThreatShield from './features/ThreatShield';
import NotificationAI from './features/NotificationAI';
import HabitLearner from './features/HabitLearner';
import NetworkAdapt from './features/NetworkAdapt';
import BatteryPredictor from './features/BatteryPredictor';
import MemoryHandler from './features/MemoryHandler';
import HealthReminders from './features/HealthReminders';
import PredictiveEngine from './features/PredictiveEngine';
import ArmorMode from './security/ArmorMode';
import CyberShield from './security/CyberShield';
import IntruderDetect from './security/IntruderDetect';
import SelfHealingEngine from './engine/SelfHealingEngine';

const { width } = Dimensions.get('window');

const PRIMARY_TABS = [
  { id: 'dashboard',    label: 'HUD',         icon: '⬡' },
  { id: 'chat',         label: 'Chat',        icon: '◈' },
  { id: 'tools',        label: 'Tools',       icon: '⚙' },
  { id: 'armor',        label: 'Armor',       icon: '⬟' },
  { id: 'more',         label: 'More',        icon: '⋯' },
];

const MORE_SCREENS = [
  { id: 'settings',    label: 'Settings',     icon: '≡',  desc: 'API keys, voice, permissions' },
  { id: 'personality', label: 'Personality',  icon: '◉',  desc: 'AI persona, tone, voice style' },
  { id: 'terminal',    label: 'Terminal',     icon: '>_', desc: 'Shell access, ADB commands' },
];

const App = () => {
  const [isReady, setIsReady]     = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEmergency, setShowEmergency] = useState(false);
  const [showMore, setShowMore]   = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus]     = useState('Initializing core systems...');

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const moreAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => { bootSequence(); }, []);

  const bootSequence = async () => {
    const steps = [
      { msg: 'Loading AI core...', pct: 0.15 },
      { msg: 'Starting security modules...', pct: 0.30 },
      { msg: 'Wiring 200+ feature engines...', pct: 0.50 },
      { msg: 'Activating background services...', pct: 0.70 },
      { msg: 'Calibrating sensors...', pct: 0.85 },
      { msg: 'All systems online.', pct: 1.0 },
    ];
    for (const step of steps) {
      setBootStatus(step.msg);
      setBootProgress(step.pct);
      Animated.timing(progressAnim, { toValue: step.pct, duration: 400, useNativeDriver: false }).start();
      await new Promise(r => setTimeout(r, 400));
    }
    // Start all background services
    const services = [
      AmbientAwareness, SecurityMonitor, ThreatShield, NotificationAI,
      HabitLearner, NetworkAdapt, BatteryPredictor, MemoryHandler,
      HealthReminders, PredictiveEngine, ArmorMode, CyberShield,
      IntruderDetect, SelfHealingEngine,
    ];
    for (const svc of services) {
      try { svc.start?.() || svc.init?.(); } catch (_) {}
    }
    setIsReady(true);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  };

  const openMore = () => {
    setShowMore(true);
    Animated.timing(moreAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const closeMore = () => {
    Animated.timing(moreAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowMore(false));
  };

  const handleMoreSelect = (id) => {
    closeMore();
    setActiveTab(id);
  };

  const renderScreen = () => {
    if (showEmergency) return <EmergencyScreen onClose={() => setShowEmergency(false)} />;
    switch (activeTab) {
      case 'dashboard':   return <DashboardScreen onEmergency={() => setShowEmergency(true)} />;
      case 'chat':        return <ChatScreen />;
      case 'tools':       return <ToolsScreen />;
      case 'armor':       return <ArmorScreen onEmergency={() => setShowEmergency(true)} />;
      case 'settings':    return <SettingsScreen />;
      case 'personality': return <PersonalityScreen />;
      case 'terminal':    return <TerminalScreen />;
      default:            return <DashboardScreen />;
    }
  };

  if (!isReady) {
    return (
      <View style={s.bootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={s.bootContent}>
          <Text style={s.bootLogo}>J.A.R.V.I.S.</Text>
          <Text style={s.bootEdition}>MANU AI — v2.0</Text>
          <View style={s.bootTrack}>
            <Animated.View style={[s.bootFill, {
              width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] })
            }]} />
          </View>
          <Text style={s.bootStatus}>{bootStatus}</Text>
          <Text style={s.bootPct}>{Math.round(bootProgress * 100)}%</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* SOS Button */}
      <TouchableOpacity style={s.sosBtn} onPress={() => setShowEmergency(true)}>
        <Text style={s.sosTxt}>SOS</Text>
      </TouchableOpacity>

      {/* Screen Content */}
      <Animated.View style={[s.screen, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {renderScreen()}
      </Animated.View>

      {/* More Drawer */}
      {showMore && (
        <TouchableOpacity style={s.overlay} onPress={closeMore} activeOpacity={1}>
          <Animated.View style={[s.moreDrawer, {
            opacity: moreAnim,
            transform: [{ translateY: moreAnim.interpolate({ inputRange:[0,1], outputRange:[40,0] }) }]
          }]}>
            <Text style={s.moreTitle}>MORE SCREENS</Text>
            {MORE_SCREENS.map(sc => (
              <TouchableOpacity key={sc.id} style={s.moreItem} onPress={() => handleMoreSelect(sc.id)}>
                <Text style={s.moreIcon}>{sc.icon}</Text>
                <View>
                  <Text style={s.moreLabel}>{sc.label}</Text>
                  <Text style={s.moreDesc}>{sc.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      {!showEmergency && (
        <View style={s.tabBar}>
          {PRIMARY_TABS.map(tab => {
            const isActive = activeTab === tab.id ||
              (tab.id === 'more' && ['settings','personality','terminal'].includes(activeTab));
            return (
              <TouchableOpacity
                key={tab.id}
                style={s.tabItem}
                onPress={() => tab.id === 'more' ? openMore() : setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabIcon, isActive && s.tabIconActive]}>{tab.icon}</Text>
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
                {isActive && <View style={s.tabDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  bootContainer: { flex:1, backgroundColor:'#000', justifyContent:'center', alignItems:'center' },
  bootContent: { alignItems:'center', width:'80%' },
  bootLogo: { fontSize:38, fontWeight:'bold', color:'#00e5ff', letterSpacing:8, marginBottom:4,
    textShadowColor:'#00e5ff', textShadowOffset:{width:0,height:0}, textShadowRadius:20 },
  bootEdition: { fontSize:13, color:'#546e7a', letterSpacing:3, marginBottom:40 },
  bootTrack: { width:'100%', height:2, backgroundColor:'#0d1117', borderRadius:1, overflow:'hidden', marginBottom:16 },
  bootFill: { height:'100%', backgroundColor:'#00e5ff' },
  bootStatus: { fontSize:12, color:'#00e5ff', letterSpacing:1, marginBottom:8 },
  bootPct: { fontSize:11, color:'#37474f' },
  container: { flex:1, backgroundColor:'#000' },
  sosBtn: { position:'absolute', top:10, right:14, zIndex:999, backgroundColor:'#b71c1c',
    borderRadius:6, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'#ef5350' },
  sosTxt: { color:'#fff', fontSize:11, fontWeight:'bold', letterSpacing:1 },
  screen: { flex:1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex:500, justifyContent:'flex-end' },
  moreDrawer: { backgroundColor:'#0a0f1a', borderTopWidth:1, borderColor:'#1a2332',
    paddingHorizontal:20, paddingTop:16, paddingBottom:30 },
  moreTitle: { color:'#37474f', fontSize:10, letterSpacing:2, marginBottom:12 },
  moreItem: { flexDirection:'row', alignItems:'center', paddingVertical:12,
    borderBottomWidth:1, borderColor:'#0d1b2a' },
  moreIcon: { fontSize:18, color:'#00e5ff', width:36 },
  moreLabel: { color:'#e0e0e0', fontSize:14, fontWeight:'600' },
  moreDesc: { color:'#546e7a', fontSize:11, marginTop:2 },
  tabBar: { flexDirection:'row', backgroundColor:'#0a0a0a',
    borderTopWidth:1, borderTopColor:'#1a2332', paddingBottom:4, paddingTop:6 },
  tabItem: { flex:1, alignItems:'center', paddingVertical:4, position:'relative' },
  tabIcon: { fontSize:18, color:'#37474f', marginBottom:2 },
  tabIconActive: { color:'#00e5ff', textShadowColor:'#00e5ff', textShadowOffset:{width:0,height:0}, textShadowRadius:8 },
  tabLabel: { fontSize:10, color:'#37474f', letterSpacing:0.5 },
  tabLabelActive: { color:'#00e5ff' },
  tabDot: { position:'absolute', bottom:-6, width:20, height:2, backgroundColor:'#00e5ff', borderRadius:1 },
});

export default App;
