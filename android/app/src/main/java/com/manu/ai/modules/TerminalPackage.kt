package com.manu.ai.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 8/20 — Terminal & Shell Integration
// File: android/app/src/main/java/com/manu/ai/modules/TerminalPackage.kt
// Generated: 2026-06-24
//
// React Native package for TerminalModule.
// Register in MainApplication.java / MainApplication.kt:
// packages.add(new TerminalPackage());

class TerminalPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(TerminalModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
