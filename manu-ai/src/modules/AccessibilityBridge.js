// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 3/20 — Device Automation via Android Accessibility Service
// File: src/modules/AccessibilityBridge.js
// Generated: 2026-06-24

import { NativeModules } from 'react-native';

const { DeviceControlModule } = NativeModules;

/**
 * Safety wrapper — returns a rejected Promise if the native module is unavailable.
 */
const safePerformAction = (action, params = {}) => {
  if (!DeviceControlModule) {
    return Promise.reject(
      new Error('DeviceControlModule is not linked. Ensure DeviceControlPackage is registered in MainApplication.')
    );
  }
  return DeviceControlModule.performAction(action, params);
};

/**
 * AccessibilityBridge — JavaScript interface for all device control actions.
 *
 * Every method returns a Promise that resolves with:
 *   { success: boolean, ...additional fields depending on action }
 *
 * Usage:
 *   AccessibilityBridge.goHome().then(res => console.log(res.success));
 *   AccessibilityBridge.readScreen().then(res => console.log(res.content));
 *   AccessibilityBridge.tapByText('Submit').then(res => console.log(res.success));
 */
const AccessibilityBridge = {
  // -----------------------------------------------------------------------
  // Navigation Actions
  // -----------------------------------------------------------------------

  /** Simulate system Back button press. */
  goBack: () => safePerformAction('GLOBAL_ACTION_BACK'),

  /** Navigate to Home screen. */
  goHome: () => safePerformAction('GLOBAL_ACTION_HOME'),

  /** Open Recent Apps screen. */
  openRecents: () => safePerformAction('GLOBAL_ACTION_RECENTS'),

  /** Expand notification shade. */
  openNotifications: () => safePerformAction('GLOBAL_ACTION_NOTIFICATIONS'),

  /** Expand Quick Settings panel. */
  openQuickSettings: () => safePerformAction('GLOBAL_ACTION_QUICK_SETTINGS'),

  // -----------------------------------------------------------------------
  // Screen Reading
  // -----------------------------------------------------------------------

  /**
   * Read all visible text content from the current screen.
   * @returns {Promise<{success: boolean, content: string}>}
   */
  readScreen: () => safePerformAction('READ_SCREEN'),

  // -----------------------------------------------------------------------
  // UI Interaction
  // -----------------------------------------------------------------------

  /**
   * Find a clickable UI element by its text or content-description and tap it.
   * @param {string} label — Text to search for (case-insensitive partial match)
   * @returns {Promise<{success: boolean}>}
   */
  tapByText: (label) => safePerformAction('TAP_BY_TEXT', { label }),

  /**
   * Type text into the currently focused input field.
   * @param {string} text — Text to input
   * @returns {Promise<{success: boolean}>}
   */
  typeText: (text) => safePerformAction('TYPE_TEXT', { text }),

  // -----------------------------------------------------------------------
  // Volume Control
  // -----------------------------------------------------------------------

  /** Increase media volume. */
  volumeUp: () => safePerformAction('VOLUME_UP'),

  /** Decrease media volume. */
  volumeDown: () => safePerformAction('VOLUME_DOWN'),

  /** Toggle mute state. */
  volumeMute: () => safePerformAction('VOLUME_MUTE'),

  // -----------------------------------------------------------------------
  // Brightness Control
  // -----------------------------------------------------------------------

  /**
   * Set screen brightness level.
   * Requires WRITE_SETTINGS permission (user must grant via system dialog).
   * @param {number} level — 0 (darkest) to 255 (brightest)
   * @returns {Promise<{success: boolean}>}
   */
  setBrightness: (level) => safePerformAction('SET_BRIGHTNESS', { level }),

  // -----------------------------------------------------------------------
  // Hardware Toggles
  // -----------------------------------------------------------------------

  /** Toggle Bluetooth adapter (or open Bluetooth settings on Android 13+). */
  toggleBluetooth: () => safePerformAction('TOGGLE_BLUETOOTH'),

  /** Toggle WiFi adapter (or open WiFi panel on Android 10+). */
  toggleWifi: () => safePerformAction('TOGGLE_WIFI'),

  /** Toggle device flashlight (camera torch). */
  toggleFlashlight: () => safePerformAction('TOGGLE_FLASHLIGHT'),

  // -----------------------------------------------------------------------
  // App Launcher
  // -----------------------------------------------------------------------

  /**
   * Launch an application by its package name.
   * @param {string} packageName — e.g., "com.whatsapp", "com.android.settings"
   * @returns {Promise<{success: boolean}>}
   */
  openApp: (packageName) => safePerformAction('OPEN_APP', { packageName }),

  // -----------------------------------------------------------------------
  // Text-to-Speech
  // -----------------------------------------------------------------------

  /**
   * Read aloud the provided text using system TTS engine.
   * @param {string} text — Text to speak
   * @returns {Promise<{success: boolean}>}
   */
  speakText: (text) => safePerformAction('TEXT_TO_SPEECH', { text }),

  /** Stop any ongoing TTS playback. */
  stopTTS: () => safePerformAction('STOP_TTS'),

  // -----------------------------------------------------------------------
  // Screenshot
  // -----------------------------------------------------------------------

  /**
   * Capture a screenshot using MediaProjection.
   * Requires prior user consent via MediaProjection permission dialog.
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  takeScreenshot: () => safePerformAction('SCREENSHOT'),

  // -----------------------------------------------------------------------
  // Service Status
  // -----------------------------------------------------------------------

  /**
   * Check whether the accessibility service is currently enabled and connected.
   * @returns {Promise<boolean>}
   */
  isServiceEnabled: () => {
    if (!DeviceControlModule) {
      return Promise.resolve(false);
    }
    return DeviceControlModule.isAccessibilityServiceEnabled();
  },
};

export default AccessibilityBridge;
