import { NativeModules, NativeEventEmitter } from 'react-native';

const { TerminalModule } = NativeModules;
const terminalEmitter = new NativeEventEmitter(TerminalModule);

class TerminalManager {
  constructor() {
    this.outputListeners = [];
    this.isRunning = false;
    this.setupListeners();
  }

  setupListeners() {
    terminalEmitter.addListener('TerminalOutput', (output) => {
      this.outputListeners.forEach(listener => listener(output));
    });
    terminalEmitter.addListener('TerminalError', (error) => {
      this.outputListeners.forEach(listener => listener(`[ERROR] ${error}`));
    });
  }

  addOutputListener(callback) {
    this.outputListeners.push(callback);
    return () => {
      this.outputListeners = this.outputListeners.filter(l => l !== callback);
    };
  }

  async startShell() {
    try {
      const result = await TerminalModule.startShell();
      this.isRunning = true;
      return { success: true, message: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executeCommand(command) {
    try {
      if (command.trim().startsWith('termux-')) {
        const realCommand = command.replace('termux-', '');
        const result = await TerminalModule.executeTermuxCommand(realCommand);
        return { success: true, message: result };
      }

      if (this.isRunning) {
        const result = await TerminalModule.executeCommand(command);
        return { success: true, message: result };
      } else {
        const result = await TerminalModule.executeSandboxCommand(command);
        return { success: true, message: result };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stopShell() {
    try {
      const result = await TerminalModule.stopShell();
      this.isRunning = false;
      return { success: true, message: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getToolCategories() {
    return [
      {
        name: 'System & Utility',
        tools: ['busybox', 'curl', 'wget', 'python3', 'git', 'vim', 'nano', 'tmux'],
        note: 'Basic system tools. Available in sandbox or Termux.',
      },
      {
        name: 'Networking',
        tools: ['nmap', 'masscan', 'hydra', 'sqlmap', 'nikto', 'gobuster', 'dirb'],
        note: 'Network scanning tools. Requires Termux installation.',
      },
      {
        name: 'Wireless',
        tools: ['aircrack-ng', 'wifite', 'bluetoothctl'],
        note: 'Wireless tools. aircrack-ng requires ROOT access.',
        rootRequired: true,
      },
      {
        name: 'OSINT',
        tools: ['theHarvester', 'sherlock'],
        note: 'Open Source Intelligence tools. Requires Termux.',
      },
      {
        name: 'Steganography',
        tools: ['steghide', 'zsteg', 'exiftool', 'binwalk', 'foremost'],
        note: 'Steganography and forensics tools.',
      },
      {
        name: 'Cryptography',
        tools: ['john', 'hashcat', 'openssl'],
        note: 'Password cracking and crypto tools.',
      },
    ];
  }
}

export default new TerminalManager();
