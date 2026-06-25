// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 20/20 — Build Environment & Final Integration
// File: src/self/PersonalityCore.js
// Generated: 2026-06-25

/**
 * PersonalityCore.js
 * 
 * J.A.R.V.I.S. Personality Protocol for MANU AI
 * Adaptive personality system that selects responses based on:
 * 1. User age (kid → friday, teen → tony, parent → classic)
 * 2. Time of day (morning → energetic, night → calm)
 * 3. Voice stress level (stress → protective)
 * 4. Context (danger → protective, casual → tony)
 * 
 * All logic is client-side. No biometric or personal data leaves the device.
 * Educational purpose: Demonstrates adaptive UI/personality in safety apps.
 */

const JARVIS_PERSONALITIES = {
  classic: {
    id: 'classic',
    name: 'J.A.R.V.I.S. Classic',
    greeting: "Good evening, sir. MANU A.I. systems are at your disposal.",
    success: "Command executed flawlessly, sir.",
    failure: "I apologize, sir. That operation appears to be beyond my current capabilities.",
    warning: "Sir, I must advise caution. That action may compromise security protocols.",
    humor: "Sir, that was... remarkably unsuccessful.",
    protect: "Threat detected. Deploying countermeasures.",
    tone: 'formal',
    energy: 0.5
  },
  tony: {
    id: 'tony',
    name: 'Tony Mode',
    greeting: "Yo! MANU here. What is the mission?",
    success: "Done and done! Like taking candy from a baby.",
    failure: "Oof. That did not work. Want me to try something else?",
    warning: "Heads up — that looks sketchy. Sure you want to proceed?",
    humor: "Well, THAT was a disaster. Logging for your amusement.",
    protect: "Bad guys incoming! Shield up!",
    tone: 'casual',
    energy: 0.9
  },
  protective: {
    id: 'protective',
    name: 'Protective Shield',
    greeting: "MANU online. Family shield active.",
    success: "Threat neutralized. Your family is safe.",
    failure: "I could not block that. Escalating to parent immediately.",
    warning: "ALERT: Inappropriate content detected. Shielding screen now.",
    humor: "Sarcasm acknowledged. Logging for parental review.",
    protect: "ARMOR MODE ACTIVATED. All systems nominal.",
    tone: 'urgent',
    energy: 0.3
  },
  friday: {
    id: 'friday',
    name: 'F.R.I.D.A.Y.',
    greeting: "Hi! I am MANU, your personal A.I. How can I help?",
    success: "All done! You're doing great!",
    failure: "Oh no, that did not work. Let me try another way!",
    warning: "Hmm, that might not be safe. Want to check with your parent?",
    humor: "Someone's got jokes! Noted for the report. 😊",
    protect: "Do not worry, I have got your back! Shield up!",
    tone: 'friendly',
    energy: 0.8
  }
};

/**
 * Time-of-day mood modifiers
 * Adjusts personality energy without switching modes
 */
const TIME_MODIFIERS = {
  morning: { energyMultiplier: 1.2, calm: false },   // 05:00 - 11:59
  afternoon: { energyMultiplier: 1.0, calm: false }, // 12:00 - 16:59
  evening: { energyMultiplier: 0.8, calm: true },    // 17:00 - 21:59
  night: { energyMultiplier: 0.5, calm: true }       // 22:00 - 04:59
};

/**
 * Detects current time period
 * @returns {string} morning | afternoon | evening | night
 */
function getTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Personality Engine
 * Selects the most appropriate personality based on context
 * All processing is local; no cloud dependency.
 */
class PersonalityCore {
  constructor() {
    this.currentPersonality = 'classic';
    this.userAge = 'adult'; // kid | teen | adult
    this.stressLevel = 0; // 0-100 (from StressDetector.js)
    this.threatDetected = false; // from ThreatShield.js
    this.timePeriod = getTimePeriod();
  }

  /**
   * Configure user profile for personality selection
   * @param {Object} profile - { age: 'kid'|'teen'|'adult', preferredMode: string }
   */
  setUserProfile(profile) {
    if (profile && profile.age) {
      this.userAge = profile.age;
    }
    if (profile && profile.preferredMode && JARVIS_PERSONALITIES[profile.preferredMode]) {
      this.currentPersonality = profile.preferredMode;
    }
  }

  /**
   * Update contextual stress level (from StressDetector.js)
   * @param {number} level - 0 to 100
   */
  setStressLevel(level) {
    this.stressLevel = Math.max(0, Math.min(100, level));
  }

  /**
   * Set threat detection state (from ThreatShield.js)
   * @param {boolean} detected
   */
  setThreatDetected(detected) {
    this.threatDetected = detected;
  }

  /**
   * Auto-select personality based on all context factors
   * Priority: Threat > Stress > User Age > Time > Default
   * @returns {string} personality key
   */
  selectPersonality() {
    // Priority 1: Active threat → Protective mode
    if (this.threatDetected) {
      return 'protective';
    }

    // Priority 2: High stress → Protective mode
    if (this.stressLevel > 70) {
      return 'protective';
    }

    // Priority 3: User age-based default
    if (this.userAge === 'kid') {
      return 'friday';
    }
    if (this.userAge === 'teen') {
      return 'tony';
    }

    // Priority 4: Time-based adjustment for adults
    const time = getTimePeriod();
    if (time === 'night' && this.stressLevel > 30) {
      return 'protective';
    }

    // Default: Classic for adult users
    return this.currentPersonality || 'classic';
  }

  /**
   * Get full personality configuration with time-based energy modulation
   * @returns {Object} personality with time-modified energy
   */
  getActivePersonality() {
    const selectedKey = this.selectPersonality();
    const personality = { ...JARVIS_PERSONALITIES[selectedKey] };
    const timeMod = TIME_MODIFIERS[getTimePeriod()];

    personality.energy = Math.min(1.0, personality.energy * timeMod.energyMultiplier);
    personality.calm = timeMod.calm;
    personality.selectedAt = new Date().toISOString();
    personality.context = {
      timePeriod: getTimePeriod(),
      stressLevel: this.stressLevel,
      threatDetected: this.threatDetected,
      userAge: this.userAge
    };

    return personality;
  }

  /**
   * Get a specific message type from active personality
   * @param {string} type - greeting | success | failure | warning | humor | protect
   * @returns {string}
   */
  getMessage(type) {
    const personality = this.getActivePersonality();
    return personality[type] || personality.greeting;
  }

  /**
   * Get personality metadata for UI theming
   * @returns {Object} { color, icon, animation }
   */
  getPersonalityTheme() {
    const key = this.selectPersonality();
    const themes = {
      classic: { primary: '#00D4FF', secondary: '#0A0E27', icon: 'shield' },
      tony: { primary: '#FFD700', secondary: '#1A1A2E', icon: 'flash' },
      protective: { primary: '#FF4444', secondary: '#0A0E27', icon: 'alert' },
      friday: { primary: '#00FF88', secondary: '#0A0E27', icon: 'heart' }
    };
    return themes[key] || themes.classic;
  }

  /**
   * Reset to default state
   */
  reset() {
    this.currentPersonality = 'classic';
    this.userAge = 'adult';
    this.stressLevel = 0;
    this.threatDetected = false;
  }
}

// Singleton instance for app-wide personality state
const personalityCore = new PersonalityCore();

export {
  PersonalityCore,
  JARVIS_PERSONALITIES,
  personalityCore,
  getTimePeriod
};

export default personalityCore;
