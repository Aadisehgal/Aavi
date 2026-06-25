// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/HeadGesture.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.sqrt

class HeadGestureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val TAG = "HeadGesture"
        const val EVENT_HEAD_GESTURE = "onHeadGesture"
        const val NOD_THRESHOLD = 6.0f
        const val SHAKE_THRESHOLD = 8.0f
        const val TILT_THRESHOLD = 5.0f
        const val COOLDOWN_MS = 800L
    }

    private val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    private var isListening = false
    private var lastGestureTime = 0L
    private val accelValues = FloatArray(3)
    private val gyroValues = FloatArray(3)
    private var nodState = 0
    private var shakeState = 0
    private var tiltState = 0

    override fun getName(): String = "HeadGesture"

    @ReactMethod
    fun startDetection(promise: Promise) {
        if (isListening) {
            promise.resolve("Already detecting")
            return
        }
        accelerometer?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        gyroscope?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        isListening = true
        promise.resolve("Head gesture detection started")
    }

    @ReactMethod
    fun stopDetection(promise: Promise) {
        sensorManager.unregisterListener(this)
        isListening = false
        promise.resolve("Detection stopped")
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!isListening) return

        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                System.arraycopy(event.values, 0, accelValues, 0, 3)
                detectShake(accelValues)
                detectTilt(accelValues)
            }
            Sensor.TYPE_GYROSCOPE -> {
                System.arraycopy(event.values, 0, gyroValues, 0, 3)
                detectNod(gyroValues)
            }
        }
    }

    private fun detectNod(gyro: FloatArray) {
        val pitch = gyro[0]
        val now = System.currentTimeMillis()
        if (now - lastGestureTime < COOLDOWN_MS) return

        when (nodState) {
            0 -> if (pitch > NOD_THRESHOLD) nodState = 1
            1 -> if (pitch < -NOD_THRESHOLD) {
                sendGesture("NOD_YES")
                nodState = 0
                lastGestureTime = now
            }
        }

        if (pitch < -NOD_THRESHOLD && nodState == 0) {
            nodState = 2
        } else if (pitch > NOD_THRESHOLD && nodState == 2) {
            sendGesture("NOD_NO")
            nodState = 0
            lastGestureTime = now
        }
    }

    private fun detectShake(accel: FloatArray) {
        val magnitude = sqrt(accel[0] * accel[0] + accel[1] * accel[1] + accel[2] * accel[2])
        val now = System.currentTimeMillis()
        if (now - lastGestureTime < COOLDOWN_MS) return

        if (magnitude > SHAKE_THRESHOLD + 9.8f) {
            when (shakeState) {
                0 -> if (accel[0] > SHAKE_THRESHOLD) shakeState = 1
                1 -> if (accel[0] < -SHAKE_THRESHOLD) {
                    sendGesture("SHAKE")
                    shakeState = 0
                    lastGestureTime = now
                }
            }
        }
    }

    private fun detectTilt(accel: FloatArray) {
        val roll = accel[1]
        val now = System.currentTimeMillis()
        if (now - lastGestureTime < COOLDOWN_MS) return

        when (tiltState) {
            0 -> {
                if (roll > TILT_THRESHOLD) tiltState = 1
                else if (roll < -TILT_THRESHOLD) tiltState = 2
            }
            1 -> if (roll < 1) {
                sendGesture("TILT_RIGHT")
                tiltState = 0
                lastGestureTime = now
            }
            2 -> if (roll > -1) {
                sendGesture("TILT_LEFT")
                tiltState = 0
                lastGestureTime = now
            }
        }
    }

    private fun sendGesture(gesture: String) {
        val params = Arguments.createMap().apply {
            putString("gesture", gesture)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_HEAD_GESTURE, params)
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
