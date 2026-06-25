// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Jarvis Battle Mode
// File: android/app/src/main/java/com/manu/ai/modules/BattleMode.kt
// Generated: 2026-06-25

package com.manu.ai.modules

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class BattleModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val CHANNEL_ID = "manu_battle_mode"
    private var mediaRecorder: MediaRecorder? = null
    private var isRecording = false
    private var recordingFile: File? = null
    private val handler = Handler(Looper.getMainLooper())
    private var sosRunnable: Runnable? = null

    override fun getName(): String = "BattleMode"

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MANU Battle Mode",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Emergency battle mode alerts"
                setSound(Uri.parse("android.resource://${reactApplicationContext.packageName}/raw/emergency_alert"), 
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build())
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun activateBattleMode(config: ReadableMap, promise: Promise) {
        try {
            val emergencyContacts = config.getArray("emergencyContacts")?.toArrayList() as? List<String> ?: emptyList()
            val recordAudio = config.getBoolean("recordAudio")
            val sendSOS = config.getBoolean("sendSOS")
            val vibrate = config.getBoolean("vibrate")
            val sosMessage = config.getString("sosMessage") ?: "EMERGENCY: MANU AI Battle Mode activated. Need help immediately."

            if (recordAudio) {
                startEmergencyRecording()
            }

            if (sendSOS && emergencyContacts.isNotEmpty()) {
                sendSOSMessages(emergencyContacts, sosMessage)
            }

            if (vibrate) {
                triggerVibrationAlarm()
            }

            showBattleModeNotification()

            if (sendSOS) {
                sosRunnable = Runnable {
                    sendSOSMessages(emergencyContacts, sosMessage + " [Auto-resend]")
                    handler.postDelayed(sosRunnable!!, 60000)
                }
                handler.postDelayed(sosRunnable!!, 60000)
            }

            promise.resolve(mapOf(
                "active" to true,
                "recording" to isRecording,
                "sosSent" to sendSOS,
                "timestamp" to System.currentTimeMillis()
            ).toWritableMap())
        } catch (e: Exception) {
            promise.reject("BATTLE_MODE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deactivateBattleMode(promise: Promise) {
        try {
            stopEmergencyRecording()
            sosRunnable?.let { handler.removeCallbacks(it) }
            sosRunnable = null

            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(9999)

            promise.resolve(mapOf("active" to false).toWritableMap())
        } catch (e: Exception) {
            promise.reject("DEACTIVATE_ERROR", e.message, e)
        }
    }

    private fun startEmergencyRecording() {
        try {
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val dir = File(reactApplicationContext.getExternalFilesDir(null), "evidence")
            dir.mkdirs()
            recordingFile = File(dir, "battle_mode_$timestamp.3gp")

            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP)
                setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)
                setOutputFile(recordingFile!!.absolutePath)
                prepare()
                start()
            }
            isRecording = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopEmergencyRecording() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun sendSOSMessages(contacts: List<String>, message: String) {
        try {
            val smsManager = SmsManager.getDefault()
            for (contact in contacts) {
                val parts = smsManager.divideMessage(message)
                smsManager.sendMultipartTextMessage(contact, null, parts, null, null)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun triggerVibrationAlarm() {
        val vibrator = reactApplicationContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 1000, 500, 1000, 500, 1000), 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000), 0)
        }
    }

    private fun showBattleModeNotification() {
        val intent = Intent(reactApplicationContext, reactApplicationContext.currentActivity?.javaClass)
        val pendingIntent = PendingIntent.getActivity(
            reactApplicationContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
            .setContentTitle("BATTLE MODE ACTIVE")
            .setContentText("Emergency recording and SOS active. Tap to open.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(9999, notification)
    }

    @ReactMethod
    fun getRecordingStatus(promise: Promise) {
        promise.resolve(mapOf(
            "isRecording" to isRecording,
            "filePath" to (recordingFile?.absolutePath ?: "")
        ).toWritableMap())
    }

    private fun Map<String, Any>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        forEach { (k, v) ->
            when (v) {
                is String -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
                is Int -> map.putInt(k, v)
                is Long -> map.putDouble(k, v.toDouble())
                is Double -> map.putDouble(k, v)
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }
}
