import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 5/20 — Voice Fingerprint & Security
// File: src/modules/VoiceFingerprint.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

/**
 * VoiceFingerprint — JavaScript bridge and orchestration layer for
 * voice biometric enrollment, verification, PIN fallback, and
 * J.A.R.V.I.S. voice stress detection (Feature 4).
 *
 * Architecture:
 *   • Native: VoiceFingerprintModule.kt (AudioRecord + analysis engine)
 *   • JS:     Enrollment flow, verification gate, PIN fallback, stress alerts
 *
 * Family Security Rule:
 *   Only the enrolled parent (owner) voice can execute commands.
 *   Children / strangers trigger voice verification failure → command rejected.
 */

const { VoiceFingerprint } = NativeModules;

const STORAGE_KEYS = {
  OWNER_NAME: '@manu_voice_owner_name',
  ENROLLMENT_DATE: '@manu_voice_enrollment_date',
  LAST_VERIFY_RESULT: '@manu_voice_last_verify',
  STRESS_ALERT_ENABLED: '@manu_stress_alert_enabled',
  STRESS_ALERT_CONTACT: '@manu_stress_alert_contact',
};

const DEFAULTS = {
  MATCH_THRESHOLD: 0.60,
  ENROLL_DURATION_MS: 4000,
  VERIFY_DURATION_MS: 3000,
  STRESS_DURATION_MS: 3500,
};

// ============================================================================
// SECTION 1: ENROLLMENT
// ============================================================================

/**
 * Enroll owner voiceprint.
 * Records 4 seconds, extracts pitch/variance/volume/cadence/clarity,
 * stores encrypted signature natively, and persists metadata in AsyncStorage.
 *
 * @param {string} ownerName — Display name for the enrolled owner
 * @returns {Promise<Object>} Enrollment metrics or error
 */
export async function enrollOwnerVoice(ownerName = 'Owner') {
  if (!VoiceFingerprint) {
    throw new Error('VoiceFingerprint native module not available');
  }
  const result = await VoiceFingerprint.enrollVoice();
  await AsyncStorage.setItem(STORAGE_KEYS.OWNER_NAME, ownerName);
  await AsyncStorage.setItem(
    STORAGE_KEYS.ENROLLMENT_DATE,
    new Date().toISOString()
  );
  // Save stress baseline immediately after enrollment
  await VoiceFingerprint.saveStressBaseline();
  return {
    success: true,
    ownerName,
    metrics: {
      avgPitch: result.avgPitch,
      pitchVariance: result.pitchVariance,
      volume: result.volume,
      cadence: result.cadence,
      clarity: result.clarity,
    },
    message: `Voice enrolled for ${ownerName}. Say "Hey Manu" to verify.`,
  };
}

// ============================================================================
// SECTION 2: VERIFICATION GATE
// ============================================================================

/**
 * Verify speaker against enrolled voiceprint.
 * Records 3 seconds, compares biometric signature, returns match result.
 *
 * Weighted scoring (native):
 *   Pitch(50%) + Volume(20%) + Cadence(20%) + Clarity(10%)
 * Threshold: 60% confidence = MATCH
 *
 * @returns {Promise<Object>} { match: boolean, score: number, detail: string }
 */
export async function verifyVoice() {
  if (!VoiceFingerprint) {
    throw new Error('VoiceFingerprint native module not available');
  }
  const result = await VoiceFingerprint.verifyVoice();
  const enriched = {
    match: result.match,
    score: result.score,
    threshold: result.threshold,
    detail: result.detail,
    timestamp: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    STORAGE_KEYS.LAST_VERIFY_RESULT,
    JSON.stringify(enriched)
  );
  return enriched;
}

/**
 * Quick check — is a voiceprint enrolled?
 */
export async function isVoiceEnrolled() {
  if (!VoiceFingerprint) return { enrolled: false, hasPin: false };
  return VoiceFingerprint.isEnrolled();
}

/**
 * Delete all voice biometric data (signature + PIN + metadata).
 */
