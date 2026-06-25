// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/VolumeShortcuts.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VolumeShortcutsService : AccessibilityService() {

    companion object {
        const val TAG = "VolumeShortcuts"
        const val EVENT_VOLUME_SHORTCUT = "onVolumeShortcut"
        const val DOUBLE_PRESS_WINDOW = 400L
        var instance: VolumeShortcutsService? = null
        private var reactContext: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContext = context
        }
    }

    private var lastVolumeUpTime = 0L
    private var lastVolumeDownTime = 0L
    private var flashlightOn = false
    private var cameraManager: CameraManager? = null
    private var cameraId: String? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            cameraId = cameraManager?.cameraIdList?.find { id ->
                val characteristics = cameraManager?.getCameraCharacteristics(id)
                characteristics?.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            }
        } catch (e: CameraAccessException) {
            Log.e(TAG, "Camera access error", e)
        }

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
        }
        Log.d(TAG, "VolumeShortcuts service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {}
    override fun onInterrupt() {}

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return super.onKeyEvent(event)
        val now = System.currentTimeMillis()

        when (event.keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP -> {
                if (now - lastVolumeUpTime < DOUBLE_PRESS_WINDOW) {
                    toggleFlashlight()
                    sendShortcutEvent("FLASHLIGHT_TOGGLE")
                    return true
                }
                lastVolumeUpTime = now
            }
            KeyEvent.KEYCODE_VOLUME_DOWN -> {
                if (now - lastVolumeDownTime < DOUBLE_PRESS_WINDOW) {
                    sendShortcutEvent("VOLUME_DOWN_DOUBLE")
                    return true
                }
                lastVolumeDownTime = now
            }
        }

        if (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP &&
            now - lastVolumeDownTime < DOUBLE_PRESS_WINDOW
        ) {
            takeScreenshot()
            sendShortcutEvent("SCREENSHOT")
            return true
        }

        return super.onKeyEvent(event)
    }

    private fun toggleFlashlight() {
        cameraId ?: return
        try {
            flashlightOn = !flashlightOn
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                cameraManager?.setTorchMode(cameraId!!, flashlightOn)
            }
        } catch (e: CameraAccessException) {
            Log.e(TAG, "Flashlight toggle failed", e)
        }
    }

    private fun takeScreenshot() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT)
        }
    }

    private fun sendShortcutEvent(action: String) {
        val params = Arguments.createMap().apply {
            putString("action", action)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_VOLUME_SHORTCUT, params)
    }
}

class VolumeShortcutsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VolumeShortcuts"

    @ReactMethod
    fun initialize(promise: Promise) {
        VolumeShortcutsService.setReactContext(reactApplicationContext)
        promise.resolve("VolumeShortcuts initialized")
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
