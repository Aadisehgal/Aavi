// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/HapticEngine.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.facebook.react.bridge.*

class HapticEngineModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "HapticEngine"
    }

    private val vibrator: Vibrator by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = reactContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            reactContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    override fun getName(): String = "HapticEngine"

    @ReactMethod
    fun triggerHaptic(pattern: String, promise: Promise) {
        try {
            when (pattern.uppercase()) {
                "TAP" -> performTap()
                "SUCCESS" -> performSuccess()
                "ERROR" -> performError()
                "WARNING" -> performWarning()
                "HEAVY" -> performHeavy()
                "LIGHT" -> performLight()
                "DOUBLE_TAP" -> performDoubleTap()
                "NOTIFICATION" -> performNotification()
                "ALERT" -> performAlert()
                "CUSTOM" -> performCustom()
                else -> performTap()
            }
            promise.resolve("Haptic triggered: $pattern")
        } catch (e: Exception) {
            Log.e(TAG, "Haptic error", e)
            promise.reject("HAPTIC_ERROR", e.message)
        }
    }

    @ReactMethod
    fun triggerCustomHaptic(timings: ReadableArray, amplitudes: ReadableArray, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val timingArray = LongArray(timings.size()) { timings.getInt(it).toLong() }
                val amplitudeArray = if (amplitudes.size() > 0) {
                    IntArray(amplitudes.size()) { amplitudes.getInt(it) }
                } else null

                val effect = if (amplitudeArray != null) {
                    VibrationEffect.createWaveform(timingArray, amplitudeArray, -1)
                } else {
                    VibrationEffect.createWaveform(timingArray, -1)
                }
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(50)
            }
            promise.resolve("Custom haptic triggered")
        } catch (e: Exception) {
            promise.reject("HAPTIC_ERROR", e.message)
        }
    }

    private fun performTap() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(10)
        }
    }

    private fun performSuccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 50, 50, 50)
            val amplitudes = intArrayOf(0, 100, 0, 150)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 50, 50, 50), -1)
        }
    }

    private fun performError() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 80, 40, 80)
            val amplitudes = intArrayOf(0, 200, 0, 200)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 80, 40, 80), -1)
        }
    }

    private fun performWarning() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 30, 20, 30, 20, 30)
            val amplitudes = intArrayOf(0, 120, 0, 120, 0, 120)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 30, 20, 30, 20, 30), -1)
        }
    }

    private fun performHeavy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(100, 255))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(100)
        }
    }

    private fun performLight() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(20, 50))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(20)
        }
    }

    private fun performDoubleTap() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 20, 40, 20)
            val amplitudes = intArrayOf(0, 180, 0, 180)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 20, 40, 20), -1)
        }
    }

    private fun performNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 100, 200, 300)
            val amplitudes = intArrayOf(0, 80, 0, 200)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 100, 200, 300), -1)
        }
    }

    private fun performAlert() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 500, 200, 500, 200, 500)
            val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 500, 200, 500, 200, 500), -1)
        }
    }

    private fun performCustom() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timings = longArrayOf(0, 50, 100, 50, 100, 50, 200, 100)
            val amplitudes = intArrayOf(0, 100, 0, 150, 0, 80, 0, 200)
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 50, 100, 50, 100, 50, 200, 100), -1)
        }
    }
}
