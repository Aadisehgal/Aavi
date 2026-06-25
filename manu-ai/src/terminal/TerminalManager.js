// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 8/20 — Terminal & Shell Integration
// File: src/terminal/TerminalManager.js
// Generated: 2026-06-24
//
// Tool categories + session manager for Terminal & Shell module.
// Manages sandbox commands, real Termux shell execution, and cybersecurity tools.

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { TerminalModule } = NativeModules;

// Check if module is available (Android only)
const isAvailable = Platform.OS === 'android' && TerminalModule != null;

// Event emitter for terminal output
const terminalEmitter = isAvailable ? new NativeEventEmitter(TerminalModule) : null;

// Tool categories definition
const TOOL_CATEGORIES = [
  {
    id: 'network',
    name: 'Network Scanning',
    icon: '🌐',
    tools: [
      { id: 'nmap', name: 'Nmap', description: 'Network mapper and port scanner', command: 'nmap', installCmd: 'pkg install nmap -y', requiresRoot: false },
      { id: 'masscan', name: 'Masscan', description: 'Mass IP port scanner', command: 'masscan', installCmd: 'pkg install masscan -y', requiresRoot: false },
    ]
  },
  {
    id: 'webapp',
    name: 'Web & Application',
    icon: '🌐',
    tools: [
      { id: 'hydra', name: 'Hydra', description: 'Login cracker for multiple protocols', command: 'hydra', installCmd: 'pkg install hydra -y', requiresRoot: false },
      { id: 'sqlmap', name: 'SQLMap', description: 'Automatic SQL injection tool', command: 'sqlmap', installCmd: 'pip install sqlmap', requiresRoot: false },
      { id: 'nikto', name: 'Nikto', description: 'Web server scanner', command: 'nikto', installCmd: 'pkg install nikto -y', requiresRoot: false },
      { id: 'gobuster', name: 'Gobuster', description: 'Directory/file & DNS buster', command: 'gobuster', installCmd: 'pkg install gobuster -y', requiresRoot: false },
      { id: 'dirb', name: 'DIRB', description: 'Web content scanner', command: 'dirb', installCmd: 'pkg install dirb -y', requiresRoot: false },
    ]
  },
  {
    id: 'osint',
    name: 'OSINT',
    icon: '🔍',
    tools: [
      { id: 'theHarvester', name: 'theHarvester', description: 'Email and subdomain harvester', command: 'theHarvester', installCmd: 'pip install theHarvester', requiresRoot: false },
      { id: 'sherlock', name: 'Sherlock', description: 'Hunt social media accounts', command: 'sherlock', installCmd: 'pip install sherlock-project', requiresRoot: false },
    ]
  },
  {
    id: 'wireless',
    name: 'Wireless',
    icon: '📡',
    tools: [
      { id: 'aircrack-ng', name: 'Aircrack-ng', description: 'WiFi security auditing', command: 'aircrack-ng', installCmd: 'pkg install aircrack-ng -y', requiresRoot: true },
      { id: 'wifite', name: 'Wifite', description: 'Automated wireless auditor', command: 'wifite', installCmd: 'pkg install wifite -y', requiresRoot: true },
    ]
  },
  {
    id: 'forensics',
    name: 'Forensics',
    icon: '🔬',
    tools: [
      { id: 'steghide', name: 'Steghide', description: 'Steganography tool', command: 'steghide', installCmd: 'pkg install steghide -y', requiresRoot: false },
      { id: 'zsteg', name: 'Zsteg', description: 'PNG/BMP steganography', command: 'zsteg', installCmd: 'gem install zsteg', requiresRoot: false },
      { id: 'exiftool', name: 'ExifTool', description: 'Metadata reader/writer', command: 'exiftool', installCmd: 'pkg install exiftool -y', requiresRoot: false },
      { id: 'binwalk', name: 'Binwalk', description: 'Firmware analysis tool', command: 'binwalk', installCmd: 'pip install binwalk', requiresRoot: false },
      { id: 'foremost', name: 'Foremost', description: 'File recovery tool', command: 'foremost', installCmd: 'pkg install foremost -y', requiresRoot: false },
    ]
  },
  {
    id: 'crypto',
    name: 'Cryptography',
    icon: '🔐',
    tools: [
      { id: 'john', name: 'John the Ripper', description: 'Password cracker', command: 'john', installCmd: 'pkg install john -y', requiresRoot: false },
      { id: 'hashcat', name: 'Hashcat', description: 'Advanced password recovery', command: 'hashcat', installCmd: 'pkg install hashcat -y', requiresRoot: false },
      { id: 'openssl', name: 'OpenSSL', description: 'Cryptography toolkit', command: 'openssl', installCmd: 'pkg install openssl -y', requiresRoot: false },
    ]
  },
  {
    id: 'proot',
    name: 'Proot Distro',
    icon: '🐧',
    tools: [
      { id: 'ubuntu', name: 'Ubuntu', description: 'Ubuntu Linux via proot', command: 'proot-distro login ubuntu', installCmd: 'proot-distro install ubuntu', requiresRoot: false },
      { id: 'debian', name: 'Debian', description: 'Debian Linux via proot', command: 'proot-distro login debian', installCmd: 'proot-distro install debian', requiresRoot: false },
      { id: 'kali', name: 'Kali Linux', description: 'Kali Linux via proot', command: 'proot-distro login kali', installCmd: 'proot-distro install kali', requiresRoot: false },
      { id: 'arch', name: 'Arch Linux', description: 'Arch Linux via proot', command: 'proot-distro login arch', installCmd: 'proot-distro install arch', requiresRoot: false },
      { id: 'fedora', name: 'Fedora', description: 'Fedora Linux via proot', command: 'proot-distro login fedora', installCmd: 'proot-distro install fedora', requiresRoot: false },
      { id: 'opensuse', name: 'openSUSE', description: 'openSUSE via proot', command: 'proot-distro login opensuse', installCmd: 'proot-distro install opensuse', requiresRoot: false },
      { id: 'void', name: 'Void Linux', description: 'Void Linux via proot', command: 'proot-distro login void', installCmd: 'proot-distro install void', requiresRoot: false },
    ]
  }
];

