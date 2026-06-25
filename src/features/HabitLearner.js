import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Habit Pattern Learner)
// File: src/features/HabitLearner.js
// Generated: 2026-06-24



const HABIT_KEY = '@manu_ai_habits';
const ROUTINE_KEY = '@manu_ai_learned_routines';

/**
 * HabitLearner observes daily routines from app usage, time patterns,
 * and user actions to auto-suggest optimized routines.
 */
class HabitLearner {
  constructor() {
    this.habits = new Map();
    this.routines = [];
    this.minObservations = 5;
    this.confidenceThreshold = 0.7;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(HABIT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.habits = new Map(parsed.habits || []);
      }
      const routineStored = await AsyncStorage.getItem(ROUTINE_KEY);
      if (routineStored) {
        this.routines = JSON.parse(routineStored).routines || [];
      }
    } catch (e) {
      console.warn('[HabitLearner] Init error:', e);
    }
  }

  /**
   * Record an observed habit/action.
   */
  async recordHabit(action, context = {}) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const timeSlot = this._getTimeSlot(hour);
    const habitKey = `${action}_${dayOfWeek}_${timeSlot}`;

    const existing = this.habits.get(habitKey) || {
      action,
      dayOfWeek,
      timeSlot,
      observations: [],
      createdAt: now.toISOString(),
    };

    existing.observations.push({
      timestamp: now.toISOString(),
      duration: context.duration || 0,
      location: context.location || null,
      metadata: context.metadata || {},
    });

    // Keep last 30 observations
    if (existing.observations.length > 30) {
      existing.observations = existing.observations.slice(-30);
    }

    this.habits.set(habitKey, existing);
    await this._persistHabits();
    await this._checkForRoutine(action, dayOfWeek, timeSlot);
  }

  /**
   * Get learned habits for a specific time/day.
   */
  async getHabitsForTime(dayOfWeek, hour) {
    const timeSlot = this._getTimeSlot(hour);
    const results = [];
    for (const [key, habit] of this.habits.entries()) {
      if (habit.dayOfWeek === dayOfWeek && habit.timeSlot === timeSlot) {
        const frequency = habit.observations.length;
        const consistency = this._calculateConsistency(habit.observations);
        const confidence = Math.min(frequency / this.minObservations, 1.0) * consistency;
        results.push({ ...habit, frequency, consistency, confidence });
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get all learned routines.
   */
  async getLearnedRoutines() {
    return this.routines.filter(r => r.confidence >= this.confidenceThreshold);
  }

  /**
   * Suggest routines based on current time and learned habits.
   */
  async suggestRoutines() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const habits = await this.getHabitsForTime(dayOfWeek, hour);
    const suggestions = [];

    for (const habit of habits) {
      if (habit.confidence >= this.confidenceThreshold) {
        suggestions.push({
          type: 'habit_suggestion',
          action: habit.action,
          confidence: habit.confidence,
          message: `You usually ${habit.action} around this time. Start now?`,
          autoTrigger: habit.confidence > 0.9,
        });
      }
    }

    // Check for routine gaps
    const routineSuggestions = this._suggestRoutineCompletions(dayOfWeek, hour);
    suggestions.push(...routineSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get habit statistics for a time period.
   */
  async getHabitStats(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stats = { totalObservations: 0, topHabits: [], consistency: 0 };
    const actionCounts = {};

    for (const [, habit] of this.habits) {
      const recentObs = habit.observations.filter(o => new Date(o.timestamp) > cutoff);
      stats.totalObservations += recentObs.length;
      actionCounts[habit.action] = (actionCounts[habit.action] || 0) + recentObs.length;
    }

    stats.topHabits = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return stats;
  }

  // --- Private helpers ---

  async _checkForRoutine(action, dayOfWeek, timeSlot) {
    const habitKey = `${action}_${dayOfWeek}_${timeSlot}`;
    const habit = this.habits.get(habitKey);
    if (!habit || habit.observations.length < this.minObservations) return;

    const consistency = this._calculateConsistency(habit.observations);
    const confidence = Math.min(habit.observations.length / 10, 1.0) * consistency;

    if (confidence >= this.confidenceThreshold) {
      const existingRoutine = this.routines.find(
        r => r.action === action && r.dayOfWeek === dayOfWeek && r.timeSlot === timeSlot
      );

      if (!existingRoutine) {
        this.routines.push({
          id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          action,
          dayOfWeek,
          timeSlot,
          confidence,
          observations: habit.observations.length,
          createdAt: new Date().toISOString(),
        });
      } else {
        existingRoutine.confidence = confidence;
        existingRoutine.observations = habit.observations.length;
      }

      await this._persistRoutines();
    }
  }

  _calculateConsistency(observations) {
    if (observations.length < 2) return 1.0;
    const times = observations.map(o => {
      const d = new Date(o.timestamp);
      return d.getHours() * 60 + d.getMinutes();
    });
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    // Lower stdDev = higher consistency (max 30 min variance = 100% consistency)
    return Math.max(0, 1 - stdDev / 60);
  }

  _suggestRoutineCompletions(dayOfWeek, hour) {
    const suggestions = [];
    const currentSlot = this._getTimeSlot(hour);
    const nextSlot = this._getNextTimeSlot(currentSlot);

    const nextHabits = [];
    for (const [, habit] of this.habits) {
      if (habit.dayOfWeek === dayOfWeek && habit.timeSlot === nextSlot) {
        nextHabits.push(habit);
      }
    }

    if (nextHabits.length > 0) {
      const topHabit = nextHabits.sort((a, b) => b.observations.length - a.observations.length)[0];
      suggestions.push({
        type: 'routine_completion',
        action: topHabit.action,
        confidence: Math.min(topHabit.observations.length / 10, 1.0),
        message: `Coming up next: you usually ${topHabit.action} in the ${nextSlot}.`,
        autoTrigger: false,
      });
    }

    return suggestions;
  }

  _getTimeSlot(hour) {
    if (hour >= 5 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'late_morning';
    if (hour >= 12 && hour < 14) return 'afternoon';
    if (hour >= 14 && hour < 17) return 'late_afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  _getNextTimeSlot(current) {
    const slots = ['morning', 'late_morning', 'afternoon', 'late_afternoon', 'evening', 'night'];
    const idx = slots.indexOf(current);
    return slots[(idx + 1) % slots.length];
  }

  async _persistHabits() {
    try {
      await AsyncStorage.setItem(HABIT_KEY, JSON.stringify({
        habits: Array.from(this.habits.entries()),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[HabitLearner] Persist error:', e);
    }
  }

  async _persistRoutines() {
    try {
      await AsyncStorage.setItem(ROUTINE_KEY, JSON.stringify({
        routines: this.routines,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[HabitLearner] Routine persist error:', e);
    }
  }

  async reset() {
    this.habits.clear();
    this.routines = [];
    await AsyncStorage.multiRemove([HABIT_KEY, ROUTINE_KEY]);
  }
}

export default new HabitLearner();
