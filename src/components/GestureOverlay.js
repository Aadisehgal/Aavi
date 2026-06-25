// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/components/GestureOverlay.js
// Purpose: Full-screen transparent overlay that listens for swipe / tap gestures
//          and dispatches named actions via GestureModule or callback

import React, { useRef, useCallback } from 'react';
import {
  View, StyleSheet, PanResponder, NativeModules, Platform,
} from 'react-native';

const { GestureModule } = NativeModules;

const SWIPE_THRESHOLD = 50;   // px minimum to register swipe
const SWIPE_VELOCITY  = 0.25; // vx/vy minimum

/**
 * GestureOverlay — wraps children in a full-screen PanResponder overlay.
 *
 * Props:
 *   onGesture  {(gesture: string) => void}  — callback with gesture name:
 *              'SWIPE_UP' | 'SWIPE_DOWN' | 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'DOUBLE_TAP'
 *   children   {ReactNode}                  — content to render beneath the overlay
 *   disabled   {boolean}                    — if true, overlay is transparent and passive
 */
export default function GestureOverlay({ onGesture, children, disabled = false }) {
  const lastTap = useRef(0);

  const dispatch = useCallback((gesture) => {
    if (disabled) return;
    onGesture?.(gesture);
    // Also forward to native GestureModule if available
    GestureModule?.reportGesture?.(gesture).catch?.(() => {});
  }, [disabled, onGesture]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,

      onPanResponderRelease: (evt, gesture) => {
        const { dx, dy, vx, vy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Double tap detection
        if (absDx < 10 && absDy < 10) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            dispatch('DOUBLE_TAP');
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
          return;
        }

        // Swipe detection
        if (absDx > absDy && absDx > SWIPE_THRESHOLD && Math.abs(vx) > SWIPE_VELOCITY) {
          dispatch(dx > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT');
        } else if (absDy > absDx && absDy > SWIPE_THRESHOLD && Math.abs(vy) > SWIPE_VELOCITY) {
          dispatch(dy > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP');
        }
      },
    })
  ).current;

  return (
    <View style={styles.root} {...(disabled ? {} : panResponder.panHandlers)}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
