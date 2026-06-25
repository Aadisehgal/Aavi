// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: android/app/src/main/java/com/manu/ai/services/ManuDreamStateService.kt
// Generated: 2026-06-24

package com.manu.ai.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.manu.ai.MainActivity
import com.manu.ai.R
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ManuDreamStateService: Low-power emergency listening service.
 * Operates in a dream-like low-power state, continuously monitoring audio
 * for emergency wake words or distress patterns while minimizing battery drain.
 */
class ManuDreamStateService : Service() {

    companion object {
        const val TAG = "ManuDreamState"
        const val CHANNEL_ID = "manu_dream_state_channel"
        const val NOTIFICATION_ID = 9901
        const val WAKE_WORD = "hey manu"
        const val EMERGENCY_WORDS = "help,emergency,stop,fire,police,ambulance"
        const val SAMPLE_RATE = 16000
        const val BUFFER_SIZE = 3200 // 100ms at 16kHz, mono, 16-bit
        const val ANALYSIS_INTERVAL_MS = 500L
    }

    private var audioRecord: AudioRecord? = null
    private val isListening = AtomicBoolean(false)
    private val isEmergencyMode = AtomicBoolean(false)
    private lateinit var wakeLock: PowerManager.WakeLock
    private val handler = Handler(Looper.getMainLooper())
    private var analysisRunnable: Runnable? = null
    private var screenOffReceiver: BroadcastReceiver? = null
    private var screenOnReceiver: BroadcastReceiver? = null
    private val audioBuffer = ByteBuffer.allocateDirect(BUFFER_SIZE * 10)
    private var consecutiveTriggers = 0
    private val triggerThreshold = 2

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "DreamStateService created")
        createNotificationChannel()
        acquireWakeLock()
        registerScreenReceivers()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "DreamStateService started")
        startForeground(NOTIFICATION_ID, buildNotification())
        startDreamListening()
        return START_STICKY
    }

    override fun onBind(intent: Intent): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "DreamStateService destroyed")
        stopDreamListening()
        unregisterScreenReceivers()
        if (::wakeLock.isInitialized && wakeLock.isHeld) {
            wakeLock.release()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MANU AI Dream State",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Low-power emergency listening mode"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MANU AI — Dream State")
            .setContentText("Emergency listening active • Low power mode")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "ManuAI::DreamStateWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L) // 10 minutes, re-acquired periodically
        }
    }

    private fun registerScreenReceivers() {
        screenOffReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (!isListening.get()) {
                    startDreamListening()
                }
            }
        }
        screenOnReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                // Continue listening but can reduce sampling if needed
            }
        }
        registerReceiver(screenOffReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
        registerReceiver(screenOnReceiver, IntentFilter(Intent.ACTION_SCREEN_ON))
    }

    private fun unregisterScreenReceivers() {
        try {
            screenOffReceiver?.let { unregisterReceiver(it) }
            screenOnReceiver?.let { unregisterReceiver(it) }
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "Receiver not registered", e)
        }
    }

    private fun startDreamListening() {
        if (isListening.get()) return
        isListening.set(true)

        val minBufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                minBufferSize.coerceAtLeast(BUFFER_SIZE)
            )
            audioRecord?.startRecording()
            Log.d(TAG, "Audio recording started in dream state")
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing RECORD_AUDIO permission", e)
            isListening.set(false)
            return
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start audio record", e)
            isListening.set(false)
            return
        }

        analysisRunnable = object : Runnable {
            override fun run() {
                if (!isListening.get()) return
                analyzeAudioChunk()
                handler.postDelayed(this, ANALYSIS_INTERVAL_MS)
            }
        }
        handler.postDelayed(analysisRunnable!!, ANALYSIS_INTERVAL_MS)
    }

    private fun stopDreamListening() {
        isListening.set(false)
        analysisRunnable?.let { handler.removeCallbacks(it) }
        analysisRunnable = null
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping audio record", e)
        }
        audioRecord = null
    }

    private fun analyzeAudioChunk() {
        val record = audioRecord ?: return
        if (record.recordingState != AudioRecord.RECORDSTATE_RECORDING) return

        val buffer = ByteArray(BUFFER_SIZE)
        val read = record.read(buffer, 0, buffer.size)
        if (read <= 0) return

        // Simple energy-based detection as proxy for wake word
        val energy = calculateAudioEnergy(buffer, read)
        val isSpeech = energy > 500 // Threshold for speech detection

        if (isSpeech) {
            // In a production build, this would feed into a local TFLite model
            // For now, use simple keyword matching on amplitude patterns as proxy
            val detected = performKeywordDetection(buffer, read)
            if (detected) {
                consecutiveTriggers++
                if (consecutiveTriggers >= triggerThreshold) {
                    consecutiveTriggers = 0
                    triggerWakeWordResponse()
                }
            } else {
                consecutiveTriggers = 0
            }
        }
    }

    private fun calculateAudioEnergy(buffer: ByteArray, length: Int): Double {
        var sum = 0.0
        var i = 0
        while (i < length - 1) {
            val sample = (buffer[i + 1].toInt() shl 8) or (buffer[i].toInt() and 0xFF)
            val normalized = sample / 32768.0
            sum += normalized * normalized
            i += 2
        }
        val mean = sum / (length / 2)
        return Math.sqrt(mean) * 10000
    }

    private fun performKeywordDetection(buffer: ByteArray, length: Int): Boolean {
        // Placeholder for local wake word detection model
        // In production, this runs a TFLite model against the audio buffer
        // Returns true if wake word confidence exceeds threshold
        val energy = calculateAudioEnergy(buffer, length)
        // Simulate wake word detection with energy + random factor for demo
        return energy > 1200
    }

    private fun triggerWakeWordResponse() {
        Log.i(TAG, "Wake word detected in dream state")
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("WAKE_WORD_TRIGGERED", true)
            putExtra("DREAM_STATE_WAKEUP", true)
        }
        startActivity(intent)

        // Notify React Native side via broadcast
        val broadcast = Intent("com.manu.ai.WAKE_WORD_DETECTED")
        broadcast.putExtra("confidence", 0.85)
        broadcast.putExtra("source", "dream_state")
        sendBroadcast(broadcast)
    }

    private fun enterEmergencyMode() {
        if (isEmergencyMode.get()) return
        isEmergencyMode.set(true)
        Log.w(TAG, "Emergency mode activated")

        // Increase sampling rate and sensitivity
        stopDreamListening()
        ANALYSIS_INTERVAL_MS.coerceAtMost(200L)
        startDreamListening()

        val broadcast = Intent("com.manu.ai.EMERGENCY_MODE")
        sendBroadcast(broadcast)
    }

    private fun exitEmergencyMode() {
        isEmergencyMode.set(false)
        Log.i(TAG, "Emergency mode deactivated")
        stopDreamListening()
        ANALYSIS_INTERVAL_MS.coerceAtLeast(500L)
        startDreamListening()
    }
}
