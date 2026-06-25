package com.manu.ai

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DeviceControlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceControlModule"

    private var accessibilityService: ManuAccessibilityService? = null

    fun setAccessibilityService(service: ManuAccessibilityService) {
        this.accessibilityService = service
    }

    @ReactMethod
    fun performGlobalAction(action: String, promise: Promise) {
        val service = accessibilityService
        if (service == null) {
            promise.reject("NO_ACCESSIBILITY", "Accessibility service not enabled. Go to Settings > Accessibility > MANU AI")
            return
        }
        val actionCode = when (action) {
            "back" -> AccessibilityService.GLOBAL_ACTION_BACK
            "home" -> AccessibilityService.GLOBAL_ACTION_HOME
            "recents" -> AccessibilityService.GLOBAL_ACTION_RECENTS
            "notifications" -> AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS
            "quick_settings" -> AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS
            else -> {
                promise.reject("UNKNOWN_ACTION", "Unknown action: $action")
                return
            }
        }
        val result = service.performGlobalAction(actionCode)
        if (result) {
            promise.resolve("Action performed: $action")
        } else {
            promise.reject("ACTION_FAILED", "Failed to perform action: $action")
        }
    }

    @ReactMethod
    fun setBrightness(level: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.System.canWrite(context)) {
                    val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS)
                    intent.data = Uri.parse("package:${context.packageName}")
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    promise.reject("NO_PERMISSION", "Write Settings permission required. Grant it in system settings.")
                    return
                }
            }
            val brightnessValue = (level * 255).toInt().coerceIn(0, 255)
            Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, brightnessValue)
            promise.resolve("Brightness set to ${(level * 100).toInt()}%")
        } catch (e: Exception) {
            promise.reject("BRIGHTNESS_ERROR", "Failed to set brightness: ${e.message}")
        }
    }

    @ReactMethod
    fun adjustVolume(direction: String, promise: Promise) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val adjustType = when (direction) {
                "up" -> AudioManager.ADJUST_RAISE
                "down" -> AudioManager.ADJUST_LOWER
                "mute" -> AudioManager.ADJUST_TOGGLE_MUTE
                else -> {
                    promise.reject("UNKNOWN_DIRECTION", "Use up/down/mute")
                    return
                }
            }
            audioManager.adjustVolume(adjustType, AudioManager.FLAG_SHOW_UI)
            promise.resolve("Volume adjusted: $direction")
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", "Failed to adjust volume: ${e.message}")
        }
    }

    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                promise.resolve("Opened app: $packageName")
            } else {
                promise.reject("APP_NOT_FOUND", "App not found: $packageName")
            }
        } catch (e: Exception) {
            promise.reject("OPEN_APP_ERROR", "Failed to open app: ${e.message}")
        }
    }

    @ReactMethod
    fun tapByText(text: String, promise: Promise) {
        val service = accessibilityService
        if (service == null) {
            promise.reject("NO_ACCESSIBILITY", "Accessibility service not enabled")
            return
        }
        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            promise.reject("NO_WINDOW", "No active window found")
            return
        }
        val node = findNodeByText(rootNode, text)
        if (node != null) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            promise.resolve("Tapped: $text")
        } else {
            promise.reject("NODE_NOT_FOUND", "Could not find element: $text")
        }
    }

    @ReactMethod
    fun typeText(text: String, promise: Promise) {
        val service = accessibilityService
        if (service == null) {
            promise.reject("NO_ACCESSIBILITY", "Accessibility service not enabled")
            return
        }
        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            promise.reject("NO_WINDOW", "No active window found")
            return
        }
        val focusedNode = findFocusedNode(rootNode)
        if (focusedNode != null) {
            val args = Bundle()
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
            focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            promise.resolve("Typed: $text")
        } else {
            promise.reject("NO_FOCUS", "No focused input field found")
        }
    }

    @ReactMethod
    fun readScreen(promise: Promise) {
        val service = accessibilityService
        if (service == null) {
            promise.reject("NO_ACCESSIBILITY", "Accessibility service not enabled")
            return
        }
        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            promise.reject("NO_WINDOW", "No active window found")
            return
        }
        val text = StringBuilder()
        traverseNodes(rootNode, text)
        promise.resolve(text.toString())
    }

    @ReactMethod
    fun toggleSystemFeature(feature: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            when (feature) {
                "wifi" -> {
                    val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    promise.resolve("Opened WiFi settings")
                }
                "bluetooth" -> {
                    val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    promise.resolve("Opened Bluetooth settings")
                }
                "flashlight" -> {
                    val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
                    val cameraId = cameraManager.cameraIdList[0]
                    cameraManager.setTorchMode(cameraId, true)
                    promise.resolve("Flashlight ON")
                }
                else -> promise.reject("UNKNOWN_FEATURE", "Unknown feature: $feature")
            }
        } catch (e: Exception) {
            promise.reject("FEATURE_ERROR", "Failed to toggle $feature: ${e.message}")
        }
    }

    private fun findNodeByText(root: AccessibilityNodeInfo, text: String): AccessibilityNodeInfo? {
        if (root.text?.toString()?.contains(text, ignoreCase = true) == true) {
            return root
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val result = findNodeByText(child, text)
            if (result != null) return result
        }
        return null
    }

    private fun findFocusedNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (root.isFocused) return root
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val result = findFocusedNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun traverseNodes(root: AccessibilityNodeInfo, sb: StringBuilder) {
        val text = root.text?.toString()
        if (!text.isNullOrEmpty()) {
            sb.append(text).append(" ")
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            traverseNodes(child, sb)
        }
    }
}
