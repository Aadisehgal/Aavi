package com.manu.ai.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import java.io.File

class EmergencyRecordingService : Service() {

    private var recorder: MediaRecorder? = null
    private val TAG = "EmergencyRecording"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(911, buildNotification())
        startRecording()
        return START_STICKY
    }

    private fun startRecording() {
        try {
            val file = File(getExternalFilesDir(null), "emergency_${System.currentTimeMillis()}.mp4")
            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION") MediaRecorder()
            }
            recorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            Log.d(TAG, "Emergency recording started: ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Recording failed", e)
        }
    }

    private fun buildNotification(): Notification {
        val channelId = "emergency_recording"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Emergency Recording", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
        return Notification.Builder(this, channelId)
            .setContentTitle("MANU AI Emergency")
            .setContentText("Emergency recording active")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .build()
    }

    override fun onDestroy() {
        recorder?.stop()
        recorder?.release()
        recorder = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