export async function deleteAllVoiceData() {
  if (!VoiceFingerprint) return false;
  await VoiceFingerprint.deleteVoiceprint();
  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys);
  return true;
}

// ============================================================================
// SECTION 3: PIN FALLBACK
// ============================================================================

/**
 * Set a 4-6 digit fallback PIN.
 * Used when voice verification fails (e.g., hoarse throat, noisy environment).
 *
 * @param {string} pin — 4-6 digit numeric PIN
 */
export async function setFallbackPin(pin) {
  if (!VoiceFingerprint) {
    throw new Error('VoiceFingerprint native module not available');
  }
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  await VoiceFingerprint.setPin(pin);
  return { success: true, message: 'Fallback PIN set successfully' };
}

/**
 * Verify fallback PIN.
 *
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyFallbackPin(pin) {
  if (!VoiceFingerprint) {
    throw new Error('VoiceFingerprint native module not available');
  }
  const result = await VoiceFingerprint.verifyWithPin(pin);
  return result.match;
}

/**
 * Unified authentication gate.
 * Tries voice first; if voice fails, optionally prompts for PIN.
 *
 * @param {Object} options
 * @param {boolean} options.allowPinFallback — Allow PIN if voice fails
 * @param {string}  options.pin — PIN to attempt (if allowPinFallback true)
 * @returns {Promise<Object>} Auth result with method used
 */
export async function authenticate({ allowPinFallback = false, pin = '' } = {}) {
  const enrolled = await isVoiceEnrolled();
  if (!enrolled.enrolled) {
    return {
      authenticated: false,
      method: 'none',
      reason: 'No voiceprint enrolled. Please enroll first.',
    };
  }

  // Primary: Voice biometric
  const voiceResult = await verifyVoice();
  if (voiceResult.match) {
    return {
      authenticated: true,
      method: 'voice',
      score: voiceResult.score,
      detail: voiceResult.detail,
    };
  }

  // Secondary: PIN fallback
  if (allowPinFallback && pin.length > 0) {
    const pinMatch = await verifyFallbackPin(pin);
    if (pinMatch) {
      return {
        authenticated: true,
        method: 'pin',
        score: 1.0,
        detail: 'Authenticated via fallback PIN',
      };
    }
    return {
      authenticated: false,
      method: 'pin',
      reason: 'PIN incorrect. Access denied.',
    };
  }

  // Denied
  return {
    authenticated: false,
    method: 'voice',
    reason: 'Voice mismatch and no PIN fallback provided.',
    score: voiceResult.score,
    detail: voiceResult.detail,
  };
}

// ============================================================================
// SECTION 4: J.A.R.V.I.S. VOICE STRESS DETECTION (Feature 4)
// ============================================================================

/**
 * Detect panic / stress in user's voice.
 * Analyzes pitch jitter, shimmer, variance, and speech rate.
 * Compares against owner baseline saved during enrollment.
 *
 * @returns {Promise<Object>} Stress metrics and panic flag
 */
export async function detectVoiceStress() {
  if (!VoiceFingerprint) {
    throw new Error('VoiceFingerprint native module not available');
  }
  const result = await VoiceFingerprint.detectStress();
  const stressEvent = {
    timestamp: new Date().toISOString(),
    stressScore: result.stressScore,
    panicDetected: result.panicDetected,
    elevated: result.elevated || false,
    metrics: {
      pitchVariance: result.pitchVariance,
      jitter: result.jitter,
      shimmer: result.shimmer,
      speechRate: result.speechRate,
      varianceDelta: result.varianceDelta,
    },
  };

  // Auto-alert logic
  if (result.panicDetected) {
    const alertEnabled = await AsyncStorage.getItem(STORAGE_KEYS.STRESS_ALERT_ENABLED);
    if (alertEnabled === 'true') {
      const contact = await AsyncStorage.getItem(STORAGE_KEYS.STRESS_ALERT_CONTACT);
      stressEvent.alertSent = true;
      stressEvent.alertContact = contact || 'Parent/Guardian';
      // In production, integrate with SMS/Notification module here
      console.warn('[J.A.R.V.I.S.] Panic detected in voice. Alerting:', stressEvent.alertContact);
    }
  }

  return stressEvent;
}

