// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 4/20 — Notification Bridge (JS Interface)
// File: src/modules/NotificationBridge.js
// Generated: 2026-06-24

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ManuNotificationBridge } = NativeModules;

// =============================================================================
// EVENT EMITTER SETUP
// =============================================================================

const notificationEmitter = ManuNotificationBridge
  ? new NativeEventEmitter(ManuNotificationBridge)
  : null;

// =============================================================================
// CORE API
// =============================================================================

/**
 * Check if notification listener access is granted
 * @returns {Promise<boolean>}
 */
export async function isNotificationAccessEnabled() {
  if (!ManuNotificationBridge) return false;
  try {
    return await ManuNotificationBridge.isNotificationAccessEnabled();
  } catch (e) {
    console.error('[NotificationBridge] isNotificationAccessEnabled error:', e);
    return false;
  }
}

/**
 * Open system notification access settings
 */
export function openNotificationAccessSettings() {
  if (ManuNotificationBridge) {
    ManuNotificationBridge.openNotificationAccessSettings();
  }
}

/**
 * Check if the background service is running
 * @returns {Promise<boolean>}
 */
export async function isServiceRunning() {
  if (!ManuNotificationBridge) return false;
  try {
    return await ManuNotificationBridge.isServiceRunning();
  } catch (e) {
    console.error('[NotificationBridge] isServiceRunning error:', e);
    return false;
  }
}

// =============================================================================
// ACTIVE NOTIFICATIONS
// =============================================================================

/**
 * Get all currently active notifications
 * @returns {Promise<Array<Object>>}
 */
export async function getActiveNotifications() {
  if (!ManuNotificationBridge) return [];
  try {
    const result = await ManuNotificationBridge.getActiveNotifications();
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.error('[NotificationBridge] getActiveNotifications error:', e);
    return [];
  }
}

// =============================================================================
// NOTIFICATION HISTORY
// =============================================================================

/**
 * Get stored notification history (last 500)
 * @returns {Promise<Array<Object>>}
 */
export async function getNotificationHistory() {
  if (!ManuNotificationBridge) return [];
  try {
    const result = await ManuNotificationBridge.getNotificationHistory();
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.error('[NotificationBridge] getNotificationHistory error:', e);
    return [];
  }
}

// =============================================================================
// DISMISS OPERATIONS
// =============================================================================

/**
 * Dismiss a single notification by its key
 * @param {string} key - Notification key
 * @returns {Promise<boolean>}
 */
export async function dismissNotification(key) {
  if (!ManuNotificationBridge || !key) return false;
  try {
    return await ManuNotificationBridge.dismissNotification(key);
  } catch (e) {
    console.error('[NotificationBridge] dismissNotification error:', e);
    return false;
  }
}

/**
 * Dismiss all notifications from a specific app
 * @param {string} packageName - Android package name (e.g., "com.whatsapp")
 * @returns {Promise<number>} Number of dismissed notifications
 */
export async function dismissAllByPackage(packageName) {
  if (!ManuNotificationBridge || !packageName) return 0;
  try {
    return await ManuNotificationBridge.dismissAllByPackage(packageName);
  } catch (e) {
    console.error('[NotificationBridge] dismissAllByPackage error:', e);
    return 0;
  }
}

/**
 * Dismiss ALL active notifications
 * @returns {Promise<number>} Number of dismissed notifications
 */
export async function dismissAllNotifications() {
  if (!ManuNotificationBridge) return 0;
  try {
    return await ManuNotificationBridge.dismissAllNotifications();
  } catch (e) {
    console.error('[NotificationBridge] dismissAllNotifications error:', e);
    return 0;
  }
}

// =============================================================================
// REPLY TO NOTIFICATIONS
// =============================================================================

/**
 * Reply to a notification (WhatsApp, SMS, etc.)
 * @param {string} key - Notification key
 * @param {string} message - Reply message text
 * @returns {Promise<boolean>}
 */
