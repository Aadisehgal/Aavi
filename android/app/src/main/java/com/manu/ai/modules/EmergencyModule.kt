// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Emergency Contact Hotline
// File: android/app/src/main/java/com/manu/ai/modules/EmergencyModule.kt
// Generated: 2026-06-25

package com.manu.ai.modules

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.telephony.TelephonyManager
import com.facebook.react.bridge.*
import android.os.Build
import com.manu.ai.services.EmergencyRecordingService

class EmergencyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var powerTapCount = 0
    private var lastTapTime = 0L
    private val TAP_WINDOW_MS = 3000L
    private val REQUIRED_TAPS = 3
    private val handler = Handler(Looper.getMainLooper())
    private var sosRunnable: Runnable? = null
    private var isListening = false

    override fun getName(): String = "EmergencyModule"

    @ReactMethod
    fun registerTripleTapListener(promise: Promise) {
        try {
            isListening = true
            promise.resolve(mapOf("registered" to true).toWritableMap())
        } catch (e: Exception) {
            promise.reject("REGISTER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun unregisterTripleTapListener(promise: Promise) {
        try {
            isListening = false
            powerTapCount = 0
            promise.resolve(mapOf("registered" to false).toWritableMap())
        } catch (e: Exception) {
            promise.reject("UNREGISTER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun onPowerKeyEvent(promise: Promise) {
        try {
            if (!isListening) {
                promise.resolve(mapOf("triggered" to false, "reason" to "not_listening").toWritableMap())
                return
            }

            val now = System.currentTimeMillis()
            if (now - lastTapTime > TAP_WINDOW_MS) {
                powerTapCount = 0
            }
            powerTapCount++
            lastTapTime = now

            if (powerTapCount >= REQUIRED_TAPS) {
                powerTapCount = 0
                triggerEmergency()
                promise.resolve(mapOf("triggered" to true, "taps" to REQUIRED_TAPS).toWritableMap())
            } else {
                promise.resolve(mapOf("triggered" to false, "taps" to powerTapCount, "needed" to REQUIRED_TAPS).toWritableMap())
            }
        } catch (e: Exception) {
            promise.reject("EVENT_ERROR", e.message, e)
        }
    }

    private fun triggerEmergency() {
        try {
            val activity = currentActivity ?: return

            val powerManager = activity.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "MANU:EmergencyWake"
            )
            wakeLock.acquire(10000)

            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:112")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(callIntent)

            val recordIntent = Intent(reactApplicationContext, EmergencyRecordingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(recordIntent)
            } else {
                reactApplicationContext.startService(recordIntent)
            }

            wakeLock.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun triggerEmergencyNow(config: ReadableMap, promise: Promise) {
        try {
            val phoneNumber = config.getString("phoneNumber") ?: "112"
            val recordAudio = config.getBoolean("recordAudio")
            val sendLocation = config.getBoolean("sendLocation")

            val activity = currentActivity
            if (activity != null) {
                val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
                activity.startActivity(callIntent)
            }

            if (recordAudio) {
                val recordIntent = Intent(reactApplicationContext, EmergencyRecordingService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactApplicationContext.startForegroundService(recordIntent)
                } else {
                    reactApplicationContext.startService(recordIntent)
                }
            }

            promise.resolve(mapOf(
                "triggered" to true,
                "phoneNumber" to phoneNumber,
                "recordAudio" to recordAudio,
                "sendLocation" to sendLocation
            ).toWritableMap())
        } catch (e: Exception) {
            promise.reject("TRIGGER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isEmergencyNumber(number: String, promise: Promise) {
        try {
            val telephonyManager = reactApplicationContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val isEmergency = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                telephonyManager.isEmergencyNumber(number)
            } else {
                number in listOf("112", "911", "999", "000", "110", "118", "119")
            }
            promise.resolve(isEmergency)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    private fun Map<String, Any>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        forEach { (k, v) ->
            when (v) {
                is String -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
                is Int -> map.putInt(k, v)
                is Long -> map.putDouble(k, v.toDouble())
                is Double -> map.putDouble(k, v)
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }
}
