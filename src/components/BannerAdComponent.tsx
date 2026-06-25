import React from 'react';
import {View, StyleSheet} from 'react-native';
import {BannerAd, BannerAdSize, getBannerAdUnitId} from '../services/ads';

export function BannerAdComponent() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.BANNER}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
  },
});
