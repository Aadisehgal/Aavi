// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 21/21 — AsyncStorage Fix & Native Storage Bridge
// File: src/modules/StorageBridge.js

import { NativeModules } from 'react-native';

const { StorageModule } = NativeModules;

const Storage = {
  /**
   * Save a string value to SharedPreferences
   * @param {string} key - Storage key
   * @param {string} value - String value to store
   * @returns {Promise<boolean>}
   */
  saveString: async (key, value) => {
    return await StorageModule.saveString(key, value);
  },

  /**
   * Retrieve a string value from SharedPreferences
   * @param {string} key - Storage key
   * @param {string|null} defaultValue - Default value if key not found
   * @returns {Promise<string|null>}
   */
  getString: async (key, defaultValue = null) => {
    return await StorageModule.getString(key, defaultValue);
  },

  /**
   * Save an object (auto JSON.stringify)
   * @param {string} key - Storage key
   * @param {object} value - Object to store
   * @returns {Promise<boolean>}
   */
  saveObject: async (key, value) => {
    const jsonValue = JSON.stringify(value);
    return await StorageModule.saveObject(key, jsonValue);
  },

  /**
   * Retrieve an object (auto JSON.parse)
   * @param {string} key - Storage key
   * @returns {Promise<object|null>}
   */
  getObject: async (key) => {
    const jsonValue = await StorageModule.getObject(key);
    if (jsonValue === null || jsonValue === undefined) {
      return null;
    }
    try {
      return JSON.parse(jsonValue);
    } catch (e) {
      console.warn(`StorageBridge: Failed to parse JSON for key "${key}"`, e);
      return null;
    }
  },

  /**
   * Delete a specific key from storage
   * @param {string} key - Storage key to delete
   * @returns {Promise<boolean>}
   */
  deleteKey: async (key) => {
    return await StorageModule.deleteKey(key);
  },

  /**
   * Clear all data from storage
   * @returns {Promise<boolean>}
   */
  clearAll: async () => {
    return await StorageModule.clearAll();
  },
};

export default Storage;
