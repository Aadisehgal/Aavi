# AsyncStorage Fix Guide

## Files to Update in Your Existing Code:

### 1. VoiceFingerprint.js
FIND:
  import AsyncStorage from '@react-native-async-storage/async-storage';
  // OR
  import { AsyncStorage } from 'react-native';

REPLACE WITH:
  import Storage from '../modules/StorageBridge';

FIND:
  await AsyncStorage.setItem('voice_signature', signature);

REPLACE WITH:
  await Storage.saveString('voice_signature', signature);

FIND:
  const signature = await AsyncStorage.getItem('voice_signature');

REPLACE WITH:
  const signature = await Storage.getString('voice_signature');

### 2. SettingsScreen.js
FIND:
  import AsyncStorage from '@react-native-async-storage/async-storage';

REPLACE WITH:
  import Storage from '../modules/StorageBridge';

FIND:
  await AsyncStorage.setItem('setting_key', value);

REPLACE WITH:
  await Storage.saveString('setting_key', value);

FIND:
  const value = await AsyncStorage.getItem('setting_key');

REPLACE WITH:
  const value = await Storage.getString('setting_key');

### 3. MainApplication.kt
ADD to packages list:
  packages.add(StoragePackage())

### 4. Any other file using AsyncStorage
Same pattern: import StorageBridge, replace AsyncStorage calls
