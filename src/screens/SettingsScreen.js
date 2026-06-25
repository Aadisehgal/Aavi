import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 10/20 — Settings & Configuration
// File: src/screens/SettingsScreen.js
// Generated: 2026-06-24

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  NativeModules,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';

const { AccessibilityModule, VoiceIdentityModule } = NativeModules;

// Self-management modules
import FeatureFlags from '../self/FeatureFlags';
import HealthMonitor from '../self/HealthMonitor';
import LocalAnalytics from '../self/LocalAnalytics';
import PermissionAI from '../self/PermissionAI';
import BackupCheck from '../self/BackupCheck';
import KeyRotation from '../self/KeyRotation';
import LocalAudit from '../self/LocalAudit';
import PersonalityCore from '../self/PersonalityCore';
// Feature toggles
import SmartDND from '../features/SmartDND';
import HabitLearner from '../features/HabitLearner';
import RoutineBuilder from '../features/RoutineBuilder';
import FocusScore from '../features/FocusScore';
import WellnessIndex from '../features/WellnessIndex';
import SleepPredictor from '../features/SleepPredictor';
import ContextReminders from '../features/ContextReminders';
import PredictiveEngine from '../features/PredictiveEngine';
const { width } = Dimensions.get('window');

const AI_PROVIDERS = [
  { key: 'openai', label: 'OpenAI', keyName: 'openai_api_key' },
  { key: 'gemini', label: 'Google Gemini', keyName: 'gemini_api_key' },
  { key: 'groq', label: 'Groq', keyName: 'groq_api_key' },
];

const PERSONALITY_CORES = [
  { key: 'formal', label: 'Formal', desc: 'Precise, professional, and courteous' },
  { key: 'casual', label: 'Casual', desc: 'Relaxed, friendly, and conversational' },
  { key: 'protective', label: 'Protective', desc: 'Cautious, vigilant, and security-focused' },
  { key: 'playful', label: 'Playful', desc: 'Witty, humorous, and engaging' },
];

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;

