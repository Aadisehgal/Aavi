import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Local TLS Server
// File: src/self/LocalTLS.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';


const { LocalServerModule } = NativeModules;

class LocalTLS {
  constructor() {
    this.port = 8443;
    this.running = false;
    this.certInfo = null;
  }

  async init() {
    await this.loadCertInfo();
    return true;
  }

  async loadCertInfo() {
    try {
      const stored = await AsyncStorage.getItem('@manu_local_tls_cert');
      if (stored) this.certInfo = JSON.parse(stored);
    } catch (e) {}
  }

  async saveCertInfo() {
    try {
      await AsyncStorage.setItem('@manu_local_tls_cert', JSON.stringify(this.certInfo));
    } catch (e) {}
  }

  async generateSelfSignedCert() {
    try {
      if (!LocalServerModule || !LocalServerModule.generateCertificate) {
        return { success: false, error: 'LocalServerModule unavailable' };
      }
      const cert = await LocalServerModule.generateCertificate({
        commonName: 'MANU-AI-Local',
        organization: 'MANU AI',
        validDays: 365,
        keySize: 2048,
      });
      this.certInfo = cert;
      await this.saveCertInfo();
      return { success: true, cert };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async startServer(options = {}) {
    if (this.running) return { success: true, alreadyRunning: true };
    try {
      if (!LocalServerModule || !LocalServerModule.startLocalServer) {
        return { success: false, error: 'LocalServerModule unavailable' };
      }
      if (!this.certInfo) {
        const genResult = await this.generateSelfSignedCert();
        if (!genResult.success) return genResult;
      }
      this.port = options.port || 8443;
      const result = await LocalServerModule.startLocalServer({ port: this.port, certificate: this.certInfo, ...options });
      this.running = result.running || false;
      return { success: this.running, port: this.port, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async stopServer() {
    try {
      if (!LocalServerModule || !LocalServerModule.stopLocalServer) {
        return { success: false, error: 'LocalServerModule unavailable' };
      }
      await LocalServerModule.stopLocalServer();
      this.running = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getServerStatus() {
    try {
      if (!LocalServerModule || !LocalServerModule.getServerStatus) {
        return { running: this.running, port: this.port };
      }
      const status = await LocalServerModule.getServerStatus();
      this.running = status.running || false;
      return status;
    } catch (e) {
      return { running: this.running, port: this.port, error: e.message };
    }
  }

  async getCertificateInfo() {
    return this.certInfo;
  }

  async trustClientCert(clientCert) {
    try {
      if (!LocalServerModule || !LocalServerModule.trustClientCertificate) {
        return { success: false, error: 'LocalServerModule unavailable' };
      }
      await LocalServerModule.trustClientCertificate(clientCert);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  isRunning() {
    return this.running;
  }

  getPort() {
    return this.port;
  }
}

export default new LocalTLS();
