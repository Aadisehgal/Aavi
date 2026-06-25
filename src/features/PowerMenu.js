// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/PowerMenu.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  NativeModules,
  Platform,
} from 'react-native';

const { PowerMenuModule } = NativeModules;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MENU_ITEMS = [
  { id: 'restart', label: 'Restart MANU', icon: '↻', color: '#00F0FF' },
  { id: 'settings', label: 'Settings', icon: '⚙', color: '#00FF88' },
  { id: 'voice', label: 'Voice Mode', icon: '🎙', color: '#FFAA00' },
  { id: 'lock', label: 'Lock Screen', icon: '🔒', color: '#FF0055' },
  { id: 'airplane', label: 'Airplane Mode', icon: '✈', color: '#AA00FF' },
  { id: 'flashlight', label: 'Flashlight', icon: '🔦', color: '#FFFF00' },
  { id: 'screenshot', label: 'Screenshot', icon: '📷', color: '#00FFFF' },
  { id: 'cancel', label: 'Cancel', icon: '✕', color: '#888888' },
];

export default function PowerMenu() {
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(MENU_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (Platform.OS === 'android' && PowerMenuModule) {
      PowerMenuModule.addListener('onLongPressPower', () => {
        showMenu();
      });
    }
    return () => {
      if (Platform.OS === 'android' && PowerMenuModule) {
        PowerMenuModule.removeAllListeners?.();
      }
    };
  }, []);

  const showMenu = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    setVisible(true);
    setSelectedIndex(-1);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.stagger(
        50,
        itemAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true })
        )
      ),
    ]).start();
  };

  const hideMenu = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      itemAnims.forEach((anim) => anim.setValue(0));
      callback?.();
    });
  };

  const handleSelect = (item, index) => {
    setSelectedIndex(index);
    Vibration.vibrate(30);

    switch (item.id) {
      case 'cancel':
        hideMenu();
        break;
      case 'restart':
        hideMenu(() => {
          if (global.MANUCore) global.MANUCore.restart();
        });
        break;
      case 'lock':
        hideMenu(() => {
          if (PowerMenuModule) PowerMenuModule.lockScreen();
        });
        break;
      case 'flashlight':
        hideMenu(() => {
          if (PowerMenuModule) PowerMenuModule.toggleFlashlight();
        });
        break;
      case 'screenshot':
        hideMenu(() => {
          if (PowerMenuModule) PowerMenuModule.takeScreenshot();
        });
        break;
      default:
        hideMenu(() => {
          if (global.MANUCore) global.MANUCore.executeAction(item.id);
        });
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => hideMenu()}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.dismissArea} onPress={() => hideMenu()} />

        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>MANU POWER MENU</Text>
            <View style={styles.headerLine} />
          </View>

          <View style={styles.grid}>
            {MENU_ITEMS.map((item, index) => (
              <Animated.View
                key={item.id}
                style={{
                  transform: [{ scale: itemAnims[index] }],
                  opacity: itemAnims[index],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    selectedIndex === index && { borderColor: item.color, backgroundColor: `${item.color}20` },
                  ]}
                  onPress={() => handleSelect(item, index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.icon, { color: item.color }]}>{item.icon}</Text>
                  <Text style={[styles.label, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    width: SCREEN_W * 0.85,
    maxHeight: SCREEN_H * 0.7,
    backgroundColor: 'rgba(15,15,25,0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    padding: 20,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  headerLine: {
    width: 60,
    height: 2,
    backgroundColor: '#00F0FF',
    marginTop: 8,
    borderRadius: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (SCREEN_W * 0.85 - 60) / 2,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
