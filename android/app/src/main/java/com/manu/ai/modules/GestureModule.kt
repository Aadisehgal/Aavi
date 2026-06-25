// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 15/20 — Advanced Interface Features 51-75
// File: android/app/src/main/java/com/manu/ai/modules/GestureModule.kt
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
import android.view.SurfaceHolder
import android.view.SurfaceView
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.ByteBuffer
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

class GestureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "GestureModule"
        const val GESTURE_EVENT = "onGestureDetected"
    }

    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private val cameraOpenCloseLock = Semaphore(1)
    private var isProcessing = false

    override fun getName(): String = "GestureModule"

    @ReactMethod
    fun startGestureDetection(promise: Promise) {
        if (isProcessing) {
            promise.resolve("Already running")
            return
        }
        startBackgroundThread()
        openCamera(promise)
    }

    @ReactMethod
    fun stopGestureDetection(promise: Promise) {
        closeCamera()
        stopBackgroundThread()
        isProcessing = false
        promise.resolve("Stopped")
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("GestureCameraBackground").also { it.start() }
        backgroundHandler = Handler(backgroundThread!!.looper)
    }

    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join(500)
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Background thread interrupted", e)
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
                ?: Size(640, 480)

            imageReader = ImageReader.newInstance(previewSize.width, previewSize.height, ImageFormat.YUV_420_888, 2)
                .apply { setOnImageAvailableListener({ reader ->
                    val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                    processImage(image)
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
                    isProcessing = true
                    promise.resolve("Gesture detection started")
                }

                override fun onConfigureFailed(session: CameraCaptureSession) {
                    promise.reject("SESSION_FAILED", "Camera session configuration failed")
                }
            }, backgroundHandler)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message)
        }
    }

    private fun processImage(image: android.media.Image) {
        val planes = image.planes
        if (planes.isEmpty()) return
        val buffer: ByteBuffer = planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)

        val width = image.width
        val height = image.height
        val gesture = analyzeFrame(bytes, width, height)

        if (gesture.isNotEmpty()) {
            sendEvent(GESTURE_EVENT, gesture)
        }
    }

    private fun analyzeFrame(bytes: ByteArray, width: Int, height: Int): String {
        var leftSum = 0L
        var rightSum = 0L
        var topSum = 0L
        var bottomSum = 0L
        var count = 0

        val step = 4
        for (y in 0 until height step step) {
            for (x in 0 until width step step) {
                val idx = y * width + x
                if (idx < bytes.size) {
                    val brightness = bytes[idx].toInt() and 0xFF
                    if (brightness < 80) {
                        if (x < width / 2) leftSum++ else rightSum++
                        if (y < height / 2) topSum++ else bottomSum++
                        count++
                    }
                }
            }
        }

        if (count < 100) return ""

        return when {
            leftSum > rightSum * 2 -> "SWIPE_LEFT"
            rightSum > leftSum * 2 -> "SWIPE_RIGHT"
            topSum > bottomSum * 2 -> "SWIPE_UP"
            bottomSum > topSum * 2 -> "SWIPE_DOWN"
            count > 5000 -> "OPEN_PALM"
            else -> ""
        }
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

    private fun sendEvent(eventName: String, gesture: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, gesture)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
