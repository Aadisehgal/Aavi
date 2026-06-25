// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: android/app/src/main/java/com/manu/ai/modules/VoiceChanger.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.os.Process
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.PI
import kotlin.math.sin

class VoiceChanger(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VoiceChanger"

    private var audioTrack: AudioTrack? = null
    private var isRecording = AtomicBoolean(false)
    private var currentEffect = "none"
    private var recordingThread: Thread? = null
    private var sampleRate = 44100
    private var bufferSize = 8192

    private var pitchShift = 1.0f
    private var robotModulation = 0.0f
    private var echoDelay = 0
    private var echoDecay = 0.5f
    private var alienWarp = 0.0f

    @ReactMethod
    fun initialize(config: ReadableMap, promise: Promise) {
        sampleRate = if (config.hasKey("sampleRate")) config.getInt("sampleRate") else 44100
        bufferSize = if (config.hasKey("bufferSize")) config.getInt("bufferSize") else 8192
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        audioTrack = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(minBufferSize.coerceAtLeast(bufferSize))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
        } else {
            @Suppress("DEPRECATION")
            AudioTrack(
                AudioAttributes.USAGE_MEDIA, sampleRate, AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT, minBufferSize.coerceAtLeast(bufferSize), AudioTrack.MODE_STREAM
            )
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun setEffect(effect: String, promise: Promise) {
        currentEffect = effect
        when (effect) {
            "robot" -> { pitchShift = 1.0f; robotModulation = 15.0f; echoDelay = 0; alienWarp = 0.0f }
            "alien" -> { pitchShift = 0.7f; robotModulation = 0.0f; echoDelay = 800; alienWarp = 0.3f }
            "kid" -> { pitchShift = 1.5f; robotModulation = 0.0f; echoDelay = 0; alienWarp = 0.0f }
            "deep" -> { pitchShift = 0.6f; robotModulation = 0.0f; echoDelay = 200; alienWarp = 0.0f }
            "echo" -> { pitchShift = 1.0f; robotModulation = 0.0f; echoDelay = 1200; alienWarp = 0.0f }
            "chipmunk" -> { pitchShift = 2.0f; robotModulation = 0.0f; echoDelay = 0; alienWarp = 0.0f }
            else -> { pitchShift = 1.0f; robotModulation = 0.0f; echoDelay = 0; alienWarp = 0.0f }
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun startPlayback(promise: Promise) {
        if (isRecording.get()) {
            promise.reject("ALREADY_RUNNING", "Voice changer is already active")
            return
        }
        isRecording.set(true)
        audioTrack?.play()
        recordingThread = Thread {
            Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
            val buffer = ShortArray(bufferSize)
            var phase = 0.0
            val echoBuffer = ShortArray(sampleRate)
            var echoIndex = 0
            while (isRecording.get()) {
                for (i in buffer.indices) {
                    val time = i.toDouble() / sampleRate
                    var sample = (sin(2 * PI * 440 * time) * 32767).toInt().toShort()
                    if (robotModulation > 0) {
                        phase += robotModulation / sampleRate
                        val modulator = (sin(2 * PI * phase) + 1.0) / 2.0
                        sample = (sample * modulator).toInt().toShort()
                    }
                    if (pitchShift != 1.0f) {
                        sample = (sample * pitchShift).toInt().coerceIn(-32768, 32767).toShort()
                    }
                    if (alienWarp > 0) {
                        phase += alienWarp / sampleRate
                        val warp = sin(2 * PI * phase * 5)
                        sample = (sample * (1.0 + warp * 0.3)).toInt().coerceIn(-32768, 32767).toShort()
                    }
                    if (echoDelay > 0) {
                        val echoPos = (echoIndex - echoDelay + echoBuffer.size) % echoBuffer.size
                        val echoSample = echoBuffer[echoPos]
                        sample = (sample + echoSample * echoDecay).toInt().coerceIn(-32768, 32767).toShort()
                    }
                    echoBuffer[echoIndex] = sample
                    echoIndex = (echoIndex + 1) % echoBuffer.size
                    buffer[i] = sample
                }
                audioTrack?.write(buffer, 0, buffer.size)
            }
        }.apply { start() }
        promise.resolve(true)
    }

    @ReactMethod
    fun stopPlayback(promise: Promise) {
        isRecording.set(false)
        recordingThread?.join(500)
        recordingThread = null
        audioTrack?.stop()
        promise.resolve(true)
    }

    @ReactMethod
    fun previewText(text: String, effect: String, promise: Promise) {
        setEffect(effect, object : Promise {
            override fun resolve(value: Any?) {
                val event = Arguments.createMap().apply {
                    putString("text", text)
                    putString("effect", effect)
                    putString("status", "preview_ready")
                }
                emitEvent("VoicePreviewReady", event)
                promise.resolve(true)
            }
            override fun reject(code: String, message: String) { promise.reject(code, message) }
            override fun reject(code: String, message: String, throwable: Throwable?) { promise.reject(code, message, throwable) }
            override fun reject(throwable: Throwable) { promise.reject(throwable) }
            override fun reject(throwable: Throwable, userInfo: WritableMap?) { promise.reject(throwable, userInfo) }
            override fun reject(code: String, userInfo: WritableMap) { promise.reject(code, userInfo) }
            override fun reject(code: String, message: String, userInfo: WritableMap) { promise.reject(code, message, userInfo) }
            override fun reject(code: String, message: String, throwable: Throwable, userInfo: WritableMap) { promise.reject(code, message, throwable, userInfo) }
        })
    }

    @ReactMethod
    fun getAvailableEffects(promise: Promise) {
        val effects = Arguments.createArray().apply {
            pushString("none"); pushString("robot"); pushString("alien"); pushString("kid")
            pushString("deep"); pushString("echo"); pushString("chipmunk")
        }
        promise.resolve(effects)
    }

    @ReactMethod
    fun release(promise: Promise) {
        stopPlayback(object : Promise {
            override fun resolve(value: Any?) {
                audioTrack?.release()
                audioTrack = null
                promise.resolve(true)
            }
            override fun reject(code: String, message: String) { promise.resolve(true) }
            override fun reject(code: String, message: String, throwable: Throwable?) { promise.resolve(true) }
            override fun reject(throwable: Throwable) { promise.resolve(true) }
            override fun reject(throwable: Throwable, userInfo: WritableMap?) { promise.resolve(true) }
            override fun reject(code: String, userInfo: WritableMap) { promise.resolve(true) }
            override fun reject(code: String, message: String, userInfo: WritableMap) { promise.resolve(true) }
            override fun reject(code: String, message: String, throwable: Throwable, userInfo: WritableMap) { promise.resolve(true) }
        })
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        isRecording.set(false)
        recordingThread?.join(500)
        audioTrack?.release()
        audioTrack = null
    }
}
