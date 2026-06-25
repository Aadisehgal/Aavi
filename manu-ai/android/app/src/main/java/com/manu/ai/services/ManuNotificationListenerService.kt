package com.manu.ai.service

import android.app.Notification
import android.app.RemoteInput
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class ManuNotificationListenerService : NotificationListenerService() {

    companion object {
        const val TAG = "ManuNotification"
        const val NOTIFICATIONS_FILE = "notification_history.json"
        var instance: ManuNotificationListenerService? = null
    }

    private val maxHistory = 100

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.d(TAG, "Notification Listener Service Created")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        try {
            val notification = sbn.notification
            val extras = notification.extras

            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: text
            val appName = sbn.packageName
            val postTime = sbn.postTime
            val key = sbn.key

            val data = Arguments.createMap().apply {
                putString("id", key)
                putString("app", appName)
                putString("title", title)
                putString("text", bigText)
                putDouble("timestamp", postTime.toDouble())
                putBoolean("canReply", notification.actions?.any { it.remoteInputs != null } ?: false)
            }

            sendEvent("NotificationPosted", data)
            saveToHistory(JSONObject().apply {
                put("id", key)
                put("app", appName)
                put("title", title)
                put("text", bigText)
                put("timestamp", postTime)
            })

            Log.d(TAG, "Notification from $appName: $title - $text")
        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification: ${e.message}")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return
        val data = Arguments.createMap().apply {
            putString("id", sbn.key)
            putString("app", sbn.packageName)
        }
        sendEvent("NotificationRemoved", data)
    }

    fun dismissNotification(key: String): Boolean {
        return try {
            cancelNotification(key)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to dismiss notification: ${e.message}")
            false
        }
    }

    fun replyToNotification(key: String, message: String): Boolean {
        return try {
            val sbn = activeNotifications?.find { it.key == key }
            if (sbn == null) {
                Log.e(TAG, "Notification not found: $key")
                return false
            }

            val notification = sbn.notification
            val action = notification.actions?.find { it.remoteInputs != null }

            if (action == null) {
                Log.e(TAG, "No reply action available for this notification")
                return false
            }

            val remoteInputs = action.remoteInputs
            val intent = action.actionIntent

            val bundle = Bundle()
            remoteInputs?.forEach { remoteInput ->
                bundle.putCharSequence(remoteInput.resultKey, message)
            }

            RemoteInput.addResultsToIntent(remoteInputs, intent, bundle)
            intent.send()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to reply to notification: ${e.message}")
            false
        }
    }

    fun getActiveNotificationsList(): List<Map<String, Any>> {
        return activeNotifications?.map { sbn ->
            val extras = sbn.notification.extras
            mapOf(
                "id" to sbn.key,
                "app" to sbn.packageName,
                "title" to (extras.getString(Notification.EXTRA_TITLE) ?: ""),
                "text" to (extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""),
                "timestamp" to sbn.postTime,
                "canReply" to (sbn.notification.actions?.any { it.remoteInputs != null } ?: false)
            )
        } ?: emptyList()
    }

    private fun saveToHistory(notificationJson: JSONObject) {
        try {
            val file = File(filesDir, NOTIFICATIONS_FILE)
            val history = if (file.exists()) {
                JSONArray(file.readText())
            } else {
                JSONArray()
            }

            history.put(notificationJson)

            // Keep only last maxHistory items
            while (history.length() > maxHistory) {
                history.remove(0)
            }

            file.writeText(history.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save notification history: ${e.message}")
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            val reactContext = (application as com.manu.ai.MainApplication).reactNativeHost
                .reactInstanceManager.currentReactContext
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event: ${e.message}")
        }
    }
}
