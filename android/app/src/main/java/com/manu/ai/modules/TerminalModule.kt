package com.manu.ai.modules

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.math.BigInteger
import java.security.MessageDigest

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 8/20 — Terminal & Shell Integration
// File: android/app/src/main/java/com/manu/ai/modules/TerminalModule.kt
// Generated: 2026-06-24
//
// Termux:API bridge for shell access.
// Supports both sandbox (built-in) and real shell (Termux) modes.
//
// NOTE: Register TerminalResultReceiver in AndroidManifest.xml:
// <receiver android:name=".modules.TerminalResultReceiver" android:exported="false" />

class TerminalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val sandboxDir = reactContext.getDir("terminal_sandbox", Context.MODE_PRIVATE)
    private var currentSandboxDir = sandboxDir.absolutePath

    companion object {
        const val TERMUX_PACKAGE = "com.termux"
        const val TERMUX_API_PACKAGE = "com.termux.api"
        const val RUN_COMMAND_SERVICE = "com.termux.RUN_COMMAND_SERVICE"
        const val RUN_COMMAND_PATH = "com.termux.RUN_COMMAND_PATH"
        const val RUN_COMMAND_ARGUMENTS = "com.termux.RUN_COMMAND_ARGUMENTS"
        const val RUN_COMMAND_WORKDIR = "com.termux.RUN_COMMAND_WORKDIR"
        const val RUN_COMMAND_BACKGROUND = "com.termux.RUN_COMMAND_BACKGROUND"

        private var instance: TerminalModule? = null
        private val pendingChecks = mutableMapOf<String, Promise>()

        init {
            TerminalResultReceiver.callback = { stdout, stderr, exitCode, requestId ->
                instance?.let { module ->
                    // Resolve pending promise checks (e.g., checkToolInstalled)
                    pendingChecks[requestId]?.let { promise ->
                        promise.resolve(exitCode == 0)
                        pendingChecks.remove(requestId)
                    }

                    // Emit event to JS for all terminal output
                    val params = Arguments.createMap().apply {
                        putString("sessionId", requestId)
                        putString("stdout", stdout)
                        putString("stderr", stderr)
                        putInt("exitCode", exitCode)
                    }
                    module.reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onTerminalOutput", params)
                }
            }
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "TerminalModule"

    // Required for NativeEventEmitter compatibility
    @ReactMethod
    fun addListener(eventName: String) {
        // Called when NativeEventEmitter adds a listener
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Called when NativeEventEmitter removes listeners
    }

    // ==================== SANDBOX COMMANDS ====================

    @ReactMethod
    fun executeSandboxCommand(command: String, args: ReadableArray, promise: Promise) {
        try {
            val argsList = args.toArrayList().map { it.toString() }
            val result = when (command) {
                "echo" -> executeEcho(argsList)
                "pwd" -> executePwd()
                "ls" -> executeLs(argsList)
                "whoami" -> executeWhoami()
                "help" -> executeHelp()
                "cd" -> executeCd(argsList)
                "mkdir" -> executeMkdir(argsList)
                "cat" -> executeCat(argsList)
                "grep" -> executeGrep(argsList)
                "base64" -> executeBase64(argsList)
                "md5sum" -> executeMd5sum(argsList)
                else -> "Error: Unknown sandbox command: $command\nType 'help' for available commands."
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SANDBOX_ERROR", e.message, e)
        }
    }

    private fun executeEcho(args: List<String>): String = args.joinToString(" ")

    private fun executePwd(): String = currentSandboxDir

    private fun executeLs(args: List<String>): String {
        val targetPath = if (args.isNotEmpty()) resolvePath(args[0]) else currentSandboxDir
        val dir = File(targetPath)
        if (!dir.exists()) return "ls: cannot access '${args.getOrElse(0) { "." }}': No such file or directory"
        if (!dir.isDirectory) return "ls: cannot access '${args.getOrElse(0) { "." }}': Not a directory"

        val files = dir.listFiles()?.sortedBy { it.name } ?: return ""
        if (files.isEmpty()) return ""

        return files.joinToString("\n") { file ->
            val type = if (file.isDirectory) "d" else "-"
            val size = if (file.isFile) file.length().toString() else "-"
            "$type ${String.format("%10s", size)} ${file.name}"
        }
    }

    private fun executeWhoami(): String = "manu"

    private fun executeHelp(): String = """
        MANU AI Sandbox Terminal v2.0
        Available commands:
          echo [text...]       Print arguments to standard output
          pwd                  Print name of current/working directory
          ls [path]            List directory contents
          whoami               Print effective userid
          cd [path]            Change working directory
          mkdir [path]         Create directory
          cat [file]           Concatenate and print files
          grep [pattern] [file]  Search for pattern in file
          base64 [text|file]   Base64 encode/decode
          md5sum [text|file]   Compute MD5 message digest
          help                 Display this help text
    """.trimIndent()

    private fun executeCd(args: List<String>): String {
        if (args.isEmpty()) {
            currentSandboxDir = sandboxDir.absolutePath
            return ""
        }
        val newPath = resolvePath(args[0])
        val dir = File(newPath)
        if (!dir.exists()) return "cd: ${args[0]}: No such file or directory"
        if (!dir.isDirectory) return "cd: ${args[0]}: Not a directory"
        // Security: prevent escaping sandbox directory
        if (!dir.absolutePath.startsWith(sandboxDir.absolutePath)) {
            return "cd: permission denied: cannot escape sandbox"
        }
        currentSandboxDir = dir.absolutePath
        return ""
    }

    private fun executeMkdir(args: List<String>): String {
        if (args.isEmpty()) return "mkdir: missing operand"
        val dir = File(resolvePath(args[0]))
        return if (dir.mkdirs()) "" else "mkdir: cannot create directory '${args[0]}': File exists or permission denied"
    }

    private fun executeCat(args: List<String>): String {
        if (args.isEmpty()) return "cat: missing file operand"
        val file = File(resolvePath(args[0]))
        if (!file.exists()) return "cat: ${args[0]}: No such file or directory"
        if (file.isDirectory) return "cat: ${args[0]}: Is a directory"
        return file.readText()
    }

    private fun executeGrep(args: List<String>): String {
        if (args.size < 2) return "grep: usage: grep [pattern] [file]"
        val pattern = args[0]
        val file = File(resolvePath(args[1]))
        if (!file.exists()) return "grep: ${args[1]}: No such file or directory"
        val lines = file.readLines()
        val matches = lines.filter { it.contains(pattern) }
        return matches.joinToString("\n")
    }

    private fun executeBase64(args: List<String>): String {
        if (args.isEmpty()) return "base64: missing operand"
        val input = args[0]
        val file = File(resolvePath(input))
        return if (file.exists() && file.isFile) {
            Base64.encodeToString(file.readBytes(), Base64.DEFAULT).trim()
        } else {
            Base64.encodeToString(input.toByteArray(), Base64.DEFAULT).trim()
        }
    }

    private fun executeMd5sum(args: List<String>): String {
        if (args.isEmpty()) return "md5sum: missing file operand"
        val input = args[0]
        val file = File(resolvePath(input))
        val bytes = if (file.exists() && file.isFile) file.readBytes() else input.toByteArray()
        val md = MessageDigest.getInstance("MD5")
        val digest = md.digest(bytes)
        val hash = BigInteger(1, digest).toString(16).padStart(32, '0')
        return if (file.exists()) "$hash  ${file.name}" else hash
    }

    private fun resolvePath(path: String): String {
        return if (path.startsWith("/")) path else File(currentSandboxDir, path).absolutePath
    }

    // ==================== TERMUX REAL SHELL ====================

    @ReactMethod
    fun executeRealCommand(command: String, args: ReadableArray, background: Boolean, sessionId: String, promise: Promise) {
        try {
            if (!isTermuxInstalled()) {
                promise.reject("TERMUX_NOT_INSTALLED", "Termux is not installed. Please install Termux and Termux:API from F-Droid.")
                return
            }

            val argsList = args.toArrayList().map { it.toString() }
            val fullCommand = if (argsList.isEmpty()) command else "$command ${argsList.joinToString(" ")}"

            sendTermuxCommand(fullCommand, background, sessionId)
            promise.resolve("Command started: $fullCommand")
        } catch (e: Exception) {
            promise.reject("EXECUTION_ERROR", e.message, e)
        }
    }

    private fun sendTermuxCommand(fullCommand: String, background: Boolean, sessionId: String) {
        val context = reactApplicationContext

        val intent = Intent().apply {
            setClassName(TERMUX_PACKAGE, "com.termux.app.RunCommandService")
            action = RUN_COMMAND_SERVICE
            putExtra(RUN_COMMAND_PATH, "/data/data/com.termux/files/usr/bin/bash")
            putExtra(RUN_COMMAND_ARGUMENTS, arrayOf("-c", fullCommand))
            putExtra(RUN_COMMAND_WORKDIR, "/data/data/com.termux/files/home")
            putExtra(RUN_COMMAND_BACKGROUND, background)
        }

        val resultIntent = Intent(context, TerminalResultReceiver::class.java).apply {
            putExtra("sessionId", sessionId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            System.currentTimeMillis().toInt(),
            resultIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )
        intent.putExtra("pendingIntent", pendingIntent)

        context.startService(intent)
    }

    @ReactMethod
    fun isTermuxAvailable(promise: Promise) {
        promise.resolve(isTermuxInstalled())
    }

    private fun isTermuxInstalled(): Boolean {
        return try {
            reactApplicationContext.packageManager.getPackageInfo(TERMUX_PACKAGE, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    @ReactMethod
    fun installTool(toolName: String, promise: Promise) {
        try {
            if (!isTermuxInstalled()) {
                promise.reject("TERMUX_NOT_INSTALLED", "Termux is not installed")
                return
            }

            val command = when (toolName) {
                "nmap" -> "pkg install nmap -y"
                "masscan" -> "pkg install masscan -y"
                "hydra" -> "pkg install hydra -y"
                "sqlmap" -> "pip install sqlmap"
                "nikto" -> "pkg install nikto -y"
                "gobuster" -> "pkg install gobuster -y"
                "dirb" -> "pkg install dirb -y"
                "theHarvester" -> "pip install theHarvester"
                "sherlock" -> "pip install sherlock-project"
                "aircrack-ng" -> "pkg install aircrack-ng -y"
                "wifite" -> "pkg install wifite -y"
                "steghide" -> "pkg install steghide -y"
                "zsteg" -> "gem install zsteg"
                "exiftool" -> "pkg install exiftool -y"
                "binwalk" -> "pip install binwalk"
                "foremost" -> "pkg install foremost -y"
                "john" -> "pkg install john -y"
                "hashcat" -> "pkg install hashcat -y"
                "openssl" -> "pkg install openssl -y"
                "proot-distro" -> "pkg install proot-distro -y"
                else -> "pkg install $toolName -y"
            }

            val requestId = "install_${System.currentTimeMillis()}"
            sendTermuxCommand(command, true, requestId)
            promise.resolve("Installation started for $toolName")
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setupProotDistro(distro: String, promise: Promise) {
        try {
            if (!isTermuxInstalled()) {
                promise.reject("TERMUX_NOT_INSTALLED", "Termux is not installed")
                return
            }

            val validDistros = listOf("ubuntu", "debian", "kali", "arch", "fedora", "opensuse", "void")
            if (!validDistros.contains(distro.lowercase())) {
                promise.reject("INVALID_DISTRO", "Supported distros: ${validDistros.joinToString(", ")}")
                return
            }

            val requestId = "proot_${System.currentTimeMillis()}"
            sendTermuxCommand("proot-distro install ${distro.lowercase()}", true, requestId)
            promise.resolve("Proot-distro installation started for $distro")
        } catch (e: Exception) {
            promise.reject("PROOT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkToolInstalled(toolName: String, promise: Promise) {
        try {
            if (!isTermuxInstalled()) {
                promise.resolve(false)
                return
            }

            val requestId = "check_${System.currentTimeMillis()}"
            pendingChecks[requestId] = promise

            val context = reactApplicationContext
            val intent = Intent().apply {
                setClassName(TERMUX_PACKAGE, "com.termux.app.RunCommandService")
                action = RUN_COMMAND_SERVICE
                putExtra(RUN_COMMAND_PATH, "/data/data/com.termux/files/usr/bin/bash")
                putExtra(RUN_COMMAND_ARGUMENTS, arrayOf("-c", "command -v $toolName >/dev/null 2>&1"))
                putExtra(RUN_COMMAND_WORKDIR, "/data/data/com.termux/files/home")
                putExtra(RUN_COMMAND_BACKGROUND, false)
            }

            val resultIntent = Intent(context, TerminalResultReceiver::class.java).apply {
                putExtra("sessionId", requestId)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                System.currentTimeMillis().toInt(),
                resultIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
            )
            intent.putExtra("pendingIntent", pendingIntent)
            context.startService(intent)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSandboxPath(promise: Promise) {
        promise.resolve(sandboxDir.absolutePath)
    }

    @ReactMethod
    fun clearSandbox(promise: Promise) {
        try {
            sandboxDir.listFiles()?.forEach { it.deleteRecursively() }
            currentSandboxDir = sandboxDir.absolutePath
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun writeSandboxFile(fileName: String, content: String, promise: Promise) {
        try {
            val file = File(sandboxDir, fileName)
            file.parentFile?.mkdirs()
            file.writeText(content)
            promise.resolve(file.absolutePath)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun readSandboxFile(fileName: String, promise: Promise) {
        try {
            val file = File(sandboxDir, fileName)
            if (!file.exists()) {
                promise.reject("NOT_FOUND", "File not found: $fileName")
                return
            }
            promise.resolve(file.readText())
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message, e)
        }
    }
}

/**
 * BroadcastReceiver to receive Termux command results via PendingIntent.
 * Must be registered in AndroidManifest.xml:
 * <receiver android:name=".modules.TerminalResultReceiver" android:exported="false" />
 */
class TerminalResultReceiver : BroadcastReceiver() {
    companion object {
        var callback: ((String, String, Int, String) -> Unit)? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val stdout = intent.getStringExtra("stdout") ?: ""
        val stderr = intent.getStringExtra("stderr") ?: ""
        val exitCode = intent.getIntExtra("exitCode", -1)
        val sessionId = intent.getStringExtra("sessionId") ?: ""
        callback?.invoke(stdout, stderr, exitCode, sessionId)
    }
}
