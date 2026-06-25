package com.manu.ai

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.provider.Settings
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.os.Build
import android.location.LocationManager
import android.location.Location
import android.location.LocationListener
import android.os.Bundle
import android.os.Looper
import android.content.ClipboardManager
import android.content.ClipData
import android.net.wifi.WifiManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.graphics.Bitmap
import android.graphics.Color
import android.provider.MediaStore
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import android.os.Environment
import java.io.File
import java.io.FileOutputStream
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class AppIntentsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppIntents"

    // ======== EXISTING METHODS ========
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val apps = JSONArray()
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            for (appInfo in packages) {
                if (pm.getLaunchIntentForPackage(appInfo.packageName) != null) {
                    val app = JSONObject()
                    app.put("packageName", appInfo.packageName)
                    app.put("appName", pm.getApplicationLabel(appInfo).toString())
                    app.put("isSystemApp", (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0)
                    apps.put(app)
                }
            }
            promise.resolve(apps.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.reject("NOT_FOUND", "App not found: $packageName")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openWhatsAppChat(phoneNumber: String, message: String?, promise: Promise) {
        try {
            val uri = if (message != null && message.isNotEmpty()) {
                Uri.parse("https://api.whatsapp.com/send?phone=$phoneNumber&text=${Uri.encode(message)}")
            } else {
                Uri.parse("https://api.whatsapp.com/send?phone=$phoneNumber")
            }
            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openWhatsAppCall(phoneNumber: String, isVideo: Boolean, promise: Promise) {
        try {
            val intent = Intent()
            intent.action = Intent.ACTION_VIEW
            val uri = Uri.parse("https://wa.me/$phoneNumber?call")
            intent.data = uri
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openWhatsAppStatus(promise: Promise) {
        try {
            val intent = Intent()
            intent.action = "android.intent.action.VIEW"
            intent.setPackage("com.whatsapp")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openTikTok(promise: Promise) {
        try {
            val intent = Intent()
            intent.setPackage("com.zhiliaoapp.musically")
            intent.action = Intent.ACTION_MAIN
            intent.addCategory(Intent.CATEGORY_LAUNCHER)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openYouTubeSearch(query: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_SEARCH)
            intent.setPackage("com.google.android.youtube")
            intent.putExtra("query", query)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openYouTubeVideo(videoId: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$videoId"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun makePhoneCall(phoneNumber: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_DIAL)
            intent.data = Uri.parse("tel:$phoneNumber")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun sendSMS(phoneNumber: String, message: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_SENDTO)
            intent.data = Uri.parse("smsto:$phoneNumber")
            intent.putExtra("sms_body", message)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun toggleFlashlight(enable: Boolean, promise: Promise) {
        try {
            val cameraManager = reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = cameraManager.cameraIdList[0]
            cameraManager.setTorchMode(cameraId, enable)
            promise.resolve(true)
        } catch (e: CameraAccessException) {
            promise.reject("ERROR", e.message)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setVolume(level: Int, promise: Promise) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val targetVolume = (level * maxVolume / 100).coerceIn(0, maxVolume)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, AudioManager.FLAG_SHOW_UI)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getContacts(promise: Promise) {
        try {
            val contacts = JSONArray()
            val cursor = reactApplicationContext.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                null, null, null, null
            )
            cursor?.use {
                while (it.moveToNext()) {
                    val contact = JSONObject()
                    val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                    if (nameIndex >= 0 && numberIndex >= 0) {
                        contact.put("name", it.getString(nameIndex))
                        contact.put("phoneNumber", it.getString(numberIndex).replace("\\s".toRegex(), ""))
                        contacts.put(contact)
                    }
                }
            }
            promise.resolve(contacts.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openAppSettings(packageName: String, promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = Uri.parse("package:$packageName")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ======== NEW ADVANCED METHODS ========

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        try {
            val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val location: Location? = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

            val result = JSONObject()
            if (location != null) {
                result.put("latitude", location.latitude)
                result.put("longitude", location.longitude)
                result.put("accuracy", location.accuracy)
                result.put("timestamp", location.time)
            } else {
                result.put("latitude", 0.0)
                result.put("longitude", 0.0)
                result.put("accuracy", 0.0)
                result.put("timestamp", 0)
            }
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getClipboardText(promise: Promise) {
        try {
            val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboard.primaryClip
            val text = if (clip != null && clip.itemCount > 0) {
                clip.getItemAt(0).text?.toString() ?: ""
            } else {
                ""
            }
            promise.resolve(text)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setClipboardText(text: String, promise: Promise) {
        try {
            val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("MANU AI", text))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun generateQRCode(text: String, size: Int, promise: Promise) {
        try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, size, size)
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
            for (x in 0 until size) {
                for (y in 0 until size) {
                    bmp.setPixel(x, y, if (bitMatrix.get(x, y)) Color.BLACK else Color.WHITE)
                }
            }
            val file = File(reactApplicationContext.cacheDir, "qrcode_${System.currentTimeMillis()}.png")
            FileOutputStream(file).use { out ->
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            promise.resolve(file.absolutePath)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun scanQRCode(promise: Promise) {
        try {
            val intent = Intent("com.google.zxing.client.android.SCAN")
            intent.putExtra("SCAN_MODE", "QR_CODE_MODE")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve("Scanning started")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun scanWiFiNetworks(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val results = wifiManager.scanResults
            val networks = JSONArray()
            for (result in results) {
                val network = JSONObject()
                network.put("ssid", result.SSID)
                network.put("bssid", result.BSSID)
                network.put("frequency", result.frequency)
                network.put("level", result.level)
                network.put("capabilities", result.capabilities)
                networks.put(network)
            }
            promise.resolve(networks.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getWiFiInfo(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val info = wifiManager.connectionInfo
            val result = JSONObject()
            result.put("ssid", info.ssid)
            result.put("bssid", info.bssid)
            result.put("ipAddress", info.ipAddress)
            result.put("linkSpeed", info.linkSpeed)
            result.put("rssi", info.rssi)
            result.put("networkId", info.networkId)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun scanBluetoothDevices(promise: Promise) {
        try {
            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            val devices = JSONArray()
            if (bluetoothAdapter != null && bluetoothAdapter.isEnabled) {
                val pairedDevices = bluetoothAdapter.bondedDevices
                for (device in pairedDevices) {
                    val dev = JSONObject()
                    dev.put("name", device.name ?: "Unknown")
                    dev.put("address", device.address)
                    dev.put("type", device.type.toString())
                    devices.put(dev)
                }
            }
            promise.resolve(devices.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getSensorData(promise: Promise) {
        try {
            val sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val result = JSONObject()

            // Accelerometer
            val accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if (accel != null) {
                val accelData = JSONObject()
                accelData.put("x", 0.0)
                accelData.put("y", 0.0)
                accelData.put("z", 0.0)
                result.put("accelerometer", accelData)
            }

            // Gyroscope
            val gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
            if (gyro != null) {
                val gyroData = JSONObject()
                gyroData.put("x", 0.0)
                gyroData.put("y", 0.0)
                gyroData.put("z", 0.0)
                result.put("gyroscope", gyroData)
            }

            // Magnetometer
            val mag = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
            if (mag != null) {
                val magData = JSONObject()
                magData.put("x", 0.0)
                magData.put("y", 0.0)
                magData.put("z", 0.0)
                result.put("magnetometer", magData)
            }

            // Proximity
            val prox = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
            if (prox != null) {
                result.put("proximity", 0.0)
            }

            // Light
            val light = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
            if (light != null) {
                result.put("light", 0.0)
            }

            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun captureAndRecognizeText(promise: Promise) {
        try {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve("Camera opened for OCR")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startAROverlay(promise: Promise) {
        try {
            val intent = Intent()
            intent.action = Intent.ACTION_MAIN
            intent.addCategory(Intent.CATEGORY_HOME)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopAROverlay(promise: Promise) {
        promise.resolve(true)
    }
}
