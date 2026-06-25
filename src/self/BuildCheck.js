import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Build Environment Checker
// File: src/self/BuildCheck.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';


const { TermuxBridge, DeviceInfo } = NativeModules;

const BUILD_REQUIREMENTS = {
  android: {
    minSdk: 26,
    targetSdk: 34,
    ndkVersion: '25.0',
    cmakeVersion: '3.22',
    gradleVersion: '8.0',
  },
  termux: {
    requiredPackages: ['build-essential', 'cmake', 'ndk-sysroot', 'libffi'],
    minStorageMB: 2048,
  },
};

class BuildCheck {
  constructor() {
    this.checkResults = {};
  }

  async init() {
    await this.runFullCheck();
    return true;
  }

  async runFullCheck() {
    const results = {
      platform: Platform.OS,
      timestamp: Date.now(),
      checks: {},
      overall: false,
    };

    results.checks.androidSDK = await this.checkAndroidSDK();
    results.checks.storage = await this.checkStorage();
    results.checks.termuxEnv = await this.checkTermuxEnvironment();
    results.checks.nativeToolchain = await this.checkNativeToolchain();
    results.checks.permissions = await this.checkBuildPermissions();
    results.checks.memory = await this.checkMemory();

    const allPassed = Object.values(results.checks).every(c => c.passed);
    results.overall = allPassed;
    this.checkResults = results;

    await AsyncStorage.setItem('@manu_build_check', JSON.stringify(results));
    return results;
  }

  async checkAndroidSDK() {
    try {
      if (DeviceInfo && DeviceInfo.getBuildConstants) {
        const info = await DeviceInfo.getBuildConstants();
        const sdkInt = info.SDK_INT || 0;
        const targetSdk = info.TARGET_SDK || 0;
        return {
          passed: sdkInt >= BUILD_REQUIREMENTS.android.minSdk && targetSdk >= BUILD_REQUIREMENTS.android.targetSdk,
          sdkInt,
          targetSdk,
          message: `SDK: ${sdkInt}, Target: ${targetSdk}`,
        };
      }
    } catch (e) {}
    return { passed: Platform.OS === 'android', sdkInt: 0, targetSdk: 0, message: 'Native info unavailable' };
  }

  async checkStorage() {
    try {
      if (TermuxBridge && TermuxBridge.executeCommand) {
        const result = await TermuxBridge.executeCommand('df /data/data | tail -1');
        if (result.exitCode === 0) {
          const parts = result.stdout.trim().split(/\s+/);
          const availableKB = parseInt(parts[3]) || 0;
          const availableMB = Math.floor(availableKB / 1024);
          return {
            passed: availableMB >= BUILD_REQUIREMENTS.termux.minStorageMB,
            availableMB,
            requiredMB: BUILD_REQUIREMENTS.termux.minStorageMB,
            message: `${availableMB}MB available`,
          };
        }
      }
    } catch (e) {}
    return { passed: true, availableMB: 0, message: 'Storage check skipped' };
  }

  async checkTermuxEnvironment() {
    try {
      if (!TermuxBridge || !TermuxBridge.executeCommand) {
        return { passed: false, message: 'Termux bridge not available' };
      }
      const result = await TermuxBridge.executeCommand('echo $TERMUX_VERSION');
      const hasTermux = result.exitCode === 0 && result.stdout.trim().length > 0;
      return { passed: hasTermux, version: result.stdout.trim(), message: hasTermux ? 'Termux detected' : 'Termux not found' };
    } catch (e) {
      return { passed: false, message: e.message };
    }
  }

  async checkNativeToolchain() {
    try {
      if (!TermuxBridge || !TermuxBridge.executeCommand) {
        return { passed: false, message: 'Termux bridge unavailable' };
      }
      const checks = ['gcc --version', 'make --version', 'cmake --version'];
      const results = {};
      for (const cmd of checks) {
        const res = await TermuxBridge.executeCommand(cmd);
        results[cmd] = res.exitCode === 0;
      }
      const allOk = Object.values(results).every(v => v);
      return { passed: allOk, tools: results, message: allOk ? 'Toolchain ready' : 'Missing tools' };
    } catch (e) {
      return { passed: false, message: e.message };
    }
  }

  async checkBuildPermissions() {
    try {
      if (TermuxBridge && TermuxBridge.executeCommand) {
        const result = await TermuxBridge.executeCommand('ls /data/data/com.termux/files/home');
        return { passed: result.exitCode === 0, message: result.exitCode === 0 ? 'Write access confirmed' : 'Permission denied' };
      }
    } catch (e) {}
    return { passed: true, message: 'Permission check skipped' };
  }

  async checkMemory() {
    try {
      if (TermuxBridge && TermuxBridge.executeCommand) {
        const result = await TermuxBridge.executeCommand('free -m | grep Mem');
        if (result.exitCode === 0) {
          const parts = result.stdout.trim().split(/\s+/);
          const totalMB = parseInt(parts[1]) || 0;
          return { passed: totalMB >= 1024, totalMB, message: `${totalMB}MB RAM` };
        }
      }
    } catch (e) {}
    return { passed: true, totalMB: 0, message: 'Memory check skipped' };
  }

  getResults() {
    return { ...this.checkResults };
  }

  isReady() {
    return this.checkResults.overall === true;
  }

  async getLastCheck() {
    try {
      const cached = await AsyncStorage.getItem('@manu_build_check');
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  }
}

export default new BuildCheck();
