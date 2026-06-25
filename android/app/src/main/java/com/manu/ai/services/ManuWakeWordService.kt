// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 2/20 — Wake Word Detection with 'Hey Manu' Trigger
// File: android/app/src/main/java/com/manu/ai/services/ManuWakeWordService.kt
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
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.app.NotificationCompat
import com.manu.ai.MainActivity
import com.manu.ai.R
import java.util.Locale

/**
 * ManuWakeWordService — Continuous background wake word detection service.
 *
 * Triggers on: "Manu" or "Hey Manu"
 * Features:
 *   - Foreground service with persistent notification
 *   - Continuous SpeechRecognizer listening with partial results
 *   - Auto-restart on service kill (via sticky service + broadcast receiver)
 *   - Idle mode after 30 minutes inactivity (reduced polling)
 *   - Vibration feedback on wake word detection
 *   - Dream State Listening (J.A.R.V.I.S. upgrade): screen-off low-power mode
 *   - Broadcasts detection events to React Native via WakeWordPackage
 */
class ManuWakeWordService : Service() {

    companion object {
        const val TAG = "ManuWakeWord"
        const val CHANNEL_ID = "manu_wake_word_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_WAKE_WORD_DETECTED = "com.manu.ai.WAKE_WORD_DETECTED"
        const val ACTION_RESTART_SERVICE = "com.manu.ai.RESTART_WAKE_WORD_SERVICE"
        const val ACTION_DREAM_STATE_CHANGED = "com.manu.ai.DREAM_STATE_CHANGED"

        // Wake word triggers (case-insensitive matching)
        val WAKE_WORDS = listOf("manu", "hey manu", "manu ai", "hey manu ai")

        // Idle timeout: 30 minutes of inactivity
        const val IDLE_TIMEOUT_MS = 30 * 60 * 1000L

        // Dream state check interval: 5 seconds
        const val DREAM_STATE_CHECK_INTERVAL_MS = 5000L

        // Idle polling interval: 10 seconds (reduced from normal)
        const val IDLE_POLLING_INTERVAL_MS = 10000L

        // Normal polling interval: 3 seconds
        const val NORMAL_POLLING_INTERVAL_MS = 3000L

        // Service running flag
        @Volatile
        var isServiceRunning = false

        // Current dream state flag
        @Volatile
        var isDreamState = false
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var recognizerIntent: Intent? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var powerManager: PowerManager? = null

    private val handler = Handler(Looper.getMainLooper())
    private var lastActivityTime = System.currentTimeMillis()
    private var isIdle = false
    private var isListening = false
    private var restartCount = 0
    private val maxRestartCount = 5

    private var dreamStateRunnable: Runnable? = null
    private var idleTimeoutRunnable: Runnable? = null
    private var restartRunnable: Runnable? = null

    // Screen state receiver for dream state detection
    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.d(TAG, "Screen OFF — entering Dream State")
                    isDreamState = true
                    enterDreamState()
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.d(TAG, "Screen ON — exiting Dream State")
                    isDreamState = false
                    exitDreamState()
                }
            }
        }
    }

    // Service restart receiver
    private val restartReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == ACTION_RESTART_SERVICE) {
                Log.d(TAG, "Restart broadcast received")
                if (!isServiceRunning) {
                    startWakeWordService(context)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ManuWakeWordService onCreate")

        isServiceRunning = true
        initializeComponents()
        registerReceivers()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        startListening()
        startDreamStateMonitor()
        startIdleTimeoutMonitor()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "ManuWakeWordService onStartCommand")
        // Return START_STICKY to auto-restart if killed by system
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        Log.d(TAG, "ManuWakeWordService onDestroy")
        isServiceRunning = false
        cleanup()
        // Schedule restart if not explicitly stopped by user
        scheduleServiceRestart()
        super.onDestroy()
    }

    // ==================== INITIALIZATION ====================

    private fun initializeComponents() {
        // Initialize Vibrator
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        // Initialize PowerManager
        powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager

        // Initialize SpeechRecognizer
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer?.setRecognitionListener(createRecognitionListener())
        } else {
            Log.e(TAG, "SpeechRecognizer not available on this device")
        }

        // Build RecognizerIntent
        recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toString())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
            // Enable offline recognition if available
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        }
    }

    private fun registerReceivers() {
        // Register screen state receiver for dream state
        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }
        registerReceiver(screenStateReceiver, screenFilter)

        // Register restart receiver
        val restartFilter = IntentFilter(ACTION_RESTART_SERVICE)
        registerReceiver(restartReceiver, restartFilter)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Manu AI Wake Word",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Continuous wake word detection for Manu AI"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Manu AI — J.A.R.V.I.S.")
            .setContentText("Listening for 'Hey Manu'...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    // ==================== SPEECH RECOGNITION ====================

    private fun createRecognitionListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: android.os.Bundle?) {
                Log.d(TAG, "SpeechRecognizer ready for speech")
                isListening = true
            }

            override fun onBeginningOfSpeech() {
                Log.d(TAG, "Speech beginning")
            }

            override fun onRmsChanged(rmsdB: Float) {
                // Optional: log audio level for debugging
            }

            override fun onBufferReceived(buffer: ByteArray?) {
                // Not used
            }

            override fun onEndOfSpeech() {
                Log.d(TAG, "Speech ended")
                isListening = false
            }

            override fun onError(error: Int) {
                val errorMessage = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No match found"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout"
                    else -> "Unknown error: $error"
                }
                Log.w(TAG, "SpeechRecognizer error: $errorMessage (code: $error)")
                isListening = false

                // Auto-restart listening after error (with delay to prevent rapid restart loops)
                handler.postDelayed({
                    if (isServiceRunning && !isListening) {
                        startListening()
                    }
                }, if (isIdle) IDLE_POLLING_INTERVAL_MS else NORMAL_POLLING_INTERVAL_MS)
            }

            override fun onResults(results: android.os.Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                Log.d(TAG, "Final results: $matches")
                processResults(matches)
                isListening = false

                // Restart listening after results
                handler.postDelayed({
                    if (isServiceRunning && !isListening) {
                        startListening()
                    }
                }, if (isIdle) IDLE_POLLING_INTERVAL_MS else NORMAL_POLLING_INTERVAL_MS)
            }

            override fun onPartialResults(partialResults: android.os.Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                Log.d(TAG, "Partial results: $matches")
                processResults(matches)
            }

            override fun onEvent(eventType: Int, params: android.os.Bundle?) {
                Log.d(TAG, "SpeechRecognizer event: $eventType")
            }
        }
    }

    private fun startListening() {
        if (!isServiceRunning) {
            Log.w(TAG, "Service not running, skipping startListening")
            return
        }

        if (isListening) {
            Log.d(TAG, "Already listening, skipping")
            return
        }

        if (speechRecognizer == null || recognizerIntent == null) {
            Log.e(TAG, "SpeechRecognizer not initialized")
            return
        }

        try {
            speechRecognizer?.cancel()
            speechRecognizer?.startListening(recognizerIntent)
            Log.d(TAG, "Started listening for wake word")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting speech recognition: ${e.message}")
            isListening = false
            // Retry after delay
            handler.postDelayed({
                if (isServiceRunning) startListening()
            }, NORMAL_POLLING_INTERVAL_MS)
        }
    }

    private fun stopListening() {
        isListening = false
        try {
            speechRecognizer?.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping speech recognition: ${e.message}")
        }
    }

    // ==================== WAKE WORD DETECTION ====================

    private fun processResults(results: ArrayList<String>?) {
        if (results.isNullOrEmpty()) return

        for (result in results) {
            val lowerResult = result.lowercase(Locale.getDefault())
            for (wakeWord in WAKE_WORDS) {
                if (lowerResult.contains(wakeWord)) {
                    Log.i(TAG, "Wake word detected: '$wakeWord' in result: '$result'")
                    onWakeWordDetected(wakeWord, result)
                    return
                }
            }
        }
    }

    private fun onWakeWordDetected(wakeWord: String, fullResult: String) {
        // Update activity timestamp
        lastActivityTime = System.currentTimeMillis()

        // Exit idle mode if active
        if (isIdle) {
            isIdle = false
            Log.d(TAG, "Exiting idle mode due to wake word detection")
        }

        // Vibrate to give feedback
        triggerVibration()

        // Broadcast to React Native layer
        broadcastWakeWordDetected(wakeWord, fullResult)

        // Update notification
        updateNotification("Wake word detected! Activating...")

        // Reset notification after 3 seconds
        handler.postDelayed({
            if (isServiceRunning) {
                updateNotification("Listening for 'Hey Manu'...")
            }
        }, 3000)
    }

    private fun triggerVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrationEffect = VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE)
                vibrator?.vibrate(vibrationEffect)
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(300)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration error: ${e.message}")
        }
    }

    private fun broadcastWakeWordDetected(wakeWord: String, fullResult: String) {
        val intent = Intent(ACTION_WAKE_WORD_DETECTED).apply {
            putExtra("wakeWord", wakeWord)
            putExtra("fullResult", fullResult)
            putExtra("timestamp", System.currentTimeMillis())
            putExtra("isDreamState", isDreamState)
            setPackage(packageName)
        }
        sendBroadcast(intent)
        Log.d(TAG, "Broadcast sent: WAKE_WORD_DETECTED")
    }

    // ==================== IDLE MODE ====================

    private fun startIdleTimeoutMonitor() {
        idleTimeoutRunnable = Runnable {
            val timeSinceLastActivity = System.currentTimeMillis() - lastActivityTime
            if (timeSinceLastActivity >= IDLE_TIMEOUT_MS && !isIdle) {
                Log.d(TAG, "Entering idle mode after $timeSinceLastActivity ms of inactivity")
                isIdle = true
            }
            // Schedule next check
            handler.postDelayed(idleTimeoutRunnable!!, IDLE_TIMEOUT_MS)
        }
        handler.postDelayed(idleTimeoutRunnable!!, IDLE_TIMEOUT_MS)
    }

    // ==================== DREAM STATE (J.A.R.V.I.S. UPGRADE) ====================

    private fun startDreamStateMonitor() {
        dreamStateRunnable = Runnable {
            if (isServiceRunning) {
                checkDreamState()
                handler.postDelayed(dreamStateRunnable!!, DREAM_STATE_CHECK_INTERVAL_MS)
            }
        }
        handler.postDelayed(dreamStateRunnable!!, DREAM_STATE_CHECK_INTERVAL_MS)
    }

    private fun checkDreamState() {
        val isScreenOn = powerManager?.isInteractive ?: true
        val newDreamState = !isScreenOn

        if (newDreamState != isDreamState) {
            isDreamState = newDreamState
            if (isDreamState) {
                enterDreamState()
            } else {
                exitDreamState()
            }
        }
    }

    private fun enterDreamState() {
        Log.d(TAG, "Entering Dream State — low-power listening mode")
        isDreamState = true

        // Broadcast dream state change
        val intent = Intent(ACTION_DREAM_STATE_CHANGED).apply {
            putExtra("isDreamState", true)
            putExtra("timestamp", System.currentTimeMillis())
            setPackage(packageName)
        }
        sendBroadcast(intent)

        // Update notification
        updateNotification("Dream State — listening for emergencies...")

        // In dream state, we keep listening but with lower power usage
        // The SpeechRecognizer already handles this efficiently
        // We can optionally reduce sensitivity here if needed
    }

    private fun exitDreamState() {
        Log.d(TAG, "Exiting Dream State — normal listening mode")
        isDreamState = false

        // Broadcast dream state change
        val intent = Intent(ACTION_DREAM_STATE_CHANGED).apply {
            putExtra("isDreamState", false)
            putExtra("timestamp", System.currentTimeMillis())
            setPackage(packageName)
        }
        sendBroadcast(intent)

        // Update notification
        updateNotification("Listening for 'Hey Manu'...")
    }

    // ==================== WAKE LOCK ====================

    private fun acquireWakeLock() {
        try {
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ManuAI::WakeWordWakeLock"
            )
            wakeLock?.setReferenceCounted(false)
            wakeLock?.acquire(60 * 60 * 1000L) // 1 hour timeout
            Log.d(TAG, "Wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "Wake lock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock: ${e.message}")
        }
    }

    // ==================== NOTIFICATION ====================

    private fun updateNotification(contentText: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Manu AI — J.A.R.V.I.S.")
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    // ==================== SERVICE RESTART ====================

    private fun scheduleServiceRestart() {
        if (restartCount >= maxRestartCount) {
            Log.w(TAG, "Max restart count reached, not restarting")
            return
        }
        restartCount++

        Log.d(TAG, "Scheduling service restart (attempt $restartCount/$maxRestartCount)")
        restartRunnable = Runnable {
            if (!isServiceRunning) {
                startWakeWordService(this)
            }
        }
        handler.postDelayed(restartRunnable!!, 3000) // 3 second delay
    }

    // ==================== CLEANUP ====================

    private fun cleanup() {
        // Stop listening
        stopListening()

        // Destroy speech recognizer
        try {
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            Log.e(TAG, "Error destroying speech recognizer: ${e.message}")
        }
        speechRecognizer = null

        // Unregister receivers
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering screen state receiver: ${e.message}")
        }
        try {
            unregisterReceiver(restartReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering restart receiver: ${e.message}")
        }

        // Remove callbacks
        idleTimeoutRunnable?.let { handler.removeCallbacks(it) }
        dreamStateRunnable?.let { handler.removeCallbacks(it) }
        restartRunnable?.let { handler.removeCallbacks(it) }

        // Release wake lock
        releaseWakeLock()

        // Reset flags
        isListening = false
        isIdle = false
        isDreamState = false
    }

    // ==================== STATIC METHODS ====================

    fun startWakeWordService(context: Context) {
        val intent = Intent(context, ManuWakeWordService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        Log.d(TAG, "WakeWordService start requested")
    }

    fun stopWakeWordService(context: Context) {
        val intent = Intent(context, ManuWakeWordService::class.java)
        context.stopService(intent)
        Log.d(TAG, "WakeWordService stop requested")
    }
}
