import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Emotional Wellness Index)
// File: src/features/WellnessIndex.js
// Generated: 2026-06-24



const MOOD_KEY = '@manu_ai_mood_entries';
const WELLNESS_KEY = '@manu_ai_wellness_index';

/**
 * WellnessIndex tracks daily mood entries and calculates a weekly
 * emotional wellness score with trend analysis for parent reports.
 */
class WellnessIndex {
  constructor() {
    this.moodEntries = [];
    this.wellnessHistory = [];
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(MOOD_KEY);
      if (stored) this.moodEntries = JSON.parse(stored);
      const wellnessStored = await AsyncStorage.getItem(WELLNESS_KEY);
      if (wellnessStored) this.wellnessHistory = JSON.parse(wellnessStored);
    } catch (e) {
      console.warn('[WellnessIndex] Init error:', e);
    }
  }

  /**
   * Record a mood entry.
   * mood: 'happy', 'calm', 'neutral', 'sad', 'anxious', 'angry', 'stressed', 'excited'
   * intensity: 1-10
   */
  async recordMood(mood, intensity = 5, notes = '', context = {}) {
    const entry = {
      id: `mood_${Date.now()}`,
      mood,
      intensity,
      notes,
      context,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    this.moodEntries.push(entry);
    if (this.moodEntries.length > 365) this.moodEntries.shift();
    await this._persistMoods();
    await this._calculateWeeklyIndex();
    return entry;
  }

  /**
   * Calculate the current wellness index.
   */
  async getCurrentIndex() {
    const recent = this._getRecentEntries(7);
    if (recent.length === 0) {
      return { score: 50, status: 'unknown', message: 'Not enough mood data yet.' };
    }
    return this._calculateIndexFromEntries(recent);
  }

  /**
   * Get weekly wellness report for parent dashboard.
   */
  async getWeeklyReport() {
    const recent = this._getRecentEntries(7);
    const index = this._calculateIndexFromEntries(recent);
    const moodDistribution = this._getMoodDistribution(recent);
    const trend = this._getTrend(14);
    const alerts = this._generateAlerts(recent);

    return {
      weekStarting: this._getWeekStart(),
      wellnessScore: index.score,
      status: index.status,
      moodDistribution,
      trend,
      alerts,
      totalEntries: recent.length,
      avgIntensity: recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length,
    };
  }

  /**
   * Get trend over specified days.
   */
  async getTrend(days = 14) {
    return this._getTrend(days);
  }

  /**
   * Get mood distribution for a period.
   */
  async getMoodDistribution(days = 7) {
    const recent = this._getRecentEntries(days);
    return this._getMoodDistribution(recent);
  }

  /**
   * Detect concerning patterns and generate alerts.
   */
  async getAlerts() {
    const recent = this._getRecentEntries(7);
    return this._generateAlerts(recent);
  }

  // --- Private helpers ---

  _getRecentEntries(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.moodEntries.filter(e => new Date(e.timestamp) > cutoff);
  }

  _calculateIndexFromEntries(entries) {
    if (entries.length === 0) return { score: 50, status: 'unknown' };

    const moodScores = {
      happy: 90, excited: 85, calm: 80, neutral: 60,
      sad: 40, anxious: 35, stressed: 30, angry: 25,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const entry of entries) {
      const baseScore = moodScores[entry.mood] || 50;
      // Intensity amplifies the score direction
      const intensityFactor = (entry.intensity - 5) / 5; // -1 to +1
      const adjustedScore = baseScore + (intensityFactor * 10);
      const weight = 1; // Could be time-based weighting
      totalScore += adjustedScore * weight;
      totalWeight += weight;
    }

    const score = Math.round(totalScore / totalWeight);
    let status = 'neutral';
    if (score >= 80) status = 'excellent';
    else if (score >= 65) status = 'good';
    else if (score >= 50) status = 'fair';
    else if (score >= 35) status = 'concerning';
    else status = 'critical';

    const message = this._getStatusMessage(status, score);
    return { score, status, message };
  }

  _getMoodDistribution(entries) {
    const distribution = {};
    for (const entry of entries) {
      distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
    }
    return distribution;
  }

  _getTrend(days) {
    const recent = this._getRecentEntries(days);
    if (recent.length < 4) return { direction: 'insufficient_data', change: 0 };

    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);

    const firstIndex = this._calculateIndexFromEntries(firstHalf).score;
    const secondIndex = this._calculateIndexFromEntries(secondHalf).score;
    const change = secondIndex - firstIndex;

    let direction = 'stable';
    if (change > 10) direction = 'improving';
    else if (change < -10) direction = 'declining';

    return { direction, change, firstHalfScore: firstIndex, secondHalfScore: secondIndex };
  }

  _generateAlerts(entries) {
    const alerts = [];
    const negativeMoods = ['sad', 'anxious', 'stressed', 'angry'];
    const negativeEntries = entries.filter(e => negativeMoods.includes(e.mood));

    // Alert 1: High frequency of negative moods
    if (negativeEntries.length >= 5) {
      alerts.push({
        type: 'negative_frequency',
        severity: 'high',
        message: 'Frequent negative mood entries detected over the past week.',
        suggestion: 'Consider checking in with the user about their wellbeing.',
      });
    } else if (negativeEntries.length >= 3) {
      alerts.push({
        type: 'negative_frequency',
        severity: 'medium',
        message: 'Several negative mood entries this week.',
        suggestion: 'Keep an eye on mood patterns.',
      });
    }

    // Alert 2: Consecutive negative entries
    let consecutiveNegative = 0;
    let maxConsecutive = 0;
    for (const entry of entries) {
      if (negativeMoods.includes(entry.mood)) {
        consecutiveNegative++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveNegative);
      } else {
        consecutiveNegative = 0;
      }
    }

    if (maxConsecutive >= 3) {
      alerts.push({
        type: 'consecutive_negative',
        severity: 'high',
        message: ` ${maxConsecutive} consecutive negative mood entries detected.`,
        suggestion: 'This pattern may indicate ongoing distress. A conversation is recommended.',
      });
    }

    // Alert 3: Low intensity positive moods (possible masking)
    const lowIntensityPositive = entries.filter(e =>
      ['happy', 'calm', 'excited'].includes(e.mood) && e.intensity <= 3
    );
    if (lowIntensityPositive.length >= 3) {
      alerts.push({
        type: 'low_intensity_positive',
        severity: 'low',
        message: 'Positive moods reported with low intensity — possible emotional masking.',
        suggestion: 'Check if the user is genuinely feeling okay or just reporting expected responses.',
      });
    }

    return alerts;
  }

  _getStatusMessage(status, score) {
    switch (status) {
      case 'excellent': return 'Emotional wellness is excellent. Keep maintaining healthy habits!';
      case 'good': return 'Emotional wellness is good. Minor improvements can help sustain this.';
      case 'fair': return 'Emotional wellness is fair. Some stressors may be affecting mood.';
      case 'concerning': return 'Emotional wellness is concerning. Consider talking to someone supportive.';
      case 'critical': return 'Emotional wellness is critical. Please reach out to a trusted adult or counselor.';
      default: return 'Not enough data to assess emotional wellness.';
    }
  }

  _getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  async _persistMoods() {
    try {
      await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(this.moodEntries));
    } catch (e) {
      console.warn('[WellnessIndex] Persist error:', e);
    }
  }

  async _calculateWeeklyIndex() {
    const index = await this.getCurrentIndex();
    this.wellnessHistory.push({
      date: new Date().toISOString().split('T')[0],
      score: index.score,
      status: index.status,
    });
    if (this.wellnessHistory.length > 52) this.wellnessHistory.shift();
    try {
      await AsyncStorage.setItem(WELLNESS_KEY, JSON.stringify(this.wellnessHistory));
    } catch (e) {
      console.warn('[WellnessIndex] Wellness save error:', e);
    }
  }

  async reset() {
    this.moodEntries = [];
    this.wellnessHistory = [];
    await AsyncStorage.multiRemove([MOOD_KEY, WELLNESS_KEY]);
  }
}

export default new WellnessIndex();
