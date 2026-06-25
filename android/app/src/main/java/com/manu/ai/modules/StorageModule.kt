// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 21/21 — AsyncStorage Fix & Native Storage Bridge
// File: android/app/src/main/java/com/manu/ai/modules/StorageModule.kt

package com.manu.ai.modules

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val prefs: SharedPreferences = reactContext.getSharedPreferences(
        "MANU_AI_STORAGE",
        Context.MODE_PRIVATE
    )

    override fun getName(): String {
        return "StorageModule"
    }

    @ReactMethod
    fun saveString(key: String, value: String, promise: Promise) {
        try {
            prefs.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_STRING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getString(key: String, defaultValue: String?, promise: Promise) {
        try {
            val result = prefs.getString(key, defaultValue)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_STRING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun saveObject(key: String, jsonValue: String, promise: Promise) {
        try {
            prefs.edit().putString(key, jsonValue).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_OBJECT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getObject(key: String, promise: Promise) {
        try {
            val result = prefs.getString(key, null)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_OBJECT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deleteKey(key: String, promise: Promise) {
        try {
            prefs.edit().remove(key).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DELETE_KEY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearAll(promise: Promise) {
        try {
            prefs.edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ALL_ERROR", e.message, e)
        }
    }
}
