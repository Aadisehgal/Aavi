// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/DoubleTapBack.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DoubleTapBackService : AccessibilityService() {

    companion object {
        const val TAG = "DoubleTapBack"
        const val EVENT_DOUBLE_TAP_BACK = "onDoubleTapBack"
        const val DOUBLE_TAP_TIMEOUT = 300L
        var instance: DoubleTapBackService? = null
        private var reactContext: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContext = context
        }
    }

    private var lastBackPressTime = 0L
    private var tapCount = 0
    private var customAction = "OPEN_MANU_MENU"

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        }
        Log.d(TAG, "DoubleTapBack service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {}

    override fun onInterrupt() {}

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
            if (event.action == KeyEvent.ACTION_UP) {
                val now = System.currentTimeMillis()
                if (now - lastBackPressTime < DOUBLE_TAP_TIMEOUT) {
                    tapCount++
                    if (tapCount >= 2) {
                        tapCount = 0
                        performCustomAction()
                        sendDoubleTapEvent()
                        return true
                    }
                } else {
                    tapCount = 1
                }
                lastBackPressTime = now
            }
        }
        return super.onKeyEvent(event)
    }

    private fun performCustomAction() {
        when (customAction) {
            "OPEN_MANU_MENU" -> {
                Log.d(TAG, "Opening MANU menu")
            }
            "GO_HOME" -> {
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
            "RECENT_APPS" -> {
                performGlobalAction(GLOBAL_ACTION_RECENTS)
            }
            "LOCK_SCREEN" -> {
                performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
            }
        }
    }

    private fun sendDoubleTapEvent() {
        val params = Arguments.createMap().apply {
            putString("action", customAction)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_DOUBLE_TAP_BACK, params)
    }

    fun setCustomAction(action: String) {
        customAction = action
    }
}

class DoubleTapBackModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DoubleTapBack"

    @ReactMethod
    fun initialize(promise: Promise) {
        DoubleTapBackService.setReactContext(reactApplicationContext)
        promise.resolve("DoubleTapBack initialized")
    }

    @ReactMethod
    fun setCustomAction(action: String, promise: Promise) {
        DoubleTapBackService.instance?.setCustomAction(action)
        promise.resolve("Action set to $action")
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
