// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: android/app/src/main/java/com/manu/ai/modules/GesturePackage.kt
// Purpose: ReactPackage wrapper that registers GestureModule with React Native

package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * GesturePackage — registers [GestureModule] (camera-based hand gesture recognition)
 * with the React Native bridge.
 *
 * Registered in MainApplication.kt:
 *   add(GesturePackage())
 */
class GesturePackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(GestureModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
