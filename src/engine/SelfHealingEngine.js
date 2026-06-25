import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 7/20 — Self-Healing Command Engine
// File: src/engine/SelfHealingEngine.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { AccessibilityService, TerminalService, ScreenshotService } = NativeModules;

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const ASYNC_STORAGE_KEYS = {
  API_KEY: 'MANU_AI_API_KEY',
  API_URL: 'MANU_AI_API_URL',
  EXECUTION_LOGS: 'MANU_AI_EXECUTION_LOGS',
  COMMAND_HISTORY: 'MANU_AI_COMMAND_HISTORY',
  OFFERED_SCRIPTS: 'MANU_AI_OFFERED_SCRIPTS',
  AUTO_SCRIPTS: 'MANU_AI_AUTO_SCRIPTS',
  ENGINE_SETTINGS: 'MANU_AI_ENGINE_SETTINGS'
};

const DEFAULT_SETTINGS = {
  aiModel: 'gpt-3.5-turbo',
  maxTokens: 500,
  autoScriptThreshold: 3,
  logRetentionDays: 30,
  maxLogEntries: 1000,
  maxHistoryEntries: 500,
  enableAutoScripting: true,
  enableDetailedLogging: true
};

const APP_PACKAGES = {
  instagram: 'com.instagram.android',
  tiktok: 'com.zhiliaoapp.musically',
  facebook: 'com.facebook.katana',
  whatsapp: 'com.whatsapp',
  youtube: 'com.google.android.youtube',
  twitter: 'com.twitter.android',
  snapchat: 'com.snapchat.android',
  gmail: 'com.google.android.gm',
  chrome: 'com.android.chrome',
  settings: 'com.android.settings',
  camera: 'com.android.camera',
  gallery: 'com.android.gallery3d',
  messages: 'com.google.android.apps.messaging',
  phone: 'com.android.dialer',
  maps: 'com.google.android.apps.maps',
  spotify: 'com.spotify.music',
  netflix: 'com.netflix.mediaclient'
};

const INTENT_PATTERNS = {
  open_instagram_message: [
    /open\s+instagram\s+(messages?|dm|direct)/i,
    /launch\s+instagram\s+(messages?|dm|direct)/i,
    /instagram\s+(messages?|dm|direct)/i,
    /open\s+ig\s+(messages?|dm|direct)/i,
    /go\s+to\s+instagram\s+(messages?|dm|direct)/i
  ],
  open_app: [
    /open\s+(\w+(?:\s+\w+)*)/i,
    /launch\s+(\w+(?:\s+\w+)*)/i,
    /start\s+(\w+(?:\s+\w+)*)/i,
    /go\s+to\s+(\w+(?:\s+\w+)*)/i,
    /switch\s+to\s+(\w+(?:\s+\w+)*)/i
  ],
  take_screenshot: [
    /take\s+(?:a\s+)?screenshot/i,
    /capture\s+(?:the\s+)?screen/i,
    /screenshot/i,
    /screen\s+capture/i,
    /save\s+screen/i
  ],
  scan_network: [
    /scan\s+(?:the\s+)?network/i,
    /network\s+scan/i,
    /nmap\s+scan/i,
    /scan\s+(?:wifi|lan|local|ip)/i,
    /check\s+network\s+devices/i,
    /find\s+devices\s+on\s+network/i
  ],
  block_app: [
    /block\s+(\w+(?:\s+\w+)*)/i,
    /stop\s+(\w+(?:\s+\w+)*)/i,
    /force\s+(?:close|stop)\s+(\w+(?:\s+\w+)*)/i,
    /kill\s+(\w+(?:\s+\w+)*)/i,
    /close\s+(\w+(?:\s+\w+)*)/i,
    /exit\s+(\w+(?:\s+\w+)*)/i,
    /turn\s+off\s+(\w+(?:\s+\w+)*)/i
  ],
  toggle_wifi: [
    /turn\s+(?:on|off)\s+wifi/i,
    /toggle\s+wifi/i,
    /enable\s+wifi/i,
    /disable\s+wifi/i,
    /wifi\s+(?:on|off)/i
  ],
  toggle_bluetooth: [
    /turn\s+(?:on|off)\s+bluetooth/i,
    /toggle\s+bluetooth/i,
    /enable\s+bluetooth/i,
    /disable\s+bluetooth/i,
    /bluetooth\s+(?:on|off)/i
  ]
};

