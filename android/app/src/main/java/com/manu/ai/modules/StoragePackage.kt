// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 21/21 — AsyncStorage Fix & Native Storage Bridge
// File: android/app/src/main/java/com/manu/ai/modules/StoragePackage.kt

package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class StoragePackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(StorageModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
