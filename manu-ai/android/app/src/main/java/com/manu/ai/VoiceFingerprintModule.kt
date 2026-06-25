package com.manu.ai

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.io.File
import kotlin.math.log10
import kotlin.math.sqrt

class VoiceFingerprintModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VoiceFingerprintModule"

    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private val scope = CoroutineScope(Dispatchers.IO)

    private val fingerprintFile by lazy {
        File(reactApplicationContext.filesDir, "voice_fingerprint.json")
    }

    @ReactMethod
    fun enrollVoice(durationMs: Int, promise: Promise) {
        scope.launch {
            try {
                if (isRecording) {
                    promise.reject("ALREADY_RECORDING", "Another recording is in progress")
                    return@launch
                }

                val duration = durationMs.coerceIn(2000, 10000)
                val audioData = recordAudio(duration)

                if (audioData.isEmpty()) {
                    promise.reject("NO_AUDIO", "No audio captured. Check microphone permission.")
                    return@launch
                }

                val fingerprint = extractFingerprint(audioData)
                saveFingerprint(fingerprint)

                promise.resolve("Voice enrolled successfully. Pitch: ${fingerprint.pitch}, Volume: ${fingerprint.volume}")
            } catch (e: Exception) {
                promise.reject("ENROLL_ERROR", "Failed to enroll voice: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun verifyVoice(durationMs: Int, promise: Promise) {
        scope.launch {
            try {
                if (!fingerprintFile.exists()) {
                    promise.reject("NO_FINGERPRINT", "No voice fingerprint enrolled. Enroll first in Settings.")
                    return@launch
                }

                if (isRecording) {
                    promise.reject("ALREADY_RECORDING", "Another recording is in progress")
                    return@launch
                }

                val duration = durationMs.coerceIn(2000, 5000)
                val audioData = recordAudio(duration)

                if (audioData.isEmpty()) {
                    promise.reject("NO_AUDIO", "No audio captured. Check microphone permission.")
                    return@launch
                }

                val currentFingerprint = extractFingerprint(audioData)
                val storedFingerprint = loadFingerprint()

                val matchScore = compareFingerprints(currentFingerprint, storedFingerprint)

                val result = Arguments.createMap().apply {
                    putDouble("matchScore", matchScore)
                    putBoolean("approved", matchScore >= 60.0)
                    putString("details", "Pitch: ${currentFingerprint.pitch}, Volume: ${currentFingerprint.volume}, Match: ${matchScore}%")
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("VERIFY_ERROR", "Failed to verify voice: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun deleteFingerprint(promise: Promise) {
        try {
            if (fingerprintFile.exists()) {
                fingerprintFile.delete()
                promise.resolve("Voice fingerprint deleted")
            } else {
                promise.resolve("No fingerprint to delete")
            }
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", "Failed to delete fingerprint: ${e.message}")
        }
    }

    @ReactMethod
    fun hasFingerprint(promise: Promise) {
        promise.resolve(fingerprintFile.exists())
    }

    private fun recordAudio(durationMs: Int): ShortArray {
        isRecording = true
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            isRecording = false
            return ShortArray(0)
        }

        audioRecord?.startRecording()
        val totalSamples = (sampleRate * durationMs / 1000)
        val audioData = ShortArray(totalSamples)
        var samplesRead = 0
        val tempBuffer = ShortArray(bufferSize)
        val startTime = System.currentTimeMillis()

        while (samplesRead < totalSamples && System.currentTimeMillis() - startTime < durationMs + 500) {
            val read = audioRecord?.read(tempBuffer, 0, tempBuffer.size) ?: 0
            if (read > 0) {
                val toCopy = minOf(read, totalSamples - samplesRead)
                tempBuffer.copyInto(audioData, samplesRead, 0, toCopy)
                samplesRead += toCopy
            }
        }

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        isRecording = false

        return audioData.copyOf(samplesRead)
    }

    private fun extractFingerprint(audioData: ShortArray): VoiceFingerprint {
        val rms = calculateRMS(audioData)
        val volumeDb = 20 * log10(rms / 32768.0 + 1e-10)
        val volumePercent = ((volumeDb + 60) / 60 * 100).coerceIn(0.0, 100.0)

        val pitch = estimatePitch(audioData)
        val cadence = calculateCadence(audioData)
        val clarity = calculateClarity(audioData)

        return VoiceFingerprint(pitch, volumePercent, cadence, clarity)
    }

    private fun calculateRMS(data: ShortArray): Double {
        var sum = 0.0
        for (sample in data) {
            sum += sample * sample
        }
        return sqrt(sum / data.size)
    }

    private fun estimatePitch(data: ShortArray): Double {
        val zeroCrossings = data.zipWithNext { a, b -> if ((a > 0) != (b > 0)) 1 else 0 }.sum()
        val durationSeconds = data.size.toDouble() / sampleRate
        val frequency = zeroCrossings / (2 * durationSeconds)
        return frequency.coerceIn(50.0, 500.0)
    }

    private fun calculateCadence(data: ShortArray): Double {
        val chunkSize = sampleRate / 10
        var silentChunks = 0
        var totalChunks = 0

        for (i in data.indices step chunkSize) {
            val end = minOf(i + chunkSize, data.size)
            val chunk = data.sliceArray(i until end)
            val rms = calculateRMS(chunk)
            if (rms < 100) silentChunks++
            totalChunks++
        }

        val speechRatio = 1.0 - (silentChunks.toDouble() / totalChunks)
        return (speechRatio * 100).coerceIn(0.0, 100.0)
    }

    private fun calculateClarity(data: ShortArray): Double {
        val mean = data.average()
        val variance = data.map { (it - mean) * (it - mean) }.average()
        val snr = if (variance > 0) 10 * log10(variance / 100.0 + 1) else 0.0
        return snr.coerceIn(0.0, 100.0)
    }

    private fun compareFingerprints(current: VoiceFingerprint, stored: VoiceFingerprint): Double {
        val pitchDiff = 1.0 - kotlin.math.abs(current.pitch - stored.pitch) / stored.pitch.coerceAtLeast(1.0)
        val volumeDiff = 1.0 - kotlin.math.abs(current.volume - stored.volume) / 100.0
        val cadenceDiff = 1.0 - kotlin.math.abs(current.cadence - stored.cadence) / 100.0
        val clarityDiff = 1.0 - kotlin.math.abs(current.clarity - stored.clarity) / 100.0

        val score = (pitchDiff * 0.50 + volumeDiff * 0.20 + cadenceDiff * 0.20 + clarityDiff * 0.10) * 100
        return score.coerceIn(0.0, 100.0)
    }

    private fun saveFingerprint(fp: VoiceFingerprint) {
        val json = """{"pitch":${fp.pitch},"volume":${fp.volume},"cadence":${fp.cadence},"clarity":${fp.clarity}}"""
        fingerprintFile.writeText(json)
    }

    private fun loadFingerprint(): VoiceFingerprint {
        val json = fingerprintFile.readText()
        val obj = org.json.JSONObject(json)
        return VoiceFingerprint(
            obj.getDouble("pitch"),
            obj.getDouble("volume"),
            obj.getDouble("cadence"),
            obj.getDouble("clarity")
        )
    }

    data class VoiceFingerprint(
        val pitch: Double,
        val volume: Double,
        val cadence: Double,
        val clarity: Double
    )
}
