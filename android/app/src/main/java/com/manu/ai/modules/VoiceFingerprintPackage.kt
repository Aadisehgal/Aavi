// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: android/app/src/main/java/com/manu/ai/modules/VoiceFingerprintPackage.kt
// Purpose: ReactPackage wrapper that registers VoiceFingerprintModule with React Native

package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * VoiceFingerprintPackage — registers [VoiceFingerprintModule] (voice biometric
 * enrolment, verification, and stress detection) with the React Native bridge.
 *
 * Registered in MainApplication.kt:
 *   add(VoiceFingerprintPackage())
 */
class VoiceFingerprintPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(VoiceFingerprintModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
