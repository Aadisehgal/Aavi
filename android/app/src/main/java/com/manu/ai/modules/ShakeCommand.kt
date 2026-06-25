// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/ShakeCommand.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.sqrt

class ShakeCommandModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val TAG = "ShakeCommand"
        const val EVENT_SHAKE = "onShakeCommand"
        const val SHAKE_THRESHOLD = 15.0f
        const val SHAKE_COUNT_THRESHOLD = 3
        const val SHAKE_WINDOW_MS = 1000L
        const val MIN_SHAKE_INTERVAL_MS = 500L
    }

    private val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private var isListening = false
    private var shakeCount = 0
    private var lastShakeTime = 0L
    private var windowStartTime = 0L
    private val patternBuffer = mutableListOf<Long>()

    override fun getName(): String = "ShakeCommand"

    @ReactMethod
    fun startListening(promise: Promise) {
        if (isListening) {
            promise.resolve("Already listening")
            return
        }
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
            isListening = true
            shakeCount = 0
            patternBuffer.clear()
            promise.resolve("Shake listening started")
        } ?: promise.reject("NO_SENSOR", "Accelerometer not available")
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        sensorManager.unregisterListener(this)
        isListening = false
        promise.resolve("Listening stopped")
    }

    @ReactMethod
    fun getPattern(promise: Promise) {
        promise.resolve(Arguments.fromList(patternBuffer))
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z)
        val now = SystemClock.elapsedRealtime()

        if (magnitude > SHAKE_THRESHOLD) {
            if (now - lastShakeTime > MIN_SHAKE_INTERVAL_MS) {
                if (windowStartTime == 0L || now - windowStartTime > SHAKE_WINDOW_MS) {
                    windowStartTime = now
                    shakeCount = 1
                    patternBuffer.clear()
                } else {
                    shakeCount++
                }
                patternBuffer.add(now - (if (patternBuffer.isEmpty()) now else patternBuffer.last()))
                lastShakeTime = now

                if (shakeCount >= SHAKE_COUNT_THRESHOLD) {
                    val command = classifyShakePattern(patternBuffer)
                    sendShakeEvent(command, shakeCount, magnitude)
                    shakeCount = 0
                    windowStartTime = 0L
                }
            }
        }
    }

    private fun classifyShakePattern(pattern: List<Long>): String {
        if (pattern.size < 2) return "SHAKE_SINGLE"
        val avgInterval = pattern.average()
        return when {
            avgInterval < 200 -> "SHAKE_RAPID"
            avgInterval < 400 -> "SHAKE_DOUBLE"
            avgInterval < 600 -> "SHAKE_TRIPLE"
            else -> "SHAKE_PATTERN"
        }
    }

    private fun sendShakeEvent(command: String, count: Int, magnitude: Float) {
        val params = Arguments.createMap().apply {
            putString("command", command)
            putInt("shakeCount", count)
            putDouble("magnitude", magnitude.toDouble())
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_SHAKE, params)
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
