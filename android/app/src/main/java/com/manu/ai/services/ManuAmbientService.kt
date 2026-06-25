// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: android/app/src/main/java/com/manu/ai/services/ManuAmbientService.kt
// Purpose: Ambient sound analysis for threat detection and environment awareness

package com.manu.ai.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * ManuAmbientService — Foreground service that continuously analyses ambient audio
 * to detect environmental threats (glass break, loud bang, shouting) and calculates
 * real-time dB levels for the J.A.R.V.I.S. ambient-awareness features.
 *
 * Runs as a foreground service to survive background restrictions on Android 8+.
 * Communicates with React Native via DeviceEventManagerModule events.
 *
 * Events emitted to JS:
 *   - "onAmbientLevel"   → { db: Float, rms: Float }
 *   - "onThreatDetected" → { type: String, confidence: Float, db: Float }
 *   - "onAmbientStatus"  → { running: Boolean }
 */
class ManuAmbientService : Service() {

    companion object {
        const val TAG = "ManuAmbientService"
        const val CHANNEL_ID = "manu_ambient_channel"
        const val NOTIFICATION_ID = 1003
        const val SAMPLE_RATE = 16000
        const val BUFFER_SIZE_FACTOR = 4
        const val DB_THREAT_THRESHOLD = 85.0   // dB above which a threat is flagged
        const val DB_SCREAM_THRESHOLD = 78.0
        const val ACTION_START = "com.manu.ai.AMBIENT_START"
        const val ACTION_STOP  = "com.manu.ai.AMBIENT_STOP"

        @Volatile var instance: ManuAmbientService? = null
        private var reactContext: ReactContext? = null

        fun setReactContext(ctx: ReactContext) { reactContext = ctx }
        fun getInstance(): ManuAmbientService? = instance
    }

    private var audioRecord: AudioRecord? = null
    private var isRunning = false
    private var processingThread: Thread? = null

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        Log.i(TAG, "ManuAmbientService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopAmbientMonitoring()
                stopSelf()
                return START_NOT_STICKY
            }
            else -> startAmbientMonitoring()
        }
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopAmbientMonitoring()
        instance = null
        super.onDestroy()
        Log.i(TAG, "ManuAmbientService destroyed")
    }

    // ── Audio Processing ───────────────────────────────────────────────────────

    private fun startAmbientMonitoring() {
        if (isRunning) return

        val minBuf = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufSize = minBuf * BUFFER_SIZE_FACTOR

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufSize
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "RECORD_AUDIO permission not granted", e)
            emitStatus(false)
            return
        }

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord failed to initialise")
            emitStatus(false)
            return
        }

        isRunning = true
        audioRecord?.startRecording()
        emitStatus(true)

        processingThread = Thread {
            val buffer = ShortArray(bufSize / 2)
            Log.i(TAG, "Ambient monitoring started")

            while (isRunning) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: break
                if (read > 0) processAudioChunk(buffer, read)
            }
            Log.i(TAG, "Ambient monitoring loop ended")
        }.also { it.start() }
    }

    private fun stopAmbientMonitoring() {
        isRunning = false
        processingThread?.join(1000)
        processingThread = null
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        emitStatus(false)
    }

    private fun processAudioChunk(buffer: ShortArray, read: Int) {
        // RMS → dB
        var sumSq = 0.0
        for (i in 0 until read) sumSq += (buffer[i].toDouble() * buffer[i].toDouble())
        val rms = sqrt(sumSq / read)
        val db = if (rms > 0) 20.0 * log10(rms / 32768.0) + 90.0 else 0.0  // normalised to ~0-100 dB SPL

        // Emit level event
        emitEvent("onAmbientLevel", Arguments.createMap().apply {
            putDouble("db", db)
            putDouble("rms", rms)
        })

        // Basic threat detection heuristics
        when {
            db >= DB_THREAT_THRESHOLD -> detectThreat(buffer, read, db, "LOUD_IMPACT")
            db >= DB_SCREAM_THRESHOLD && hasHighFrequencySpike(buffer, read) -> detectThreat(buffer, read, db, "SCREAM")
        }
    }

    /** Crude high-frequency spike detector (rapid sign changes → high freq content) */
    private fun hasHighFrequencySpike(buffer: ShortArray, read: Int): Boolean {
        var signChanges = 0
        for (i in 1 until read) {
            if ((buffer[i] > 0) != (buffer[i - 1] > 0)) signChanges++
        }
        val ratio = signChanges.toFloat() / read
        return ratio > 0.35f  // >35% sign-change rate ≈ dominant HF content
    }

    private fun detectThreat(buffer: ShortArray, read: Int, db: Double, type: String) {
        val peak = buffer.take(read).maxOf { abs(it.toInt()) }
        val confidence = (db / 100.0).coerceIn(0.0, 1.0).toFloat()
        Log.w(TAG, "Threat detected: $type @ ${db}dB (confidence=$confidence)")
        emitEvent("onThreatDetected", Arguments.createMap().apply {
            putString("type", type)
            putDouble("db", db)
            putDouble("peak", peak.toDouble())
            putDouble("confidence", confidence.toDouble())
        })
    }

    // ── React Native Events ────────────────────────────────────────────────────

    private fun emitEvent(name: String, params: com.facebook.react.bridge.WritableMap) {
        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(name, params)
    }

    private fun emitStatus(running: Boolean) {
        emitEvent("onAmbientStatus", Arguments.createMap().apply { putBoolean("running", running) })
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID,
                "MANU AI Ambient Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Monitors ambient sound for threat detection" }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(chan)
        }
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MANU AI — Ambient Monitor")
            .setContentText("Listening for environmental threats…")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
}
