// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 4/20 — Notification Bridge Module
// File: android/app/src/main/java/com/manu/ai/modules/NotificationPackage.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.manu.ai.services.ManuNotificationListenerService
import org.json.JSONObject

class NotificationPackage(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NotificationBridge"
        private const val EVENT_NAME = "ManuNotificationEvent"
    }

    private var eventReceiver: BroadcastReceiver? = null

    init {
        registerEventReceiver()
    }

    override fun getName(): String {
        return "ManuNotificationBridge"
    }

    // =============================================================================
    // PERMISSION & SERVICE CHECKS
    // =============================================================================

    @ReactMethod
    fun isNotificationAccessEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                context.getSystemService(Context.NOTIFICATION_SERVICE) is android.app.NotificationManager &&
                        Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")?.contains(context.packageName) == true
            } else {
                Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")?.contains(context.packageName) == true
            }
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking notification access", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openNotificationAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening notification settings", e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(ManuNotificationListenerService.isServiceRunning)
    }

    // =============================================================================
    // ACTIVE NOTIFICATIONS
    // =============================================================================

    @ReactMethod
    fun getActiveNotifications(promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val array = service.getActiveNotificationsList()
                promise.resolve(array)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting active notifications", e)
            promise.reject("ERROR", e.message)
        }
    }

    // =============================================================================
    // NOTIFICATION HISTORY
    // =============================================================================

    @ReactMethod
    fun getNotificationHistory(promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val array = service.getNotificationHistory()
                promise.resolve(array)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting notification history", e)
            promise.reject("ERROR", e.message)
        }
    }

    // =============================================================================
    // DISMISS OPERATIONS
    // =============================================================================

    @ReactMethod
    fun dismissNotification(key: String, promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val result = service.dismissNotification(key)
                promise.resolve(result)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing notification", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun dismissAllByPackage(packageName: String, promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val count = service.dismissAllNotificationsByPackage(packageName)
                promise.resolve(count)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing notifications by package", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun dismissAllNotifications(promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val count = service.dismissAllNotifications()
                promise.resolve(count)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing all notifications", e)
            promise.reject("ERROR", e.message)
        }
    }

    // =============================================================================
    // REPLY TO NOTIFICATIONS
    // =============================================================================

    @ReactMethod
    fun replyToNotification(key: String, message: String, promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val result = service.replyToNotification(key, message)
                promise.resolve(result)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error replying to notification", e)
            promise.reject("ERROR", e.message)
        }
    }

    // =============================================================================
    // STATISTICS & AI
    // =============================================================================

    @ReactMethod
    fun getNotificationStats(promise: Promise) {
        try {
            val service = ManuNotificationListenerService.instance
            if (service != null) {
                val stats = service.getNotificationStats()
                promise.resolve(stats)
            } else {
                promise.reject("SERVICE_NOT_RUNNING", "Notification listener service is not running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting notification stats", e)
            promise.reject("ERROR", e.message)
        }
    }

    // =============================================================================
    // EVENT EMITTER
    // =============================================================================

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in EventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in EventEmitter
    }

    private fun registerEventReceiver() {
        try {
            eventReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action == "com.manu.ai.NOTIFICATION_EVENT") {
                        val eventType = intent.getStringExtra("eventType") ?: ""
                        val dataString = intent.getStringExtra("data") ?: "{}"
                        try {
                            val json = JSONObject(dataString)
                            val params = Arguments.createMap()
                            val keys = json.keys()
                            while (keys.hasNext()) {
                                val key = keys.next()
                                when (val value = json.get(key)) {
                                    is String -> params.putString(key, value)
                                    is Int -> params.putInt(key, value)
                                    is Double -> params.putDouble(key, value)
                                    is Boolean -> params.putBoolean(key, value)
                                    is Long -> params.putDouble(key, value.toDouble())
                                    else -> params.putString(key, value.toString())
                                }
                            }
                            params.putString("eventType", eventType)
                            sendEvent(EVENT_NAME, params)
                        } catch (e: Exception) {
                            Log.e(TAG, "Error parsing notification event data", e)
                        }
                    }
                }
            }
            val filter = IntentFilter("com.manu.ai.NOTIFICATION_EVENT")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.registerReceiver(eventReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactApplicationContext.registerReceiver(eventReceiver, filter)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering event receiver", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event to JS", e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            eventReceiver?.let {
                reactApplicationContext.unregisterReceiver(it)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver", e)
        }
    }
}