const DEFAULT_STRATEGY_CHAINS = {
  open_instagram_message: ['open_app', 'tap_by_text', 'terminal', 'ai_chat'],
  open_app: ['accessibility', 'terminal', 'ai_chat'],
  take_screenshot: ['accessibility', 'terminal', 'ai_chat'],
  scan_network: ['terminal', 'ai_chat'],
  block_app: ['accessibility', 'terminal', 'ai_chat'],
  toggle_wifi: ['accessibility', 'terminal', 'ai_chat'],
  toggle_bluetooth: ['accessibility', 'terminal', 'ai_chat']
};

const STRATEGY_METADATA = {
  accessibility: {
    name: 'Accessibility Service',
    description: 'Uses Android AccessibilityService to perform UI actions',
    priority: 1,
    requires: 'AccessibilityService'
  },
  tap_by_text: {
    name: 'Tap by Text',
    description: 'Uses accessibility to find and tap UI elements by their text content',
    priority: 2,
    requires: 'AccessibilityService'
  },
  terminal: {
    name: 'Terminal Shell',
    description: 'Executes shell commands via Android terminal',
    priority: 3,
    requires: 'TerminalService'
  },
  ai_chat: {
    name: 'AI Chat Assistance',
    description: 'Falls back to AI for instructions and alternative methods',
    priority: 4,
    requires: 'API_KEY'
  }
};

// =============================================================================
// SELF-HEALING COMMAND ENGINE
// =============================================================================

