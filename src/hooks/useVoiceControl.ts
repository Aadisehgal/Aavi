import {useCallback, useEffect, useRef, useState} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import {useStore} from '../store/useStore';
import {
  initializeTTS,
  speak,
  stopSpeaking,
  startSpeechRecognition,
  stopSpeechRecognition,
  destroySpeechRecognition,
  isSpeechAvailable,
} from '../services/voice';
import {
  getInstalledApps,
  getContacts,
  openApp,
  makePhoneCall,
  sendSMS,
  toggleFlashlight,
  setVolume,
  openYouTubeSearch,
  openWhatsAppChat,
  openWhatsAppStatus,
  openTikTok,
} from '../services/apps';
import {parseVoiceCommand, executeCommand} from '../utils/commandParser';
import {detectEmotion} from '../utils/emotion';
import type {AppInfo, Contact} from '../types';

export function useVoiceControl() {
  const {
    settings,
    setIsListening,
    setIsSpeaking,
    setLastTranscript,
    addMessage,
    setCurrentEmotion,
  } = useStore();

  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continuousListening = useRef(false);
  const processingRef = useRef(false);

  // Load apps and contacts on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const apps = await getInstalledApps();
        setInstalledApps(apps);
      } catch (e) {
        console.log('Could not load apps:', e);
      }

      try {
        const conts = await getContacts();
        setContacts(conts);
      } catch (e) {
        console.log('Could not load contacts:', e);
      }
    };
    loadData();
  }, []);

  // Initialize TTS
  useEffect(() => {
    initializeTTS(settings.language)
      .then(() => setIsInitialized(true))
      .catch((e) => setError('TTS initialization failed'));
  }, [settings.language]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      for (const permission of permissions) {
        try {
          const result = await PermissionsAndroid.request(permission, {
            title: 'MANU AI Permission',
            message: 'MANU AI needs this permission to function properly.',
            buttonPositive: 'Allow',
          });
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log(`Permission ${permission} not granted`);
          }
        } catch (e) {
          console.log(`Error requesting ${permission}:`, e);
        }
      }
    }
  }, []);

  const handleVoiceResult = useCallback(async (text: string, isFinal: boolean) => {
    if (!isFinal || processingRef.current) return;

    processingRef.current = true;
    setLastTranscript(text);

    // Detect emotion from voice input
    const emotion = detectEmotion(text, settings.language);
    setCurrentEmotion(emotion);

    // Check if it's a command
    const command = parseVoiceCommand(text, settings.language, installedApps, contacts);

    if (command) {
      const response = await executeCommand(command, {
        openApp,
        makeCall: makePhoneCall,
        sendSMS,
        toggleFlashlight,
        setVolume,
        openYouTubeSearch,
        openWhatsAppChat,
        openWhatsAppStatus,
        openTikTok,
      });

      setIsSpeaking(true);
      await speak(response, undefined, () => setIsSpeaking(false));

      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        emotion,
      });
    } else {
      // Treat as chat message
      addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
    }

    processingRef.current = false;
  }, [settings.language, installedApps, contacts, setLastTranscript, setCurrentEmotion, addMessage, setIsSpeaking]);

  const startListening = useCallback(async (continuous: boolean = true) => {
    try {
      await requestPermissions();
      const available = await isSpeechAvailable();
      if (!available) {
        setError('Speech recognition not available');
        return;
      }

      continuousListening.current = continuous;
      setIsListening(true);

      const locale = settings.language === 'hi' ? 'hi-IN' : 'en-US';

      await startSpeechRecognition(
        locale,
        continuous,
        handleVoiceResult,
        (status) => {
          if (status === 'error') {
            setIsListening(false);
          }
        },
        (rms) => {
          // Volume feedback could be used for visual indicator
        },
      );
    } catch (e) {
      setError(`Failed to start listening: ${e}`);
      setIsListening(false);
    }
  }, [settings.language, requestPermissions, handleVoiceResult, setIsListening]);

  const stopListening = useCallback(async () => {
    continuousListening.current = false;
    setIsListening(false);
    try {
      await stopSpeechRecognition();
    } catch (e) {
      console.log('Error stopping speech:', e);
    }
  }, [setIsListening]);

  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    await speak(text, undefined, () => setIsSpeaking(false));
  }, [setIsSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroySpeechRecognition();
      stopSpeaking();
    };
  }, []);

  return {
    isInitialized,
    error,
    startListening,
    stopListening,
    speakText,
    installedApps,
    contacts,
  };
}
