package com.manu.ai.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.app.NotificationCompat
import com.manu.ai.MainActivity
import com.manu.ai.R

class ManuWakeWordService : Service() {

    companion object {
        const val CHANNEL_ID = "manu_wake_word_channel"
        const val NOTIFICATION_ID = 1001
        const val WAKE_WORDS = "manu,hey manu"
        const val TAG = "ManuWakeWord"
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var isServiceRunning = false
    private var idleStartTime: Long = 0
    private val IDLE_TIMEOUT_MS = 30 * 60 * 1000L
    private var wakeWordCallback: ((String) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isServiceRunning) {
            isServiceRunning = true
            startForeground(NOTIFICATION_ID, buildNotification())
            startListening()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        stopListening()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MANU AI Wake Word",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Listens for 'Manu' or 'Hey Manu' wake word"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
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
            .setContentTitle("MANU AI is listening...")
            .setContentText("Say 'Hey Manu' to activate")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun startListening() {
        if (isListening) return

        try {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        Log.d(TAG, "Ready for speech")
                        isListening = true
                    }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {
                        isListening = false
                        restartListening()
                    }
                    override fun onError(error: Int) {
                        Log.e(TAG, "Speech recognition error: $error")
                        isListening = false
                        if (isServiceRunning) {
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                restartListening()
                            }, 1000)
                        }
                    }
                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        matches?.forEach { match ->
                            Log.d(TAG, "Heard: $match")
                            if (match.contains("manu", ignoreCase = true) ||
                                match.contains("menu", ignoreCase = true)) {
                                onWakeWordDetected(match)
                            }
                        }
                        isListening = false
                        restartListening()
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        matches?.forEach { match ->
                            if (match.contains("manu", ignoreCase = true)) {
                                onWakeWordDetected(match)
                            }
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }

            speechRecognizer?.startListening(intent)
            idleStartTime = System.currentTimeMillis()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start listening: ${e.message}")
            isListening = false
        }
    }

    private fun restartListening() {
        if (!isServiceRunning) return

        val currentTime = System.currentTimeMillis()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val isScreenOn = pm.isInteractive

        if (!isScreenOn && (currentTime - idleStartTime > IDLE_TIMEOUT_MS)) {
            Log.d(TAG, "Phone idle for 30min, reducing CPU usage. Restarting in 5s...")
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                startListening()
            }, 5000)
            return
        }

        stopListening()
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            startListening()
        }, 500)
    }

    private fun stopListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
            speechRecognizer = null
            isListening = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping listener: ${e.message}")
        }
    }

    private fun onWakeWordDetected(text: String) {
        Log.d(TAG, "Wake word detected: $text")
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(android.os.VibrationEffect.createOneShot(200, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(200)
        }

        val intent = Intent("com.manu.ai.WAKE_WORD_DETECTED").apply {
            putExtra("text", text)
            `package` = packageName
        }
        sendBroadcast(intent)
    }
}
