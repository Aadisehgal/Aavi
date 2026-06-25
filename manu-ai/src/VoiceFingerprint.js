import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { VoiceFingerprintModule } = NativeModules;

const PIN_KEY = '@manu_voice_pin';

class VoiceFingerprint {
  async enrollVoice() {
    try {
      const result = await VoiceFingerprintModule.enrollVoice(4000);
      return { success: true, message: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyVoice() {
    try {
      const result = await VoiceFingerprintModule.verifyVoice(3000);
      return {
        success: true,
        approved: result.approved,
        matchScore: result.matchScore,
        details: result.details,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFingerprint() {
    try {
      await VoiceFingerprintModule.deleteFingerprint();
      return { success: true, message: 'Voice fingerprint deleted' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async hasFingerprint() {
    try {
      return await VoiceFingerprintModule.hasFingerprint();
    } catch (error) {
      return false;
    }
  }

  async setPIN(pin) {
    try {
      await AsyncStorage.setItem(PIN_KEY, pin);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPIN(pin) {
    try {
      const stored = await AsyncStorage.getItem(PIN_KEY);
      return stored === pin;
    } catch (error) {
      return false;
    }
  }

  async hasPIN() {
    try {
      const stored = await AsyncStorage.getItem(PIN_KEY);
      return stored !== null;
    } catch (error) {
      return false;
    }
  }
}

export default new VoiceFingerprint();
