// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 20/20 — Build Environment & Final Integration
// File: android/app/src/main/java/com/manu/ai/MainActivity.kt
// Generated: 2026-06-25

package com.manu.ai

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "ManuAI"

    /**
     * Returns the instance of the [ReactActivityDelegate].
     * Single-task launch mode is declared in AndroidManifest.xml to prevent
     * duplicate voice services, accessibility connections, and native module
     * instances from running concurrently.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // singleTask behavior enforced via AndroidManifest.xml launchMode
    }
}
