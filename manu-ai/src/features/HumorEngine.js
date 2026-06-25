// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Sarcasm & Humor Detection)
// File: src/features/HumorEngine.js
// Generated: 2026-06-24

import AsyncStorage from '@react-native-async-storage/async-storage';

const LEARNED_KEY = '@manu_ai_humor_learned';

/**
 * HumorEngine detects sarcasm, humor, and playful tone in text
 * using pattern matching, keyword analysis, and contextual cues.
 */
class HumorEngine {
  constructor() {
    this.sarcasmPatterns = this._getSarcasmPatterns();
    this.humorPatterns = this._getHumorPatterns();
    this.contextualBoosters = this._getContextualBoosters();
    this.learnedSarcasm = new Map();
    this.learnedHumor = new Map();
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(LEARNED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.learnedSarcasm = new Map(parsed.sarcasm || []);
        this.learnedHumor = new Map(parsed.humor || []);
      }
    } catch (e) {
      console.warn('[HumorEngine] Init error:', e);
    }
  }

  /**
   * Analyze text for sarcasm, humor, and emotional tone.
   * Returns: { isSarcastic, isHumorous, confidence, tone, explanation }
   */
  analyze(text, context = {}) {
    const lowerText = (text || '').toLowerCase().trim();
    if (!lowerText) {
      return { isSarcastic: false, isHumorous: false, confidence: 0, tone: 'neutral', explanation: 'Empty text' };
    }

    let sarcasmScore = 0;
    let humorScore = 0;
    const matchedPatterns = [];

    // 1. Sarcasm detection
    for (const pattern of this.sarcasmPatterns) {
      if (pattern.regex.test(lowerText)) {
        sarcasmScore += pattern.weight;
        matchedPatterns.push({ type: 'sarcasm', pattern: pattern.name, weight: pattern.weight });
      }
    }

    // 2. Humor detection
    for (const pattern of this.humorPatterns) {
      if (pattern.regex.test(lowerText)) {
        humorScore += pattern.weight;
        matchedPatterns.push({ type: 'humor', pattern: pattern.name, weight: pattern.weight });
      }
    }

    // 3. Contextual boosters
    for (const booster of this.contextualBoosters) {
      if (booster.regex.test(lowerText)) {
        if (booster.target === 'sarcasm') sarcasmScore += booster.weight;
        if (booster.target === 'humor') humorScore += booster.weight;
        matchedPatterns.push({ type: 'booster', pattern: booster.name, weight: booster.weight });
      }
    }

    // 4. Structural cues
    const words = lowerText.split(/\s+/);
    const positiveWords = ['great', 'awesome', 'love', 'best', 'perfect', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disgusting', 'pathetic'];
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;

    // Positive words in negative context = sarcasm
    if (positiveCount > 0 && negativeCount > 0) {
      sarcasmScore += 1.5;
      matchedPatterns.push({ type: 'structural', pattern: 'positive_negative_mix', weight: 1.5 });
    }

    // Excessive punctuation = humor or excitement
    const exclamationCount = (lowerText.match(/!/g) || []).length;
    if (exclamationCount >= 3) {
      humorScore += 0.5;
      sarcasmScore += 0.5;
    }

    // ALL CAPS words
    const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
    if (capsWords > 0) {
      sarcasmScore += capsWords * 0.3;
      humorScore += capsWords * 0.2;
    }

    // 5. Learned patterns
    const learnedSarcasmScore = this._checkLearnedPatterns(lowerText, this.learnedSarcasm);
    const learnedHumorScore = this._checkLearnedPatterns(lowerText, this.learnedHumor);
    sarcasmScore += learnedSarcasmScore;
    humorScore += learnedHumorScore;

    // Normalize scores
    const maxPossibleScore = 8;
    const sarcasmConfidence = Math.min(sarcasmScore / maxPossibleScore, 1.0);
    const humorConfidence = Math.min(humorScore / maxPossibleScore, 1.0);

    const isSarcastic = sarcasmConfidence > 0.55;
    const isHumorous = humorConfidence > 0.55 && !isSarcastic;

    let tone = 'neutral';
    if (isSarcastic) tone = 'sarcastic';
    else if (isHumorous) tone = 'humorous';
    else if (sarcasmConfidence > 0.3) tone = 'possibly_sarcastic';
    else if (humorConfidence > 0.3) tone = 'possibly_humorous';

    const explanation = this._generateExplanation(isSarcastic, isHumorous, matchedPatterns, sarcasmConfidence, humorConfidence);

    return {
      isSarcastic,
      isHumorous,
      sarcasmConfidence,
      humorConfidence,
      tone,
      explanation,
      matchedPatterns: matchedPatterns.slice(0, 5),
    };
  }

  /**
   * Log a sarcastic/humorous message for parent review (privacy-safe).
   */
  async logForParent(text, analysisResult) {
    if (!analysisResult.isSarcastic && !analysisResult.isHumorous) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      tone: analysisResult.tone,
      confidence: analysisResult.isSarcastic ? analysisResult.sarcasmConfidence : analysisResult.humorConfidence,
      summary: text.length > 50 ? text.substring(0, 50) + '...' : text,
      hash: this._hashText(text),
    };

    try {
      const key = '@manu_ai_tone_log';
      const stored = await AsyncStorage.getItem(key);
      const logs = stored ? JSON.parse(stored) : [];
      logs.push(logEntry);
      if (logs.length > 100) logs.shift();
      await AsyncStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      console.warn('[HumorEngine] Log error:', e);
    }
  }

  /**
   * Get tone log summary for parent dashboard.
   */
  async getToneLogSummary(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    try {
      const stored = await AsyncStorage.getItem('@manu_ai_tone_log');
      if (!stored) return { sarcasticCount: 0, humorousCount: 0, total: 0, recent: [] };
      const logs = JSON.parse(stored).filter(l => new Date(l.timestamp).getTime() > cutoff);
      const sarcasticCount = logs.filter(l => l.tone === 'sarcastic').length;
      const humorousCount = logs.filter(l => l.tone === 'humorous').length;
      return { sarcasticCount, humorousCount, total: logs.length, recent: logs.slice(-10) };
    } catch (e) {
      return { sarcasticCount: 0, humorousCount: 0, total: 0, recent: [] };
    }
  }

  /**
   * Learn from user feedback about sarcasm/humor detection.
   */
  async learnFeedback(text, wasActuallySarcastic, wasActuallyHumorous) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 3);

    if (wasActuallySarcastic) {
      for (const word of words) {
        const key = `sarc_${word}`;
        const current = this.learnedSarcasm.get(key) || 0;
        this.learnedSarcasm.set(key, current + 1);
      }
    }
    if (wasActuallyHumorous) {
      for (const word of words) {
        const key = `hum_${word}`;
        const current = this.learnedHumor.get(key) || 0;
        this.learnedHumor.set(key, current + 1);
      }
    }

    try {
      await AsyncStorage.setItem(LEARNED_KEY, JSON.stringify({
        sarcasm: Array.from(this.learnedSarcasm.entries()),
        humor: Array.from(this.learnedHumor.entries()),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[HumorEngine] Learn error:', e);
    }
  }

  // --- Private helpers ---

  _getSarcasmPatterns() {
    return [
      { name: 'obviously_sarcastic', regex: /\b(obviously|clearly|definitely|totally|sure)\b/i, weight: 1.5 },
      { name: 'overly_positive_negative', regex: /\b(great|awesome|love|best).{0,20}(but|however|except|though)/i, weight: 2.0 },
      { name: 'fake_enthusiasm', regex: /\b(yay|wow|amazing|fantastic|wonderful).{0,15}[.?!]{2,}/i, weight: 1.8 },
      { name: 'thanks_a_lot', regex: /\b(thanks a lot|thank you so much|appreciate it).{0,10}[.?!]/i, weight: 1.5 },
      { name: 'not_really', regex: /\b(not really|i guess|if you say so|whatever you say)\b/i, weight: 1.2 },
      { name: 'oh_really', regex: /\b(oh really|oh sure|oh great|oh wonderful|oh perfect)\b/i, weight: 1.8 },
      { name: 'as_if', regex: /\b(as if|yeah right|tell me about it|good one)\b/i, weight: 2.0 },
      { name: 'because_that_works', regex: /\b(because that works|that went well|what could go wrong)\b/i, weight: 2.0 },
      { name: 'love_it_when', regex: /\b(i love it when|i just love|my favorite thing is)\b/i, weight: 1.5 },
      { name: 'quotation_sarcasm', regex: /["'][^"']{3,30}["'].{0,10}(right|sure|yeah|okay)/i, weight: 2.2 },
    ];
  }

  _getHumorPatterns() {
    return [
      { name: 'laugh_indicators', regex: /\b(lol|lmao|rofl|haha|hehe|hahaha)\b/i, weight: 2.0 },
      { name: 'joke_structure', regex: /\b(why did the|what do you call|knock knock|what happens when)\b/i, weight: 2.5 },
      { name: 'pun_indicators', regex: /\b(no pun intended|pun intended|wordplay|play on words)\b/i, weight: 1.5 },
      { name: 'funny_reaction', regex: /\b(that\'s hilarious|too funny|can\'t stop laughing|dying)\b/i, weight: 1.8 },
      { name: 'meme_reference', regex: /\b(bruh|fam|sus|no cap|based|cringe|vibe|mood|slay)\b/i, weight: 1.0 },
      { name: 'exaggeration', regex: /\b(literally dying|literally dead|i can\'t even|i\'m dead)\b/i, weight: 1.5 },
      { name: 'emoji_indicators', regex: /[😂🤣😆😄😁🤪😜😝🙃]/, weight: 1.5 },
      { name: 'self_deprecating', regex: /\b(i\'m such a|typical me|story of my life|just my luck)\b/i, weight: 1.2 },
    ];
  }

  _getContextualBoosters() {
    return [
      { name: 'contrast_marker', regex: /\b(but|however|although|though|yet|still)\b/i, target: 'sarcasm', weight: 0.8 },
      { name: 'excessive_punctuation', regex: /[.?!]{3,}/, target: 'sarcasm', weight: 0.5 },
      { name: 'emoji_humor', regex: /[😂🤣😆]/, target: 'humor', weight: 1.0 },
      { name: 'emoji_sarcasm', regex: /[🙃😏🤔😒]/, target: 'sarcasm', weight: 1.0 },
    ];
  }

  _checkLearnedPatterns(text, learnedMap) {
    let score = 0;
    for (const [key, weight] of learnedMap.entries()) {
      const word = key.replace(/^(sarc_|hum_)/, '');
      if (text.includes(word)) score += weight * 0.1;
    }
    return score;
  }

  _generateExplanation(isSarcastic, isHumorous, patterns, sarcasmConf, humorConf) {
    if (isSarcastic) return `Detected sarcasm with ${(sarcasmConf * 100).toFixed(0)}% confidence based on ${patterns.filter(p => p.type === 'sarcasm').length} pattern matches.`;
    if (isHumorous) return `Detected humor with ${(humorConf * 100).toFixed(0)}% confidence based on ${patterns.filter(p => p.type === 'humor').length} pattern matches.`;
    if (sarcasmConf > 0.3) return `Possibly sarcastic (${(sarcasmConf * 100).toFixed(0)}% confidence) but below threshold.`;
    if (humorConf > 0.3) return `Possibly humorous (${(humorConf * 100).toFixed(0)}% confidence) but below threshold.`;
    return 'No sarcasm or humor detected in the text.';
  }

  _hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  async reset() {
    this.learnedSarcasm.clear();
    this.learnedHumor.clear();
    await AsyncStorage.multiRemove([LEARNED_KEY, '@manu_ai_tone_log']);
  }
}

export default new HumorEngine();
