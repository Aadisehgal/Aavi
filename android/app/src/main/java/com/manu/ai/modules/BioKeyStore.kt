package com.manu.ai.modules

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import com.facebook.react.bridge.*
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class BioKeyStore(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BioKeyStore"

    private val KEYSTORE = "AndroidKeyStore"
    private val KEY_ALIAS = "manu_ai_biometric_key"

    @ReactMethod
    fun isBiometricAvailable(promise: Promise) {
        try {
            val bm = BiometricManager.from(reactApplicationContext)
            val result = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            promise.resolve(result == BiometricManager.BIOMETRIC_SUCCESS)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun generateKey(alias: String, promise: Promise) {
        try {
            val keyAlias = if (alias.isNotEmpty()) alias else KEY_ALIAS
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
            val spec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_CBC)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_PKCS7)
                .setUserAuthenticationRequired(true)
                .apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        setUserAuthenticationParameters(30, KeyProperties.AUTH_BIOMETRIC_STRONG)
                    } else {
                        @Suppress("DEPRECATION")
                        setUserAuthenticationValidityDurationSeconds(30)
                    }
                }
                .build()
            keyGenerator.init(spec)
            keyGenerator.generateKey()
            promise.resolve(keyAlias)
        } catch (e: Exception) {
            promise.reject("KEY_GEN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deleteKey(alias: String, promise: Promise) {
        try {
            val ks = KeyStore.getInstance(KEYSTORE).apply { load(null) }
            val keyAlias = if (alias.isNotEmpty()) alias else KEY_ALIAS
            if (ks.containsAlias(keyAlias)) ks.deleteEntry(keyAlias)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEY_DELETE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun hasKey(alias: String, promise: Promise) {
        try {
            val ks = KeyStore.getInstance(KEYSTORE).apply { load(null) }
            val keyAlias = if (alias.isNotEmpty()) alias else KEY_ALIAS
            promise.resolve(ks.containsAlias(keyAlias))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun authenticateBiometric(title: String, subtitle: String, promise: Promise) {
        // Biometric auth via UI requires FragmentActivity — handled from JS side via NativeModules
        // Here we just verify biometric availability
        try {
            val bm = BiometricManager.from(reactApplicationContext)
            val canAuth = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            if (canAuth == BiometricManager.BIOMETRIC_SUCCESS) {
                promise.resolve(true)
            } else {
                promise.reject("BIOMETRIC_UNAVAILABLE", "Biometric not available")
            }
        } catch (e: Exception) {
            promise.reject("AUTH_ERROR", e.message, e)
        }
    }
}
