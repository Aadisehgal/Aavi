import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/SMSFilter.js
// Feature 43 — AI-powered SMS spam and phishing filter



const STORAGE_KEY = '@manu_ai_sms_filter';

const SPAM_KEYWORDS = [
  'congratulations', 'you have won', 'click here', 'free gift', 'limited offer',
  'act now', 'verify your account', 'otp', 'bank account', 'lottery', 'prize',
  'urgent', 'suspend', 'blocked', 'verify immediately',
];

const PHISHING_PATTERNS = [
  /bit\.ly\/\S+/i, /tinyurl\.com\/\S+/i, /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /password.{0,20}(reset|change|verify)/i,
  /account.{0,20}(suspend|block|close|verify)/i,
];

class SMSFilter {
  constructor() {
    this.blocklist   = new Set();
    this.allowlist   = new Set();
    this.filterLog   = [];
    this.enabled     = true;
    this.spamCount   = 0;
    this.phishCount  = 0;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.blocklist  = new Set(data.blocklist  || []);
        this.allowlist  = new Set(data.allowlist  || []);
        this.enabled    = data.enabled ?? true;
        this.spamCount  = data.spamCount  || 0;
        this.phishCount = data.phishCount || 0;
        this.filterLog  = data.filterLog  || [];
      }
    } catch (e) { console.warn('[SMSFilter] Init error:', e); }
  }

  async save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        blocklist:  [...this.blocklist],
        allowlist:  [...this.allowlist],
        enabled:    this.enabled,
        spamCount:  this.spamCount,
        phishCount: this.phishCount,
        filterLog:  this.filterLog.slice(0, 100),
      }));
    } catch (e) { console.warn('[SMSFilter] Save error:', e); }
  }

  /**
   * Analyse an incoming SMS.
   * @returns {{ verdict: 'SAFE'|'SPAM'|'PHISHING', confidence: number, reasons: string[] }}
   */
  analyse(sms) {
    if (!this.enabled) return { verdict: 'SAFE', confidence: 0, reasons: [] };

    const { sender, body } = sms || {};
    const text = (body || '').toLowerCase();
    const reasons = [];
    let spamScore    = 0;
    let phishScore   = 0;

    // Blocklist / allowlist
    if (this.allowlist.has(sender)) return { verdict: 'SAFE', confidence: 1, reasons: ['Allowlisted'] };
    if (this.blocklist.has(sender)) return { verdict: 'SPAM',  confidence: 1, reasons: ['Blocklisted'] };

    // Keyword scoring
    for (const kw of SPAM_KEYWORDS) {
      if (text.includes(kw)) { spamScore += 0.15; reasons.push(`Keyword: "${kw}"`); }
    }

    // Phishing pattern scoring
    for (const pat of PHISHING_PATTERNS) {
      if (pat.test(text)) { phishScore += 0.35; reasons.push(`Pattern: ${pat.source.slice(0, 30)}`); }
    }

    // Sender heuristics (no-name short codes, random numbers)
    if (/^[+]?[\d\s\-]{5,8}$/.test(sender || '')) spamScore += 0.1;

    const verdict     = phishScore >= 0.35 ? 'PHISHING' : spamScore >= 0.3 ? 'SPAM' : 'SAFE';
    const confidence  = Math.min(Math.max(phishScore, spamScore), 1);

    if (verdict !== 'SAFE') {
      if (verdict === 'PHISHING') this.phishCount++;
      else this.spamCount++;
      this.filterLog.unshift({ ts: new Date().toISOString(), sender, verdict, confidence });
      this.save();
    }

    return { verdict, confidence, reasons: reasons.slice(0, 5) };
  }

  block(sender)  { this.blocklist.add(sender);  this.allowlist.delete(sender);  this.save(); }
  allow(sender)  { this.allowlist.add(sender);  this.blocklist.delete(sender);  this.save(); }
  unblock(sender){ this.blocklist.delete(sender); this.save(); }

  getStats() {
    return { spamCount: this.spamCount, phishCount: this.phishCount, log: this.filterLog.slice(0, 20) };
  }
}

export default new SMSFilter();
