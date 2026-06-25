// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 2/20 — Wake Word Detection with 'Hey Manu' Trigger
// File: android/app/src/main/java/com/manu/ai/modules/WakeWordPackage.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.manu.ai.services.ManuWakeWordService

/**
 * WakeWordPackage — React Native bridge module for wake word detection.
 *
 * Exposes Android wake word service functionality to JavaScript layer.
 * Features:
 *   - Start/stop wake word service from JS
 * *   - Listen for wake word detection events
 *   - Listen for dream state changes
 *   - Get current service status
 *   - Check device compatibility
 */
class WakeWordPackage(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        const val TAG = "WakeWordPackage"
        const val MODULE_NAME = "WakeWordBridge"

        // Event names sent to JS
        const val EVENT_WAKE_WORD_DETECTED = "onWakeWordDetected"
        const val EVENT_DREAM_STATE_CHANGED = "onDreamStateChanged"
        const val EVENT_SERVICE_STATUS_CHANGED = "onServiceStatusChanged"
    }

    private var wakeWordReceiver: BroadcastReceiver? = null
    private var dreamStateReceiver: BroadcastReceiver? = null
    private val handler = Handler(Looper.getMainLooper())
    private var isRegistered = false

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return MODULE_NAME
    }

    // ==================== REACT METHODS (JS Callable) ====================

    /**
     * Start the wake word detection service.
     * Returns a promise that resolves when service starts.
     */
    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val context = reactApplicationContext
            ManuWakeWordService.startWakeWordService(context)
            registerBroadcastReceivers()
            promise.resolve(createStatusMap(true, "Wake word service started"))
        } catch (e: Exception) {
            Log.e(TAG, "Error starting service: ${e.message}")
            promise.reject("START_ERROR", "Failed to start wake word service: ${e.message}", e)
        }
    }

    /**
     * Stop the wake word detection service.
     */
    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val context = reactApplicationContext
            ManuWakeWordService.stopWakeWordService(context)
            unregisterBroadcastReceivers()
            promise.resolve(createStatusMap(false, "Wake word service stopped"))
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping service: ${e.message}")
            promise.reject("STOP_ERROR", "Failed to stop wake word service: ${e.message}", e)
        }
    }

    /**
     * Check if the wake word service is currently running.
     */
    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(ManuWakeWordService.isServiceRunning)
    }

    /**
     * Check if the device is currently in dream state (screen off).
     */
    @ReactMethod
    fun isDreamState(promise: Promise) {
        promise.resolve(ManuWakeWordService.isDreamState)
    }

    /**
     * Check if the device supports speech recognition.
     */
    @ReactMethod
    fun isSpeechRecognitionAvailable(promise: Promise) {
        val context = reactApplicationContext
        val isAvailable = android.speech.SpeechRecognizer.isRecognitionAvailable(context)
        promise.resolve(isAvailable)
    }

    /**
     * Get the current service status including all state flags.
     */
    @ReactMethod
    fun getServiceStatus(promise: Promise) {
        val statusMap = Arguments.createMap().apply {
            putBoolean("isServiceRunning", ManuWakeWordService.isServiceRunning)
            putBoolean("isDreamState", ManuWakeWordService.isDreamState)
            putBoolean("isSpeechAvailable", android.speech.SpeechRecognizer.isRecognitionAvailable(reactApplicationContext))
            putString("supportedWakeWords", ManuWakeWordService.WAKE_WORDS.joinToString(", "))
        }
        promise.resolve(statusMap)
    }

    // ==================== BROADCAST RECEIVERS ====================

    private fun registerBroadcastReceivers() {
        if (isRegistered) return

        // Register wake word detection receiver
        wakeWordReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == ManuWakeWordService.ACTION_WAKE_WORD_DETECTED) {
                    val wakeWord = intent.getStringExtra("wakeWord") ?: ""
                    val fullResult = intent.getStringExtra("fullResult") ?: ""
                    val timestamp = intent.getLongExtra("timestamp", 0L)
                    val isDreamState = intent.getBooleanExtra("isDreamState", false)

                    val eventData = Arguments.createMap().apply {
                        putString("wakeWord", wakeWord)
                        putString("fullResult", fullResult)
                        putDouble("timestamp", timestamp.toDouble())
                        putBoolean("isDreamState", isDreamState)
                    }

                    sendEvent(EVENT_WAKE_WORD_DETECTED, eventData)
                    Log.d(TAG, "Wake word event sent to JS: $wakeWord")
                }
            }
        }

        val wakeFilter = android.content.IntentFilter(ManuWakeWordService.ACTION_WAKE_WORD_DETECTED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(
                wakeWordReceiver,
                wakeFilter,
                android.content.Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            reactApplicationContext.registerReceiver(wakeWordReceiver, wakeFilter)
        }

        // Register dream state change receiver
        dreamStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == ManuWakeWordService.ACTION_DREAM_STATE_CHANGED) {
                    val isDreamState = intent.getBooleanExtra("isDreamState", false)
                    val timestamp = intent.getLongExtra("timestamp", 0L)

                    val eventData = Arguments.createMap().apply {
                        putBoolean("isDreamState", isDreamState)
                        putDouble("timestamp", timestamp.toDouble())
                    }

                    sendEvent(EVENT_DREAM_STATE_CHANGED, eventData)
                    Log.d(TAG, "Dream state event sent to JS: isDreamState=$isDreamState")
                }
            }
        }

        val dreamFilter = android.content.IntentFilter(ManuWakeWordService.ACTION_DREAM_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(
                dreamStateReceiver,
                dreamFilter,
                android.content.Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            reactApplicationContext.registerReceiver(dreamStateReceiver, dreamFilter)
        }

        isRegistered = true
        Log.d(TAG, "Broadcast receivers registered")
    }

    private fun unregisterBroadcastReceivers() {
        if (!isRegistered) return

        try {
            wakeWordReceiver?.let {
                reactApplicationContext.unregisterReceiver(it)
                wakeWordReceiver = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering wake word receiver: ${e.message}")
        }

        try {
            dreamStateReceiver?.let {
                reactApplicationContext.unregisterReceiver(it)
                dreamStateReceiver = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering dream state receiver: ${e.message}")
        }

        isRegistered = false
        Log.d(TAG, "Broadcast receivers unregistered")
    }

    // ==================== EVENT SENDING ====================

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event $eventName: ${e.message}")
        }
    }

    // ==================== LIFECYCLE ====================

    override fun onHostResume() {
        Log.d(TAG, "onHostResume — ensuring receivers are registered")
        if (ManuWakeWordService.isServiceRunning && !isRegistered) {
            registerBroadcastReceivers()
        }
    }

    override fun onHostPause() {
        Log.d(TAG, "onHostPause")
    }

    override fun onHostDestroy() {
        Log.d(TAG, "onHostDestroy — cleaning up")
        unregisterBroadcastReceivers()
        reactApplicationContext.removeLifecycleEventListener(this)
    }

    // ==================== HELPERS ====================

    private fun createStatusMap(isRunning: Boolean, message: String): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isRunning", isRunning)
            putString("message", message)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }
}
