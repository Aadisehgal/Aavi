import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Study Focus Score)
// File: src/features/FocusScore.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule, NotificationListenerModule } = NativeModules;

const FOCUS_SESSION_KEY = '@manu_ai_focus_sessions';
const DAILY_SCORE_KEY = '@manu_ai_daily_focus_scores';

const DISTRACTION_APPS = [
  'com.instagram.android', 'com.facebook.katana', 'com.whatsapp',
  'com.twitter.android', 'com.snapchat.android', 'com.youtube.android',
  'com.tiktok.android', 'com.reddit.frontpage', 'com.discord',
];

const STUDY_APPS = [
  'com.google.android.apps.docs', 'com.microsoft.office.word',
  'com.microsoft.office.excel', 'com.microsoft.office.powerpoint',
  'com.google.android.apps.classroom', 'com.khanacademy.android',
  'com.duolingo', 'com.coursera.android',
];

/**
 * FocusScore tracks study sessions, distractions, and calculates
 * a daily focus rating to help users improve concentration.
 */
class FocusScore {
  constructor() {
    this.activeSession = null;
    this.dailyScores = new Map();
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(DAILY_SCORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.dailyScores = new Map(Object.entries(parsed.scores || {}));
      }
    } catch (e) {
      console.warn('[FocusScore] Init error:', e);
    }
  }

  /**
   * Start a focused study session.
   */
  async startFocusSession(taskName, durationMinutes = 25) {
    if (this.activeSession) {
      await this.endFocusSession();
    }

    this.activeSession = {
      id: `focus_${Date.now()}`,
      taskName,
      plannedDuration: durationMinutes,
      startTime: new Date().toISOString(),
      distractions: [],
      appSwitches: [],
      notificationsBlocked: 0,
    };

    // Enable DND if available
    if (Platform.OS === 'android' && NotificationListenerModule) {
      try {
        await NotificationListenerModule.enableDND();
      } catch (e) {
        console.warn('[FocusScore] DND error:', e);
      }
    }

    return this.activeSession.id;
  }

  /**
   * End the current focus session and calculate score.
   */
  async endFocusSession() {
    if (!this.activeSession) return null;

    const endTime = new Date().toISOString();
    const start = new Date(this.activeSession.startTime);
    const end = new Date(endTime);
    const actualDuration = (end - start) / (1000 * 60); // minutes

    const session = {
      ...this.activeSession,
      endTime,
      actualDuration,
      score: this._calculateSessionScore(this.activeSession, actualDuration),
    };

    // Save session
    try {
      const stored = await AsyncStorage.getItem(FOCUS_SESSION_KEY);
      const sessions = stored ? JSON.parse(stored) : [];
      sessions.push(session);
      if (sessions.length > 100) sessions.shift();
      await AsyncStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('[FocusScore] Session save error:', e);
    }

    // Update daily score
    await this._updateDailyScore(session);

    // Disable DND
    if (Platform.OS === 'android' && NotificationListenerModule) {
      try {
        await NotificationListenerModule.disableDND();
      } catch (e) {
        console.warn('[FocusScore] DND disable error:', e);
      }
    }

    this.activeSession = null;
    return session;
  }

  /**
   * Record a distraction during active session.
   */
  async recordDistraction(type, details = {}) {
    if (!this.activeSession) return;
    this.activeSession.distractions.push({
      type,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Record app switch during active session.
   */
  async recordAppSwitch(packageName, durationSeconds = 0) {
    if (!this.activeSession) return;
    const isDistraction = DISTRACTION_APPS.some(app => packageName.includes(app));
    this.activeSession.appSwitches.push({
      packageName,
      durationSeconds,
      isDistraction,
      timestamp: new Date().toISOString(),
    });
    if (isDistraction) {
      await this.recordDistraction('app_switch', { app: packageName });
    }
  }

  /**
   * Get today's focus score.
   */
  async getTodayScore() {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyScores.get(today) || { score: 0, sessions: 0, totalMinutes: 0, distractions: 0 };
  }

  /**
   * Get focus trend over time.
   */
  async getFocusTrend(days = 7) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(date => ({
      date,
      ...this.dailyScores.get(date),
    }));
  }

  /**
   * Get focus recommendations based on patterns.
   */
  async getRecommendations() {
    const trend = await this.getFocusTrend(7);
    const recommendations = [];

    const avgScore = trend.reduce((sum, d) => sum + (d.score || 0), 0) / trend.length;
    const avgDistractions = trend.reduce((sum, d) => sum + (d.distractions || 0), 0) / trend.length;

    if (avgScore < 50) {
      recommendations.push('Your focus score is low. Try shorter 15-minute sessions and gradually increase.');
    } else if (avgScore < 70) {
      recommendations.push('Good progress! Try the Pomodoro technique: 25 min focus, 5 min break.');
    } else {
      recommendations.push('Excellent focus habits! Consider challenging yourself with longer deep-work sessions.');
    }

    if (avgDistractions > 5) {
      recommendations.push('Many distractions detected. Enable Do Not Disturb during study sessions.');
    }

    const recentSessions = await this._getRecentSessions(7);
    const distractionApps = {};
    for (const session of recentSessions) {
      for (const sw of session.appSwitches || []) {
        if (sw.isDistraction) {
          distractionApps[sw.packageName] = (distractionApps[sw.packageName] || 0) + 1;
        }
      }
    }

    const topDistraction = Object.entries(distractionApps).sort((a, b) => b[1] - a[1])[0];
    if (topDistraction) {
      recommendations.push(`Your top distraction is ${topDistraction[0]}. Consider using app timers during study hours.`);
    }

    return recommendations;
  }

  // --- Private helpers ---

  _calculateSessionScore(session, actualDuration) {
    let score = 100;

    // Penalty for distractions
    score -= session.distractions.length * 5;

    // Penalty for app switches to distraction apps
    const distractionSwitches = session.appSwitches.filter(s => s.isDistraction).length;
    score -= distractionSwitches * 8;

    // Penalty for not completing planned duration
    const completionRatio = actualDuration / session.plannedDuration;
    if (completionRatio < 0.5) score -= 20;
    else if (completionRatio < 0.8) score -= 10;

    // Bonus for completing longer sessions
    if (actualDuration >= session.plannedDuration && session.plannedDuration >= 25) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  async _updateDailyScore(session) {
    const today = new Date().toISOString().split('T')[0];
    const current = this.dailyScores.get(today) || {
      score: 0,
      sessions: 0,
      totalMinutes: 0,
      distractions: 0,
    };

    const newTotalSessions = current.sessions + 1;
    const newTotalMinutes = current.totalMinutes + session.actualDuration;
    const newDistractions = current.distractions + session.distractions.length;

    // Weighted average of session scores
    const newScore = Math.round(
      ((current.score * current.sessions) + session.score) / newTotalSessions
    );

    this.dailyScores.set(today, {
      score: newScore,
      sessions: newTotalSessions,
      totalMinutes: newTotalMinutes,
      distractions: newDistractions,
    });

    try {
      await AsyncStorage.setItem(DAILY_SCORE_KEY, JSON.stringify({
        scores: Object.fromEntries(this.dailyScores),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[FocusScore] Daily score save error:', e);
    }
  }

  async _getRecentSessions(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    try {
      const stored = await AsyncStorage.getItem(FOCUS_SESSION_KEY);
      if (!stored) return [];
      const sessions = JSON.parse(stored);
      return sessions.filter(s => new Date(s.startTime) > cutoff);
    } catch (e) {
      return [];
    }
  }

  async reset() {
    this.activeSession = null;
    this.dailyScores.clear();
    await AsyncStorage.multiRemove([FOCUS_SESSION_KEY, DAILY_SCORE_KEY]);
  }
}

export default new FocusScore();
