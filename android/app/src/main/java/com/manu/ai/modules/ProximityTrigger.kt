// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/ProximityTrigger.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ProximityTriggerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val TAG = "ProximityTrigger"
        const val EVENT_PROXIMITY = "onProximityChange"
        const val PROXIMITY_NEAR = 0.0f
    }

    private val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
    private val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    private var wakeLock: PowerManager.WakeLock? = null
    private var isMonitoring = false
    private var wasNear = false
    private var autoWakeEnabled = true
    private var autoSleepEnabled = true

    override fun getName(): String = "ProximityTrigger"

    init {
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "MANU:ProximityWakeLock"
        )
    }

    @ReactMethod
    fun startMonitoring(promise: Promise) {
        if (isMonitoring) {
            promise.resolve("Already monitoring")
            return
        }
        proximitySensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
            isMonitoring = true
            promise.resolve("Proximity monitoring started")
        } ?: promise.reject("NO_SENSOR", "Proximity sensor not available")
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        sensorManager.unregisterListener(this)
        isMonitoring = false
        promise.resolve("Monitoring stopped")
    }

    @ReactMethod
    fun setAutoWake(enabled: Boolean, promise: Promise) {
        autoWakeEnabled = enabled
        promise.resolve("Auto wake ${if (enabled) "enabled" else "disabled"}")
    }

    @ReactMethod
    fun setAutoSleep(enabled: Boolean, promise: Promise) {
        autoSleepEnabled = enabled
        promise.resolve("Auto sleep ${if (enabled) "enabled" else "disabled"}")
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_PROXIMITY) return
        val distance = event.values[0]
        val isNear = distance <= PROXIMITY_NEAR + 1.0f

        val params = Arguments.createMap().apply {
            putBoolean("isNear", isNear)
            putDouble("distance", distance.toDouble())
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_PROXIMITY, params)

        if (isNear && !wasNear) {
            if (autoSleepEnabled) {
                Log.d(TAG, "Proximity near - triggering sleep")
            }
        } else if (!isNear && wasNear) {
            if (autoWakeEnabled) {
                try {
                    wakeLock?.acquire(3000)
                    Log.d(TAG, "Proximity far - triggering wake")
                } catch (e: Exception) {
                    Log.e(TAG, "Wake lock acquire failed", e)
                }
            }
        }
        wasNear = isNear
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
