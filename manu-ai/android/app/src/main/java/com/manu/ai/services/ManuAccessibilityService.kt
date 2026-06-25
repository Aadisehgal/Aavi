package com.manu.ai.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.manu.ai.DeviceControlModule
import com.manu.ai.MainApplication

class ManuAccessibilityService : AccessibilityService() {

    companion object {
        const val TAG = "ManuAccessibility"
        var instance: ManuAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d(TAG, "Accessibility Service Connected")

        try {
            val app = application as MainApplication
            val reactContext = app.reactNativeHost.reactInstanceManager.currentReactContext
            reactContext?.getNativeModule(DeviceControlModule::class.java)?.setAccessibilityService(this)
        } catch (e: Exception) {
            Log.e(TAG, "Could not register with DeviceControlModule: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        // Log events for debugging
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                Log.d(TAG, "Window changed: ${event.packageName}")
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                Log.d(TAG, "View clicked: ${event.contentDescription}")
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility Service Interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.d(TAG, "Accessibility Service Destroyed")
    }

    fun tapAt(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun swipe(startX: Float, startY: Float, endX: Float, endY: Float, duration: Long = 300): Boolean {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, duration))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun scrollDown(): Boolean {
        val displayMetrics = resources.displayMetrics
        val centerX = displayMetrics.widthPixels / 2f
        val startY = displayMetrics.heightPixels * 0.7f
        val endY = displayMetrics.heightPixels * 0.3f
        return swipe(centerX, startY, centerX, endY, 500)
    }

    fun scrollUp(): Boolean {
        val displayMetrics = resources.displayMetrics
        val centerX = displayMetrics.widthPixels / 2f
        val startY = displayMetrics.heightPixels * 0.3f
        val endY = displayMetrics.heightPixels * 0.7f
        return swipe(centerX, startY, centerX, endY, 500)
    }
}
