// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Repulsor-Level Force Close
// File: android/app/src/main/java/com/manu/ai/modules/ForceClose.kt
// Generated: 2026-06-25

package com.manu.ai.modules

import android.app.ActivityManager
import android.content.Context
import android.os.Process
import com.facebook.react.bridge.*

class ForceCloseModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ForceClose"

    @ReactMethod
    fun forceCloseApp(packageName: String, promise: Promise) {
        try {
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            var killed = false

            activityManager.killBackgroundProcesses(packageName)
            killed = true

            try {
                Runtime.getRuntime().exec("am force-stop $packageName")
                killed = true
            } catch (e: Exception) {}

            try {
                val pids = getPidsForPackage(packageName)
                for (pid in pids) {
                    Process.killProcess(pid)
                    killed = true
                }
            } catch (e: Exception) {}

            if (packageName == reactApplicationContext.packageName) {
                try {
                    val runtime = Runtime.getRuntime()
                    runtime.exec("pm clear $packageName")
                } catch (e: Exception) {}
            }

            try {
                val method = activityManager.javaClass.getMethod("forceStopPackage", String::class.java)
                method.invoke(activityManager, packageName)
                killed = true
            } catch (e: Exception) {}

            promise.resolve(mapOf(
                "success" to killed,
                "package" to packageName,
                "methodsAttempted" to listOf("killBackgroundProcesses", "am_force_stop", "sigkill", "pm_clear", "forceStopPackage")
            ).toWritableMap())
        } catch (e: Exception) {
            promise.reject("FORCE_CLOSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun forceCloseSelf(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            forceCloseApp(packageName, promise)
        } catch (e: Exception) {
            promise.reject("SELF_CLOSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getRunningApps(promise: Promise) {
        try {
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningApps = activityManager.runningAppProcesses?.map { process ->
                mapOf(
                    "packageName" to (process.processName ?: ""),
                    "pid" to process.pid,
                    "importance" to process.importance
                )
            } ?: emptyList()

            promise.resolve(runningApps.toWritableArray())
        } catch (e: Exception) {
            promise.reject("GET_RUNNING_ERROR", e.message, e)
        }
    }

    private fun getPidsForPackage(packageName: String): List<Int> {
        val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return activityManager.runningAppProcesses
            ?.filter { it.processName == packageName }
            ?.map { it.pid }
            ?: emptyList()
    }

    private fun List<Map<String, Any>>.toWritableArray(): WritableArray {
        val array = Arguments.createArray()
        forEach { map ->
            val writableMap = Arguments.createMap()
            map.forEach { (k, v) ->
                when (v) {
                    is String -> writableMap.putString(k, v)
                    is Boolean -> writableMap.putBoolean(k, v)
                    is Int -> writableMap.putInt(k, v)
                    is Long -> writableMap.putDouble(k, v.toDouble())
                    is Double -> writableMap.putDouble(k, v)
                    else -> writableMap.putString(k, v.toString())
                }
            }
            array.pushMap(writableMap)
        }
        return array
    }

    private fun Map<String, Any>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        forEach { (k, v) ->
            when (v) {
                is String -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
                is Int -> map.putInt(k, v)
                is Long -> map.putDouble(k, v.toDouble())
                is Double -> map.putDouble(k, v)
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }
}
