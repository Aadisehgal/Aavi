// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Password Strength AI
// File: src/self/PasswordAI.js
// Generated: 2026-06-25

import SecureRandom from './SecureRandom';

class PasswordAI {
  constructor() {
    this.commonPasswords = new Set([
      '123456', 'password', '12345678', 'qwerty', '123456789',
      'letmein', '1234567', 'football', 'iloveyou', 'admin',
      'welcome', 'monkey', 'login', 'abc123', '111111',
      '123123', 'password123', '1234', 'baseball', 'qwertyuiop',
    ]);
  }

  async analyze(password) {
    const analysis = { score: 0, maxScore: 100, strength: 'very_weak', entropy: 0, crackTime: '', warnings: [], suggestions: [], patterns: [] };

    if (!password || password.length === 0) {
      analysis.warnings.push('Password is empty');
      return analysis;
    }

    let score = 0;
    const len = password.length;
    if (len >= 16) score += 25;
    else if (len >= 12) score += 20;
    else if (len >= 8) score += 10;
    else score += 5;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;':",./<>?]/.test(password);
    const hasUnicode = /[^\x00-\x7F]/.test(password);
    const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial, hasUnicode].filter(Boolean).length;
    score += varietyCount * 10;

    if (this.commonPasswords.has(password.toLowerCase())) {
      analysis.patterns.push('common_password');
      analysis.warnings.push('This is one of the most commonly used passwords');
      score = Math.max(0, score - 30);
    }

    if (/^(.)\1+$/.test(password)) {
      analysis.patterns.push('repeated_char');
      analysis.warnings.push('Password consists of repeated characters');
      score = Math.max(0, score - 20);
    }

    if (/^\d+$/.test(password)) {
      analysis.patterns.push('digits_only');
      analysis.warnings.push('Password is digits only');
      score = Math.max(0, score - 15);
    }

    if (/^[a-zA-Z]+$/.test(password)) {
      analysis.patterns.push('letters_only');
      analysis.warnings.push('Password is letters only');
      score = Math.max(0, score - 10);
    }

    if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i.test(password)) {
      analysis.patterns.push('keyboard_sequence');
      analysis.warnings.push('Contains keyboard sequence');
      score = Math.max(0, score - 10);
    }

    if (/(19|20)\d\d/.test(password)) {
      analysis.patterns.push('year');
      analysis.warnings.push('Contains a year — easily guessable');
      score = Math.max(0, score - 5);
    }

    let poolSize = 0;
    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasDigit) poolSize += 10;
    if (hasSpecial) poolSize += 33;
    if (hasUnicode) poolSize += 100;
    analysis.entropy = len * Math.log2(poolSize || 1);

    const guessesPerSecond = 1e10;
    const combinations = Math.pow(poolSize || 1, len);
    const seconds = combinations / guessesPerSecond;
    analysis.crackTime = this.formatTime(seconds);

    score = Math.min(100, Math.max(0, score));
    analysis.score = score;

    if (score >= 90) analysis.strength = 'excellent';
    else if (score >= 75) analysis.strength = 'strong';
    else if (score >= 50) analysis.strength = 'moderate';
    else if (score >= 25) analysis.strength = 'weak';
    else analysis.strength = 'very_weak';

    if (len < 12) analysis.suggestions.push('Use at least 12 characters');
    if (!hasUpper) analysis.suggestions.push('Add uppercase letters');
    if (!hasLower) analysis.suggestions.push('Add lowercase letters');
    if (!hasDigit) analysis.suggestions.push('Add numbers');
    if (!hasSpecial) analysis.suggestions.push('Add special characters (!@#$...)');
    if (varietyCount < 3) analysis.suggestions.push('Use a mix of character types');
    if (analysis.patterns.length > 0) analysis.suggestions.push('Avoid common patterns and sequences');
    if (analysis.suggestions.length === 0 && score < 100) analysis.suggestions.push('Consider making it even longer for maximum security');

    return analysis;
  }

  formatTime(seconds) {
    if (seconds < 1) return 'instantly';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
    if (seconds < 315360000000) return `${Math.round(seconds / 3153600000)} centuries`;
    return 'forever';
  }

  async generateStrong(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const idx = await SecureRandom.getRandomInt(0, charset.length);
      password += charset[idx];
    }
    return password;
  }
}

export default new PasswordAI();
