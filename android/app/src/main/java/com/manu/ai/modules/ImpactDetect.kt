// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Impact Detection
// File: android/app/src/main/java/com/manu/ai/modules/ImpactDetect.kt
// Generated: 2026-06-25

package com.manu.ai.modules

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import kotlin.math.abs
import kotlin.math.sqrt

class ImpactDetectModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager: SensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var isListening = false
    private val handler = Handler(Looper.getMainLooper())

    private val IMPACT_G_THRESHOLD = 35.0f
    private val JERK_THRESHOLD = 500.0f
    private val GYRO_THRESHOLD = 15.0f

    private var lastAccel = floatArrayOf(0f, 0f, 0f)
    private var lastTimestamp = 0L

    override fun getName(): String = "ImpactDetect"

    @ReactMethod
    fun startMonitoring(promise: Promise) {
        try {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

            if (accelerometer == null) {
                promise.reject("NO_ACCEL", "Accelerometer not available", null)
                return
            }

            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
            gyroscope?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }

            isListening = true
            promise.resolve(mapOf("listening" to true, "hasGyro" to (gyroscope != null)).toWritableMap())
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        try {
            sensorManager.unregisterListener(this)
            isListening = false
            promise.resolve(mapOf("listening" to false).toWritableMap())
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve(mapOf(
            "listening" to isListening,
            "hasAccelerometer" to (accelerometer != null),
            "hasGyroscope" to (gyroscope != null)
        ).toWritableMap())
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event?.let { e ->
            when (e.sensor.type) {
                Sensor.TYPE_ACCELEROMETER -> handleAccelerometer(e)
                Sensor.TYPE_GYROSCOPE -> handleGyroscope(e)
            }
        }
    }

    private fun handleAccelerometer(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z)

        val dt = (event.timestamp - lastTimestamp) / 1_000_000_000.0f
        if (dt > 0 && lastAccel[0] != 0f) {
            val jerk = abs(magnitude - sqrt(lastAccel[0] * lastAccel[0] + lastAccel[1] * lastAccel[1] + lastAccel[2] * lastAccel[2])) / dt

            if (magnitude > IMPACT_G_THRESHOLD || jerk > JERK_THRESHOLD) {
                emitImpactEvent(magnitude, jerk, x, y, z)
            }
        }

        lastAccel = floatArrayOf(x, y, z)
        lastTimestamp = event.timestamp
    }

    private fun handleGyroscope(event: SensorEvent) {
        val x = abs(event.values[0])
        val y = abs(event.values[1])
        val z = abs(event.values[2])
        val maxRotation = maxOf(x, y, z)

        if (maxRotation > GYRO_THRESHOLD) {
            emitGyroEvent(maxRotation, x, y, z)
        }
    }

    private fun emitImpactEvent(magnitude: Float, jerk: Float, x: Float, y: Float, z: Float) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IMPACT_DETECTED", mapOf(
                "timestamp" to System.currentTimeMillis(),
                "magnitude" to magnitude,
                "jerk" to jerk,
                "x" to x,
                "y" to y,
                "z" to z,
                "type" to "acceleration"
            ).toWritableMap())
    }

    private fun emitGyroEvent(maxRotation: Float, x: Float, y: Float, z: Float) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IMPACT_DETECTED", mapOf(
                "timestamp" to System.currentTimeMillis(),
                "maxRotation" to maxRotation,
                "x" to x,
                "y" to y,
                "z" to z,
                "type" to "rotation"
            ).toWritableMap())
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
