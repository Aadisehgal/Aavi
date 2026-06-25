import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { DeviceControlModule, TerminalModule } = NativeModules;

const COMMAND_REGISTRY = {
  open_instagram: {
    strategies: [
      { type: 'accessibility', action: 'openApp', args: ['com.instagram.android'] },
      { type: 'terminal', command: 'am start -n com.instagram.android/.activity.MainTabActivity' },
      { type: 'terminal', command: 'monkey -p com.instagram.android -c android.intent.category.LAUNCHER 1' },
    ],
  },
  open_app: {
    strategies: [
      { type: 'accessibility', action: 'openApp', args: ['{package}'] },
      { type: 'terminal', command: 'am start -n {package}/.MainActivity' },
    ],
  },
  take_screenshot: {
    strategies: [
      { type: 'accessibility', action: 'performGlobalAction', args: ['screenshot'] },
      { type: 'terminal', command: 'screencap -p /sdcard/screenshot.png' },
    ],
    note: 'Screenshot requires MediaProjection permission on Android 10+. Use device button combo as fallback.',
  },
  scan_network: {
    strategies: [
      { type: 'terminal', command: 'nmap -sn 192.168.1.0/24' },
      { type: 'terminal', command: 'ip neigh' },
    ],
    note: 'Install nmap via Termux: pkg install nmap',
  },
  message_on_instagram: {
    strategies: [
      { type: 'accessibility', action: 'openApp', args: ['com.instagram.android'] },
      { type: 'terminal', command: 'am start -a android.intent.action.VIEW -d "instagram://direct"' },
    ],
    note: 'After opening Instagram, use "Tap search" and "Type {name}" to find the contact.',
  },
  volume_up: {
    strategies: [
      { type: 'accessibility', action: 'adjustVolume', args: ['up'] },
    ],
  },
  volume_down: {
    strategies: [
      { type: 'accessibility', action: 'adjustVolume', args: ['down'] },
    ],
  },
  go_home: {
    strategies: [
      { type: 'accessibility', action: 'performGlobalAction', args: ['home'] },
    ],
  },
  go_back: {
    strategies: [
      { type: 'accessibility', action: 'performGlobalAction', args: ['back'] },
    ],
  },
  read_screen: {
    strategies: [
      { type: 'accessibility', action: 'readScreen', args: [] },
    ],
  },
};

const FAILURE_LOG_KEY = '@manu_failure_log';

class SelfHealingEngine {
  constructor() {
    this.failureLog = [];
    this.loadFailureLog();
  }

  async loadFailureLog() {
    try {
      const log = await AsyncStorage.getItem(FAILURE_LOG_KEY);
      if (log) this.failureLog = JSON.parse(log);
    } catch (e) {
      console.log('No previous failure log');
    }
  }

  async saveFailureLog() {
    try {
      await AsyncStorage.setItem(FAILURE_LOG_KEY, JSON.stringify(this.failureLog.slice(-50)));
    } catch (e) {
      console.error('Failed to save failure log:', e);
    }
  }

  parseCommand(input) {
    const lower = input.toLowerCase().trim();

    if (lower.includes('open') && lower.includes('instagram')) {
      if (lower.includes('message')) {
        return { intent: 'message_on_instagram', params: { name: this.extractName(lower) } };
      }
      return { intent: 'open_instagram', params: {} };
    }

    if (lower.includes('open') || lower.includes('launch') || lower.includes('start')) {
      const appName = this.extractAppName(lower);
      const packageMap = {
        'instagram': 'com.instagram.android',
        'whatsapp': 'com.whatsapp',
        'youtube': 'com.google.android.youtube',
        'chrome': 'com.android.chrome',
        'settings': 'com.android.settings',
      };
      return { intent: 'open_app', params: { package: packageMap[appName] || appName } };
    }

    if (lower.includes('screenshot') || lower.includes('screen shot')) {
      return { intent: 'take_screenshot', params: {} };
    }

    if (lower.includes('scan') && lower.includes('network')) {
      return { intent: 'scan_network', params: {} };
    }

    if (lower.includes('volume')) {
      if (lower.includes('up') || lower.includes('increase')) {
        return { intent: 'volume_up', params: {} };
      }
      if (lower.includes('down') || lower.includes('decrease') || lower.includes('lower')) {
        return { intent: 'volume_down', params: {} };
      }
    }

    if (lower.includes('home') || lower.includes('go home')) {
      return { intent: 'go_home', params: {} };
    }

    if (lower.includes('back') || lower.includes('go back')) {
      return { intent: 'go_back', params: {} };
    }

    if (lower.includes('read') && lower.includes('screen')) {
      return { intent: 'read_screen', params: {} };
    }

    return null;
  }