// Session manager class
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionCounter = 0;
    this.outputListeners = new Set();
    this.setupEventListener();
  }

  setupEventListener() {
    if (!terminalEmitter) return;
    terminalEmitter.addListener('onTerminalOutput', (data) => {
      this.handleTerminalOutput(data);
    });
  }

  handleTerminalOutput(data) {
    const { stdout, stderr, exitCode, sessionId } = data;
    const output = {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: exitCode !== undefined ? exitCode : -1,
      sessionId: sessionId || '',
      timestamp: Date.now(),
    };

    // Find active session by sessionId
    let session = null;
    for (const [, s] of this.sessions) {
      if (s.sessionId === sessionId && s.status === 'running') {
        session = s;
        break;
      }
    }

    if (session) {
      session.output.push(output);
      if (exitCode !== undefined && exitCode !== -1) {
        session.status = exitCode === 0 ? 'completed' : 'error';
        session.exitCode = exitCode;
        session.endTime = Date.now();
      }
    }

    // Notify all listeners
    this.outputListeners.forEach(listener => listener(output));
  }

  createSession(command, args = [], mode = 'real') {
    this.sessionCounter++;
    const sessionId = `session_${this.sessionCounter}_${Date.now()}`;
    const session = {
      id: this.sessionCounter,
      sessionId,
      command: `${command} ${args.join(' ')}`.trim(),
      args,
      mode,
      status: 'running',
      output: [],
      startTime: Date.now(),
      endTime: null,
      exitCode: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  getSessionBySessionId(sessionId) {
    for (const [, session] of this.sessions) {
      if (session.sessionId === sessionId) return session;
    }
    return null;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running');
  }

  killSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.status = 'killed';
      session.endTime = Date.now();
      // Note: Actual process killing requires PID tracking which is limited in Termux bridge
      return true;
    }
    return false;
  }

  clearSessions() {
    this.sessions.clear();
    this.sessionCounter = 0;
  }

  addOutputListener(callback) {
    this.outputListeners.add(callback);
    return () => this.outputListeners.delete(callback);
  }

  removeOutputListener(callback) {
    this.outputListeners.delete(callback);
  }
}

const sessionManager = new SessionManager();

