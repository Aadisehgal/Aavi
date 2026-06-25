// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/EyeScroll.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.Surface
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.ByteBuffer
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

class EyeScrollModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "EyeScroll"
        const val EVENT_SCROLL = "onEyeScroll"
        const val SAMPLE_RATE = 16000
    }

    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private val cameraOpenCloseLock = Semaphore(1)
    private var isTracking = false
    private var lastEyeY = 0.0
    private var scrollThreshold = 15

    override fun getName(): String = "EyeScroll"

    @ReactMethod
    fun startEyeTracking(promise: Promise) {
        if (isTracking) {
            promise.resolve("Already tracking")
            return
        }
        startBackgroundThread()
        openCamera(promise)
    }

    @ReactMethod
    fun stopEyeTracking(promise: Promise) {
        closeCamera()
        stopBackgroundThread()
        isTracking = false
        promise.resolve("Tracking stopped")
    }

    @ReactMethod
    fun setScrollThreshold(threshold: Int, promise: Promise) {
        scrollThreshold = threshold
        promise.resolve("Threshold set to $threshold")
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("EyeScrollCamera").also { it.start() }
        backgroundHandler = Handler(backgroundThread!!.looper)
    }

    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join(500)
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Thread interrupted", e)
        }
    }

    private fun openCamera(promise: Promise) {
        val context = reactApplicationContext
        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            val cameraId = cameraManager.cameraIdList.find { id ->
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                facing == CameraCharacteristics.LENS_FACING_FRONT
            } ?: cameraManager.cameraIdList[0]

            val characteristics = cameraManager.getCameraCharacteristics(cameraId)
            val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val previewSize = map?.getOutputSizes(ImageFormat.YUV_420_888)?.maxByOrNull { it.width * it.height }
                ?: Size(320, 240)

            imageReader = ImageReader.newInstance(previewSize.width, previewSize.height, ImageFormat.YUV_420_888, 2)
                .apply { setOnImageAvailableListener({ reader ->
                    val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                    processEyeFrame(image)
                    image.close()
                }, backgroundHandler) }

            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "Camera permission not granted")
                return
            }

            cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraOpenCloseLock.release()
                    cameraDevice = camera
                    createCaptureSession(promise)
                }
                override fun onDisconnected(camera: CameraDevice) {
                    cameraOpenCloseLock.release()
                    camera.close()
                    cameraDevice = null
                }
                override fun onError(camera: CameraDevice, error: Int) {
                    cameraOpenCloseLock.release()
                    camera.close()
                    cameraDevice = null
                    promise.reject("CAMERA_ERROR", "Camera error: $error")
                }
            }, backgroundHandler)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open camera", e)
            promise.reject("CAMERA_OPEN_FAILED", e.message)
        }
    }

    private fun createCaptureSession(promise: Promise) {
        val device = cameraDevice ?: return
        val reader = imageReader ?: return
        try {
            val surfaces = listOf<Surface>(reader.surface)
            device.createCaptureSession(surfaces, object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(session: CameraCaptureSession) {
                    captureSession = session
                    val request = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                        addTarget(reader.surface)
                    }.build()
                    session.setRepeatingRequest(request, null, backgroundHandler)
                    isTracking = true
                    promise.resolve("Eye tracking started")
                }
                override fun onConfigureFailed(session: CameraCaptureSession) {
                    promise.reject("SESSION_FAILED", "Camera session failed")
                }
            }, backgroundHandler)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message)
        }
    }

    private fun processEyeFrame(image: android.media.Image) {
        val planes = image.planes
        if (planes.isEmpty()) return
        val buffer: ByteBuffer = planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)

        val width = image.width
        val height = image.height
        val eyeRegion = detectEyeRegion(bytes, width, height)

        if (eyeRegion > 0) {
            val delta = eyeRegion - lastEyeY
            lastEyeY = eyeRegion

            if (kotlin.math.abs(delta) > scrollThreshold) {
                val direction = if (delta > 0) "DOWN" else "UP"
                val amount = kotlin.math.abs(delta).toInt()
                sendScrollEvent(direction, amount)
            }
        }
    }

    private fun detectEyeRegion(bytes: ByteArray, width: Int, height: Int): Double {
        val faceTop = height / 6
        val faceBottom = height * 5 / 6
        val faceLeft = width / 6
        val faceRight = width * 5 / 6

        var darkSumX = 0.0
        var darkSumY = 0.0
        var darkCount = 0

        for (y in faceTop until faceBottom step 2) {
            for (x in faceLeft until faceRight step 2) {
                val idx = y * width + x
                if (idx < bytes.size) {
                    val brightness = bytes[idx].toInt() and 0xFF
                    if (brightness < 60) {
                        darkSumX += x
                        darkSumY += y
                        darkCount++
                    }
                }
            }
        }

        return if (darkCount > 50) darkSumY / darkCount else 0.0
    }

    private fun sendScrollEvent(direction: String, amount: Int) {
        val params = Arguments.createMap().apply {
            putString("direction", direction)
            putInt("amount", amount)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_SCROLL, params)
    }

    private fun closeCamera() {
        try {
            cameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)
            captureSession?.close()
            captureSession = null
            cameraDevice?.close()
            cameraDevice = null
            imageReader?.close()
            imageReader = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Interrupted while closing camera", e)
        } finally {
            cameraOpenCloseLock.release()
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
