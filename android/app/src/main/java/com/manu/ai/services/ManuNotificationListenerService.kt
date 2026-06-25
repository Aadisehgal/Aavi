import android.app.RemoteInput
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 4/20 — Notification Listener Service
// File: android/app/src/main/java/com/manu/ai/services/ManuNotificationListenerService.kt
// Generated: 2026-06-24

package com.manu.ai.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

class ManuNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "ManuNotification"
        private const val CHANNEL_ID = "manu_notification_listener"
        private const val HISTORY_FILE = "notification_history.json"
        private const val MAX_HISTORY_SIZE = 500
        private const val PRIORITY_AI_ENABLED = true

        @Volatile
        var instance: ManuNotificationListenerService? = null

        @Volatile
        var isServiceRunning = false

        private val notificationHistory = ConcurrentHashMap<String, JSONObject>()
        private val activeNotifications = ConcurrentHashMap<String, StatusBarNotification>()
        private val dismissPatterns = ConcurrentHashMap<String, Int>()
    }

    private lateinit var handler: Handler
    private lateinit var notificationManager: NotificationManager
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

    // =============================================================================
    // SERVICE LIFECYCLE
    // =============================================================================

    override fun onCreate() {
        super.onCreate()
        handler = Handler(Looper.getMainLooper())
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        instance = this
        isServiceRunning = true
        loadHistoryFromDisk()
        Log.d(TAG, "ManuNotificationListenerService created")
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        instance = null
        saveHistoryToDisk()
        Log.d(TAG, "ManuNotificationListenerService destroyed")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
        refreshActiveNotifications()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }

    // =============================================================================
    // NOTIFICATION CALLBACKS
    // =============================================================================

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        try {
            activeNotifications[sbn.key] = sbn
            val notificationData = extractNotificationData(sbn)
            val category = categorizeNotification(notificationData)
            notificationData.put("aiCategory", category)
            notificationData.put("aiPriority", calculatePriority(category, sbn))
            notificationData.put("dismissed", false)
            storeNotification(notificationData)
            broadcastNotificationEvent("posted", notificationData)
            Log.d(TAG, "Notification posted: ${sbn.packageName} - Category: $category")
        } catch (e: Exception) {
            Log.e(TAG, "Error processing posted notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return
        try {
            activeNotifications.remove(sbn.key)
            val key = sbn.key
            val existing = notificationHistory[key]
            if (existing != null) {
                existing.put("dismissed", true)
                existing.put("dismissedAt", dateFormat.format(Date()))
                notificationHistory[key] = existing
                learnFromDismiss(sbn.packageName)
            }
            val removedData = extractNotificationData(sbn)
            removedData.put("event", "removed")
            broadcastNotificationEvent("removed", removedData)
            Log.d(TAG, "Notification removed: ${sbn.packageName}")
        } catch (e: Exception) {
            Log.e(TAG, "Error processing removed notification", e)
        }
    }

    // =============================================================================
    // NOTIFICATION DATA EXTRACTION
    // =============================================================================

    private fun extractNotificationData(sbn: StatusBarNotification): JSONObject {
        val data = JSONObject()
        val notification = sbn.notification
        val extras = notification.extras

        data.put("key", sbn.key)
        data.put("id", sbn.id)
        data.put("packageName", sbn.packageName)
        data.put("tag", sbn.tag ?: "")
        data.put("postTime", sbn.postTime)
        data.put("timestamp", dateFormat.format(Date(sbn.postTime)))
        data.put("isClearable", sbn.isClearable)
        data.put("isOngoing", sbn.isOngoing)
        data.put("groupKey", sbn.groupKey ?: "")

        // App info
        try {
            val pm = packageManager
            val appInfo = pm.getApplicationInfo(sbn.packageName, 0)
            data.put("appName", pm.getApplicationLabel(appInfo).toString())
        } catch (e: PackageManager.NameNotFoundException) {
            data.put("appName", sbn.packageName)
        }

        // Title
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        data.put("title", title)

        // Text content
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            val linesArray = JSONArray()
            for (line in textLines) {
                linesArray.put(line.toString())
            }
            data.put("textLines", linesArray)
        }

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        data.put("bigText", bigText?.toString() ?: "")

        val text = extras.getCharSequence(Notification.EXTRA_TEXT)
        data.put("text", text?.toString() ?: "")

        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)
        data.put("subText", subText?.toString() ?: "")

        // Summary text
        val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)
        data.put("summaryText", summaryText?.toString() ?: "")

        // Messages (for messaging style notifications like WhatsApp)
        val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (messages != null && messages.isNotEmpty()) {
            val messagesArray = JSONArray()
            for (msg in messages) {
                if (msg is Bundle) {
                    val msgObj = JSONObject()
                    msgObj.put("text", msg.getCharSequence("text")?.toString() ?: "")
                    msgObj.put("sender", msg.getCharSequence("sender")?.toString() ?: "")
                    msgObj.put("timestamp", msg.getLong("time"))
                    messagesArray.put(msgObj)
                }
            }
            data.put("messages", messagesArray)
        }

        // People (senders)
        val people = extras.getStringArray(Notification.EXTRA_PEOPLE)
        if (people != null && people.isNotEmpty()) {
            val peopleArray = JSONArray()
            for (person in people) {
                peopleArray.put(person)
            }
            data.put("people", peopleArray)
        }

        // Actions
        val actions = notification.actions
        if (actions != null && actions.isNotEmpty()) {
            val actionsArray = JSONArray()
            for (action in actions) {
                val actionObj = JSONObject()
                actionObj.put("title", action.title.toString())
                actionObj.put("actionIntent", action.actionIntent != null)
                // Check for remote input (reply capability)
                val remoteInputs = action.remoteInputs
                if (remoteInputs != null && remoteInputs.isNotEmpty()) {
                    val remoteInputArray = JSONArray()
                    for (ri in remoteInputs) {
                        val riObj = JSONObject()
                        riObj.put("resultKey", ri.resultKey)
                        riObj.put("label", ri.label?.toString() ?: "")
                        remoteInputArray.put(riObj)
                    }
                    actionObj.put("remoteInputs", remoteInputArray)
                    actionObj.put("canReply", true)
                } else {
                    actionObj.put("canReply", false)
                }
                actionsArray.put(actionObj)
            }
            data.put("actions", actionsArray)
        }

        // Category
        data.put("category", notification.category ?: "")

        // Priority
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            data.put("priority", notification.priority)
        }

        // Flags
        data.put("flags", notification.flags)

        return data
    }

    // =============================================================================
    // AI CATEGORIZATION & PRIORITY
    // =============================================================================

    private fun categorizeNotification(data: JSONObject): String {
        val packageName = data.optString("packageName", "")
        val title = data.optString("title", "").lowercase()
        val text = data.optString("text", "").lowercase()
        val category = data.optString("category", "")
        val combined = "$title $text"

        // Family monitoring keywords
        val familyKeywords = listOf(
            "mom", "dad", "mother", "father", "parent", "family", "home",
            "school", "teacher", "homework", "pickup", "kids", "child",
            "mama", "papa", "bhai", "behen", "didi", "bhaiya", "amma", "appa"
        )

        // Urgent keywords
        val urgentKeywords = listOf(
            "urgent", "emergency", "alert", "critical", "immediate", "asap",
            "hospital", "doctor", "police", "accident", "fire", "help",
            "otp", "verification", "code", "security", "fraud", "suspicious"
        )

        // Junk keywords
        val junkKeywords = listOf(
            "promo", "offer", "deal", "discount", "sale", "win", "free",
            "lucky", "prize", "cashback", "reward", "subscription", "unsubscribe",
            "marketing", "promotion", "advertisement", "spam"
        )

        // Check family
        if (familyKeywords.any { combined.contains(it) } ||
            packageName.contains("whatsapp") ||
            packageName.contains("sms") ||
            packageName.contains("messaging") ||
            category == "msg" || category == "call") {
            return "Family"
        }

        // Check urgent
        if (urgentKeywords.any { combined.contains(it) } ||
            packageName.contains("bank") ||
            packageName.contains("pay") ||
            packageName.contains("wallet") ||
            category == "alarm" || category == "reminder") {
            return "Urgent"
        }

        // Check junk
        if (junkKeywords.any { combined.contains(it) } ||
            dismissPatterns[packageName] ?: 0 > 10) {
            return "Junk"
        }

        // Social media
        if (packageName.contains("facebook") ||
            packageName.contains("instagram") ||
            packageName.contains("twitter") ||
            packageName.contains("snapchat") ||
            packageName.contains("tiktok")) {
            return "Social"
        }

        // Entertainment
        if (packageName.contains("youtube") ||
            packageName.contains("netflix") ||
            packageName.contains("spotify") ||
            packageName.contains("game") ||
            category == "transport") {
            return "Entertainment"
        }

        return "General"
    }

    private fun calculatePriority(category: String, sbn: StatusBarNotification): Int {
        var priority = when (category) {
            "Urgent" -> 10
            "Family" -> 8
            "Social" -> 5
            "Entertainment" -> 3
            "Junk" -> 1
            else -> 4
        }

        // Boost if ongoing
        if (sbn.isOngoing) priority += 2

        // Boost if not clearable (system important)
        if (!sbn.isClearable) priority += 1

        // Deduct if user frequently dismisses this app
        val dismissCount = dismissPatterns[sbn.packageName] ?: 0
        if (dismissCount > 5) priority -= 2
        if (dismissCount > 15) priority -= 3

        return priority.coerceIn(1, 10)
    }

    private fun learnFromDismiss(packageName: String) {
        val current = dismissPatterns[packageName] ?: 0
        dismissPatterns[packageName] = current + 1
    }

    // =============================================================================
    // HISTORY MANAGEMENT
    // =============================================================================

    private fun storeNotification(data: JSONObject) {
        val key = data.optString("key", "")
        if (key.isEmpty()) return

        notificationHistory[key] = data

        // Trim history if too large
        if (notificationHistory.size > MAX_HISTORY_SIZE) {
            val oldest = notificationHistory.entries.minByOrNull { it.value.optLong("postTime", 0) }
            oldest?.let { notificationHistory.remove(it.key) }
        }

        // Save periodically (every 10 notifications)
        if (notificationHistory.size % 10 == 0) {
            saveHistoryToDisk()
        }
    }

    private fun saveHistoryToDisk() {
        try {
            val file = File(filesDir, HISTORY_FILE)
            val array = JSONArray()
            for (entry in notificationHistory.values) {
                array.put(entry)
            }
            FileWriter(file).use { writer ->
                writer.write(array.toString(2))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving history", e)
        }
    }

    private fun loadHistoryFromDisk() {
        try {
            val file = File(filesDir, HISTORY_FILE)
            if (!file.exists()) return
            val content = file.readText()
            val array = JSONArray(content)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val key = obj.optString("key", "")
                if (key.isNotEmpty()) {
                    notificationHistory[key] = obj
                }
            }
            Log.d(TAG, "Loaded ${notificationHistory.size} notifications from history")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading history", e)
        }
    }

    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================

    fun getActiveNotificationsList(): WritableArray {
        val array = Arguments.createArray()
        refreshActiveNotifications()
        for (sbn in activeNotifications.values) {
            val data = extractNotificationData(sbn)
            val category = categorizeNotification(data)
            data.put("aiCategory", category)
            data.put("aiPriority", calculatePriority(category, sbn))
            val map = jsonToWritableMap(data)
            array.pushMap(map)
        }
        return array
    }

    fun getNotificationHistory(): WritableArray {
        val array = Arguments.createArray()
        val sorted = notificationHistory.values.sortedByDescending { it.optLong("postTime", 0) }
        for (obj in sorted) {
            array.pushMap(jsonToWritableMap(obj))
        }
        return array
    }

    fun dismissNotification(key: String): Boolean {
        return try {
            cancelNotification(key)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing notification", e)
            false
        }
    }

    fun dismissAllNotificationsByPackage(packageName: String): Int {
        var count = 0
        try {
            val keysToRemove = activeNotifications.filter { it.value.packageName == packageName }.keys
            for (key in keysToRemove) {
                cancelNotification(key)
                count++
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing notifications by package", e)
        }
        return count
    }

    fun dismissAllNotifications(): Int {
        var count = 0
        try {
            for (key in activeNotifications.keys) {
                cancelNotification(key)
                count++
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing all notifications", e)
        }
        return count
    }

    fun replyToNotification(key: String, message: String): Boolean {
        return try {
            val sbn = activeNotifications[key] ?: return false
            val notification = sbn.notification
            val actions = notification.actions ?: return false

            for (action in actions) {
                val remoteInputs = action.remoteInputs
                if (remoteInputs != null && remoteInputs.isNotEmpty()) {
                    val remoteInput = remoteInputs[0]
                    val replyIntent = Intent()
                    val replyBundle = Bundle()
                    replyBundle.putCharSequence(remoteInput.resultKey, message)
                    RemoteInput.addResultsToIntent(arrayOf(remoteInput), replyIntent, replyBundle)
                    action.actionIntent.send(this, 0, replyIntent)
                    Log.d(TAG, "Reply sent to $key")
                    return true
                }
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error replying to notification", e)
            false
        }
    }

    fun getNotificationStats(): WritableMap {
        val map = Arguments.createMap()
        val categoryCounts = mutableMapOf<String, Int>()
        val packageCounts = mutableMapOf<String, Int>()

        for (entry in notificationHistory.values) {
            val cat = entry.optString("aiCategory", "General")
            categoryCounts[cat] = (categoryCounts[cat] ?: 0) + 1

            val pkg = entry.optString("packageName", "unknown")
            packageCounts[pkg] = (packageCounts[pkg] ?: 0) + 1
        }

        val catMap = Arguments.createMap()
        for ((k, v) in categoryCounts) {
            catMap.putInt(k, v)
        }
        map.putMap("categoryCounts", catMap)

        val pkgMap = Arguments.createMap()
        val topPackages = packageCounts.entries.sortedByDescending { it.value }.take(10)
        for ((k, v) in topPackages) {
            pkgMap.putInt(k, v)
        }
        map.putMap("topPackages", pkgMap)

        map.putInt("totalHistory", notificationHistory.size)
        map.putInt("activeCount", activeNotifications.size)

        return map
    }

    // =============================================================================
    // HELPER METHODS
    // =============================================================================

    private fun refreshActiveNotifications() {
        try {
            activeNotifications.clear()
            val sbns = super.getActiveNotifications()
            if (sbns != null) {
                for (sbn in sbns) {
                    activeNotifications[sbn.key] = sbn
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing active notifications", e)
        }
    }

    private fun broadcastNotificationEvent(eventType: String, data: JSONObject) {
        try {
            val intent = Intent("com.manu.ai.NOTIFICATION_EVENT")
            intent.putExtra("eventType", eventType)
            intent.putExtra("data", data.toString())
            sendBroadcast(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error broadcasting event", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Manu AI Notification Listener",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background service for monitoring notifications"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun jsonToWritableMap(json: JSONObject): WritableMap {
        val map = Arguments.createMap()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            when (val value = json.get(key)) {
                is String -> map.putString(key, value)
                is Int -> map.putInt(key, value)
                is Double -> map.putDouble(key, value)
                is Boolean -> map.putBoolean(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is JSONObject -> map.putMap(key, jsonToWritableMap(value))
                is JSONArray -> map.putArray(key, jsonToWritableArray(value))
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    private fun jsonToWritableArray(array: JSONArray): WritableArray {
        val writableArray = Arguments.createArray()
        for (i in 0 until array.length()) {
            when (val value = array.get(i)) {
                is String -> writableArray.pushString(value)
                is Int -> writableArray.pushInt(value)
                is Double -> writableArray.pushDouble(value)
                is Boolean -> writableArray.pushBoolean(value)
                is Long -> writableArray.pushDouble(value.toDouble())
                is JSONObject -> writableArray.pushMap(jsonToWritableMap(value))
                is JSONArray -> writableArray.pushArray(jsonToWritableArray(value))
                else -> writableArray.pushString(value.toString())
            }
        }
        return writableArray
    }
}
