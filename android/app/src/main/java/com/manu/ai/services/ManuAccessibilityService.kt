// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 3/20 — Device Automation via Android Accessibility Service
// File: android/app/src/main/java/com/manu/ai/services/ManuAccessibilityService.kt
// Generated: 2026-06-24

package com.manu.ai.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ManuAccessibilityService — Core Android AccessibilityService for J.A.R.V.I.S. device control.
 *
 * Permissions required in AndroidManifest.xml:
 *   <uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE"/>
 *   <uses-permission android:name="android.permission.WRITE_SETTINGS"/>
 *   <uses-permission android:name="android.permission.BLUETOOTH"/>
 *   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
 *   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/> <!-- Android 12+ -->
 *   <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
 *   <uses-permission android:name="android.permission.CHANGE_WIFI_STATE"/>
 *   <uses-permission android:name="android.permission.CAMERA"/>
 *   <uses-permission android:name="android.permission.RECORD_AUDIO"/> <!-- For TTS -->
 *
 * Service declaration in AndroidManifest.xml:
 *   <service
 *       android:name=".services.ManuAccessibilityService"
 *       android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
 *       android:exported="true">
 *       <intent-filter>
 *           <action android:name="android.accessibilityservice.AccessibilityService"/>
 *       </intent-filter>
 *       <meta-data
 *           android:name="android.accessibilityservice"
 *           android:resource="@xml/accessibility_service_config"/>
 *   </service>
 */
class ManuAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        private var instance: ManuAccessibilityService? = null

        private var ttsInstance: TextToSpeech? = null
        private var mediaProjection: MediaProjection? = null

        /**
         * Returns the active service instance if connected.
         */
        fun getInstance(): ManuAccessibilityService? =
            if (instance?.isServiceConnected == true) instance else null

        /**
         * Sets the MediaProjection instance for screenshot capture.
         * Must be called from the Activity that handled the MediaProjection permission request.
         */
        fun setMediaProjection(mp: MediaProjection?) {
            mediaProjection = mp
        }

        /**
         * Executes an accessibility action by name with optional parameters.
         * Called from DeviceControlModule (React Native bridge).
         */
        fun performAction(action: String, params: Map<String, Any>? = null): WritableMap {
            val result = Arguments.createMap()
            val service = instance

            if (service == null || !service.isServiceConnected) {
                result.putBoolean("success", false)
                result.putString("error", "Accessibility service not connected. Please enable it in Settings > Accessibility.")
                return result
            }

            service.executeAction(action, params, result)
            return result
        }
    }

    private var isServiceConnected = false
    private var isFlashlightOn = false
    private val handler = Handler(Looper.getMainLooper())

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isServiceConnected = true

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED or
                    AccessibilityEvent.TYPE_VIEW_FOCUSED or
                    AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        serviceInfo = info

        initTTS()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // Multi-Screen Awareness (J.A.R.V.I.S. Upgrade — Feature 9):
        // Track app switches and window changes. This can be extended to
        // emit events to the JS layer for multi-app tracking.
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // App/window changed — can be used to auto-pause media, log usage, etc.
            }
            AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED -> {
                // Notification received — can trigger auto-pause/resume logic
            }
        }
    }

    override fun onInterrupt() {
        ttsInstance?.stop()
    }

    override fun onDestroy() {
        super.onDestroy()
        shutdownTTS()
        mediaProjection?.stop()
        mediaProjection = null
        instance = null
        isServiceConnected = false
    }

    // -------------------------------------------------------------------------
    // Text-to-Speech
    // -------------------------------------------------------------------------

    private fun initTTS() {
        shutdownTTS()
        ttsInstance = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsInstance?.language = Locale.getDefault()
            }
        }
    }

    private fun shutdownTTS() {
        ttsInstance?.stop()
        ttsInstance?.shutdown()
        ttsInstance = null
    }

    // -------------------------------------------------------------------------
    // Action Dispatcher
    // -------------------------------------------------------------------------

    private fun executeAction(action: String, params: Map<String, Any>?, result: WritableMap) {
        when (action) {
            "GLOBAL_ACTION_BACK" ->
                result.putBoolean("success", performGlobalAction(GLOBAL_ACTION_BACK))

            "GLOBAL_ACTION_HOME" ->
                result.putBoolean("success", performGlobalAction(GLOBAL_ACTION_HOME))

            "GLOBAL_ACTION_RECENTS" ->
                result.putBoolean("success", performGlobalAction(GLOBAL_ACTION_RECENTS))

            "GLOBAL_ACTION_NOTIFICATIONS" ->
                result.putBoolean("success", performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS))

            "GLOBAL_ACTION_QUICK_SETTINGS" ->
                result.putBoolean("success", performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS))

            "READ_SCREEN" -> {
                val content = readScreenContent()
                result.putBoolean("success", true)
                result.putString("content", content)
            }

            "TAP_BY_TEXT" -> {
                val label = getStringParam(params, "label")
                if (label != null) {
                    result.putBoolean("success", tapByText(label))
                } else {
                    result.putBoolean("success", false)
                    result.putString("error", "Missing required parameter: label")
                }
            }

            "TYPE_TEXT" -> {
                val text = getStringParam(params, "text")
                if (text != null) {
                    result.putBoolean("success", typeText(text))
                } else {
                    result.putBoolean("success", false)
                    result.putString("error", "Missing required parameter: text")
                }
            }

            "VOLUME_UP" ->
                result.putBoolean("success", adjustVolume(AudioManager.ADJUST_RAISE))

            "VOLUME_DOWN" ->
                result.putBoolean("success", adjustVolume(AudioManager.ADJUST_LOWER))

            "VOLUME_MUTE" ->
                result.putBoolean("success", adjustVolume(AudioManager.ADJUST_TOGGLE_MUTE))

            "SET_BRIGHTNESS" -> {
                val level = getIntParam(params, "level")
                if (level != null) {
                    result.putBoolean("success", setBrightness(level))
                } else {
                    result.putBoolean("success", false)
                    result.putString("error", "Missing required parameter: level (0-255)")
                }
            }

            "TOGGLE_BLUETOOTH" ->
                result.putBoolean("success", toggleBluetooth())

            "TOGGLE_WIFI" ->
                result.putBoolean("success", toggleWifi())

            "TOGGLE_FLASHLIGHT" ->
                result.putBoolean("success", toggleFlashlight())

            "OPEN_APP" -> {
                val packageName = getStringParam(params, "packageName")
                if (packageName != null) {
                    result.putBoolean("success", openApp(packageName))
                } else {
                    result.putBoolean("success", false)
                    result.putString("error", "Missing required parameter: packageName")
                }
            }

            "TEXT_TO_SPEECH" -> {
                val text = getStringParam(params, "text")
                if (text != null) {
                    result.putBoolean("success", speakText(text))
                } else {
                    result.putBoolean("success", false)
                    result.putString("error", "Missing required parameter: text")
                }
            }

            "STOP_TTS" -> {
                ttsInstance?.stop()
                result.putBoolean("success", true)
            }

            "SCREENSHOT" ->
                takeScreenshot(result)

            else -> {
                result.putBoolean("success", false)
                result.putString("error", "Unknown action: $action")
            }
        }
    }

    // -------------------------------------------------------------------------
    // Parameter Helpers
    // -------------------------------------------------------------------------

    private fun getStringParam(params: Map<String, Any>?, key: String): String? {
        return params?.get(key) as? String
    }

    private fun getIntParam(params: Map<String, Any>?, key: String): Int? {
        return when (val value = params?.get(key)) {
            is Int -> value
            is Double -> value.toInt()
            is Number -> value.toInt()
            else -> null
        }
    }

    // -------------------------------------------------------------------------
    // Screen Content Reading
    // -------------------------------------------------------------------------

    private fun readScreenContent(): String {
        val rootNode = rootInActiveWindow ?: return ""
        val builder = StringBuilder()
        val allNodes = mutableListOf<AccessibilityNodeInfo>()
        try {
            traverseNode(rootNode, builder, allNodes)
        } finally {
            allNodes.forEach { it.recycle() }
        }
        return builder.toString().trim()
    }

    private fun traverseNode(
        node: AccessibilityNodeInfo,
        builder: StringBuilder,
        allNodes: MutableList<AccessibilityNodeInfo>
    ) {
        allNodes.add(node)

        node.text?.let { if (it.isNotEmpty()) builder.append(it).append(" ") }
        node.contentDescription?.let { if (it.isNotEmpty()) builder.append(it).append(" ") }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { traverseNode(it, builder, allNodes) }
        }
    }

    // -------------------------------------------------------------------------
    // Tap by Text Label
    // -------------------------------------------------------------------------

    private fun tapByText(label: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val found = AtomicBoolean(false)
        val allNodes = mutableListOf<AccessibilityNodeInfo>()
        try {
            findAndClickNode(rootNode, label, found, allNodes)
        } finally {
            allNodes.forEach { it.recycle() }
        }
        return found.get()
    }

    private fun findAndClickNode(
        node: AccessibilityNodeInfo,
        label: String,
        found: AtomicBoolean,
        allNodes: MutableList<AccessibilityNodeInfo>
    ) {
        if (found.get()) return
        allNodes.add(node)

        val nodeText = node.text?.toString() ?: ""
        val nodeDesc = node.contentDescription?.toString() ?: ""

        if ((nodeText.contains(label, ignoreCase = true) ||
                    nodeDesc.contains(label, ignoreCase = true)) && node.isClickable
        ) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            found.set(true)
            return
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { findAndClickNode(it, label, found, allNodes) }
            if (found.get()) return
        }
    }

    // -------------------------------------------------------------------------
    // Type Text into Focused Input
    // -------------------------------------------------------------------------

    private fun typeText(text: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val allNodes = mutableListOf<AccessibilityNodeInfo>()
        return try {
            val focusedNode = findFocusedNode(rootNode, allNodes)
            if (focusedNode != null) {
                val args = Bundle().apply {
                    putCharSequence(
                        AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                        text
                    )
                }
                focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            } else {
                false
            }
        } finally {
            allNodes.forEach { it.recycle() }
        }
    }

    private fun findFocusedNode(
        node: AccessibilityNodeInfo,
        allNodes: MutableList<AccessibilityNodeInfo>
    ): AccessibilityNodeInfo? {
        allNodes.add(node)
        if (node.isFocused && node.isEditable) {
            return node
        }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let {
                val found = findFocusedNode(it, allNodes)
                if (found != null) return found
            }
        }
        return null
    }

    // -------------------------------------------------------------------------
    // Volume Control
    // -------------------------------------------------------------------------

    private fun adjustVolume(direction: Int): Boolean {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.adjustVolume(direction, AudioManager.FLAG_SHOW_UI)
        return true
    }

    // -------------------------------------------------------------------------
    // Brightness Control
    // -------------------------------------------------------------------------

    private fun setBrightness(level: Int): Boolean {
        return try {
            if (Settings.System.canWrite(this)) {
                Settings.System.putInt(
                    contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS,
                    level.coerceIn(0, 255)
                )
                true
            } else {
                // Redirect user to grant WRITE_SETTINGS permission
                val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    // -------------------------------------------------------------------------
    // Bluetooth Toggle
    // -------------------------------------------------------------------------

    @Suppress("DEPRECATION")
    private fun toggleBluetooth(): Boolean {
        return try {
            val adapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter()
            if (adapter == null) {
                return false
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ — direct enable/disable requires BLUETOOTH_CONNECT.
                // Fallback to system settings.
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                true
            } else {
                if (adapter.isEnabled) adapter.disable() else adapter.enable()
                true
            }
        } catch (e: SecurityException) {
            false
        }
    }

    // -------------------------------------------------------------------------
    // WiFi Toggle
    // -------------------------------------------------------------------------

    @Suppress("DEPRECATION")
    private fun toggleWifi(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ — use system panel
                val intent = Intent(Settings.Panel.ACTION_WIFI).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                true
            } else {
                val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE)
                        as android.net.wifi.WifiManager
                wifiManager.isWifiEnabled = !wifiManager.isWifiEnabled
                true
            }
        } catch (e: Exception) {
            false
        }
    }

    // -------------------------------------------------------------------------
    // Flashlight Toggle
    // -------------------------------------------------------------------------

    private fun toggleFlashlight(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameraId = cameraManager.cameraIdList.getOrNull(0) ?: return false
                isFlashlightOn = !isFlashlightOn
                cameraManager.setTorchMode(cameraId, isFlashlightOn)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    // -------------------------------------------------------------------------
    // Open App by Package Name
    // -------------------------------------------------------------------------

    private fun openApp(packageName: String): Boolean {
        return try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                startActivity(intent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    // -------------------------------------------------------------------------
    // Text-to-Speech
    // -------------------------------------------------------------------------

    private fun speakText(text: String): Boolean {
        val tts = ttsInstance ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "MANU_TTS_UTTERANCE") == TextToSpeech.SUCCESS
        } else {
            @Suppress("DEPRECATION")
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null) == TextToSpeech.SUCCESS
        }
    }

    // -------------------------------------------------------------------------
    // Screenshot via MediaProjection
    // -------------------------------------------------------------------------

    private fun takeScreenshot(result: WritableMap) {
        val projection = mediaProjection
        if (projection == null) {
            result.putBoolean("success", false)
            result.putString(
                "error",
                "MediaProjection not available. Request permission via startActivityForResult with MediaProjectionManager.createScreenCaptureIntent()."
            )
            return
        }

        try {
            val metrics = resources.displayMetrics
            val width = metrics.widthPixels
            val height = metrics.heightPixels
            val density = metrics.densityDpi

            val imageReader = ImageReader.newInstance(width, height, android.graphics.PixelFormat.RGBA_8888, 2)
            val virtualDisplay = projection.createVirtualDisplay(
                "MANU_SCREENSHOT",
                width, height, density,
                android.hardware.display.DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.surface,
                null,
                handler
            )

            handler.postDelayed({
                try {
                    val image = imageReader.acquireLatestImage()
                    if (image != null) {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * width

                        val bitmap = android.graphics.Bitmap.createBitmap(
                            width + rowPadding / pixelStride,
                            height,
                            android.graphics.Bitmap.Config.ARGB_8888
                        )
                        bitmap.copyPixelsFromBuffer(buffer)

                        val cropped = android.graphics.Bitmap.createBitmap(bitmap, 0, 0, width, height)
                        val filename = "screenshot_${System.currentTimeMillis()}.png"
                        val file = File(getExternalFilesDir(null), filename)

                        FileOutputStream(file).use { out ->
                            cropped.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
                        }

                        bitmap.recycle()
                        cropped.recycle()
                        image.close()

                        result.putBoolean("success", true)
                        result.putString("path", file.absolutePath)
                    } else {
                        result.putBoolean("success", false)
                        result.putString("error", "Failed to acquire screenshot image")
                    }
                } catch (e: Exception) {
                    result.putBoolean("success", false)
                    result.putString("error", e.message ?: "Screenshot capture failed")
                } finally {
                    virtualDisplay?.release()
                    imageReader.close()
                }
            }, 500)
        } catch (e: Exception) {
            result.putBoolean("success", false)
            result.putString("error", e.message ?: "Screenshot initialization failed")
        }
    }
}
