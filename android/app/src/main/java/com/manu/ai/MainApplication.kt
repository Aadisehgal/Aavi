package com.manu.ai

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.soloader.SoLoader
import com.manu.ai.modules.DeviceControlPackage
import com.manu.ai.modules.TerminalPackage
import com.manu.ai.modules.VoiceFingerprintPackage
import com.manu.ai.modules.GesturePackage
import com.manu.ai.modules.LocalLLMPackage
import com.manu.ai.modules.EmergencyPackage

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : ReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    add(DeviceControlPackage())
                    add(TerminalPackage())
                    add(VoiceFingerprintPackage())
                    add(GesturePackage())
                    add(LocalLLMPackage())
                    add(EmergencyPackage())
                }
            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
        }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
    }
}