  extractName(text) {
    const match = text.match(/(?:message|text|call)\s+(\w+)/i);
    return match ? match[1] : '';
  }

  extractAppName(text) {
    const match = text.match(/(?:open|launch|start)\s+(\w+)/i);
    return match ? match[1].toLowerCase() : '';
  }

  async executeCommand(intent, params) {
    const registryEntry = COMMAND_REGISTRY[intent];
    if (!registryEntry) {
      return { success: false, error: `Unknown command intent: ${intent}`, tried: [], fallback: null };
    }

    const tried = [];

    for (let i = 0; i < registryEntry.strategies.length; i++) {
      const strategy = registryEntry.strategies[i];
      try {
        let result;

        if (strategy.type === 'accessibility') {
          const args = strategy.args.map(a => params[a.replace(/[{}]/g, '')] || a);
          result = await this.executeAccessibilityAction(strategy.action, args);
        } else if (strategy.type === 'terminal') {
          let cmd = strategy.command;
          Object.keys(params).forEach(key => {
            cmd = cmd.replace(`{${key}}`, params[key]);
          });
          result = await this.executeTerminalCommand(cmd);
        }

        tried.push({ strategy: i + 1, type: strategy.type, result: 'success' });

        return {
          success: true,
          message: `Done, sir. Executed via ${strategy.type}.`,
          tried,
          note: registryEntry.note || null,
        };
      } catch (error) {
        tried.push({ strategy: i + 1, type: strategy.type, result: 'failed', error: error.message });
      }
    }

    // All strategies failed
    const failureRecord = {
      timestamp: Date.now(),
      intent,
      params,
      tried,
      note: registryEntry.note,
    };
    this.failureLog.push(failureRecord);
    await this.saveFailureLog();

    return {
      success: false,
      error: `All ${registryEntry.strategies.length} strategies failed for "${intent}"`,
      tried,
      note: registryEntry.note || null,
      suggestion: this.getSuggestion(intent),
    };
  }

  async executeAccessibilityAction(action, args) {
    switch (action) {
      case 'openApp':
        return DeviceControlModule.openApp(args[0]);
      case 'performGlobalAction':
        return DeviceControlModule.performGlobalAction(args[0]);
      case 'adjustVolume':
        return DeviceControlModule.adjustVolume(args[0]);
      case 'readScreen':
        return DeviceControlModule.readScreen();
      default:
        throw new Error(`Unknown accessibility action: ${action}`);
    }
  }

  async executeTerminalCommand(command) {
    return new Promise((resolve, reject) => {
      TerminalModule.executeTermuxCommand(command, (result) => {
        if (result && !result.includes('error') && !result.includes('failed')) {
          resolve(result);
        } else {
          reject(new Error(result || 'Terminal command failed'));
        }
      });
    });
  }

  getSuggestion(intent) {
    const suggestions = {
      open_instagram: 'Try: "Open Instagram" after enabling Accessibility service.',
      take_screenshot: 'Use device button combo (Power + Volume Down) as fallback.',
      scan_network: 'Install nmap: pkg install nmap (in Termux).',
    };
    return suggestions[intent] || 'Check Settings > System Status for missing permissions.';
  }

  async getFailureStats() {
    const stats = {};
    this.failureLog.forEach(entry => {
      stats[entry.intent] = (stats[entry.intent] || 0) + 1;
    });
    return stats;
  }
}

export default new SelfHealingEngine();
