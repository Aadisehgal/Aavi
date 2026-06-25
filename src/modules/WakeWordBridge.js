// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 2/20 — Wake Word Detection with 'Hey Manu' Trigger
// File: src/modules/WakeWordBridge.js
// Generated: 2026-06-24

import {
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

/**
 * WakeWordBridge — JavaScript bridge to communicate with the Android wake word service.
 *
 * This module provides a clean JS API to:
 *   - Start/stop the wake word detection service
 *   - Subscribe to wake word detection events
 *   - Subscribe to dream state changes
 *   - Query service status and device capabilities
 *
 * All methods return Promises for async operations.
 * Event subscriptions use the standard React Native EventEmitter pattern.
 */

const { WakeWordBridge } = NativeModules;

// Create event emitter for wake word events
const wakeWordEventEmitter = new NativeEventEmitter(WakeWordBridge);

// ==================== SERVICE CONTROL ====================

/**
 * Start the wake word detection service.
 * The service will run in the foreground and listen for "Hey Manu" continuously.
 * @returns {Promise<{isRunning: boolean, message: string, timestamp: number}>}
 */
export async function startWakeWordService() {
  if (Platform.OS !== 'android') {
    return Promise.reject(new Error('Wake word service is only available on Android'));
  }
  return WakeWordBridge.startService();
}

/**
 * Stop the wake word detection service.
 * This will terminate the background listening.
 * @returns {Promise<{isRunning: boolean, message: string, timestamp: number}>}
 */
export async function stopWakeWordService() {
  if (Platform.OS !== 'android') {
    return Promise.reject(new Error('Wake word service is only available on Android'));
  }
  return WakeWordBridge.stopService();
}

// ==================== STATUS QUERIES ====================

/**
 * Check if the wake word service is currently running.
 * @returns {Promise<boolean>}
 */
export async function isServiceRunning() {
  if (Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return WakeWordBridge.isServiceRunning();
}

/**
 * Check if the device is currently in dream state (screen off, low-power mode).
 * @returns {Promise<boolean>}
 */
export async function isDreamState() {
  if (Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return WakeWordBridge.isDreamState();
}

/**
 * Check if the device supports speech recognition.
 * @returns {Promise<boolean>}
 */
export async function isSpeechRecognitionAvailable() {
  if (Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return WakeWordBridge.isSpeechRecognitionAvailable();
}

/**
 * Get the complete service status including all state flags.
 * @returns {Promise<{isServiceRunning: boolean, isDreamState: boolean, isSpeechAvailable: boolean, supportedWakeWords: string}>}
 */
export async function getServiceStatus() {
  if (Platform.OS !== 'android') {
    return Promise.resolve({
      isServiceRunning: false,
      isDreamState: false,
      isSpeechAvailable: false,
      supportedWakeWords: '',
    });
  }
  return WakeWordBridge.getServiceStatus();
}

// ==================== EVENT SUBSCRIPTIONS ====================

/**
 * Subscribe to wake word detection events.
 * Callback is invoked whenever "Hey Manu" or similar wake words are detected.
 *
 * @param {Function} callback — Called with { wakeWord, fullResult, timestamp, isDreamState }
 * @returns {Object} Subscription object with .remove() method
 *
 * Example:
 *   const sub = onWakeWordDetected((event) => {
 *     console.log('Wake word:', event.wakeWord);
 *     console.log('Full result:', event.fullResult);
 *     console.log('Dream state:', event.isDreamState);
 *   });
 *   // Later: sub.remove();
 */
export function onWakeWordDetected(callback) {
  if (Platform.OS !== 'android') {
    console.warn('Wake word events are only available on Android');
    return { remove: () => {} };
  }
  return wakeWordEventEmitter.addListener('onWakeWordDetected', callback);
}

/**
 * Subscribe to dream state change events.
 * Callback is invoked when the device enters or exits dream state (screen off/on).
 *
 * @param {Function} callback — Called with { isDreamState, timestamp }
 * @returns {Object} Subscription object with .remove() method
 *
 * Example:
 *   const sub = onDreamStateChanged((event) => {
 *     console.log('Dream state:', event.isDreamState ? 'ON' : 'OFF');
 *   });
 *   // Later: sub.remove();
 */
export function onDreamStateChanged(callback) {
  if (Platform.OS !== 'android') {
    console.warn('Dream state events are only available on Android');
    return { remove: () => {} };
  }
  return wakeWordEventEmitter.addListener('onDreamStateChanged', callback);
}

/**
 * Subscribe to service status change events.
 * (Note: This event is reserved for future use when service status changes
 * are actively broadcasted from native layer.)
 *
 * @param {Function} callback — Called with status update object
 * @returns {Object} Subscription object with .remove() method
 */
export function onServiceStatusChanged(callback) {
  if (Platform.OS !== 'android') {
    console.warn('Service status events are only available on Android');
    return { remove: () => {} };
  }
  return wakeWordEventEmitter.addListener('onServiceStatusChanged', callback);
}

// ==================== UTILITY ====================

/**
 * Convenience function to check if the entire wake word pipeline is ready.
 * Returns true only if on Android, speech recognition is available, and service can be started.
 * @returns {Promise<boolean>}
 */
export async function isWakeWordReady() {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    const isAvailable = await isSpeechRecognitionAvailable();
    return isAvailable;
  } catch (e) {
    return false;
  }
}

/**
 * Get the list of supported wake words.
 * @returns {string[]}
 */
export function getSupportedWakeWords() {
  return ['manu', 'hey manu', 'manu ai', 'hey manu ai'];
}

// ==================== DEFAULT EXPORT ====================

/**
 * Default export object containing all wake word bridge functions.
 * Useful for importing all functions at once.
 */
export default {
  startWakeWordService,
  stopWakeWordService,
  isServiceRunning,
  isDreamState,
  isSpeechRecognitionAvailable,
  getServiceStatus,
  onWakeWordDetected,
  onDreamStateChanged,
  onServiceStatusChanged,
  isWakeWordReady,
  getSupportedWakeWords,
};
