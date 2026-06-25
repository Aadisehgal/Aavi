// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 5/20 — Voice Fingerprint & Security
// File: android/app/src/main/java/com/manu/ai/modules/VoiceFingerprintModule.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.math.*

/**
 * VoiceFingerprintModule — Native voice recording, analysis, and biometric engine.
 *
 * Features:
 *   • 4-second voice enrollment (pitch, variance, volume, cadence)
 *   • 3-second voice verification with weighted scoring
 *   • AES-encrypted storage in SharedPreferences
 *   • PIN fallback for failed voice matches
 *   • Voice stress / panic detection (J.A.R.V.I.S. Upgrade Feature 4)
 *
 * Built-in APIs only: AudioRecord, MediaRecorder (for fallback), SharedPreferences,
 * Android Keystore-less AES, React Native Bridge.
 */

class VoiceFingerprintModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "VoiceFingerprint"
        const val PREFS_NAME = "ManuVoicePrefs"
        const val PREFS_KEY_SIGNATURE = "voice_signature_encrypted"
        const val PREFS_KEY_PIN_HASH = "voice_pin_hash"
        const val PREFS_KEY_OWNER_NAME = "voice_owner_name"
        const val PREFS_KEY_STRESS_BASELINE = "stress_baseline"

        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        const val ENROLL_DURATION_MS = 4000L
        const val VERIFY_DURATION_MS = 3000L
        const val STRESS_DURATION_MS = 3500L
        const val MATCH_THRESHOLD = 0.60
        const val MIN_PITCH_HZ = 50.0
        const val MAX_PITCH_HZ = 500.0

        // Scoring weights
        const val W_PITCH = 0.50
        const val W_VOLUME = 0.20
        const val W_CADENCE = 0.20
        const val W_CLARITY = 0.10
    }

    private val prefs: SharedPreferences by lazy {
        reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = MODULE_NAME

    // ========================================================================
    // SECTION 1: REACT EXPOSED METHODS
    // ========================================================================

    /**
     * Enroll owner voice — records 4 seconds, extracts biometric signature,
     * encrypts, and persists to SharedPreferences.
     */
    @ReactMethod
    fun enrollVoice(promise: Promise) {
        if (!hasRecordPermission()) {
            promise.reject("E_NO_PERMISSION", "RECORD_AUDIO permission not granted")
            return
        }
        recordAndAnalyze(ENROLL_DURATION_MS) { result ->
            when (result) {
                is RecordResult.Success -> {
                    val signature = VoiceSignature(
                        avgPitch = result.avgPitch,
                        pitchVariance = result.pitchVariance,
                        volume = result.volumeRMS,
                        cadence = result.cadenceWPM,
                        clarity = result.claritySNR,
                        timestamp = System.currentTimeMillis()
                    )
                    val encrypted = encryptSignature(signature)
                    prefs.edit().putString(PREFS_KEY_SIGNATURE, encrypted).apply()

                    val map = Arguments.createMap()
                    map.putDouble("avgPitch", signature.avgPitch)
                    map.putDouble("pitchVariance", signature.pitchVariance)
                    map.putDouble("volume", signature.volume)
                    map.putDouble("cadence", signature.cadence)
                    map.putDouble("clarity", signature.clarity)
                    map.putBoolean("success", true)
                    promise.resolve(map)
                }
                is RecordResult.Error -> {
                    promise.reject("E_RECORD", result.message)
                }
            }
        }
    }

    /**
     * Verify voice — records 3 seconds, compares against enrolled signature.
     * Returns match score and boolean result.
     */
    @ReactMethod
    fun verifyVoice(promise: Promise) {
        if (!hasRecordPermission()) {
            promise.reject("E_NO_PERMISSION", "RECORD_AUDIO permission not granted")
            return
        }
        val storedEnc = prefs.getString(PREFS_KEY_SIGNATURE, null)
        if (storedEnc == null) {
            promise.reject("E_NOT_ENROLLED", "No voiceprint enrolled. Enroll first.")
            return
        }
        val stored = decryptSignature(storedEnc)
        if (stored == null) {
            promise.reject("E_CORRUPT", "Stored voice signature is corrupted.")
            return
        }
        recordAndAnalyze(VERIFY_DURATION_MS) { result ->
            when (result) {
                is RecordResult.Success -> {
                    val score = calculateMatchScore(stored, result.data)
                    val isMatch = score >= MATCH_THRESHOLD
                    val map = Arguments.createMap()
                    map.putDouble("score", score)
                    map.putBoolean("match", isMatch)
                    map.putDouble("threshold", MATCH_THRESHOLD)
                    map.putString("detail", buildScoreDetail(stored, result.data, score))
                    promise.resolve(map)
                }
                is RecordResult.Error -> {
                    promise.reject("E_RECORD", result.message)
                }
            }
        }
    }

    /**
     * Check if a voiceprint is already enrolled.
     */
    @ReactMethod
    fun isEnrolled(promise: Promise) {
        val hasSig = prefs.contains(PREFS_KEY_SIGNATURE)
        val hasPin = prefs.contains(PREFS_KEY_PIN_HASH)
        val map = Arguments.createMap()
        map.putBoolean("enrolled", hasSig)
        map.putBoolean("hasPin", hasPin)
        promise.resolve(map)
    }

    /**
     * Delete enrolled voiceprint and PIN.
     */
    @ReactMethod
    fun deleteVoiceprint(promise: Promise) {
        prefs.edit()
            .remove(PREFS_KEY_SIGNATURE)
            .remove(PREFS_KEY_PIN_HASH)
            .remove(PREFS_KEY_OWNER_NAME)
            .remove(PREFS_KEY_STRESS_BASELINE)
            .apply()
        promise.resolve(true)
    }

    /**
     * Set fallback PIN (4-6 digits). Stored as SHA-256 hash.
     */
    @ReactMethod
    fun setPin(pin: String, promise: Promise) {
        if (pin.length < 4 || pin.length > 6 || !pin.all { it.isDigit() }) {
            promise.reject("E_INVALID_PIN", "PIN must be 4-6 digits.")
            return
        }
        val hash = sha256(pin)
        prefs.edit().putString(PREFS_KEY_PIN_HASH, hash).apply()
        promise.resolve(true)
    }

    /**
     * Verify fallback PIN.
     */
    @ReactMethod
    fun verifyWithPin(pin: String, promise: Promise) {
        val storedHash = prefs.getString(PREFS_KEY_PIN_HASH, null)
        if (storedHash == null) {
            promise.reject("E_NO_PIN", "No PIN set.")
            return
        }
        val inputHash = sha256(pin)
        val match = storedHash == inputHash
        val map = Arguments.createMap()
        map.putBoolean("match", match)
        promise.resolve(map)
    }

    /**
     * J.A.R.V.I.S. Upgrade Feature 4 — Voice Stress Detection.
     * Records voice, analyzes pitch jitter, shimmer, and rate.
     * Compares against baseline if available; otherwise returns raw metrics.
     */
    @ReactMethod
    fun detectStress(promise: Promise) {
        if (!hasRecordPermission()) {
            promise.reject("E_NO_PERMISSION", "RECORD_AUDIO permission not granted")
            return
        }
        recordAndAnalyze(STRESS_DURATION_MS) { result ->
            when (result) {
                is RecordResult.Success -> {
                    val stressScore = analyzeStress(result.data)
                    val baselineEnc = prefs.getString(PREFS_KEY_STRESS_BASELINE, null)
                    val map = Arguments.createMap()
                    map.putDouble("stressScore", stressScore) // 0.0 = calm, 1.0 = high stress
                    map.putDouble("pitchVariance", result.data.pitchVariance)
                    map.putDouble("jitter", result.data.jitter)
                    map.putDouble("shimmer", result.data.shimmer)
                    map.putDouble("speechRate", result.data.cadenceWPM)
                    map.putBoolean("panicDetected", stressScore > 0.75)

                    if (baselineEnc != null) {
                        val baseline = decryptSignature(baselineEnc)
                        if (baseline != null) {
                            val varianceDelta = result.pitchVariance / max(baseline.pitchVariance, 1.0)
                            map.putDouble("varianceDelta", varianceDelta)
                            map.putBoolean("elevated", varianceDelta > 1.5)
                        }
                    }
                    promise.resolve(map)
                }
                is RecordResult.Error -> {
                    promise.reject("E_RECORD", result.message)
                }
            }
        }
    }

    /**
     * Save current stress metrics as owner baseline for future comparison.
     */
    @ReactMethod
    fun saveStressBaseline(promise: Promise) {
        val storedEnc = prefs.getString(PREFS_KEY_SIGNATURE, null)
        if (storedEnc == null) {
            promise.reject("E_NOT_ENROLLED", "Enroll voice first.")
            return
        }
        prefs.edit().putString(PREFS_KEY_STRESS_BASELINE, storedEnc).apply()
        promise.resolve(true)
    }

    // ========================================================================
    // SECTION 2: AUDIO RECORDING & ANALYSIS ENGINE
    // ========================================================================

    private fun hasRecordPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            reactApplicationContext,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun recordAndAnalyze(durationMs: Long, callback: (RecordResult) -> Unit) {
        val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (bufferSize <= 0) {
            callback(RecordResult.Error("Invalid audio buffer size"))
            return
        }
        val safeBufferSize = max(bufferSize, SAMPLE_RATE * 2) // At least 1 second buffer

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            safeBufferSize
        )
        val record = audioRecord ?: return

        if (record.state != AudioRecord.STATE_INITIALIZED) {
            callback(RecordResult.Error("AudioRecord initialization failed"))
            return
        }

        val totalSamples = ((SAMPLE_RATE * durationMs) / 1000).toInt()
        val audioBuffer = ShortArray(totalSamples)
        var samplesRead = 0

        recordingThread = Thread {
            try {
                record.startRecording()
                val startTime = SystemClock.elapsedRealtime()
                while (samplesRead < totalSamples && 
                       (SystemClock.elapsedRealtime() - startTime) < durationMs + 500) {
                    val read = record.read(audioBuffer, samplesRead, totalSamples - samplesRead)
                    if (read > 0) samplesRead += read
                }
                record.stop()
                record.release()
                audioRecord = null

                if (samplesRead < SAMPLE_RATE / 2) {
                    mainHandler.post { callback(RecordResult.Error("Recording too short or silent")) }
                    return@Thread
                }

                val validBuffer = audioBuffer.copyOfRange(0, samplesRead)
                val analysis = analyzeAudio(validBuffer)
                mainHandler.post { callback(RecordResult.Success(analysis)) }
            } catch (e: Exception) {
                record.release()
                audioRecord = null
                mainHandler.post { callback(RecordResult.Error("Recording error: ${e.message}")) }
            }
        }
        recordingThread?.start()
    }

    private fun analyzeAudio(buffer: ShortArray): AnalysisResult {
        // 1. Volume (RMS)
        val volumeRMS = calculateRMS(buffer)

        // 2. Pitch detection via autocorrelation
        val pitchData = detectPitchAutocorrelation(buffer, SAMPLE_RATE)
        val avgPitch = pitchData.avgPitch
        val pitchVariance = pitchData.variance
        val jitter = pitchData.jitter

        // 3. Cadence (WPM approximation)
        val cadenceWPM = estimateCadence(buffer, SAMPLE_RATE)

        // 4. Clarity (SNR approximation)
        val claritySNR = estimateSNR(buffer)

        // 5. Shimmer (amplitude perturbation)
        val shimmer = calculateShimmer(buffer)

        return AnalysisResult(
            avgPitch = avgPitch,
            pitchVariance = pitchVariance,
            volumeRMS = volumeRMS,
            cadenceWPM = cadenceWPM,
            claritySNR = claritySNR,
            jitter = jitter,
            shimmer = shimmer
        )
    }

    // ------------------------------------------------------------------------
    // Pitch Detection — Autocorrelation (YIN-inspired simplified)
    // ------------------------------------------------------------------------
    private fun detectPitchAutocorrelation(buffer: ShortArray, sampleRate: Int): PitchData {
        val minPeriod = (sampleRate / MAX_PITCH_HZ).toInt()
        val maxPeriod = (sampleRate / MIN_PITCH_HZ).toInt()
        val frameSize = 2048
        val hopSize = 512
        val pitches = mutableListOf<Double>()

        var i = 0
        while (i + frameSize < buffer.size) {
            val frame = buffer.copyOfRange(i, i + frameSize)
            val pitch = autocorrelationPitch(frame, sampleRate, minPeriod, maxPeriod)
            if (pitch > 0) pitches.add(pitch)
            i += hopSize
        }

        if (pitches.isEmpty()) return PitchData(0.0, 0.0, 0.0)

        val avg = pitches.average()
        val variance = pitches.map { (it - avg).pow(2) }.average()

        // Jitter: average absolute difference between consecutive periods
        var jitterSum = 0.0
        for (j in 1 until pitches.size) {
            jitterSum += abs(pitches[j] - pitches[j - 1]) / max(pitches[j], 1.0)
        }
        val jitter = if (pitches.size > 1) jitterSum / (pitches.size - 1) else 0.0

        return PitchData(avg, variance, jitter)
    }

    private fun autocorrelationPitch(
        frame: ShortArray,
        sampleRate: Int,
        minPeriod: Int,
        maxPeriod: Int
    ): Double {
        val nsdf = DoubleArray(maxPeriod - minPeriod + 1)
        val frameSize = frame.size

        for (tau in minPeriod..maxPeriod) {
            var acf = 0.0
            var divisorM = 0.0
            for (i in 0 until frameSize - tau) {
                val s1 = frame[i].toDouble()
                val s2 = frame[i + tau].toDouble()
                acf += s1 * s2
                divisorM += s1 * s1 + s2 * s2
            }
            nsdf[tau - minPeriod] = if (divisorM > 0) 2.0 * acf / divisorM else 0.0
        }

        // Find first peak above threshold
        var bestTau = 0
        var bestVal = 0.0
        for (tau in minPeriod..maxPeriod) {
            val idx = tau - minPeriod
            if (nsdf[idx] > 0.5 && nsdf[idx] > bestVal) {
                bestVal = nsdf[idx]
                bestTau = tau
            }
        }
        return if (bestTau > 0) sampleRate.toDouble() / bestTau else 0.0
    }

    // ------------------------------------------------------------------------
    // Volume & Shimmer
    // ------------------------------------------------------------------------
    private fun calculateRMS(buffer: ShortArray): Double {
        var sum = 0.0
        for (s in buffer) {
            sum += s * s
        }
        return sqrt(sum / buffer.size)
    }

    private fun calculateShimmer(buffer: ShortArray): Double {
        val frameSize = 512
        val amplitudes = mutableListOf<Double>()
        var i = 0
        while (i + frameSize < buffer.size) {
            var sum = 0.0
            for (j in i until i + frameSize) {
                sum += abs(buffer[j].toDouble())
            }
            amplitudes.add(sum / frameSize)
            i += frameSize
        }
        if (amplitudes.size < 2) return 0.0
        var diffSum = 0.0
        var ampSum = 0.0
        for (j in 1 until amplitudes.size) {
            diffSum += abs(amplitudes[j] - amplitudes[j - 1])
            ampSum += amplitudes[j]
        }
        return if (ampSum > 0) diffSum / ampSum else 0.0
    }

    // ------------------------------------------------------------------------
    // Cadence — Approximate WPM using energy envelope and speech/silence
    // ------------------------------------------------------------------------
    private fun estimateCadence(buffer: ShortArray, sampleRate: Int): Double {
        val frameSize = (sampleRate * 0.02).toInt() // 20ms frames
        val energies = mutableListOf<Double>()
        var i = 0
        while (i + frameSize < buffer.size) {
            var sum = 0.0
            for (j in i until i + frameSize) {
                sum += buffer[j].toDouble().pow(2)
            }
            energies.add(sum / frameSize)
            i += frameSize
        }
        if (energies.isEmpty()) return 0.0

        val sorted = energies.sorted()
        val noiseFloor = sorted[sorted.size / 10] // 10th percentile as noise floor
        val threshold = noiseFloor * 3.0

        var speechSegments = 0
        var inSpeech = false
        for (e in energies) {
            if (e > threshold && !inSpeech) {
                inSpeech = true
                speechSegments++
            } else if (e <= threshold) {
                inSpeech = false
            }
        }

        val durationMin = buffer.size.toDouble() / sampleRate / 60.0
        return if (durationMin > 0) (speechSegments * 1.5) / durationMin else 0.0
        // 1.5 factor approximates words per speech segment
    }

    // ------------------------------------------------------------------------
    // Clarity — SNR approximation
    // ------------------------------------------------------------------------
    private fun estimateSNR(buffer: ShortArray): Double {
        val frameSize = 512
        val energies = mutableListOf<Double>()
        var i = 0
        while (i + frameSize < buffer.size) {
            var sum = 0.0
            for (j in i until i + frameSize) {
                sum += buffer[j].toDouble().pow(2)
            }
            energies.add(sum / frameSize)
            i += frameSize
        }
        if (energies.isEmpty()) return 0.0
        val sorted = energies.sorted()
        val noise = sorted.take(max(sorted.size / 10, 1)).average()
        val signal = sorted.takeLast(max(sorted.size / 10, 1)).average()
        return if (noise > 0) 10.0 * log10(signal / noise) else 0.0
    }

    // ========================================================================
    // SECTION 3: MATCHING & SCORING ENGINE
    // ========================================================================

    private fun calculateMatchScore(
        stored: VoiceSignature,
        current: AnalysisResult
    ): Double {
        // Normalize each feature to 0-1 similarity
        val pitchSim = similarity(stored.avgPitch, current.avgPitch, 50.0)
        val volSim = similarity(stored.volume, current.volumeRMS, stored.volume * 0.4)
        val cadSim = similarity(stored.cadence, current.cadenceWPM, 60.0)
        val clarSim = min(current.claritySNR / 20.0, 1.0) // Absolute clarity metric

        val score = W_PITCH * pitchSim +
                    W_VOLUME * volSim +
                    W_CADENCE * cadSim +
                    W_CLARITY * clarSim

        // Penalize if pitch variance is wildly different (possible mimic)
        val varianceRatio = current.pitchVariance / max(stored.pitchVariance, 1.0)
        val variancePenalty = if (varianceRatio > 3.0 || varianceRatio < 0.33) 0.15 else 0.0

        return (score - variancePenalty).coerceIn(0.0, 1.0)
    }

    private fun similarity(a: Double, b: Double, tolerance: Double): Double {
        if (a <= 0 || b <= 0) return 0.0
        val diff = abs(a - b)
        return max(0.0, 1.0 - diff / tolerance)
    }

    private fun buildScoreDetail(
        stored: VoiceSignature,
        current: AnalysisResult,
        score: Double
    ): String {
        return "Pitch: ${"%.1f".format(current.avgPitch)}Hz (ref ${"%.1f".format(stored.avgPitch)}Hz), " +
               "Vol: ${"%.0f".format(current.volumeRMS)} (ref ${"%.0f".format(stored.volume)}), " +
               "Cad: ${"%.1f".format(current.cadenceWPM)}WPM (ref ${"%.1f".format(stored.cadence)}), " +
               "Clarity: ${"%.1f".format(current.claritySNR)}dB, Score: ${"%.2f".format(score)}"
    }

    // ========================================================================
    // SECTION 4: STRESS DETECTION
    // ========================================================================

    private fun analyzeStress(result: AnalysisResult): Double {
        // Stress indicators:
        // 1. High pitch variance (0-40%)
        val varStress = min(result.pitchVariance / 500.0, 0.4)
        // 2. High jitter (0-30%)
        val jitStress = min(result.jitter * 3.0, 0.3)
        // 3. High shimmer (0-20%)
        val shimStress = min(result.shimmer * 2.0, 0.2)
        // 4. Very fast or very slow speech (0-10%)
        val rateStress = when {
            result.cadenceWPM > 180 -> (result.cadenceWPM - 180) / 100.0
            result.cadenceWPM < 80 -> (80 - result.cadenceWPM) / 80.0
            else -> 0.0
        }.coerceIn(0.0, 0.1)

        return (varStress + jitStress + shimStress + rateStress).coerceIn(0.0, 1.0)
    }

    // ========================================================================
    // SECTION 5: ENCRYPTION & STORAGE
    // ========================================================================

    private fun encryptSignature(sig: VoiceSignature): String {
        val json = "{"avgPitch":${sig.avgPitch},"pitchVariance":${sig.pitchVariance}," +
                   ""volume":${sig.volume},"cadence":${sig.cadence}," +
                   ""clarity":${sig.clarity},"timestamp":${sig.timestamp}}"
        val key = getEncryptionKey()
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        val iv = ByteArray(16).apply { SecureRandom().nextBytes(this) }
        cipher.init(Cipher.ENCRYPT_MODE, key, IvParameterSpec(iv))
        val encrypted = cipher.doFinal(json.toByteArray(Charsets.UTF_8))
        val combined = iv + encrypted
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    private fun decryptSignature(encrypted: String): VoiceSignature? {
        return try {
            val combined = Base64.decode(encrypted, Base64.NO_WRAP)
            val iv = combined.copyOfRange(0, 16)
            val data = combined.copyOfRange(16, combined.size)
            val key = getEncryptionKey()
            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            cipher.init(Cipher.DECRYPT_MODE, key, IvParameterSpec(iv))
            val decrypted = String(cipher.doFinal(data), Charsets.UTF_8)
            parseSignatureJson(decrypted)
        } catch (e: Exception) {
            null
        }
    }

    private fun getEncryptionKey(): SecretKeySpec {
        // Derive a device-bound key from package name + device fingerprint
        val seed = reactApplicationContext.packageName +
                   android.os.Build.BOARD +
                   android.os.Build.BRAND +
                   android.os.Build.DEVICE
        val digest = MessageDigest.getInstance("SHA-256").digest(seed.toByteArray())
        return SecretKeySpec(digest.copyOf(16), "AES")
    }

    private fun parseSignatureJson(json: String): VoiceSignature? {
        // Simple JSON parsing without external libraries
        val map = mutableMapOf<String, Double>()
        val regex = ""([a-zA-Z]+)":([0-9.Ee+-]+)".toRegex()
        regex.findAll(json).forEach { match ->
            val key = match.groupValues[1]
            val value = match.groupValues[2].toDoubleOrNull() ?: 0.0
            map[key] = value
        }
        if (map["avgPitch"] == null) return null
        return VoiceSignature(
            avgPitch = map["avgPitch"] ?: 0.0,
            pitchVariance = map["pitchVariance"] ?: 0.0,
            volume = map["volume"] ?: 0.0,
            cadence = map["cadence"] ?: 0.0,
            clarity = map["clarity"] ?: 0.0,
            timestamp = map["timestamp"]?.toLong() ?: System.currentTimeMillis()
        )
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    // ========================================================================
    // SECTION 6: DATA CLASSES
    // ========================================================================

    data class VoiceSignature(
        val avgPitch: Double,
        val pitchVariance: Double,
        val volume: Double,
        val cadence: Double,
        val clarity: Double,
        val timestamp: Long
    )

    data class AnalysisResult(
        val avgPitch: Double,
        val pitchVariance: Double,
        val volumeRMS: Double,
        val cadenceWPM: Double,
        val claritySNR: Double,
        val jitter: Double,
        val shimmer: Double
    )

    data class PitchData(
        val avgPitch: Double,
        val variance: Double,
        val jitter: Double
    )

    sealed class RecordResult {
        data class Success(val data: AnalysisResult) : RecordResult()
        data class Error(val message: String) : RecordResult()
    }
}
