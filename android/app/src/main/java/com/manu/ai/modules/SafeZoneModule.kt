// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Geo-Fence Safe Zones
// File: android/app/src/main/java/com/manu/ai/modules/SafeZoneModule.kt
// Generated: 2026-06-25

package com.manu.ai.modules

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Looper
import com.facebook.react.bridge.*
import com.google.android.gms.location.*

class SafeZoneModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val geofencingClient: GeofencingClient = LocationServices.getGeofencingClient(reactApplicationContext)
    private val fusedLocationClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(reactApplicationContext)
    private val geofenceList = mutableMapOf<String, Geofence>()
    private val pendingIntent: PendingIntent by lazy {
        val intent = Intent(reactApplicationContext, GeofenceBroadcastReceiver::class.java)
        PendingIntent.getBroadcast(
            reactApplicationContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }

    override fun getName(): String = "SafeZoneModule"

    @ReactMethod
    fun addSafeZone(config: ReadableMap, promise: Promise) {
        try {
            val id = config.getString("id") ?: throw Exception("ID required")
            val lat = config.getDouble("latitude")
            val lng = config.getDouble("longitude")
            val radius = config.getDouble("radius").toFloat()
            val name = config.getString("name") ?: id

            val geofence = Geofence.Builder()
                .setRequestId(id)
                .setCircularRegion(lat, lng, radius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
                .build()

            geofenceList[id] = geofence

            val request = GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofence(geofence)
                .build()

            geofencingClient.addGeofences(request, pendingIntent)
                .addOnSuccessListener {
                    promise.resolve(mapOf(
                        "success" to true,
                        "id" to id,
                        "name" to name,
                        "lat" to lat,
                        "lng" to lng,
                        "radius" to radius
                    ).toWritableMap())
                }
                .addOnFailureListener { e ->
                    promise.reject("GEOFENCE_ADD_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("ADD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun removeSafeZone(id: String, promise: Promise) {
        try {
            geofencingClient.removeGeofences(listOf(id))
                .addOnSuccessListener {
                    geofenceList.remove(id)
                    promise.resolve(mapOf("success" to true, "removed" to id).toWritableMap())
                }
                .addOnFailureListener { e ->
                    promise.reject("REMOVE_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("REMOVE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun removeAllSafeZones(promise: Promise) {
        try {
            geofencingClient.removeGeofences(pendingIntent)
                .addOnSuccessListener {
                    geofenceList.clear()
                    promise.resolve(mapOf("success" to true, "removedAll" to true).toWritableMap())
                }
                .addOnFailureListener { e ->
                    promise.reject("REMOVE_ALL_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("REMOVE_ALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        try {
            fusedLocationClient.lastLocation
                .addOnSuccessListener { location: Location? ->
                    if (location != null) {
                        promise.resolve(mapOf(
                            "latitude" to location.latitude,
                            "longitude" to location.longitude,
                            "accuracy" to location.accuracy,
                            "altitude" to location.altitude,
                            "speed" to location.speed,
                            "timestamp" to location.time
                        ).toWritableMap())
                    } else {
                        promise.reject("NO_LOCATION", "Last location is null", null)
                    }
                }
                .addOnFailureListener { e ->
                    promise.reject("LOCATION_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("LOCATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSafeZones(promise: Promise) {
        val zones = geofenceList.map { (id, geofence) ->
            mapOf(
                "id" to id,
                "latitude" to geofence.latitude,
                "longitude" to geofence.longitude,
                "radius" to geofence.radius
            )
        }
        promise.resolve(zones.toWritableArray())
    }

    @ReactMethod
    fun isInSafeZone(promise: Promise) {
        try {
            fusedLocationClient.lastLocation
                .addOnSuccessListener { location: Location? ->
                    if (location == null) {
                        promise.resolve(mapOf("inSafeZone" to false, "reason" to "no_location").toWritableMap())
                        return@addOnSuccessListener
                    }

                    var inZone = false
                    var zoneId: String? = null

                    for ((id, geofence) in geofenceList) {
                        val results = FloatArray(1)
                        Location.distanceBetween(
                            location.latitude, location.longitude,
                            geofence.latitude, geofence.longitude,
                            results
                        )
                        if (results[0] <= geofence.radius) {
                            inZone = true
                            zoneId = id
                            break
                        }
                    }

                    promise.resolve(mapOf(
                        "inSafeZone" to inZone,
                        "zoneId" to (zoneId ?: "")
                    ).toWritableMap())
                }
                .addOnFailureListener { e ->
                    promise.reject("CHECK_ERROR", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
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
                    is Float -> writableMap.putDouble(k, v.toDouble())
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
                is Float -> map.putDouble(k, v.toDouble())
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }
}
