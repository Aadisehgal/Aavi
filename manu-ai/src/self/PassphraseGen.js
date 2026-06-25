// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Passphrase Generator
// File: src/self/PassphraseGen.js
// Generated: 2026-06-25

import SecureRandom from './SecureRandom';

const WORD_LIST = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'falcon', 'garden', 'harbor',
  'island', 'jungle', 'knight', 'lemon', 'mountain', 'nebula', 'ocean', 'penguin',
  'quartz', 'river', 'shadow', 'thunder', 'unicorn', 'valley', 'whisper', 'xenon',
  'yellow', 'zenith', 'arrow', 'bridge', 'crystal', 'diamond', 'ember', 'forest',
  'galaxy', 'horizon', 'iceberg', 'journey', 'kingdom', 'lighthouse', 'meadow',
  'northern', 'orbit', 'phoenix', 'quantum', 'radiant', 'sapphire', 'tornado',
  'universe', 'voyage', 'winter', 'cascade', 'dolphin', 'eclipse', 'flame',
  'griffin', 'hollow', 'inferno', 'jewel', 'kraken', 'legend', 'mirage', 'nimbus',
  'obsidian', 'prism', 'quiver', 'raven', 'storm', 'tempest', 'umbra', 'vortex',
  'willow', 'aurora', 'blizzard', 'comet', 'drift', 'echo', 'frost', 'glimmer',
  'halo', 'ignite', 'jade', 'keystone', 'lunar', 'mystic', 'nova', 'onyx',
  'pulse', 'quest', 'rift', 'solar', 'tidal', 'updraft', 'void', 'warp',
];

const SEPARATORS = ['-', '_', '.', '!', '@', '#', '$', '%', '^', '&', '*', '+', '='];

class PassphraseGen {
  constructor() {
    this.wordList = WORD_LIST;
  }

  async generate(options = {}) {
    const wordCount = options.wordCount || 4;
    const separator = options.separator || 'random';
    const capitalize = options.capitalize !== false;
    const addNumber = options.addNumber !== false;
    const addSpecial = options.addSpecial !== false;

    if (wordCount < 3 || wordCount > 10) {
      throw new Error('wordCount must be between 3 and 10');
    }

    const words = [];
    for (let i = 0; i < wordCount; i++) {
      const idx = await SecureRandom.getRandomInt(0, this.wordList.length);
      let word = this.wordList[idx];
      if (capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(word);
    }

    let sep = separator;
    if (separator === 'random') {
      const sepIdx = await SecureRandom.getRandomInt(0, SEPARATORS.length);
      sep = SEPARATORS[sepIdx];
    }

    let passphrase = words.join(sep);

    if (addNumber) {
      const num = await SecureRandom.getRandomInt(0, 1000);
      const position = await SecureRandom.getRandomInt(0, 3);
      if (position === 0) passphrase = `${num}${sep}${passphrase}`;
      else if (position === 1) passphrase = `${passphrase}${sep}${num}`;
      else passphrase = `${words[0]}${num}${sep}${words.slice(1).join(sep)}`;
    }

    if (addSpecial) {
      const specialIdx = await SecureRandom.getRandomInt(0, SEPARATORS.length);
      const special = SEPARATORS[specialIdx];
      passphrase += special;
    }

    const entropy = this.calculateEntropy(wordCount, capitalize, addNumber, addSpecial);

    return { passphrase, words, separator: sep, entropy, crackTime: this.estimateCrackTime(entropy) };
  }

  calculateEntropy(wordCount, capitalize, addNumber, addSpecial) {
    let entropy = wordCount * Math.log2(this.wordList.length);
    if (capitalize) entropy += wordCount;
    if (addNumber) entropy += Math.log2(1000);
    if (addSpecial) entropy += Math.log2(SEPARATORS.length);
    return Math.round(entropy * 10) / 10;
  }

  estimateCrackTime(entropy) {
    const guessesPerSecond = 1e10;
    const seconds = Math.pow(2, entropy) / guessesPerSecond;
    if (seconds < 60) return 'seconds';
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
    return 'centuries';
  }

  async generateMultiple(count = 5, options = {}) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.generate(options));
    }
    return results;
  }

  getWordList() {
    return [...this.wordList];
  }

  async customWordList(words) {
    if (!Array.isArray(words) || words.length < 20) {
      throw new Error('Word list must contain at least 20 words');
    }
    this.wordList = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length >= 3);
    return { wordCount: this.wordList.length };
  }
}

export default new PassphraseGen();
