// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/AmbientSound.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

class AmbientSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "AmbientSound"
        const val SAMPLE_RATE = 16000
        const val BUFFER_SIZE = 1024
        const val EVENT_SOUND_ANALYSIS = "onSoundAnalysis"
    }

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private val soundHistory = mutableListOf<Map<String, Any>>()

    override fun getName(): String = "AmbientSound"

    @ReactMethod
    fun startAnalysis(promise: Promise) {
        if (isRecording) {
            promise.resolve("Already analyzing")
            return
        }

        val context = reactApplicationContext
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "Record audio permission not granted")
            return
        }

        startBackgroundThread()

        val minBufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBufferSize.coerceAtLeast(BUFFER_SIZE * 2)
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            promise.reject("INIT_FAILED", "AudioRecord initialization failed")
            return
        }

        isRecording = true
        audioRecord?.startRecording()
        backgroundHandler?.post(audioAnalysisRunnable)
        promise.resolve("Ambient sound analysis started")
    }

    @ReactMethod
    fun stopAnalysis(promise: Promise) {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        stopBackgroundThread()
        promise.resolve("Analysis stopped")
    }

    @ReactMethod
    fun getSoundHistory(promise: Promise) {
        promise.resolve(Arguments.fromList(soundHistory))
    }

    private val audioAnalysisRunnable = object : Runnable {
        override fun run() {
            if (!isRecording || audioRecord == null) return

            val buffer = ShortArray(BUFFER_SIZE)
            val read = audioRecord?.read(buffer, 0, BUFFER_SIZE) ?: 0

            if (read > 0) {
                val analysis = analyzeBuffer(buffer, read)
                soundHistory.add(analysis)
                if (soundHistory.size > 100) soundHistory.removeAt(0)

                val params = Arguments.createMap().apply {
                    putDouble("rms", analysis["rms"] as Double)
                    putDouble("db", analysis["db"] as Double)
                    putDouble("peak", analysis["peak"] as Double)
                    putDouble("zeroCrossingRate", analysis["zeroCrossingRate"] as Double)
                    putString("classification", analysis["classification"] as String)
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(EVENT_SOUND_ANALYSIS, params)
            }

            if (isRecording) {
                backgroundHandler?.postDelayed(this, 500)
            }
        }
    }

    private fun analyzeBuffer(buffer: ShortArray, readSize: Int): Map<String, Any> {
        var sum = 0.0
        var peak = 0.0
        var zeroCrossings = 0
        var prevSample = 0.0

        for (i in 0 until readSize) {
            val sample = buffer[i].toDouble()
            sum += sample * sample
            peak = maxOf(peak, abs(sample))
            if ((sample > 0 && prevSample <= 0) || (sample < 0 && prevSample >= 0)) {
                zeroCrossings++
            }
            prevSample = sample
        }

        val rms = sqrt(sum / readSize)
        val db = if (rms > 0) 20 * log10(rms / 32768.0) else -100.0
        val zcr = zeroCrossings.toDouble() / readSize

        val classification = when {
            db < -60 -> "SILENCE"
            db < -40 -> "QUIET"
            db < -20 -> "NORMAL"
            db < -10 -> "LOUD"
            else -> "VERY_LOUD"
        }

        return mapOf(
            "rms" to rms,
            "db" to db,
            "peak" to peak,
            "zeroCrossingRate" to zcr,
            "classification" to classification
        )
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("AmbientSoundThread").also { it.start() }
        backgroundHandler = Handler(backgroundThread!!.looper)
    }

    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join(500)
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Thread interrupted", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
