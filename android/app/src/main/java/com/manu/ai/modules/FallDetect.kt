// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Fall Detection
// File: android/app/src/main/java/com/manu/ai/modules/FallDetect.kt
// Generated: 2026-06-25

package com.manu.ai.modules
import com.facebook.react.modules.core.DeviceEventManagerModule

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import kotlin.math.sqrt

class FallDetectModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager: SensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var accelerometer: Sensor? = null
    private var isListening = false
    private val handler = Handler(Looper.getMainLooper())
    private var fallDetected = false
    private var postFallTimer: Runnable? = null

    private val IMPACT_THRESHOLD = 25.0f
    private val FREE_FALL_THRESHOLD = 6.0f
    private val POST_FALL_TIMEOUT = 30000L

    override fun getName(): String = "FallDetect"

    @ReactMethod
    fun startMonitoring(promise: Promise) {
        try {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if (accelerometer == null) {
                promise.reject("NO_SENSOR", "Accelerometer not available", null)
                return
            }

            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)
            isListening = true
            promise.resolve(mapOf("listening" to true).toWritableMap())
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        try {
            sensorManager.unregisterListener(this)
            isListening = false
            fallDetected = false
            postFallTimer?.let { handler.removeCallbacks(it) }
            postFallTimer = null
            promise.resolve(mapOf("listening" to false).toWritableMap())
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlert(promise: Promise) {
        try {
            fallDetected = false
            postFallTimer?.let { handler.removeCallbacks(it) }
            postFallTimer = null
            promise.resolve(mapOf("cancelled" to true).toWritableMap())
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve(mapOf(
            "listening" to isListening,
            "fallDetected" to fallDetected,
            "hasAccelerometer" to (accelerometer != null)
        ).toWritableMap())
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event?.let { e ->
            val x = e.values[0]
            val y = e.values[1]
            val z = e.values[2]
            val magnitude = sqrt(x * x + y * y + z * z)

            if (magnitude < FREE_FALL_THRESHOLD) {
                // Potential free fall
            }

            if (magnitude > IMPACT_THRESHOLD && !fallDetected) {
                fallDetected = true

                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("FALL_DETECTED", mapOf(
                        "timestamp" to System.currentTimeMillis(),
                        "magnitude" to magnitude,
                        "x" to x,
                        "y" to y,
                        "z" to z
                    ).toWritableMap())

                postFallTimer = Runnable {
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("FALL_ALERT", mapOf(
                            "timestamp" to System.currentTimeMillis(),
                            "autoTriggered" to true
                        ).toWritableMap())
                }
                handler.postDelayed(postFallTimer!!, POST_FALL_TIMEOUT)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun Map<String, Any>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        forEach { (k, v) ->
            when (v) {
                is String -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
                is Int -> map.putInt(k, v)
                is Long -> map.putDouble(k, v.toDouble())
                is Double -> map.putDouble(k, v)
                is Float -> map.putDouble(k, v.toDouble())
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }
}
