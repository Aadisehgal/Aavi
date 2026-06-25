// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/ScreenAnalyzer.js
// Feature 49 — Continuous screen awareness: detect app, activity, and UI context

import { NativeModules, NativeEventEmitter, AppState } from 'react-native';

const { AccessibilityBridgeModule } = NativeModules;

const APP_CATEGORIES = {
  social:     ['com.whatsapp', 'com.facebook', 'com.instagram', 'com.twitter', 'org.telegram'],
  navigation: ['com.google.android.apps.maps', 'com.waze'],
  browser:    ['com.android.chrome', 'org.mozilla.firefox', 'com.brave.browser'],
  media:      ['com.spotify.music', 'com.google.android.youtube', 'com.netflix.mediaclient'],
  work:       ['com.microsoft.teams', 'com.slack', 'com.google.android.gm'],
  finance:    ['com.google.android.apps.walletnfcrel'],
};

class ScreenAnalyzer {
  constructor() {
    this.currentApp      = null;
    this.currentActivity = null;
    this.appCategory     = 'unknown';
    this.sessionStart    = null;
    this.appUsageMap     = {};  // { packageName: totalMs }
    this._listeners      = [];
    this._pollTimer      = null;
    this.onChange        = null;  // Callback: (info) => {}
  }

  initialize(onChange) {
    this.onChange = onChange;

    // Listen for accessibility screen-change events
    if (AccessibilityBridgeModule) {
      const emitter = new NativeEventEmitter(AccessibilityBridgeModule);
      this._listeners.push(
        emitter.addListener('onScreenChanged', info => this._handleScreenChange(info))
      );
    }

    // Fallback polling every 5s
    this._pollTimer = setInterval(() => this._poll(), 5000);

    // App state listener
    this._listeners.push(
      AppState.addEventListener('change', state => {
        if (state === 'background') this._recordSession();
      })
    );
  }

  async _poll() {
    try {
      const info = await AccessibilityBridgeModule?.getCurrentApp?.();
      if (info?.packageName && info.packageName !== this.currentApp) {
        this._handleScreenChange(info);
      }
    } catch (e) {}
  }

  _handleScreenChange(info) {
    this._recordSession();
    this.currentApp      = info.packageName || this.currentApp;
    this.currentActivity = info.activityName || null;
    this.appCategory     = this._categorize(this.currentApp);
    this.sessionStart    = Date.now();
    this.onChange?.({
      app:      this.currentApp,
      activity: this.currentActivity,
      category: this.appCategory,
    });
  }

  _recordSession() {
    if (!this.currentApp || !this.sessionStart) return;
    const duration = Date.now() - this.sessionStart;
    this.appUsageMap[this.currentApp] = (this.appUsageMap[this.currentApp] || 0) + duration;
    this.sessionStart = null;
  }

  _categorize(pkg) {
    if (!pkg) return 'unknown';
    for (const [cat, packages] of Object.entries(APP_CATEGORIES)) {
      if (packages.some(p => pkg.startsWith(p))) return cat;
    }
    return 'other';
  }

  getCurrentContext() {
    return {
      app:      this.currentApp,
      activity: this.currentActivity,
      category: this.appCategory,
      sessionMs: this.sessionStart ? Date.now() - this.sessionStart : 0,
    };
  }

  getTopApps(limit = 10) {
    return Object.entries(this.appUsageMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([pkg, ms]) => ({ pkg, minutes: Math.round(ms / 60000) }));
  }

  destroy() {
    clearInterval(this._pollTimer);
    this._listeners.forEach(l => l.remove?.());
    this._listeners = [];
  }
}

export default new ScreenAnalyzer();