export async function replyToNotification(key, message) {
  if (!ManuNotificationBridge || !key || !message) return false;
  try {
    return await ManuNotificationBridge.replyToNotification(key, message);
  } catch (e) {
    console.error('[NotificationBridge] replyToNotification error:', e);
    return false;
  }
}

// =============================================================================
// STATISTICS & AI
// =============================================================================

/**
 * Get AI-categorized notification statistics
 * @returns {Promise<Object>}
 */
export async function getNotificationStats() {
  if (!ManuNotificationBridge) return null;
  try {
    return await ManuNotificationBridge.getNotificationStats();
  } catch (e) {
    console.error('[NotificationBridge] getNotificationStats error:', e);
    return null;
  }
}

// =============================================================================
// EVENT SUBSCRIPTION
// =============================================================================

/**
 * Subscribe to real-time notification events
 * @param {Function} callback - (event) => void
 * @returns {Object} Subscription object with .remove() method
 */
export function addNotificationListener(callback) {
  if (!notificationEmitter) {
    console.warn('[NotificationBridge] Native module not available, event listener not registered');
    return { remove: () => {} };
  }
  return notificationEmitter.addListener('ManuNotificationEvent', (event) => {
    try {
      callback(event);
    } catch (e) {
      console.error('[NotificationBridge] Listener callback error:', e);
    }
  });
}

/**
 * Remove all notification event listeners
 */
export function removeAllNotificationListeners() {
  if (notificationEmitter) {
    notificationEmitter.removeAllListeners('ManuNotificationEvent');
  }
}

// =============================================================================
// HIGH-LEVEL HELPERS
// =============================================================================

/**
 * Get notifications filtered by AI category
 * @param {string} category - 'Urgent', 'Family', 'Social', 'Entertainment', 'Junk', 'General'
 * @returns {Promise<Array<Object>>}
 */
export async function getNotificationsByCategory(category) {
  const all = await getActiveNotifications();
  return all.filter(n => n.aiCategory === category);
}

/**
 * Get high-priority notifications (Urgent + Family)
 * @returns {Promise<Array<Object>>}
 */
export async function getHighPriorityNotifications() {
  const all = await getActiveNotifications();
  return all.filter(n => n.aiCategory === 'Urgent' || n.aiCategory === 'Family');
}

/**
 * Get junk notifications for bulk cleanup
 * @returns {Promise<Array<Object>>}
 */
export async function getJunkNotifications() {
  const all = await getActiveNotifications();
  return all.filter(n => n.aiCategory === 'Junk');
}

/**
 * Auto-dismiss all junk notifications
 * @returns {Promise<number>}
 */
export async function autoDismissJunk() {
  const junk = await getJunkNotifications();
  let count = 0;
  for (const notification of junk) {
    const success = await dismissNotification(notification.key);
    if (success) count++;
  }
  return count;
}

/**
 * Get family-related notifications (for parental monitoring)
 * @returns {Promise<Array<Object>>}
 */
export async function getFamilyNotifications() {
  const all = await getActiveNotifications();
  return all.filter(n => n.aiCategory === 'Family');
}

/**
 * Quick reply to WhatsApp/SMS notification by package name
 * Finds the most recent notification from the package and replies
 * @param {string} packageName - e.g., 'com.whatsapp'
 * @param {string} message - Reply text
 * @returns {Promise<boolean>}
 */
export async function quickReplyToPackage(packageName, message) {
  const all = await getActiveNotifications();
  const target = all.find(n => n.packageName === packageName && n.canReply);
  if (target) {
    return await replyToNotification(target.key, message);
  }
  return false;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  isServiceRunning,
  getActiveNotifications,
  getNotificationHistory,
  dismissNotification,
  dismissAllByPackage,
  dismissAllNotifications,
  replyToNotification,
  getNotificationStats,
  addNotificationListener,
  removeAllNotificationListeners,
  getNotificationsByCategory,
  getHighPriorityNotifications,
  getJunkNotifications,
  autoDismissJunk,
  getFamilyNotifications,
  quickReplyToPackage,
};
