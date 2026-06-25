import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Dependency Resolver
// File: src/self/DependencyResolver.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';


const { TermuxBridge } = NativeModules;

const REQUIRED_PACKAGES = [
  { name: 'python', minVersion: '3.9', termuxPkg: 'python', checkCmd: 'python --version' },
  { name: 'ffmpeg', minVersion: '4.4', termuxPkg: 'ffmpeg', checkCmd: 'ffmpeg -version' },
  { name: 'openssl', minVersion: '1.1', termuxPkg: 'openssl-tool', checkCmd: 'openssl version' },
  { name: 'wget', minVersion: '1.21', termuxPkg: 'wget', checkCmd: 'wget --version' },
  { name: 'curl', minVersion: '7.80', termuxPkg: 'curl', checkCmd: 'curl --version' },
  { name: 'proot', minVersion: '5.3', termuxPkg: 'proot', checkCmd: 'proot --version' },
  { name: 'git', minVersion: '2.34', termuxPkg: 'git', checkCmd: 'git --version' },
  { name: 'nodejs', minVersion: '16.0', termuxPkg: 'nodejs', checkCmd: 'node --version' },
];

class DependencyResolver {
  constructor() {
    this.statusCache = {};
    this.installQueue = [];
    this.isInstalling = false;
  }

  async init() {
    await this.refreshStatus();
    return true;
  }

  async refreshStatus() {
    const results = {};
    for (const pkg of REQUIRED_PACKAGES) {
      results[pkg.name] = await this.checkPackage(pkg);
    }
    this.statusCache = results;
    await AsyncStorage.setItem('@manu_deps_status', JSON.stringify(results));
    return results;
  }

  async checkPackage(pkg) {
    try {
      if (!TermuxBridge || !TermuxBridge.executeCommand) {
        return { installed: false, version: null, available: false, error: 'Termux bridge unavailable' };
      }
      const result = await TermuxBridge.executeCommand(pkg.checkCmd);
      if (result.exitCode === 0) {
        const versionMatch = result.stdout.match(/\d+\.\d+(\.\d+)?/);
        const version = versionMatch ? versionMatch[0] : 'unknown';
        const isSufficient = this.compareVersions(version, pkg.minVersion) >= 0;
        return { installed: true, version, sufficient: isSufficient, available: true };
      }
    } catch (e) {
      return { installed: false, version: null, available: false, error: e.message };
    }
    return { installed: false, version: null, available: false };
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  async installMissing() {
    const missing = REQUIRED_PACKAGES.filter(pkg => {
      const status = this.statusCache[pkg.name];
      return !status || !status.installed || !status.sufficient;
    });

    if (missing.length === 0) return { success: true, installed: [], message: 'All dependencies satisfied' };

    this.installQueue = [...missing];
    const installed = [];
    const failed = [];

    for (const pkg of this.installQueue) {
      try {
        const result = await this.installPackage(pkg);
        if (result.success) installed.push(pkg.name);
        else failed.push({ name: pkg.name, error: result.error });
      } catch (e) {
        failed.push({ name: pkg.name, error: e.message });
      }
    }

    await this.refreshStatus();
    return { success: failed.length === 0, installed, failed };
  }

  async installPackage(pkg) {
    try {
      if (!TermuxBridge || !TermuxBridge.executeCommand) {
        return { success: false, error: 'Termux bridge unavailable' };
      }
      const updateResult = await TermuxBridge.executeCommand('pkg update -y');
      if (updateResult.exitCode !== 0) {
        return { success: false, error: 'pkg update failed: ' + updateResult.stderr };
      }
      const installResult = await TermuxBridge.executeCommand(`pkg install -y ${pkg.termuxPkg}`);
      if (installResult.exitCode === 0) {
        return { success: true, output: installResult.stdout };
      }
      return { success: false, error: installResult.stderr };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getStatus() {
    return { ...this.statusCache };
  }

  getMissing() {
    return REQUIRED_PACKAGES.filter(pkg => {
      const status = this.statusCache[pkg.name];
      return !status || !status.installed || !status.sufficient;
    }).map(p => p.name);
  }

  async isEnvironmentReady() {
    const missing = this.getMissing();
    return missing.length === 0;
  }
}

export default new DependencyResolver();
