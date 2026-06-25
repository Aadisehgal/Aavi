// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Voice Stress Detection)
// File: android/app/src/main/java/com/manu/ai/modules/StressDetector.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * StressDetector analyzes voice pitch variance and frequency patterns
 * to detect stress, panic, or emotional distress in real-time audio.
 *
 * Uses Android AudioRecord with built-in DSP — no external libraries.
 */
class StressDetector(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "StressDetector"
        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        const val BUFFER_SIZE = 1024
        const val TAG = "StressDetector"
    }

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingThread: Thread? = null
    private val handler = Handler(Looper.getMainLooper())

    private var baselinePitch: Double = 0.0
    private var baselineEnergy: Double = 0.0
    private var isCalibrated = false
    private val calibrationSamples = mutableListOf<Double>()
    private val calibrationEnergySamples = mutableListOf<Double>()

    private val panicThreshold = 2.5
    private val stressThreshold = 1.8
    private val minPitchHz = 50.0
    private val maxPitchHz = 500.0
    private val calibrationWindowSize = 50

    private val pitchHistory = ArrayDeque<Double>(100)
    private val energyHistory = ArrayDeque<Double>(100)

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun calibrate(promise: Promise) {
        try {
            if (audioRecord?.state == AudioRecord.STATE_INITIALIZED) {
                promise.reject("ALREADY_INITIALIZED", "AudioRecord already initialized")
                return
            }

            val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
                promise.reject("BUFFER_ERROR", "Invalid buffer size for AudioRecord")
                return
            }

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                minBufferSize * 2
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject("INIT_ERROR", "AudioRecord failed to initialize")
                return
            }

            isCalibrated = false
            calibrationSamples.clear()
            calibrationEnergySamples.clear()
            startCalibrationRecording(promise)

        } catch (e: Exception) {
            Log.e(TAG, "Calibration error", e)
            promise.reject("CALIBRATION_ERROR", e.message)
        }
    }

    private fun startCalibrationRecording(promise: Promise) {
        audioRecord?.startRecording()
        isRecording = true

        recordingThread = Thread {
            val buffer = ShortArray(BUFFER_SIZE)
            var samplesCollected = 0

            while (isRecording && samplesCollected < calibrationWindowSize) {
                val read = audioRecord?.read(buffer, 0, BUFFER_SIZE) ?: 0
                if (read > 0) {
                    val pitch = estimatePitch(buffer, read)
                    val energy = calculateEnergy(buffer, read)
                    if (pitch in minPitchHz..maxPitchHz) {
                        calibrationSamples.add(pitch)
                        calibrationEnergySamples.add(energy)
                        samplesCollected++
                    }
                }
            }

            stopRecording()

            if (calibrationSamples.size >= 10) {
                baselinePitch = calibrationSamples.average()
                baselineEnergy = calibrationEnergySamples.average()
                isCalibrated = true

                handler.post {
                    promise.resolve(
                        Arguments.createMap().apply {
                            putDouble("baselinePitch", baselinePitch)
                            putDouble("baselineEnergy", baselineEnergy)
                            putBoolean("calibrated", true)
                        }
                    )
                }
            } else {
                handler.post {
                    promise.reject("CALIBRATION_FAILED", "Not enough valid voice samples. Please speak clearly.")
                }
            }
        }
        recordingThread?.start()
    }

    @ReactMethod
    fun startDetection(promise: Promise) {
        if (!isCalibrated) {
            promise.reject("NOT_CALIBRATED", "Please calibrate first using calibrate()")
            return
        }

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                minBufferSize * 2
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject("INIT_ERROR", "AudioRecord failed to initialize for detection")
                return
            }

            audioRecord?.startRecording()
            isRecording = true
            pitchHistory.clear()
            energyHistory.clear()

            recordingThread = Thread {
                val buffer = ShortArray(BUFFER_SIZE)
                var consecutiveStressFrames = 0
                var consecutivePanicFrames = 0
                val stressFrameThreshold = 5
                val panicFrameThreshold = 3

                while (isRecording) {
                    val read = audioRecord?.read(buffer, 0, BUFFER_SIZE) ?: 0
                    if (read > 0) {
                        val pitch = estimatePitch(buffer, read)
                        val energy = calculateEnergy(buffer, read)

                        if (pitch in minPitchHz..maxPitchHz) {
                            pitchHistory.addLast(pitch)
                            energyHistory.addLast(energy)
                            if (pitchHistory.size > 100) pitchHistory.removeFirst()
                            if (energyHistory.size > 100) energyHistory.removeFirst()

                            val analysis = analyzeStress(pitch, energy)

                            when (analysis.level) {
                                "panic" -> {
                                    consecutivePanicFrames++
                                    consecutiveStressFrames = 0
                                    if (consecutivePanicFrames >= panicFrameThreshold) {
                                        emitEvent("onStressDetected", analysis.toWritableMap())
                                        consecutivePanicFrames = 0
                                    }
                                }
                                "stress" -> {
                                    consecutiveStressFrames++
                                    consecutivePanicFrames = 0
                                    if (consecutiveStressFrames >= stressFrameThreshold) {
                                        emitEvent("onStressDetected", analysis.toWritableMap())
                                        consecutiveStressFrames = 0
                                    }
                                }
                                else -> {
                                    consecutiveStressFrames = 0
                                    consecutivePanicFrames = 0
                                }
                            }

                            emitEvent("onPitchData", Arguments.createMap().apply {
                                putDouble("pitch", pitch)
                                putDouble("energy", energy)
                                putDouble("baselinePitch", baselinePitch)
                                putDouble("baselineEnergy", baselineEnergy)
                            })
                        }
                    }
                }
            }
            recordingThread?.start()
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(TAG, "Start detection error", e)
            promise.reject("DETECTION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopDetection(promise: Promise) {
        stopRecording()
        promise.resolve(true)
    }

    @ReactMethod
    fun getCurrentStatus(promise: Promise) {
        val map = Arguments.createMap().apply {
            putBoolean("isCalibrated", isCalibrated)
            putBoolean("isRecording", isRecording)
            putDouble("baselinePitch", baselinePitch)
            putDouble("baselineEnergy", baselineEnergy)
            putInt("pitchHistorySize", pitchHistory.size)
            putInt("energyHistorySize", energyHistory.size)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun resetCalibration(promise: Promise) {
        isCalibrated = false
        baselinePitch = 0.0
        baselineEnergy = 0.0
        calibrationSamples.clear()
        calibrationEnergySamples.clear()
        pitchHistory.clear()
        energyHistory.clear()
        promise.resolve(true)
    }

    private fun stopRecording() {
        isRecording = false
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping AudioRecord", e)
        }
        audioRecord = null
        recordingThread = null
    }

    /**
     * Estimate fundamental frequency using autocorrelation method.
     * Built-in DSP — no external libraries.
     */
    private fun estimatePitch(buffer: ShortArray, readSize: Int): Double {
        val samples = DoubleArray(readSize)
        for (i in 0 until readSize) {
            samples[i] = buffer[i].toDouble() / Short.MAX_VALUE
        }

        val sampleRate = SAMPLE_RATE.toDouble()
        val minLag = (sampleRate / maxPitchHz).toInt()
        val maxLag = (sampleRate / minPitchHz).toInt()

        var bestLag = 0
        var bestCorrelation = -1.0

        for (lag in minLag..maxLag.coerceAtMost(readSize / 2)) {
            var correlation = 0.0
            for (i in 0 until readSize - lag) {
                correlation += samples[i] * samples[i + lag]
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation
                bestLag = lag
            }
        }

        return if (bestLag > 0) sampleRate / bestLag else 0.0
    }

    private fun calculateEnergy(buffer: ShortArray, readSize: Int): Double {
        var sum = 0.0
        for (i in 0 until readSize) {
            sum += abs(buffer[i].toDouble())
        }
        val avg = sum / readSize
        return if (avg > 0) 20.0 * log10(avg) else -96.0
    }

    private fun analyzeStress(currentPitch: Double, currentEnergy: Double): StressAnalysis {
        if (!isCalibrated || pitchHistory.size < 10) {
            return StressAnalysis("unknown", 0.0, "Not enough data")
        }

        val recentPitches = pitchHistory.toList()
        val meanPitch = recentPitches.average()
        val variance = recentPitches.map { (it - meanPitch) * (it - meanPitch) }.average()
        val stdDev = sqrt(variance)
        val pitchRatio = if (baselinePitch > 0) currentPitch / baselinePitch else 1.0
        val energyRatio = if (baselineEnergy > 0) currentEnergy / baselineEnergy else 1.0

        val pitchVarianceRatio = if (baselinePitch > 0) stdDev / baselinePitch else 0.0

        return when {
            pitchVarianceRatio > panicThreshold || pitchRatio > 2.2 || energyRatio > 2.5 -> {
                val confidence = ((pitchVarianceRatio - panicThreshold) / panicThreshold).coerceIn(0.0, 1.0)
                StressAnalysis("panic", confidence, "High pitch variance and energy spike detected")
            }
            pitchVarianceRatio > stressThreshold || pitchRatio > 1.8 || energyRatio > 2.0 -> {
                val confidence = ((pitchVarianceRatio - stressThreshold) / (panicThreshold - stressThreshold)).coerceIn(0.0, 1.0)
                StressAnalysis("stress", confidence, "Elevated pitch variance indicates stress")
            }
            else -> {
                StressAnalysis("normal", 0.0, "Voice patterns within normal range")
            }
        }
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        handler.post {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        }
    }

    data class StressAnalysis(
        val level: String,
        val confidence: Double,
        val reason: String
    ) {
        fun toWritableMap(): WritableMap = Arguments.createMap().apply {
            putString("level", level)
            putDouble("confidence", confidence)
            putString("reason", reason)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }
}
