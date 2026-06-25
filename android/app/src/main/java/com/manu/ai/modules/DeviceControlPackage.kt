package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ViewManager
import com.manu.ai.services.ManuAccessibilityService

class DeviceControlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "DeviceControlModule"

    @ReactMethod
    fun performAction(action: String, params: ReadableMap?, promise: Promise) {
        try {
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("E_ACTION", e.message)
        }
    }
}

class DeviceControlPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(DeviceControlModule(reactContext))
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
