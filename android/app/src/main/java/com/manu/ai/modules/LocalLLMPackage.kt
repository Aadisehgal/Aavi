// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 12/20 — Local LLM Core
// File: android/app/src/main/java/com/manu/ai/modules/LocalLLMPackage.kt
// Generated: 2026-06-24

package com.manu.ai.modules

import android.app.ActivityManager
import android.content.Context
import android.os.Environment
import android.os.StatFs
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class LocalLLMModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "LocalLLM"
        const val SERVER_PORT = 8080
        const val MODELS_DIR = "/data/data/com.manu.ai/files/models"
    }

    private var serverProcess: Process? = null
    private var serverThread: Thread? = null
    private val executor = Executors.newSingleThreadExecutor()
    private var isServerRunning = false


    override fun getName(): String = "LocalLLM"

    @ReactMethod
    fun getTotalMemory(promise: Promise) {
        try {
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memoryInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memoryInfo)
            promise.resolve(memoryInfo.totalMem.toDouble())
        } catch (e: Exception) {
            Log.e(TAG, "getTotalMemory error: ${e.message}")
            promise.reject("MEMORY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAvailableStorage(promise: Promise) {
        try {
            val stat = StatFs(Environment.getDataDirectory().path)
            val blockSize = stat.blockSizeLong
            val availableBlocks = stat.availableBlocksLong
            promise.resolve((availableBlocks * blockSize).toDouble())
        } catch (e: Exception) {
            Log.e(TAG, "getAvailableStorage error: ${e.message}")
            promise.reject("STORAGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isFileExists(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            promise.resolve(file.exists() && file.isFile && file.length() > 0)
        } catch (e: Exception) {
            Log.e(TAG, "isFileExists error: ${e.message}")
            promise.reject("FILE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun downloadModel(url: String, destinationPath: String, promise: Promise) {
        executor.execute {
            try {
                val destFile = File(destinationPath)
                destFile.parentFile?.mkdirs()

                if (destFile.exists() && destFile.length() > 0) {
                    promise.resolve(true)
                    return@execute
                }

                val connection = URL(url).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 30000
                connection.readTimeout = 30000
                connection.setRequestProperty("User-Agent", "MANU-AI/2.0")
                connection.connect()

                val totalSize = connection.contentLength
                val input = BufferedInputStream(connection.inputStream)
                val output = FileOutputStream(destFile)
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var downloaded = 0L

                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    downloaded += bytesRead
                    if (totalSize > 0) {
                        val progress = ((downloaded * 100) / totalSize).toInt()
                        emitEvent("modelDownloadProgress", progress)
                    }
                }

                output.flush()
                output.close()
                input.close()
                connection.disconnect()

                emitEvent("modelDownloadProgress", 100)
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "downloadModel error: ${e.message}")
                promise.reject("DOWNLOAD_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun startServer(modelPath: String, port: Int, contextSize: Int, promise: Promise) {
        if (isServerRunning) {
            promise.resolve(true)
            return
        }

        executor.execute {
            try {
                val modelFile = File(modelPath)
                if (!modelFile.exists()) {
                    promise.reject("MODEL_NOT_FOUND", "Model file not found: $modelPath")
                    return@execute
                }

                val binaryDir = File(reactApplicationContext.filesDir, "llama-bin")
                val serverBinary = File(binaryDir, "llama-server")

                if (!serverBinary.exists()) {
                    promise.reject("BINARY_NOT_FOUND", "llama-server binary not found. Build llama.cpp in Termux first.")
                    return@execute
                }

                serverBinary.setExecutable(true, false)

                val pb = ProcessBuilder(
                    serverBinary.absolutePath,
                    "-m", modelPath,
                    "--port", port.toString(),
                    "-c", contextSize.toString(),
                    "-t", Runtime.getRuntime().availableProcessors().toString(),
                    "--host", "127.0.0.1"
                )
                pb.directory(binaryDir)
                pb.redirectErrorStream(true)
                pb.environment()["LD_LIBRARY_PATH"] = binaryDir.absolutePath

                serverProcess = pb.start()
                isServerRunning = true

                serverThread = Thread {
                    try {
                        val reader = BufferedReader(InputStreamReader(serverProcess!!.inputStream))
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            Log.d(TAG, "llama-server: $line")
                            if (line?.contains("HTTP server listening") == true) {
                                emitEvent("serverStatus", "ready")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Server output reader error: ${e.message}")
                    } finally {
                        isServerRunning = false
                        emitEvent("serverStatus", "stopped")
                    }
                }
                serverThread?.start()

                Thread.sleep(3000)

                if (serverProcess?.isAlive == true) {
                    promise.resolve(true)
                } else {
                    isServerRunning = false
                    promise.reject("SERVER_START_FAILED", "llama-server process died immediately")
                }
            } catch (e: Exception) {
                Log.e(TAG, "startServer error: ${e.message}")
                isServerRunning = false
                promise.reject("SERVER_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopServer(promise: Promise) {
        try {
            isServerRunning = false
            serverProcess?.let { process ->
                if (process.isAlive) {
                    process.destroy()
                    try {
                        if (!process.waitFor(3, java.util.concurrent.TimeUnit.SECONDS)) {
                            process.destroyForcibly()
                        }
                    } catch (e: Exception) {
                        process.destroyForcibly()
                    }
                }
            }
            serverProcess = null
            serverThread = null
            emitEvent("serverStatus", "stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "stopServer error: ${e.message}")
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isServerAlive(promise: Promise) {
        promise.resolve(isServerRunning && serverProcess?.isAlive == true)
    }

    @ReactMethod
    fun getServerLogs(promise: Promise) {
        promise.resolve("")
    }

    private fun emitEvent(eventName: String, data: Any) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, data)
        } catch (e: Exception) {
            Log.e(TAG, "emitEvent error: ${e.message}")
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            isServerRunning = false
            serverProcess?.destroyForcibly()
            serverProcess = null
            executor.shutdownNow()
        } catch (e: Exception) {
            Log.e(TAG, "onCatalystInstanceDestroy error: ${e.message}")
        }
    }
}

class LocalLLMPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(LocalLLMModule(reactContext))
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
