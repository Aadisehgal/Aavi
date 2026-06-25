// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/QSTiles.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

@RequiresApi(Build.VERSION_CODES.N)
class MANUQSTileService : TileService() {

    companion object {
        const val TAG = "MANUQSTile"
        const val EVENT_TILE_CLICK = "onQSTileClick"
        var instance: MANUQSTileService? = null
        private var reactContext: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContext = context
        }

        fun updateTileState(state: Int, label: String, subtitle: String = "") {
            instance?.qsTile?.let { tile ->
                tile.state = state
                tile.label = label
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = subtitle
                }
                tile.updateTile()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onStartListening() {
        super.onStartListening()
        instance = this
        qsTile?.let { tile ->
            tile.state = Tile.STATE_INACTIVE
            tile.label = "MANU AI"
            tile.updateTile()
        }
    }

    override fun onStopListening() {
        super.onStopListening()
    }

    override fun onClick() {
        super.onClick()
        val tile = qsTile ?: return
        val newState = if (tile.state == Tile.STATE_ACTIVE) Tile.STATE_INACTIVE else Tile.STATE_ACTIVE
        tile.state = newState
        tile.updateTile()

        val action = if (newState == Tile.STATE_ACTIVE) "ACTIVATE" else "DEACTIVATE"
        sendTileEvent(action)

        if (newState == Tile.STATE_ACTIVE) {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivityAndCollapse(intent)
        }
    }

    private fun sendTileEvent(action: String) {
        val params = Arguments.createMap().apply {
            putString("action", action)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_TILE_CLICK, params)
    }
}

class QSTilesModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "QSTiles"

    @ReactMethod
    fun initialize(promise: Promise) {
        MANUQSTileService.setReactContext(reactApplicationContext)
        promise.resolve("QS Tiles initialized")
    }

    @ReactMethod
    fun updateTile(state: Int, label: String, subtitle: String, promise: Promise) {
        MANUQSTileService.updateTileState(state, label, subtitle)
        promise.resolve("Tile updated")
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