/**
 * Enable or disable automatic stress alerts.
 *
 * @param {boolean} enabled
 * @param {string} contact — Contact identifier for alert (phone/email)
 */
export async function configureStressAlerts(enabled, contact = '') {
  await AsyncStorage.setItem(
    STORAGE_KEYS.STRESS_ALERT_ENABLED,
    enabled ? 'true' : 'false'
  );
  if (contact) {
    await AsyncStorage.setItem(STORAGE_KEYS.STRESS_ALERT_CONTACT, contact);
  }
  return { enabled, contact };
}

// ============================================================================
// SECTION 5: COMMAND GATE (Family Security)
// ============================================================================

/**
 * Command execution gate.
 * Wraps any sensitive command with voice authentication.
 * Kids / strangers saying "Hey Manu" will fail verification → command rejected.
 *
 * Usage:
 *   const auth = await gateCommand(async () => {
 *     return await executeSensitiveAction();
 *   }, { allowPinFallback: true, pin: userEnteredPin });
 *
 * @param {Function} commandFn — Async function to execute if auth passes
 * @param {Object} options — Same as authenticate()
 * @returns {Promise<Object>} Command result or auth denial
 */
export async function gateCommand(commandFn, options = {}) {
  const auth = await authenticate(options);
  if (!auth.authenticated) {
    return {
      success: false,
      error: auth.reason || 'Authentication failed',
      authMethod: auth.method,
      score: auth.score || 0,
    };
  }
  try {
    const result = await commandFn();
    return {
      success: true,
      data: result,
      authMethod: auth.method,
      score: auth.score,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Command execution failed',
      authMethod: auth.method,
    };
  }
}

// ============================================================================
// SECTION 6: UTILITIES & DEBUG
// ============================================================================

/**
 * Get last verification result from AsyncStorage.
 */
export async function getLastVerificationResult() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_VERIFY_RESULT);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Get enrollment metadata.
 */
export async function getEnrollmentInfo() {
  const [name, date] = await AsyncStorage.multiGet([
    STORAGE_KEYS.OWNER_NAME,
    STORAGE_KEYS.ENROLLMENT_DATE,
  ]);
  return {
    ownerName: name[1] || null,
    enrollmentDate: date[1] || null,
  };
}

/**
 * Export all voice-related settings (for backup / migration).
 */
export async function exportVoiceSettings() {
  const keys = Object.values(STORAGE_KEYS);
  const pairs = await AsyncStorage.multiGet(keys);
  const settings = {};
  pairs.forEach(([k, v]) => {
    const shortKey = k.replace('@manu_', '');
    settings[shortKey] = v ? JSON.parse(v) : null;
  });
  return settings;
}

/**
 * Diagnostic: Check native module availability and permissions.
 */
export async function getVoiceModuleStatus() {
  const available = !!VoiceFingerprint;
  let enrolled = false;
  let hasPin = false;
  if (available) {
    const status = await VoiceFingerprint.isEnrolled();
    enrolled = status.enrolled;
    hasPin = status.hasPin;
  }
  return {
    platform: Platform.OS,
    nativeModuleAvailable: available,
    enrolled,
    hasPin,
    constants: DEFAULTS,
  };
}

// ============================================================================
// DEFAULT EXPORT — Unified API Object
// ============================================================================

export default {
  // Enrollment
  enrollOwnerVoice,
  isVoiceEnrolled,
  deleteAllVoiceData,

  // Verification
  verifyVoice,
  authenticate,
  gateCommand,

  // PIN Fallback
  setFallbackPin,
  verifyFallbackPin,

  // Stress Detection (J.A.R.V.I.S. Feature 4)
  detectVoiceStress,
  configureStressAlerts,

  // Utilities
  getLastVerificationResult,
  getEnrollmentInfo,
  exportVoiceSettings,
  getVoiceModuleStatus,
};
