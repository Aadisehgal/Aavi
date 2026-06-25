// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: android/app/src/main/java/com/manu/ai/modules/SpatialAudio.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.cos
import kotlin.math.sin

class SpatialAudio(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SpatialAudio"

    private var soundPool: SoundPool? = null
    private val loadedSounds = mutableMapOf<String, Int>()
    private val soundIds = mutableMapOf<Int, Int>()
    private var maxStreams = 8
    private var masterVolume: Float = 1.0f

    private val DIRECTION_FRONT = 0.0
    private val DIRECTION_RIGHT = 90.0
    private val DIRECTION_BACK = 180.0
    private val DIRECTION_LEFT = 270.0

    init {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(maxStreams)
            .setAudioAttributes(audioAttributes)
            .build()

        soundPool?.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0) {
                val event = Arguments.createMap().apply {
                    putInt("sampleId", sampleId)
                    putString("status", "loaded")
                }
                emitEvent("SpatialAudioLoaded", event)
            }
        }
    }

    @ReactMethod
    fun configure(params: ReadableMap, promise: Promise) {
        maxStreams = if (params.hasKey("maxStreams")) params.getInt("maxStreams") else 8
        masterVolume = if (params.hasKey("volume")) params.getDouble("volume").toFloat() else 1.0f
        promise.resolve(true)
    }

    @ReactMethod
    fun loadSound(name: String, resourceName: String, promise: Promise) {
        val context = reactApplicationContext
        val resId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
        if (resId == 0) {
            promise.reject("NOT_FOUND", "Sound resource not found: $resourceName")
            return
        }
        val soundId = soundPool?.load(context, resId, 1) ?: -1
        if (soundId != -1) {
            loadedSounds[name] = soundId
            soundIds[soundId] = resId
            promise.resolve(soundId)
        } else {
            promise.reject("LOAD_ERROR", "Failed to load sound: $name")
        }
    }

    @ReactMethod
    fun playDirectional(name: String, direction: Double, distance: Double, promise: Promise) {
        val soundId = loadedSounds[name]
        if (soundId == null) {
            promise.reject("NOT_LOADED", "Sound not loaded: $name")
            return
        }
        val radians = Math.toRadians(direction)
        val pan = sin(radians).toFloat()
        val elevation = cos(radians).toFloat()
        val attenuation = (1.0f - (distance / 100.0).toFloat()).coerceIn(0.1f, 1.0f)
        val baseVolume = masterVolume * attenuation
        val leftVolume = baseVolume * (1.0f - pan).coerceIn(0.0f, 1.0f)
        val rightVolume = baseVolume * (1.0f + pan).coerceIn(0.0f, 1.0f)
        val streamId = soundPool?.play(
            soundId, leftVolume, rightVolume, 1, 0, 1.0f + (elevation * 0.2f)
        ) ?: 0
        if (streamId != 0) {
            soundIds[soundId] = streamId
            promise.resolve(streamId)
        } else {
            promise.reject("PLAY_ERROR", "Failed to play sound")
        }
    }

    @ReactMethod
    fun playAlert(type: String, promise: Promise) {
        val direction = when (type) {
            "approach_left" -> DIRECTION_LEFT
            "approach_right" -> DIRECTION_RIGHT
            "approach_front" -> DIRECTION_FRONT
            "approach_back" -> DIRECTION_BACK
            "obstacle_near" -> DIRECTION_FRONT
            "notification" -> DIRECTION_RIGHT
            "warning" -> DIRECTION_LEFT
            else -> DIRECTION_FRONT
        }
        val distance = if (type.contains("near")) 5.0 else 20.0
        playDirectional("alert", direction, distance, promise)
    }

    @ReactMethod
    fun stopAll(promise: Promise) {
        soundPool?.autoPause()
        promise.resolve(true)
    }

    @ReactMethod
    fun stopSound(name: String, promise: Promise) {
        val soundId = loadedSounds[name]
        if (soundId != null) {
            val streamId = soundIds[soundId]
            if (streamId != null) soundPool?.stop(streamId)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun setVolume(streamId: Int, volume: Double, promise: Promise) {
        val vol = volume.toFloat().coerceIn(0.0f, 1.0f)
        soundPool?.setVolume(streamId, vol, vol)
        promise.resolve(true)
    }

    @ReactMethod
    fun hapticDirection(direction: Double, promise: Promise) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = reactApplicationContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            reactApplicationContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        val pattern = when {
            direction < 45.0 || direction >= 315.0 -> longArrayOf(0, 100, 50, 100)
            direction in 45.0..<135.0 -> longArrayOf(0, 50, 100, 50)
            direction in 135.0..<225.0 -> longArrayOf(0, 100, 100, 100)
            else -> longArrayOf(0, 50, 50, 50)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun release(promise: Promise) {
        soundPool?.release()
        soundPool = null
        loadedSounds.clear()
        soundIds.clear()
        promise.resolve(true)
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        soundPool?.release()
        soundPool = null
    }
}
