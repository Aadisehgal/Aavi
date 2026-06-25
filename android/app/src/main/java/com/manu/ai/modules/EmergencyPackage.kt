// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: android/app/src/main/java/com/manu/ai/modules/EmergencyPackage.kt
// Purpose: ReactPackage wrapper that registers EmergencyModule with React Native

package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * EmergencyPackage — registers [EmergencyModule] (SOS / Armor emergency protocols)
 * with the React Native bridge.
 *
 * Registered in MainApplication.kt:
 *   add(EmergencyPackage())
 */
class EmergencyPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(EmergencyModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
