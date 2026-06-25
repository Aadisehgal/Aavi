// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/ScreenAwareness.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.pm.ActivityInfo
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenAwareness : AccessibilityService() {

    companion object {
        const val TAG = "ScreenAwareness"
        const val EVENT_APP_CHANGE = "onAppChange"
        const val EVENT_WINDOW_STATE = "onWindowStateChange"
        var instance: ScreenAwareness? = null
        private var reactContext: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContext = context
        }
    }

    private val trackedApps = mutableSetOf<String>()
    private var currentPackage = ""
    private var currentActivity = ""

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        Log.d(TAG, "ScreenAwareness service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val packageName = event.packageName?.toString() ?: return
                val className = event.className?.toString() ?: ""

                if (packageName != currentPackage || className != currentActivity) {
                    currentPackage = packageName
                    currentActivity = className
                    sendAppChangeEvent(packageName, className)
                    checkAutoManage(packageName)
                }
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                analyzeWindowContent(event.source)
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
    }

    private fun sendAppChangeEvent(packageName: String, activityName: String) {
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("activityName", activityName)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_APP_CHANGE, params)
    }

    private fun analyzeWindowContent(rootNode: AccessibilityNodeInfo?) {
        rootNode ?: return
        val textElements = mutableListOf<String>()
        collectText(rootNode, textElements)
        rootNode.recycle()

        if (textElements.isNotEmpty()) {
            val params = Arguments.createMap().apply {
                putArray("textElements", Arguments.fromList(textElements))
                putString("packageName", currentPackage)
            }
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_WINDOW_STATE, params)
        }
    }

    private fun collectText(node: AccessibilityNodeInfo, list: MutableList<String>) {
        node.text?.toString()?.let { if (it.isNotBlank()) list.add(it) }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                collectText(child, list)
                child.recycle()
            }
        }
    }

    private fun checkAutoManage(packageName: String) {
        if (trackedApps.contains(packageName)) {
            Log.d(TAG, "Auto-managing app: $packageName")
        }
    }

    fun addTrackedApp(packageName: String) {
        trackedApps.add(packageName)
    }

    fun removeTrackedApp(packageName: String) {
        trackedApps.remove(packageName)
    }

    fun getCurrentApp(): WritableMap {
        return Arguments.createMap().apply {
            putString("packageName", currentPackage)
            putString("activityName", currentActivity)
        }
    }
}

class ScreenAwarenessModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenAwareness"

    @ReactMethod
    fun startTracking(promise: Promise) {
        ScreenAwareness.setReactContext(reactApplicationContext)
        promise.resolve("Tracking initialized")
    }

    @ReactMethod
    fun addTrackedApp(packageName: String, promise: Promise) {
        ScreenAwareness.instance?.addTrackedApp(packageName)
        promise.resolve("Added $packageName")
    }

    @ReactMethod
    fun removeTrackedApp(packageName: String, promise: Promise) {
        ScreenAwareness.instance?.removeTrackedApp(packageName)
        promise.resolve("Removed $packageName")
    }

    @ReactMethod
    fun getCurrentApp(promise: Promise) {
        val app = ScreenAwareness.instance?.getCurrentApp() ?: Arguments.createMap()
        promise.resolve(app)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