// Terminal Manager API
const TerminalManager = {
  // Check if Termux is available
  async isTermuxAvailable() {
    if (!isAvailable) return false;
    try {
      return await TerminalModule.isTermuxAvailable();
    } catch (e) {
      console.error('Error checking Termux availability:', e);
      return false;
    }
  },

  // Execute sandbox command
  async executeSandbox(command, args = []) {
    if (!isAvailable) {
      return {
        stdout: '',
        stderr: 'Terminal module not available',
        exitCode: 1,
        command: `${command} ${args.join(' ')}`.trim(),
        timestamp: Date.now(),
      };
    }
    try {
      const result = await TerminalModule.executeSandboxCommand(command, args);
      return {
        stdout: result,
        stderr: '',
        exitCode: 0,
        command: `${command} ${args.join(' ')}`.trim(),
        timestamp: Date.now(),
      };
    } catch (e) {
      return {
        stdout: '',
        stderr: e.message || 'Sandbox execution failed',
        exitCode: 1,
        command: `${command} ${args.join(' ')}`.trim(),
        timestamp: Date.now(),
      };
    }
  },

  // Execute real command via Termux
  async executeReal(command, args = [], background = false) {
    if (!isAvailable) {
      throw new Error('Terminal module not available');
    }
    const session = sessionManager.createSession(command, args, 'real');
    try {
      await TerminalModule.executeRealCommand(command, args, background, session.sessionId);
      return session;
    } catch (e) {
      session.status = 'error';
      session.endTime = Date.now();
      session.output.push({
        stdout: '',
        stderr: e.message || 'Command execution failed',
        exitCode: 1,
        sessionId: session.sessionId,
        timestamp: Date.now(),
      });
      return session;
    }
  },

  // Install a tool
  async installTool(toolId) {
    const tool = this.findTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    if (tool.requiresRoot) {
      throw new Error('ROOT REQUIRED: This tool requires root access. Please root your device or use a proot-distro with proper permissions.');
    }
    return await this.executeReal('pkg', ['install', toolId, '-y'], true);
  },

  // Setup proot distro
  async setupProotDistro(distroId) {
    const validDistros = ['ubuntu', 'debian', 'kali', 'arch', 'fedora', 'opensuse', 'void'];
    if (!validDistros.includes(distroId.toLowerCase())) {
      throw new Error(`Invalid distro. Supported: ${validDistros.join(', ')}`);
    }
    return await this.executeReal('proot-distro', ['install', distroId.toLowerCase()], true);
  },

  // Check if tool is installed
  async isToolInstalled(toolId) {
    if (!isAvailable) return false;
    try {
      return await TerminalModule.checkToolInstalled(toolId);
    } catch (e) {
      return false;
    }
  },

  // Get tool categories
  getToolCategories() {
    return TOOL_CATEGORIES;
  },

  // Find tool by ID
  findTool(toolId) {
    for (const category of TOOL_CATEGORIES) {
      const tool = category.tools.find(t => t.id === toolId);
      if (tool) return tool;
    }
    return null;
  },

  // Get sandbox path
  async getSandboxPath() {
    if (!isAvailable) return null;
    return await TerminalModule.getSandboxPath();
  },

  // Clear sandbox
  async clearSandbox() {
    if (!isAvailable) return false;
    return await TerminalModule.clearSandbox();
  },

  // Write file to sandbox
  async writeSandboxFile(fileName, content) {
    if (!isAvailable) return null;
    return await TerminalModule.writeSandboxFile(fileName, content);
  },

  // Read file from sandbox
  async readSandboxFile(fileName) {
    if (!isAvailable) return null;
    return await TerminalModule.readSandboxFile(fileName);
  },

  // Session management
  getSessionManager() {
    return sessionManager;
  },

  getSession(id) {
    return sessionManager.getSession(id);
  },

  getActiveSessions() {
    return sessionManager.getActiveSessions();
  },

  killSession(id) {
    return sessionManager.killSession(id);
  },

  clearSessions() {
    sessionManager.clearSessions();
  },

  // Add output listener
  onOutput(callback) {
    return sessionManager.addOutputListener(callback);
  },

  // Remove output listener
  offOutput(callback) {
    sessionManager.removeOutputListener(callback);
  },

  // Get install instructions
  getInstallInstructions() {
    return [
      '1. Install Termux + Termux:API from F-Droid (NOT Play Store)',
      '2. Open Termux and run: pkg install termux-api',
      '3. Run: echo "allow-external-apps=true" >> ~/.termux/termux.properties',
      '4. Grant "Run commands in Termux" permission to MANU AI',
      '5. Restart Termux app',
    ];
  },

  // Get family use examples
  getFamilyUseExamples() {
    return [
      '• Run nmap to scan your home network for connected devices',
      '• Check what WiFi networks your kids connect to (requires root)',
      '• Use steghide to check images for hidden data',
      '• Monitor network traffic with tcpdump',
    ];
  },

  // Get tool status summary
  async getToolStatusSummary() {
    const summary = [];
    for (const category of TOOL_CATEGORIES) {
      for (const tool of category.tools) {
        const installed = await this.isToolInstalled(tool.id);
        summary.push({
          id: tool.id,
          name: tool.name,
          category: category.name,
          installed,
          requiresRoot: tool.requiresRoot,
        });
      }
    }
    return summary;
  },
};

export default TerminalManager;
