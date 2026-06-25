package com.manu.ai

import com.facebook.react.bridge.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.util.concurrent.Executors

class TerminalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TerminalModule"

    private val executor = Executors.newSingleThreadExecutor()
    private var process: Process? = null
    private var outputReader: BufferedReader? = null
    private var inputWriter: OutputStreamWriter? = null
    private var isRunning = false

    @ReactMethod
    fun startShell(promise: Promise) {
        try {
            if (isRunning) {
                promise.resolve("Shell already running")
                return
            }
            val pb = ProcessBuilder("/system/bin/sh")
            pb.redirectErrorStream(true)
            process = pb.start()
            outputReader = BufferedReader(InputStreamReader(process!!.inputStream))
            inputWriter = OutputStreamWriter(process!!.outputStream)
            isRunning = true

            executor.execute {
                try {
                    var line: String?
                    while (outputReader!!.readLine().also { line = it } != null) {
                        sendEvent("TerminalOutput", line!!)
                    }
                } catch (e: Exception) {
                    sendEvent("TerminalError", "Shell output error: ${e.message}")
                }
            }
            promise.resolve("Shell started")
        } catch (e: Exception) {
            promise.reject("SHELL_START_ERROR", "Failed to start shell: ${e.message}")
        }
    }

    @ReactMethod
    fun executeCommand(command: String, promise: Promise) {
        try {
            if (!isRunning || inputWriter == null) {
                promise.reject("SHELL_NOT_RUNNING", "Shell is not running. Call startShell first.")
                return
            }
            inputWriter!!.write("$command
")
            inputWriter!!.flush()
            promise.resolve("Command sent: $command")
        } catch (e: Exception) {
            promise.reject("COMMAND_ERROR", "Failed to execute command: ${e.message}")
        }
    }

    @ReactMethod
    fun executeSandboxCommand(command: String, promise: Promise) {
        try {
            val parts = command.trim().split(" ")
            val cmd = parts[0]
            val args = parts.drop(1).toTypedArray()

            val result = when (cmd) {
                "echo" -> args.joinToString(" ")
                "pwd" -> "/data/data/com.manu.ai/files"
                "ls" -> "sandbox: echo, pwd, ls, whoami, help"
                "whoami" -> "manu-user"
                "help" -> """Available sandbox commands:
                    |echo <text> - Print text
                    |pwd - Print working directory
                    |ls - List available commands
                    |whoami - Current user
                    |help - Show this help
                    |
                    |For real shell: Install Termux and enable external apps.
                    |Then use: termux-exec <command>""".trimMargin()
                else -> "Unknown sandbox command: $cmd. Type 'help' for available commands."
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SANDBOX_ERROR", "Sandbox error: ${e.message}")
        }
    }

    @ReactMethod
    fun executeTermuxCommand(command: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = android.content.Intent()
            intent.setClassName("com.termux", "com.termux.app.RunCommandService")
            intent.action = "com.termux.RUN_COMMAND"
            intent.putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
            intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", arrayOf("-c", command))
            intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
            intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true)
            context.startService(intent)
            promise.resolve("Termux command dispatched: $command")
        } catch (e: Exception) {
            promise.reject("TERMUX_ERROR", """Termux command failed: ${e.message}
                |Ensure Termux is installed from F-Droid (NOT Play Store).
                |Run: pkg install termux-api
                |Then: echo "allow-external-apps=true" >> ~/.termux/termux.properties
                |Finally: termux-reload-settings""".trimMargin())
        }
    }

    @ReactMethod
    fun stopShell(promise: Promise) {
        try {
            isRunning = false
            inputWriter?.close()
            outputReader?.close()
            process?.destroy()
            inputWriter = null
            outputReader = null
            process = null
            promise.resolve("Shell stopped")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop shell: ${e.message}")
        }
    }

    private fun sendEvent(eventName: String, message: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, message)
    }
}
