import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Auto-Command Scripting)
// File: src/features/AutoScript.js
// Generated: 2026-06-24



const SCRIPT_KEY = '@manu_ai_auto_scripts';
const EXECUTION_LOG_KEY = '@manu_ai_script_executions';

/**
 * AutoScript detects repetitive user commands and automatically
 * creates executable scripts that can be triggered by a single command.
 */
class AutoScript {
  constructor() {
    this.scripts = [];
    this.commandHistory = [];
    this.repetitionThreshold = 3;
    this.minCommandLength = 5;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(SCRIPT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.scripts = parsed.scripts || [];
      }
    } catch (e) {
      console.warn('[AutoScript] Init error:', e);
    }
  }

  /**
   * Record a user command for pattern detection.
   */
  async recordCommand(command, actions = []) {
    const normalized = this._normalizeCommand(command);
    if (normalized.length < this.minCommandLength) return;

    const entry = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      command: normalized,
      originalCommand: command,
      actions,
      timestamp: new Date().toISOString(),
    };

    this.commandHistory.push(entry);
    if (this.commandHistory.length > 200) this.commandHistory.shift();

    await this._detectRepetition(normalized, actions);
  }

  /**
   * Execute a script by name or ID.
   */
  async executeScript(scriptIdOrName) {
    const script = this.scripts.find(
      s => s.id === scriptIdOrName || s.name.toLowerCase() === scriptIdOrName.toLowerCase()
    );

    if (!script) {
      return { success: false, error: 'Script not found', executedActions: [] };
    }

    const results = [];
    for (const action of script.actions) {
      try {
        const result = await this._executeAction(action);
        results.push({ action, success: true, result });
      } catch (e) {
        results.push({ action, success: false, error: e.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    await this._logExecution(script, results);

    return {
      success: allSuccess,
      scriptName: script.name,
      executedActions: results,
    };
  }

  /**
   * Get all created scripts.
   */
  async getScripts() {
    return this.scripts.map(s => ({
      id: s.id,
      name: s.name,
      triggerPhrase: s.triggerPhrase,
      actionsCount: s.actions.length,
      createdAt: s.createdAt,
      executionCount: s.executionCount || 0,
      lastExecuted: s.lastExecuted,
    }));
  }

  /**
   * Create a script manually.
   */
  async createScript(name, triggerPhrase, actions) {
    const script = {
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      triggerPhrase: this._normalizeCommand(triggerPhrase),
      actions,
      createdAt: new Date().toISOString(),
      executionCount: 0,
      lastExecuted: null,
      autoCreated: false,
    };

    this.scripts.push(script);
    await this._persistScripts();
    return script;
  }

  /**
   * Delete a script.
   */
  async deleteScript(scriptId) {
    this.scripts = this.scripts.filter(s => s.id !== scriptId);
    await this._persistScripts();
  }

  /**
   * Get execution history.
   */
  async getExecutionHistory(limit = 20) {
    try {
      const stored = await AsyncStorage.getItem(EXECUTION_LOG_KEY);
      if (!stored) return [];
      const logs = JSON.parse(stored);
      return logs.slice(-limit).reverse();
    } catch (e) {
      return [];
    }
  }

  /**
   * Find a script matching a natural language command.
   */
  async findScriptForCommand(command) {
    const normalized = this._normalizeCommand(command);

    // Exact match
    let match = this.scripts.find(s => s.triggerPhrase === normalized);
    if (match) return match;

    // Keyword overlap
    const commandWords = new Set(normalized.split(/\s+/));
    let bestMatch = null;
    let bestScore = 0;

    for (const script of this.scripts) {
      const scriptWords = new Set(script.triggerPhrase.split(/\s+/));
      const intersection = [...commandWords].filter(w => scriptWords.has(w));
      const score = intersection.length / Math.max(commandWords.size, scriptWords.size);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = script;
      }
    }

    return bestMatch;
  }

  // --- Private helpers ---

  async _detectRepetition(command, actions) {
    const recent = this.commandHistory.filter(
      h => h.command === command && new Date(h.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recent.length >= this.repetitionThreshold) {
      const existing = this.scripts.find(s => s.triggerPhrase === command);
      if (!existing) {
        const script = {
          id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: this._generateScriptName(command),
          triggerPhrase: command,
          actions: actions.length > 0 ? actions : this._inferActions(command),
          createdAt: new Date().toISOString(),
          executionCount: 0,
          lastExecuted: null,
          autoCreated: true,
          repetitionCount: recent.length,
        };
        this.scripts.push(script);
        await this._persistScripts();
      }
    }
  }

  _inferActions(command) {
    const actions = [];
    const lower = command.toLowerCase();

    if (lower.includes('study') || lower.includes('focus')) {
      actions.push({ type: 'enable_dnd' });
      actions.push({ type: 'launch_app', package: 'com.google.android.apps.docs' });
      actions.push({ type: 'set_timer', duration: 25 });
    } else if (lower.includes('sleep') || lower.includes('bed')) {
      actions.push({ type: 'enable_dnd' });
      actions.push({ type: 'set_alarm', offsetMinutes: 480 });
      actions.push({ type: 'dim_screen' });
    } else if (lower.includes('morning') || lower.includes('wake')) {
      actions.push({ type: 'disable_dnd' });
      actions.push({ type: 'read_weather' });
      actions.push({ type: 'read_calendar' });
    } else if (lower.includes('workout') || lower.includes('gym')) {
      actions.push({ type: 'launch_app', package: 'com.google.android.apps.fitness' });
      actions.push({ type: 'play_music', playlist: 'workout' });
      actions.push({ type: 'set_timer', duration: 60 });
    } else {
      actions.push({ type: 'custom', command });
    }

    return actions;
  }

  async _executeAction(action) {
    // Placeholder for actual action execution
    // In production, these would interface with native modules
    switch (action.type) {
      case 'enable_dnd':
        return { type: 'dnd', status: 'enabled' };
      case 'disable_dnd':
        return { type: 'dnd', status: 'disabled' };
      case 'launch_app':
        return { type: 'app', package: action.package, status: 'launched' };
      case 'set_timer':
        return { type: 'timer', duration: action.duration, status: 'set' };
      case 'set_alarm':
        return { type: 'alarm', offsetMinutes: action.offsetMinutes, status: 'set' };
      case 'dim_screen':
        return { type: 'screen', brightness: 0.1, status: 'dimmed' };
      case 'read_weather':
        return { type: 'weather', status: 'read' };
      case 'read_calendar':
        return { type: 'calendar', status: 'read' };
      case 'play_music':
        return { type: 'music', playlist: action.playlist, status: 'playing' };
      case 'custom':
        return { type: 'custom', command: action.command, status: 'executed' };
      default:
        return { type: action.type, status: 'unknown' };
    }
  }

  _generateScriptName(command) {
    const words = command.split(/\s+/).filter(w => w.length > 2);
    const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return name || 'Auto Script';
  }

  _normalizeCommand(command) {
    return command
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async _persistScripts() {
    try {
      await AsyncStorage.setItem(SCRIPT_KEY, JSON.stringify({
        scripts: this.scripts,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[AutoScript] Persist error:', e);
    }
  }

  async _logExecution(script, results) {
    try {
      script.executionCount = (script.executionCount || 0) + 1;
      script.lastExecuted = new Date().toISOString();
      await this._persistScripts();

      const stored = await AsyncStorage.getItem(EXECUTION_LOG_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      logs.push({
        scriptId: script.id,
        scriptName: script.name,
        timestamp: new Date().toISOString(),
        success: results.every(r => r.success),
        results,
      });
      if (logs.length > 100) logs.shift();
      await AsyncStorage.setItem(EXECUTION_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[AutoScript] Log error:', e);
    }
  }

  async reset() {
    this.scripts = [];
    this.commandHistory = [];
    await AsyncStorage.multiRemove([SCRIPT_KEY, EXECUTION_LOG_KEY]);
  }
}

export default new AutoScript();
