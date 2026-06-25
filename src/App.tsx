import React, {useEffect} from 'react';
import {StatusBar, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './navigation/AppNavigator';
import {useStore} from './store/useStore';
import {initializeAds} from './services/ads';

export default function App() {
  const {loadSettings} = useStore();

  useEffect(() => {
    loadSettings();
    initializeAds().catch(console.error);
  }, [loadSettings]);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1e" />
        <AppNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
});