class SelfHealingEngine {
  constructor() {
    this.intentRegistry = { ...DEFAULT_STRATEGY_CHAINS };
    this.settings = { ...DEFAULT_SETTINGS };
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION & CONFIGURATION
  // ---------------------------------------------------------------------------

  async initialize() {
    if (this.initialized) return;

    try {
      const settingsJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ENGINE_SETTINGS);
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
      }
      this.initialized = true;
    } catch (error) {
      console.error('[SelfHealingEngine] Initialization error:', error);
      this.initialized = true;
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.ENGINE_SETTINGS,
      JSON.stringify(this.settings)
    );
  }

  async getSettings() {
    return { ...this.settings };
  }

  async validateConfiguration() {
    await this.initialize();
    const issues = [];
    const warnings = [];

    if (!AccessibilityService) {
      issues.push('AccessibilityService native module not available. Accessibility strategies will fail.');
    }
    if (!TerminalService) {
      issues.push('TerminalService native module not available. Terminal strategies will fail.');
    }
    if (!ScreenshotService) {
      warnings.push('ScreenshotService native module not available.');
    }

    const apiKey = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.API_KEY);
    if (!apiKey) {
      warnings.push('AI API key not configured. AI chat fallback will fail.');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      nativeModules: {
        accessibility: !!AccessibilityService,
        terminal: !!TerminalService,
        screenshot: !!ScreenshotService
      }
    };
  }

  // ---------------------------------------------------------------------------
  // INTENT REGISTRY MANAGEMENT
  // ---------------------------------------------------------------------------

  registerIntent(intentName, strategyChain) {
    if (!Array.isArray(strategyChain) || strategyChain.length === 0) {
      throw new Error('Strategy chain must be a non-empty array');
    }

    for (const strategy of strategyChain) {
      if (!STRATEGY_METADATA[strategy]) {
        throw new Error(`Unknown strategy: ${strategy}`);
      }
    }

    this.intentRegistry[intentName] = [...strategyChain];
  }

  unregisterIntent(intentName) {
    if (DEFAULT_STRATEGY_CHAINS[intentName]) {
      throw new Error(`Cannot unregister default intent: ${intentName}`);
    }
    delete this.intentRegistry[intentName];
  }

  getIntentRegistry() {
    return { ...this.intentRegistry };
  }

  getSupportedIntents() {
    return Object.keys(this.intentRegistry);
  }

  getStrategyMetadata() {
    return { ...STRATEGY_METADATA };
  }

  // ---------------------------------------------------------------------------
  // INTENT PARSING
  // ---------------------------------------------------------------------------

  parseIntent(naturalLanguage) {
    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      return { intentName: null, intentData: {}, confidence: 0 };
    }

    const text = naturalLanguage.trim().toLowerCase();

    for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const intentData = {};
          if (match[1]) {
            intentData.appName = match[1].trim().toLowerCase();
            intentData.rawAppName = match[1].trim();
          }
          intentData.originalText = naturalLanguage;

          let confidence = 0.8;
          if (text.includes(intentName.replace('_', ' ')) || 
              (intentData.appName && APP_PACKAGES[intentData.appName])) {
            confidence = 0.95;
          }

          return { intentName, intentData, confidence };
        }
      }
    }

    // Fallback: try to detect app names in any command
    for (const [appName, packageName] of Object.entries(APP_PACKAGES)) {
      const appPattern = new RegExp(`\\b${appName}\\b`, 'i');
      if (appPattern.test(text)) {
        if (text.includes('open') || text.includes('launch') || text.includes('start')) {
          return {
            intentName: 'open_app',
            intentData: { appName, rawAppName: appName, originalText: naturalLanguage },
            confidence: 0.6
          };
        }
        if (text.includes('close') || text.includes('stop') || text.includes('block') || text.includes('kill')) {
          return {
            intentName: 'block_app',
            intentData: { appName, rawAppName: appName, originalText: naturalLanguage },
            confidence: 0.6
          };
        }
      }
    }

    return { intentName: null, intentData: {}, confidence: 0 };
  }

  // ---------------------------------------------------------------------------
  // STRATEGY EXECUTORS
  // ---------------------------------------------------------------------------

  async executeStrategy(strategyName, intentName, intentData) {
    switch (strategyName) {
      case 'accessibility':
        return await this._executeAccessibilityStrategy(intentName, intentData);
      case 'tap_by_text':
        return await this._executeTapByTextStrategy(intentName, intentData);
      case 'terminal':
        return await this._executeTerminalStrategy(intentName, intentData);
      case 'ai_chat':
        return await this._executeAIChatStrategy(intentName, intentData);
      case 'open_app':
        return await this._executeOpenAppStrategy(intentData);
      default:
        throw new Error(`Unknown strategy: ${strategyName}`);
    }
  }

  async _executeOpenAppStrategy(intentData) {
    if (!AccessibilityService) {
      throw new Error('AccessibilityService native module not available');
    }

    const appName = intentData.appName || intentData.rawAppName;
    if (!appName) {
      throw new Error('App name not provided');
    }

    const packageName = APP_PACKAGES[appName.toLowerCase()];
    if (!packageName) {
      throw new Error(`Unknown app: ${appName}. No package mapping found.`);
    }

    try {
      const result = await AccessibilityService.launchApp(packageName);
      return { success: true, method: 'accessibility_launch', packageName, result };
    } catch (error) {
      throw new Error(`Failed to open app via accessibility: ${error.message || error}`);
    }
  }

  async _executeAccessibilityStrategy(intentName, intentData) {
    if (!AccessibilityService) {
      throw new Error('AccessibilityService native module not available');
    }

    switch (intentName) {
      case 'open_app': {
        const appName = intentData.appName || intentData.rawAppName;
        const packageName = APP_PACKAGES[appName?.toLowerCase()];
        if (!packageName) throw new Error(`Unknown app: ${appName}`);
        const result = await AccessibilityService.launchApp(packageName);
        return { success: true, method: 'launch_app', packageName, result };
      }

      case 'take_screenshot': {
        if (ScreenshotService && ScreenshotService.takeScreenshot) {
          const result = await ScreenshotService.takeScreenshot();
          return { success: true, method: 'screenshot_service', result };
        }
        throw new Error('ScreenshotService not available for accessibility strategy');
      }

      case 'block_app': {
        const appName = intentData.appName || intentData.rawAppName;
        const packageName = APP_PACKAGES[appName?.toLowerCase()];
        if (!packageName) throw new Error(`Unknown app: ${appName}`);

        // Try to open app settings and force stop
        try {
          await AccessibilityService.launchApp('com.android.settings');
          await this._delay(1000);
          await AccessibilityService.tapByText('Apps');
          await this._delay(500);
          await AccessibilityService.tapByText('See all');
          await this._delay(500);

          // Try to find the app by name
          const appDisplayName = intentData.rawAppName || appName;
          await AccessibilityService.tapByText(appDisplayName);
          await this._delay(500);
          await AccessibilityService.tapByText('Force stop');
          await this._delay(300);
          await AccessibilityService.tapByText('OK');

          return { success: true, method: 'settings_force_stop', packageName };
        } catch (error) {
          throw new Error(`Accessibility force-stop failed: ${error.message || error}`);
        }
      }

      case 'toggle_wifi': {
        try {
          await AccessibilityService.launchApp('com.android.settings');
          await this._delay(800);
          await AccessibilityService.tapByText('Network & internet');
          await this._delay(500);
          await AccessibilityService.tapByText('Wi-Fi');
          return { success: true, method: 'settings_wifi_toggle' };
        } catch (error) {
          throw new Error(`Accessibility Wi-Fi toggle failed: ${error.message || error}`);
        }
      }

      case 'toggle_bluetooth': {
        try {
          await AccessibilityService.launchApp('com.android.settings');
          await this._delay(800);
          await AccessibilityService.tapByText('Connected devices');
          await this._delay(500);
          await AccessibilityService.tapByText('Bluetooth');
          return { success: true, method: 'settings_bluetooth_toggle' };
        } catch (error) {
          throw new Error(`Accessibility Bluetooth toggle failed: ${error.message || error}`);
        }
      }

      case 'open_instagram_message': {
        const igPackage = APP_PACKAGES['instagram'];
        await AccessibilityService.launchApp(igPackage);
        await this._delay(1500);

        try {
          await AccessibilityService.tapByText('Message');
        } catch (e) {
          try {
            await AccessibilityService.tapByText('Direct');
          } catch (e2) {
            try {
              await AccessibilityService.tapByContentDescription('Messages');
            } catch (e3) {
              throw new Error('Could not find Instagram message button');
            }
          }
        }
        return { success: true, method: 'instagram_messages' };
      }

      default:
        throw new Error(`Accessibility strategy not implemented for intent: ${intentName}`);
    }
  }

  async _executeTapByTextStrategy(intentName, intentData) {
    if (!AccessibilityService) {
      throw new Error('AccessibilityService native module not available');
    }

    if (intentName === 'open_instagram_message') {
      try {
        await AccessibilityService.tapByText('Message');
        return { success: true, method: 'tap_text_message' };
      } catch (e) {
        try {
          await AccessibilityService.tapByText('Direct');
          return { success: true, method: 'tap_text_direct' };
        } catch (e2) {
          throw new Error('Tap by text failed for Instagram messages');
        }
      }
    }

    throw new Error(`Tap by text strategy not applicable for intent: ${intentName}`);
  }

  async _executeTerminalStrategy(intentName, intentData) {
    if (!TerminalService) {
      throw new Error('TerminalService native module not available');
    }

    switch (intentName) {
      case 'open_app': {
        const appName = intentData.appName || intentData.rawAppName;
        const packageName = APP_PACKAGES[appName?.toLowerCase()];
        if (!packageName) throw new Error(`Unknown app: ${appName}`);

        const result = await TerminalService.executeCommand(
          `am start -n ${packageName}/.MainActivity`
        );
        return { success: true, method: 'am_start', packageName, result };
      }

      case 'open_instagram_message': {
        const result = await TerminalService.executeCommand(
          'am start -a android.intent.action.VIEW -d instagram://direct'
        );
        return { success: true, method: 'instagram_intent', result };
      }

      case 'take_screenshot': {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `/sdcard/Download/screenshot_${timestamp}.png`;
        const result = await TerminalService.executeCommand(`screencap -p ${path}`);
        return { success: true, method: 'screencap', path, result };
      }

      case 'scan_network': {
        try {
          const result = await TerminalService.executeCommand('nmap -sn 192.168.1.0/24');
          return { success: true, method: 'nmap_scan', result };
        } catch (e) {
          // Fallback to ping sweep
          const result = await TerminalService.executeCommand(
            'for i in $(seq 1 254); do ping -c 1 -W 1 192.168.1.$i 2>/dev/null && echo "192.168.1.$i is up"; done'
          );
          return { success: true, method: 'ping_sweep', result };
        }
      }

      case 'block_app': {
        const appName = intentData.appName || intentData.rawAppName;
        const packageName = APP_PACKAGES[appName?.toLowerCase()];
        if (!packageName) throw new Error(`Unknown app: ${appName}`);

        const result = await TerminalService.executeCommand(`am force-stop ${packageName}`);
        return { success: true, method: 'am_force_stop', packageName, result };
      }

      case 'toggle_wifi': {
        const isOn = intentData.originalText?.toLowerCase().includes('on') || 
                     intentData.originalText?.toLowerCase().includes('enable');
        const cmd = isOn 
          ? 'svc wifi enable' 
          : 'svc wifi disable';
        const result = await TerminalService.executeCommand(cmd);
        return { success: true, method: 'svc_wifi', enabled: isOn, result };
      }

      case 'toggle_bluetooth': {
        const isOn = intentData.originalText?.toLowerCase().includes('on') || 
                     intentData.originalText?.toLowerCase().includes('enable');
        const cmd = isOn 
          ? 'svc bluetooth enable' 
          : 'svc bluetooth disable';
        const result = await TerminalService.executeCommand(cmd);
        return { success: true, method: 'svc_bluetooth', enabled: isOn, result };
      }

      default:
        throw new Error(`Terminal strategy not implemented for intent: ${intentName}`);
    }
  }

  async _executeAIChatStrategy(intentName, intentData) {
    const apiKey = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.API_KEY);
    const apiUrl = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.API_URL) || 
                   'https://api.openai.com/v1/chat/completions';

    if (!apiKey) {
      throw new Error('AI API key not configured. Please set it in Settings.');
    }

    const prompt = this._buildAIPrompt(intentName, intentData);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.aiModel,
          messages: [
            { 
              role: 'system', 
              content: 'You are J.A.R.V.I.S., the AI assistant for MANU AI. You help users execute commands on their Android device. Provide concise, actionable step-by-step instructions. If the user wants to open an app or perform a system action, give them the exact manual steps to do it.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: this.settings.maxTokens,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';

      return { 
        success: true, 
        method: 'ai_chat', 
        aiResponse,
        model: this.settings.aiModel
      };
    } catch (error) {
      if (error.message && error.message.includes('Network')) {
        throw new Error('Network error: Unable to reach AI service. Check your internet connection.');
      }
      throw error;
    }
  }

  _buildAIPrompt(intentName, intentData) {
    const appName = intentData.rawAppName || intentData.appName;

    switch (intentName) {
      case 'open_instagram_message':
        return 'The user wants to open Instagram Direct Messages on Android. Provide exact step-by-step manual instructions. Include: 1) Open Instagram app, 2) Tap the paper airplane icon (top right), 3) The DM inbox will open.';

      case 'open_app':
        return `The user wants to open the app "${appName}" on Android. Provide exact step-by-step manual instructions to find and open this app. If it's not installed, suggest installing it from the Play Store.`;

      case 'take_screenshot':
        return 'The user wants to take a screenshot on Android. Provide the exact button combination: Press and hold Power + Volume Down buttons simultaneously for 1-2 seconds. Also mention alternative methods if available on their device.';

      case 'scan_network':
        return 'The user wants to scan their local Wi-Fi network to find connected devices. Since automated tools failed, provide manual alternatives: 1) Check router admin page (usually 192.168.1.1), 2) Use Fing app from Play Store, 3) Use built-in Wi-Fi settings to see connected devices.';

      case 'block_app':
        return `The user wants to force-stop or block the app "${appName}" on Android. Provide exact manual steps: 1) Open Settings, 2) Go to Apps, 3) Find ${appName}, 4) Tap Force Stop, 5) Confirm. Also mention how to restrict background activity if needed.`;

      case 'toggle_wifi':
        return 'The user wants to toggle Wi-Fi on Android. Provide exact manual steps: 1) Swipe down from top to open Quick Settings, 2) Tap the Wi-Fi icon to toggle, OR 3) Go to Settings > Network & internet > Wi-Fi.';

      case 'toggle_bluetooth':
        return 'The user wants to toggle Bluetooth on Android. Provide exact manual steps: 1) Swipe down from top to open Quick Settings, 2) Tap the Bluetooth icon to toggle, OR 3) Go to Settings > Connected devices > Bluetooth.';

      default:
        return `The user issued a command: "${intentData.originalText || intentName}". Please provide helpful, step-by-step instructions to accomplish this on an Android device.`;
    }
  }

  // ---------------------------------------------------------------------------
  // FALLBACK CHAIN EXECUTOR
  // ---------------------------------------------------------------------------

  async executeFallbackChain(intentName, intentData, strategyChain) {
    const chainStartTime = Date.now();
    const errors = [];

    for (let i = 0; i < strategyChain.length; i++) {
      const strategyName = strategyChain[i];
      const strategyStartTime = Date.now();

      try {
        const result = await this.executeStrategy(strategyName, intentName, intentData);
        const duration = Date.now() - strategyStartTime;

        await this._logAttempt(intentName, strategyName, true, null, duration, { result });

        return {
          success: true,
          intentName,
          strategyUsed: strategyName,
          strategyIndex: i,
          result,
          attempts: i + 1,
          totalDuration: Date.now() - chainStartTime,
          fallbackUsed: i > 0,
          previousErrors: errors.length > 0 ? errors : null
        };
      } catch (error) {
        const duration = Date.now() - strategyStartTime;
        const errorInfo = {
          strategy: strategyName,
          error: error.message || String(error),
          timestamp: Date.now()
        };
        errors.push(errorInfo);

        await this._logAttempt(intentName, strategyName, false, error, duration);

        if (i === strategyChain.length - 1) {
          return {
            success: false,
            intentName,
            strategyUsed: null,
            strategyIndex: -1,
            result: null,
            attempts: strategyChain.length,
            totalDuration: Date.now() - chainStartTime,
            fallbackUsed: true,
            errors
          };
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN PUBLIC API
  // ---------------------------------------------------------------------------

  async executeCommand(naturalLanguage) {
    await this.initialize();
    const startTime = Date.now();

    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      const error = new Error('Invalid input: naturalLanguage must be a non-empty string');
      await this._logAttempt('invalid_input', 'parse', false, error, 0);
      return { success: false, error: error.message, intentName: 'invalid_input' };
    }

    const { intentName, intentData, confidence } = this.parseIntent(naturalLanguage);

    if (!intentName) {
      const error = new Error(`Could not parse intent from: "${naturalLanguage}"`);
      await this._logAttempt('unknown', 'parse', false, error, Date.now() - startTime, { input: naturalLanguage });
      return { 
        success: false, 
        error: error.message, 
        intentName: 'unknown',
        suggestion: 'Try commands like: "open Instagram", "take screenshot", "block TikTok", "scan network"'
      };
    }

    const strategyChain = this.intentRegistry[intentName];

    if (!strategyChain) {
      const error = new Error(`No strategy chain registered for intent: ${intentName}`);
      await this._logAttempt(intentName, 'registry', false, error, Date.now() - startTime);
      return { success: false, error: error.message, intentName };
    }

    const result = await this.executeFallbackChain(intentName, intentData, strategyChain);

    // Auto-scripting detection
    let autoScriptSuggestion = null;
    if (this.settings.enableAutoScripting) {
      autoScriptSuggestion = await this._detectRepetitiveCommand(intentName, naturalLanguage);
    }

    return {
      ...result,
      confidence,
      parsedIntent: intentName,
      intentData: { ...intentData, originalText: naturalLanguage },
      autoScriptSuggestion: autoScriptSuggestion?.shouldOffer ? autoScriptSuggestion : null
    };
  }

  async executeStrategyDirectly(strategyName, intentName, intentData = {}) {
    await this.initialize();
    const startTime = Date.now();

    try {
      const result = await this.executeStrategy(strategyName, intentName, intentData);
      const duration = Date.now() - startTime;
      await this._logAttempt(intentName, strategyName, true, null, duration, { result, manual: true });
      return { success: true, strategyName, intentName, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this._logAttempt(intentName, strategyName, false, error, duration, { manual: true });
      return { success: false, strategyName, intentName, error: error.message || String(error), duration };
    }
  }

  // ---------------------------------------------------------------------------
  // LOGGING SYSTEM
  // ---------------------------------------------------------------------------

  async _logAttempt(intentName, strategyName, success, error, duration, details = {}) {
    if (!this.settings.enableDetailedLogging) return;

    try {
      const logsJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.EXECUTION_LOGS);
      let logs = logsJson ? JSON.parse(logsJson) : [];

      const entry = {
        id: `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        intentName,
        strategyName,
        success,
        error: error ? (error.message || String(error)) : null,
        duration,
        details
      };

      logs.push(entry);

      // Trim old logs
      if (logs.length > this.settings.maxLogEntries) {
        logs = logs.slice(-this.settings.maxLogEntries);
      }

      // Also remove logs older than retention period
      const retentionMs = this.settings.logRetentionDays * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - retentionMs;
      logs = logs.filter(log => log.timestamp > cutoff);

      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXECUTION_LOGS, JSON.stringify(logs));
    } catch (storageError) {
      console.error('[SelfHealingEngine] Logging error:', storageError);
    }
  }

  async getLogs(options = {}) {
    const { limit = 100, intentName = null, success = null } = options;

    try {
      const logsJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.EXECUTION_LOGS);
      let logs = logsJson ? JSON.parse(logsJson) : [];

      if (intentName) {
        logs = logs.filter(log => log.intentName === intentName);
      }
      if (success !== null) {
        logs = logs.filter(log => log.success === success);
      }

      return logs.slice(-limit).reverse();
    } catch (error) {
      console.error('[SelfHealingEngine] Get logs error:', error);
      return [];
    }
  }

  async clearLogs() {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.EXECUTION_LOGS, JSON.stringify([]));
  }

  async exportLogs() {
    const logs = await this.getLogs({ limit: this.settings.maxLogEntries });
    return {
      exportedAt: new Date().toISOString(),
      totalEntries: logs.length,
      logs
    };
  }

  // ---------------------------------------------------------------------------
  // AUTO-COMMAND SCRIPTING (Feature 11 — J.A.R.V.I.S. Upgrade)
  // ---------------------------------------------------------------------------

  async _detectRepetitiveCommand(intentName, naturalLanguage) {
    try {
      const historyJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.COMMAND_HISTORY);
      let history = historyJson ? JSON.parse(historyJson) : [];

      const now = Date.now();
      history.push({ intentName, naturalLanguage, timestamp: now });

      // Keep only recent history
      const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
      history = history.filter(h => h.timestamp > cutoff).slice(-this.settings.maxHistoryEntries);

      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.COMMAND_HISTORY, JSON.stringify(history));

      // Count occurrences of this exact intent
      const intentCount = history.filter(h => h.intentName === intentName).length;

      if (intentCount >= this.settings.autoScriptThreshold) {
        const offeredJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.OFFERED_SCRIPTS);
        const offered = offeredJson ? JSON.parse(offeredJson) : [];

        if (!offered.includes(intentName)) {
          offered.push(intentName);
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.OFFERED_SCRIPTS, JSON.stringify(offered));

          // Find most common natural language pattern
          const patterns = history
            .filter(h => h.intentName === intentName)
            .map(h => h.naturalLanguage);
          const suggestedPattern = this._getMostCommonPattern(patterns);

          return {
            shouldOffer: true,
            count: intentCount,
            intentName,
            suggestedPattern,
            message: `You've used "${intentName}" ${intentCount} times. Would you like to create an auto-script?`
          };
        }
      }

      return { shouldOffer: false, count: intentCount, intentName };
    } catch (error) {
      console.error('[SelfHealingEngine] Auto-script detection error:', error);
      return { shouldOffer: false, count: 0, intentName };
    }
  }

  _getMostCommonPattern(patterns) {
    if (!patterns || patterns.length === 0) return '';

    const counts = {};
    let maxCount = 0;
    let maxPattern = patterns[0];

    for (const pattern of patterns) {
      const normalized = pattern.toLowerCase().trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
      if (counts[normalized] > maxCount) {
        maxCount = counts[normalized];
        maxPattern = pattern;
      }
    }

    return maxPattern;
  }

  async createAutoScript(intentName, commandPattern, name, description = '') {
    if (!intentName || !commandPattern) {
      throw new Error('intentName and commandPattern are required');
    }

    const scripts = await this.getAutoScripts();

    const script = {
      id: `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
      name: name || `${intentName.replace(/_/g, ' ')} script`,
      description: description || `Auto-script for: ${commandPattern}`,
      intentName,
      commandPattern,
      createdAt: Date.now(),
      executionCount: 0,
      lastExecuted: null,
      enabled: true
    };

    scripts.push(script);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.AUTO_SCRIPTS, JSON.stringify(scripts));

    return script;
  }

  async getAutoScripts() {
    try {
      const scriptsJson = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.AUTO_SCRIPTS);
      return scriptsJson ? JSON.parse(scriptsJson) : [];
    } catch (error) {
      return [];
    }
  }

  async executeAutoScript(scriptId) {
    const scripts = await this.getAutoScripts();
    const script = scripts.find(s => s.id === scriptId);

    if (!script) {
      throw new Error(`Auto script not found: ${scriptId}`);
    }

    if (!script.enabled) {
      throw new Error(`Auto script is disabled: ${script.name}`);
    }

    const result = await this.executeCommand(script.commandPattern);

    // Update execution stats
    script.executionCount += 1;
    script.lastExecuted = Date.now();

    const updatedScripts = scripts.map(s => s.id === scriptId ? script : s);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.AUTO_SCRIPTS, JSON.stringify(updatedScripts));

    return { ...result, scriptId: script.id, scriptName: script.name };
  }

  async updateAutoScript(scriptId, updates) {
    const scripts = await this.getAutoScripts();
    const index = scripts.findIndex(s => s.id === scriptId);

    if (index === -1) {
      throw new Error(`Auto script not found: ${scriptId}`);
    }

    scripts[index] = { ...scripts[index], ...updates };
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.AUTO_SCRIPTS, JSON.stringify(scripts));
    return scripts[index];
  }

  async deleteAutoScript(scriptId) {
    const scripts = await this.getAutoScripts();
    const filtered = scripts.filter(s => s.id !== scriptId);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.AUTO_SCRIPTS, JSON.stringify(filtered));
  }

  async clearAutoScriptOffers() {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.OFFERED_SCRIPTS, JSON.stringify([]));
  }

  // ---------------------------------------------------------------------------
  // STATISTICS & ANALYTICS
  // ---------------------------------------------------------------------------

  async getExecutionStats(options = {}) {
    const { days = 7 } = options;
    const logs = await this.getLogs({ limit: this.settings.maxLogEntries });
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(log => log.timestamp > cutoff);

    const stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      successRate: 0,
      intents: {},
      strategies: {},
      averageExecutionTime: 0,
      mostUsedIntent: null,
      period: `${days} days`
    };

    let totalDuration = 0;
    const intentCounts = {};

    for (const log of recentLogs) {
      stats.totalCommands += 1;
      totalDuration += log.duration || 0;

      if (log.success) {
        stats.successfulCommands += 1;
      } else {
        stats.failedCommands += 1;
      }

      // Intent stats
      if (!stats.intents[log.intentName]) {
        stats.intents[log.intentName] = { total: 0, success: 0, failure: 0 };
      }
      stats.intents[log.intentName].total += 1;
      if (log.success) {
        stats.intents[log.intentName].success += 1;
      } else {
        stats.intents[log.intentName].failure += 1;
      }

      intentCounts[log.intentName] = (intentCounts[log.intentName] || 0) + 1;

      // Strategy stats
      if (!stats.strategies[log.strategyName]) {
        stats.strategies[log.strategyName] = { total: 0, success: 0, failure: 0 };
      }
      stats.strategies[log.strategyName].total += 1;
      if (log.success) {
        stats.strategies[log.strategyName].success += 1;
      } else {
        stats.strategies[log.strategyName].failure += 1;
      }
    }

    if (stats.totalCommands > 0) {
      stats.successRate = Math.round((stats.successfulCommands / stats.totalCommands) * 100);
      stats.averageExecutionTime = Math.round(totalDuration / stats.totalCommands);
    }

    // Find most used intent
    let maxCount = 0;
    for (const [intent, count] of Object.entries(intentCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stats.mostUsedIntent = intent;
      }
    }

    return stats;
  }

  async getHealthReport() {
    const config = await this.validateConfiguration();
    const stats = await this.getExecutionStats({ days: 1 });
    const recentLogs = await this.getLogs({ limit: 10 });

    return {
      timestamp: new Date().toISOString(),
      configuration: config,
      recentStats: stats,
      recentActivity: recentLogs,
      engineStatus: config.valid ? 'healthy' : 'degraded',
      recommendations: this._generateRecommendations(config, stats)
    };
  }

  _generateRecommendations(config, stats) {
    const recommendations = [];

    if (!config.nativeModules.accessibility) {
      recommendations.push('Enable AccessibilityService for better app control');
    }
    if (!config.nativeModules.terminal) {
      recommendations.push('Enable TerminalService for shell command execution');
    }
    if (config.warnings.some(w => w.includes('API key'))) {
      recommendations.push('Configure AI API key in Settings for fallback assistance');
    }
    if (stats.successRate < 50 && stats.totalCommands > 5) {
      recommendations.push('Success rate is low. Check native module configuration and app permissions.');
    }
    if (stats.totalCommands === 0) {
      recommendations.push('No commands executed yet. Try saying "open Instagram" or "take screenshot".');
    }

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAppPackages() {
    return { ...APP_PACKAGES };
  }

  addAppPackage(appName, packageName) {
    APP_PACKAGES[appName.toLowerCase()] = packageName;
  }

  async resetAllData() {
    await AsyncStorage.multiRemove([
      ASYNC_STORAGE_KEYS.EXECUTION_LOGS,
      ASYNC_STORAGE_KEYS.COMMAND_HISTORY,
      ASYNC_STORAGE_KEYS.OFFERED_SCRIPTS,
      ASYNC_STORAGE_KEYS.AUTO_SCRIPTS,
      ASYNC_STORAGE_KEYS.ENGINE_SETTINGS
    ]);
    this.settings = { ...DEFAULT_SETTINGS };
    this.intentRegistry = { ...DEFAULT_STRATEGY_CHAINS };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export default new SelfHealingEngine();
