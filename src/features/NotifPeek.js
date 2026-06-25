// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: src/features/NotifPeek.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

const { NotifPeekModule } = NativeModules;
const notifEmitter = NotifPeekModule ? new NativeEventEmitter(NotifPeekModule) : null;

const { width: SCREEN_W } = Dimensions.get('window');

export default function NotifPeek() {
  const [notification, setNotification] = useState(null);
  const [hovered, setHovered] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hoverTimer = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    NotifPeekModule?.startListening?.().catch(() => {});
    const subscription = notifEmitter?.addListener('onNotificationPeek', (data) => {
      showNotification(data);
    });

    return () => {
      subscription?.remove();
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const showNotification = useCallback((data) => {
    setNotification(data);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    hoverTimer.current = setTimeout(() => {
      if (!hovered) {
        hideNotification();
      }
    }, 4000);
  }, [hovered]);

  const hideNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setNotification(null);
      setHovered(false);
    });
  }, []);

  const handleHoverIn = () => {
    setHovered(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  const handleHoverOut = () => {
    setHovered(false);
    hoverTimer.current = setTimeout(hideNotification, 2000);
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      onMouseEnter={handleHoverIn}
      onMouseLeave={handleHoverOut}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (Platform.OS === 'android' && NotifPeekModule) {
            NotifPeekModule.openNotification(notification.id).catch(() => {});
          }
          hideNotification();
        }}
        onLongPress={handleHoverIn}
      >
        <View style={styles.inner}>
          <View style={[styles.appIcon, { backgroundColor: notification.color || '#00F0FF' }]}>
            <Text style={styles.iconText}>{(notification.appName || '?')[0]}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.appName}>{notification.appName || 'Unknown'}</Text>
            <Text style={styles.title} numberOfLines={1}>{notification.title || ''}</Text>
            <Text style={styles.body} numberOfLines={2}>{notification.body || ''}</Text>
          </View>
          <TouchableOpacity onPress={hideNotification} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 10001,
    elevation: 10001,
  },
  inner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,15,30,0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    padding: 12,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  appName: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  body: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,0,85,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dismissText: {
    color: '#FF0055',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
