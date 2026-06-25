import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Smart Routine Builder)
// File: src/features/RoutineBuilder.js
// Generated: 2026-06-24



const ROUTINE_KEY = '@manu_ai_routines';
const ACTIVE_ROUTINE_KEY = '@manu_ai_active_routine';

/**
 * RoutineBuilder creates and manages smart routines like "Study Mode",
 * "Sleep Mode", "Morning Routine" with automated actions and triggers.
 */
class RoutineBuilder {
  constructor() {
    this.routines = [];
    this.activeRoutine = null;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(ROUTINE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.routines = parsed.routines || [];
      }
      const active = await AsyncStorage.getItem(ACTIVE_ROUTINE_KEY);
      if (active) this.activeRoutine = JSON.parse(active);
    } catch (e) {
      console.warn('[RoutineBuilder] Init error:', e);
    }
  }

  /**
   * Create a new smart routine.
   */
  async createRoutine(name, config) {
    const routine = {
      id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      description: config.description || '',
      icon: config.icon || 'default',
      color: config.color || '#4A90D9',
      triggers: config.triggers || [],
      actions: config.actions || [],
      autoStart: config.autoStart || false,
      schedule: config.schedule || null, // { days: [0,1,2], time: '08:00' }
      createdAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: null,
    };

    this.routines.push(routine);
    await this._persistRoutines();
    return routine;
  }

  /**
   * Start a routine.
   */
  async startRoutine(routineId) {
    const routine = this.routines.find(r => r.id === routineId);
    if (!routine) return { success: false, error: 'Routine not found' };

    if (this.activeRoutine) {
      await this.endRoutine();
    }

    this.activeRoutine = {
      ...routine,
      startTime: new Date().toISOString(),
      executedActions: [],
    };

    // Execute routine actions
    const results = [];
    for (const action of routine.actions) {
      try {
        const result = await this._executeRoutineAction(action);
        results.push({ action, success: true, result });
        this.activeRoutine.executedActions.push(action);
      } catch (e) {
        results.push({ action, success: false, error: e.message });
      }
    }

    routine.usageCount += 1;
    routine.lastUsed = new Date().toISOString();
    await this._persistRoutines();
    await this._persistActiveRoutine();

    return { success: true, routine, results };
  }

  /**
   * End the currently active routine.
   */
  async endRoutine() {
    if (!this.activeRoutine) return { success: false, error: 'No active routine' };

    const endTime = new Date().toISOString();
    const duration = (new Date(endTime) - new Date(this.activeRoutine.startTime)) / (1000 * 60);

    // Execute end actions if defined
    const endActions = this.activeRoutine.actions.filter(a => a.phase === 'end');
    const results = [];
    for (const action of endActions) {
      try {
        const result = await this._executeRoutineAction(action);
        results.push({ action, success: true, result });
      } catch (e) {
        results.push({ action, success: false, error: e.message });
      }
    }

    const completed = {
      ...this.activeRoutine,
      endTime,
      durationMinutes: duration,
      endResults: results,
    };

    this.activeRoutine = null;
    await AsyncStorage.removeItem(ACTIVE_ROUTINE_KEY);

    return { success: true, completed };
  }

  /**
   * Get all routines.
   */
  async getRoutines() {
    return this.routines.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      icon: r.icon,
      color: r.color,
      autoStart: r.autoStart,
      schedule: r.schedule,
      usageCount: r.usageCount,
      lastUsed: r.lastUsed,
      isActive: this.activeRoutine?.id === r.id,
    }));
  }

  /**
   * Get active routine status.
   */
  async getActiveRoutine() {
    if (!this.activeRoutine) return null;
    const duration = (Date.now() - new Date(this.activeRoutine.startTime).getTime()) / (1000 * 60);
    return {
      ...this.activeRoutine,
      durationMinutes: Math.round(duration),
    };
  }

  /**
   * Check if any routine should auto-start based on triggers.
   */
  async checkAutoTriggers(context = {}) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const dayOfWeek = now.getDay();

    const triggered = [];

    for (const routine of this.routines) {
      if (!routine.autoStart) continue;

      // Time-based trigger
      if (routine.schedule) {
        const { days, time } = routine.schedule;
        if (days.includes(dayOfWeek) && time === currentTime) {
          triggered.push(routine);
          continue;
        }
      }

      // Context-based triggers
      for (const trigger of routine.triggers) {
        if (trigger.type === 'location' && context.location === trigger.value) {
          triggered.push(routine);
          break;
        }
        if (trigger.type === 'app_open' && context.app === trigger.value) {
          triggered.push(routine);
          break;
        }
        if (trigger.type === 'time' && context.time === trigger.value) {
          triggered.push(routine);
          break;
        }
        if (trigger.type === 'battery' && context.batteryLevel <= trigger.threshold) {
          triggered.push(routine);
          break;
        }
      }
    }

    return triggered;
  }

  /**
   * Delete a routine.
   */
  async deleteRoutine(routineId) {
    if (this.activeRoutine?.id === routineId) {
      await this.endRoutine();
    }
    this.routines = this.routines.filter(r => r.id !== routineId);
    await this._persistRoutines();
  }

  /**
   * Create preset routines.
   */
  async createPresetRoutines() {
    const presets = [
      {
        name: 'Study Mode',
        description: 'Optimized for deep focus and learning',
        icon: 'book',
        color: '#2E7D32',
        triggers: [{ type: 'time', value: '19:00' }],
        actions: [
          { type: 'enable_dnd', phase: 'start' },
          { type: 'set_brightness', value: 0.4, phase: 'start' },
          { type: 'launch_app', package: 'com.google.android.apps.docs', phase: 'start' },
          { type: 'set_timer', duration: 25, phase: 'start' },
          { type: 'disable_dnd', phase: 'end' },
          { type: 'set_brightness', value: 0.7, phase: 'end' },
        ],
        autoStart: false,
      },
      {
        name: 'Sleep Mode',
        description: 'Prepare for restful sleep',
        icon: 'moon',
        color: '#1A237E',
        triggers: [{ type: 'time', value: '22:30' }],
        actions: [
          { type: 'enable_dnd', phase: 'start' },
          { type: 'set_brightness', value: 0.05, phase: 'start' },
          { type: 'close_apps', apps: ['com.instagram.android', 'com.youtube.android'], phase: 'start' },
          { type: 'set_alarm', offsetMinutes: 480, phase: 'start' },
          { type: 'disable_dnd', phase: 'end' },
        ],
        autoStart: false,
      },
      {
        name: 'Morning Routine',
        description: 'Start your day energized',
        icon: 'sun',
        color: '#F57C00',
        triggers: [{ type: 'time', value: '07:00' }],
        actions: [
          { type: 'disable_dnd', phase: 'start' },
          { type: 'set_brightness', value: 0.8, phase: 'start' },
          { type: 'read_weather', phase: 'start' },
          { type: 'read_calendar', phase: 'start' },
          { type: 'play_music', playlist: 'morning', phase: 'start' },
        ],
        autoStart: false,
      },
      {
        name: 'Workout Mode',
        description: 'Focus on fitness and health',
        icon: 'fitness',
        color: '#C62828',
        triggers: [],
        actions: [
          { type: 'enable_dnd', phase: 'start' },
          { type: 'set_brightness', value: 0.6, phase: 'start' },
          { type: 'launch_app', package: 'com.google.android.apps.fitness', phase: 'start' },
          { type: 'play_music', playlist: 'workout', phase: 'start' },
          { type: 'set_timer', duration: 60, phase: 'start' },
          { type: 'disable_dnd', phase: 'end' },
        ],
        autoStart: false,
      },
    ];

    for (const preset of presets) {
      const exists = this.routines.find(r => r.name === preset.name);
      if (!exists) {
        await this.createRoutine(preset.name, preset);
      }
    }
  }

  // --- Private helpers ---

  async _executeRoutineAction(action) {
    // Placeholder — actual implementation interfaces with native modules
    switch (action.type) {
      case 'enable_dnd': return { status: 'enabled' };
      case 'disable_dnd': return { status: 'disabled' };
      case 'set_brightness': return { brightness: action.value, status: 'set' };
      case 'launch_app': return { package: action.package, status: 'launched' };
      case 'close_apps': return { closed: action.apps, status: 'closed' };
      case 'set_timer': return { duration: action.duration, status: 'set' };
      case 'set_alarm': return { offsetMinutes: action.offsetMinutes, status: 'set' };
      case 'read_weather': return { status: 'read' };
      case 'read_calendar': return { status: 'read' };
      case 'play_music': return { playlist: action.playlist, status: 'playing' };
      default: return { status: 'unknown' };
    }
  }

  async _persistRoutines() {
    try {
      await AsyncStorage.setItem(ROUTINE_KEY, JSON.stringify({
        routines: this.routines,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[RoutineBuilder] Persist error:', e);
    }
  }

  async _persistActiveRoutine() {
    try {
      await AsyncStorage.setItem(ACTIVE_ROUTINE_KEY, JSON.stringify(this.activeRoutine));
    } catch (e) {
      console.warn('[RoutineBuilder] Active routine persist error:', e);
    }
  }

  async reset() {
    this.routines = [];
    this.activeRoutine = null;
    await AsyncStorage.multiRemove([ROUTINE_KEY, ACTIVE_ROUTINE_KEY]);
  }
}

export default new RoutineBuilder();