export default function SettingsScreen() {
  // ─── Voice Identity ───
  const [voiceEnrolled, setVoiceEnrolled] = useState(false);
  const [voiceEnrolling, setVoiceEnrolling] = useState(false);
  const [voiceVerifying, setVoiceVerifying] = useState(false);

  // ─── Wake Word ───
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  // ─── PIN Fallback ───
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSettingMode, setPinSettingMode] = useState(false);
  const [parentalControlsEnabled, setParentalControlsEnabled] = useState(false);

  // ─── AI Provider ───
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKeys, setSavedKeys] = useState({});

  // ─── System Status ───
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [systemStatusLoading, setSystemStatusLoading] = useState(true);

  // ─── Personality Core ───
  const [selectedPersonality, setSelectedPersonality] = useState('formal');

  // ─── Dialogs ───
  const [helpDialogVisible, setHelpDialogVisible] = useState(false);
  const [voiceDialogVisible, setVoiceDialogVisible] = useState(false);

  // ─── Load persisted settings ───
  useEffect(() => {
    loadSettings();
    checkSystemStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        wakeWord,
        pin,
        parentalCtrl,
        provider,
        personality,
        keys,
        voiceStatus,
      ] = await Promise.all([
        AsyncStorage.getItem('settings_wake_word'),
        AsyncStorage.getItem('settings_pin'),
        AsyncStorage.getItem('settings_parental_controls'),
        AsyncStorage.getItem('settings_ai_provider'),
        AsyncStorage.getItem('settings_personality'),
        AsyncStorage.getItem('settings_api_keys'),
        AsyncStorage.getItem('settings_voice_enrolled'),
      ]);

      if (wakeWord !== null) setWakeWordEnabled(wakeWord === 'true');
      if (pin !== null) setPinEnabled(pin !== '');
      if (parentalCtrl !== null) setParentalControlsEnabled(parentalCtrl === 'true');
      if (provider !== null) setSelectedProvider(provider);
      if (personality !== null) setSelectedPersonality(personality);
      if (keys !== null) {
        const parsed = JSON.parse(keys);
        setSavedKeys(parsed);
        if (parsed[provider || 'openai']) setApiKeyInput(parsed[provider || 'openai']);
      }
      if (voiceStatus !== null) setVoiceEnrolled(voiceStatus === 'true');
    } catch (e) {
      console.error('Settings load error:', e);
    }
  };

  const checkSystemStatus = async () => {
    setSystemStatusLoading(true);
    try {
      if (AccessibilityModule && AccessibilityModule.isEnabled) {
        const enabled = await AccessibilityModule.isEnabled();
        setAccessibilityEnabled(!!enabled);
      } else {
        setAccessibilityEnabled(false);
      }
    } catch (e) {
      setAccessibilityEnabled(false);
    }
    setSystemStatusLoading(false);
  };

  // ─── Voice Identity Handlers ───
  const handleEnrollVoice = async () => {
    setVoiceEnrolling(true);
    try {
      if (VoiceIdentityModule && VoiceIdentityModule.enrollVoice) {
        const result = await VoiceIdentityModule.enrollVoice();
        if (result && result.success) {
          setVoiceEnrolled(true);
          await AsyncStorage.setItem('settings_voice_enrolled', 'true');
          Alert.alert('Voice Enrolled', 'Your voice fingerprint has been saved successfully.');
        } else {
          Alert.alert('Enrollment Failed', result?.message || 'Please try again in a quiet environment.');
        }
      } else {
        Alert.alert('Not Available', 'Voice identity module is not ready.');
      }
    } catch (e) {
      Alert.alert('Error', 'Voice enrollment failed. ' + e.message);
    }
    setVoiceEnrolling(false);
    setVoiceDialogVisible(false);
  };

  const handleVerifyVoice = async () => {
    setVoiceVerifying(true);
    try {
      if (VoiceIdentityModule && VoiceIdentityModule.verifyVoice) {
        const result = await VoiceIdentityModule.verifyVoice();
        if (result && result.success) {
          Alert.alert('Verification Successful', 'Voice identity confirmed.');
        } else {
          Alert.alert('Verification Failed', 'Voice did not match enrolled fingerprint.');
        }
      } else {
        Alert.alert('Not Available', 'Voice identity module is not ready.');
      }
    } catch (e) {
      Alert.alert('Error', 'Voice verification failed. ' + e.message);
    }
    setVoiceVerifying(false);
    setVoiceDialogVisible(false);
  };

  const handleDeleteVoice = async () => {
    Alert.alert(
      'Delete Voice Fingerprint?',
      'This will permanently remove your enrolled voice identity. You will need to re-enroll to use voice authentication.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (VoiceIdentityModule && VoiceIdentityModule.deleteVoice) {
                await VoiceIdentityModule.deleteVoice();
              }
              setVoiceEnrolled(false);
              await AsyncStorage.setItem('settings_voice_enrolled', 'false');
              Alert.alert('Deleted', 'Voice fingerprint has been removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete voice fingerprint.');
            }
          },
        },
      ]
    );
  };

  // ─── Wake Word Toggle ───
  const toggleWakeWord = async (value) => {
    setWakeWordEnabled(value);
    try {
      await AsyncStorage.setItem('settings_wake_word', value ? 'true' : 'false');
      if (NativeModules.WakeWordModule && NativeModules.WakeWordModule.setEnabled) {
        await NativeModules.WakeWordModule.setEnabled(value);
      }
    } catch (e) {
      console.error('Wake word toggle error:', e);
    }
  };

  // ─── PIN Handlers ───
  const validatePin = (pin) => /^\d+$/.test(pin) && pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH;

  const handleSavePin = async () => {
    if (!validatePin(pinInput)) {
      Alert.alert('Invalid PIN', `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.`);
      return;
    }
    if (pinInput !== pinConfirm) {
      Alert.alert('PIN Mismatch', 'The two PIN entries do not match.');
      return;
    }
    try {
      await AsyncStorage.setItem('settings_pin', pinInput);
      setPinEnabled(true);
      setPinSettingMode(false);
      setPinInput('');
      setPinConfirm('');
      Alert.alert('PIN Saved', 'PIN fallback has been enabled.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save PIN.');
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN?',
      'This will disable PIN fallback authentication.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('settings_pin');
              setPinEnabled(false);
              setPinInput('');
              setPinConfirm('');
            } catch (e) {
              Alert.alert('Error', 'Failed to remove PIN.');
            }
          },
        },
      ]
    );
  };

  // ─── Parental Controls ───
  const toggleParentalControls = async (value) => {
    setParentalControlsEnabled(value);
    try {
      await AsyncStorage.setItem('settings_parental_controls', value ? 'true' : 'false');
    } catch (e) {
      console.error('Parental controls toggle error:', e);
    }
  };

  // ─── AI Provider Handlers ───
  const handleProviderChange = (providerKey) => {
    setSelectedProvider(providerKey);
    setApiKeyInput(savedKeys[providerKey] || '');
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput || apiKeyInput.trim().length < 10) {
      Alert.alert('Invalid Key', 'Please enter a valid API key.');
      return;
    }
    try {
      const updatedKeys = { ...savedKeys, [selectedProvider]: apiKeyInput.trim() };
      await AsyncStorage.setItem('settings_api_keys', JSON.stringify(updatedKeys));
      setSavedKeys(updatedKeys);
      Alert.alert('API Key Saved', `Your ${AI_PROVIDERS.find(p => p.key === selectedProvider)?.label} key has been stored securely.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save API key.');
    }
  };

  const handleDeleteApiKey = () => {
    Alert.alert(
      'Delete API Key?',
      'This will remove the stored API key for the selected provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedKeys = { ...savedKeys };
              delete updatedKeys[selectedProvider];
              await AsyncStorage.setItem('settings_api_keys', JSON.stringify(updatedKeys));
              setSavedKeys(updatedKeys);
              setApiKeyInput('');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete API key.');
            }
          },
        },
      ]
    );
  };

  // ─── Personality Core ───
  const handlePersonalityChange = async (coreKey) => {
    setSelectedPersonality(coreKey);
    try {
      await AsyncStorage.setItem('settings_personality', coreKey);
      if (NativeModules.PersonalityModule && NativeModules.PersonalityModule.setCore) {
        await NativeModules.PersonalityModule.setCore(coreKey);
      }
    } catch (e) {
      console.error('Personality change error:', e);
    }
  };

  // ─── Render Helpers ───
  const renderSectionHeader = (title) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderCard = (children) => (
    <View style={styles.card}>{children}</View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Configure MANU AI</Text>
      </View>

      {/* ─── System Status ─── */}
      {renderSectionHeader('System Status')}
      {renderCard(
        <View style={styles.statusRow}>
          <View style={styles.statusLabelBlock}>
            <Text style={styles.statusLabel}>Accessibility Service</Text>
            <Text style={styles.statusSubLabel}>
              {systemStatusLoading ? 'Checking...' : accessibilityEnabled ? 'Running' : 'Not Enabled'}
            </Text>
          </View>
          {systemStatusLoading ? (
            <ActivityIndicator size="small" color="#00D2FF" />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: accessibilityEnabled ? '#00FF88' : '#FF4444' }]} />
          )}
        </View>
      )}

      {/* ─── Voice Identity ─── */}
      {renderSectionHeader('Voice Identity')}
      {renderCard(
        <View>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.rowTitle}>Voice Fingerprint</Text>
              <Text style={styles.rowSubtitle}>
                {voiceEnrolled ? 'Enrolled and active' : 'Not enrolled'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setVoiceDialogVisible(true)}
            >
              <Text style={styles.actionButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Wake Word ─── */}
      {renderSectionHeader('Wake Word')}
      {renderCard(
        <View style={styles.rowBetween}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowTitle}>Enable Wake Word</Text>
            <Text style={styles.rowSubtitle}>Activate MANU with your voice</Text>
          </View>
          <Switch
            value={wakeWordEnabled}
            onValueChange={toggleWakeWord}
            trackColor={{ false: '#333', true: '#00D2FF' }}
            thumbColor={wakeWordEnabled ? '#FFFFFF' : '#888'}
          />
        </View>
      )}

      {/* ─── PIN Fallback ─── */}
      {renderSectionHeader('PIN Fallback')}
      {renderCard(
        <View>
          <View style={styles.rowBetween}>
            <View style={styles.rowLabelBlock}>
              <Text style={styles.rowTitle}>PIN Protection</Text>
              <Text style={styles.rowSubtitle}>
                {pinEnabled ? 'PIN is set' : 'No PIN configured'}
              </Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={(val) => {
                if (val) setPinSettingMode(true);
                else handleRemovePin();
              }}
              trackColor={{ false: '#333', true: '#00D2FF' }}
              thumbColor={pinEnabled ? '#FFFFFF' : '#888'}
            />
          </View>

          {pinSettingMode && (
            <View style={styles.pinInputBlock}>
              <TextInput
                style={styles.input}
                placeholder="Enter ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digit PIN"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={PIN_MAX_LENGTH}
                secureTextEntry
                value={pinInput}
                onChangeText={setPinInput}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm PIN"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={PIN_MAX_LENGTH}
                secureTextEntry
                value={pinConfirm}
                onChangeText={setPinConfirm}
              />
              <View style={styles.pinButtonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => { setPinSettingMode(false); setPinInput(''); setPinConfirm(''); }}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSavePin}>
                  <Text style={styles.primaryButtonText}>Save PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ─── Parental Controls ─── */}
      {renderSectionHeader('Family Use')}
      {renderCard(
        <View style={styles.rowBetween}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowTitle}>Parental Controls</Text>
            <Text style={styles.rowSubtitle}>Prevent kids from disabling the app</Text>
          </View>
          <Switch
            value={parentalControlsEnabled}
            onValueChange={toggleParentalControls}
            trackColor={{ false: '#333', true: '#00D2FF' }}
            thumbColor={parentalControlsEnabled ? '#FFFFFF' : '#888'}
          />
        </View>
      )}

      {/* ─── AI Provider ─── */}
      {renderSectionHeader('AI Provider')}
      {renderCard(
        <View>
          <View style={styles.providerSelector}>
            {AI_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.key}
                style={[
                  styles.providerChip,
                  selectedProvider === provider.key && styles.providerChipActive,
                ]}
                onPress={() => handleProviderChange(provider.key)}
              >
                <Text
                  style={[
                    styles.providerChipText,
                    selectedProvider === provider.key && styles.providerChipTextActive,
                  ]}
                >
                  {provider.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            {AI_PROVIDERS.find((p) => p.key === selectedProvider)?.label} API Key
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Paste your API key here"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
          />
          <View style={styles.apiKeyButtonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDeleteApiKey}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveApiKey}>
              <Text style={styles.primaryButtonText}>Save Key</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Personality Core Selector ─── */}
      {renderSectionHeader('J.A.R.V.I.S. Personality Core')}
      {renderCard(
        <View>
          {PERSONALITY_CORES.map((core) => (
            <TouchableOpacity
              key={core.key}
              style={[
                styles.personalityRow,
                selectedPersonality === core.key && styles.personalityRowActive,
              ]}
              onPress={() => handlePersonalityChange(core.key)}
            >
              <View style={styles.personalityRadio}>
                <View
                  style={[
                    styles.personalityRadioInner,
                    selectedPersonality === core.key && styles.personalityRadioInnerActive,
                  ]}
                />
              </View>
              <View style={styles.personalityTextBlock}>
                <Text style={styles.personalityLabel}>{core.label}</Text>
                <Text style={styles.personalityDesc}>{core.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── What's Possible Without Root ─── */}
      {renderSectionHeader('Help')}
      {renderCard(
        <TouchableOpacity style={styles.helpRow} onPress={() => setHelpDialogVisible(true)}>
          <Text style={styles.helpRowText}>What is Possible Without Root?</Text>
          <Text style={styles.helpRowArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ─── Voice Management Dialog ─── */}
      <Modal
        visible={voiceDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Voice Identity</Text>
            <Text style={styles.modalSubtitle}>
              {voiceEnrolled
                ? 'Your voice fingerprint is enrolled. You can verify or delete it below.'
                : 'No voice fingerprint enrolled. Enroll now to enable voice authentication.'}
            </Text>

            {!voiceEnrolled && (
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleEnrollVoice}
                disabled={voiceEnrolling}
              >
                {voiceEnrolling ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Enroll Voice</Text>
                )}
              </TouchableOpacity>
            )}

            {voiceEnrolled && (
              <>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={handleVerifyVoice}
                  disabled={voiceVerifying}
                >
                  {voiceVerifying ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalPrimaryButtonText}>Verify Voice</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDangerButton}
                  onPress={handleDeleteVoice}
                >
                  <Text style={styles.modalDangerButtonText}>Delete Fingerprint</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setVoiceDialogVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Help Dialog ─── */}
      <Modal
        visible={helpDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What is Possible Without Root?</Text>
            <ScrollView style={styles.helpScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.helpText}>
                MANU AI is designed to provide maximum functionality on non-rooted devices. Here is what works out of the box:
              </Text>
              <Text style={styles.helpBullet}>• Voice commands and wake word detection</Text>
              <Text style={styles.helpBullet}>• Notification reading and smart replies</Text>
              <Text style={styles.helpBullet}>• Accessibility-based UI automation (tap, scroll, type)</Text>
              <Text style={styles.helpBullet}>• Screen context awareness via Accessibility events</Text>
              <Text style={styles.helpBullet}>• Ad-supported free tier with premium unlock options</Text>
              <Text style={styles.helpBullet}>• PIN and voice identity authentication</Text>
              <Text style={styles.helpText}>
                Root-only features (not available on your device):
              </Text>
              <Text style={styles.helpBullet}>• System-level gesture injection outside app context</Text>
              <Text style={styles.helpBullet}>• Direct system file access</Text>
              <Text style={styles.helpBullet}>• Modifying protected system settings</Text>
              <Text style={styles.helpText}>
                For most users, the non-root experience is fully sufficient. Enable Accessibility Service in system settings to unlock all features.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setHelpDialogVisible(false)}
            >
              <Text style={styles.modalPrimaryButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00D2FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabelBlock: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelBlock: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusSubLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pinInputBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 16,
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    marginTop: 8,
  },
  pinButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#00D2FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  apiKeyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  providerSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  providerChip: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  providerChipActive: {
    backgroundColor: '#00D2FF22',
    borderColor: '#00D2FF',
  },
  providerChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  providerChipTextActive: {
    color: '#00D2FF',
  },
  personalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  personalityRowActive: {
    backgroundColor: '#00D2FF11',
  },
  personalityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personalityRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  personalityRadioInnerActive: {
    backgroundColor: '#00D2FF',
  },
  personalityTextBlock: {
    flex: 1,
  },
  personalityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  personalityDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  helpRowText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  helpRowArrow: {
    fontSize: 20,
    color: '#00D2FF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalPrimaryButton: {
    backgroundColor: '#00D2FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 15,
  },
  modalDangerButton: {
    backgroundColor: '#FF444422',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  modalDangerButtonText: {
    color: '#FF4444',
    fontWeight: '700',
    fontSize: 15,
  },
  modalSecondaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalSecondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  helpScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 10,
  },
  helpBullet: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 22,
    marginLeft: 4,
    marginBottom: 6,
  },
});
