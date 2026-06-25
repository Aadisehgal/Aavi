import {
  MobileAds,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
  AppOpenAd,
  TestIds,
} from 'react-native-google-mobile-ads';

// ============================================
// AD UNIT IDs - REPLACE WITH YOUR REAL IDs
// ============================================
// Get these from: https://admob.google.com
// Format: ca-app-pub-3684441716460567/XXXXXXXXXX
//
// TEST IDs (use during development):
// Banner:       ca-app-pub-3940256099942544/6300978111
// Interstitial: ca-app-pub-3940256099942544/1033173712
// Rewarded:     ca-app-pub-3940256099942544/5224354917
// App Open:     ca-app-pub-3940256099942544/9257395921
// ============================================

const PUBLISHER_ID = 'ca-app-pub-3684441716460567';

// Production Ad Unit IDs (REPLACE THESE WITH YOUR REAL IDs!)
const PROD_BANNER_UNIT_ID = `${PUBLISHER_ID}/7116352504`;
const PROD_INTERSTITIAL_UNIT_ID = `${PUBLISHER_ID}/1234567890`;
const PROD_REWARDED_UNIT_ID = `${PUBLISHER_ID}/7885822933`;
const PROD_APP_OPEN_UNIT_ID = `${PUBLISHER_ID}/4567890123`;

// Test Ad Unit IDs (Google's official test IDs)
const TEST_BANNER_UNIT_ID = TestIds.BANNER;
const TEST_INTERSTITIAL_UNIT_ID = TestIds.INTERSTITIAL;
const TEST_REWARDED_UNIT_ID = TestIds.REWARDED;
// App Open test ID - using Google's test ID directly
const TEST_APP_OPEN_UNIT_ID = 'ca-app-pub-3940256099942544/9257395921';

// Use test IDs in development, production IDs in release
const isDev = __DEV__;

export const AD_UNIT_IDS = {
  banner: isDev ? TEST_BANNER_UNIT_ID : PROD_BANNER_UNIT_ID,
  interstitial: isDev ? TEST_INTERSTITIAL_UNIT_ID : PROD_INTERSTITIAL_UNIT_ID,
  rewarded: isDev ? TEST_REWARDED_UNIT_ID : PROD_REWARDED_UNIT_ID,
  appOpen: isDev ? TEST_APP_OPEN_UNIT_ID : PROD_APP_OPEN_UNIT_ID,
};

// ============================================
// AD STATE MANAGEMENT
// ============================================
let rewardedAd: RewardedAd | null = null;
let interstitialAd: InterstitialAd | null = null;
let appOpenAd: AppOpenAd | null = null;

// Track ad impressions for analytics
let adStats = {
  bannerImpressions: 0,
  interstitialImpressions: 0,
  rewardedImpressions: 0,
  appOpenImpressions: 0,
  totalRevenue: 0,
};

// ============================================
// INITIALIZATION
// ============================================
export async function initializeAds(): Promise<void> {
  try {
    // Set request configuration before initialization
    await MobileAds().setRequestConfiguration({
      testDeviceIdentifiers: isDev ? ['EMULATOR'] : [],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    // Initialize the SDK
    const adapterStatuses = await MobileAds().initialize();
    console.log('AdMob initialized:', adapterStatuses);

    // Pre-load ads
    await Promise.all([
      loadInterstitialAd(),
      loadRewardedAd(),
      loadAppOpenAd(),
    ]);
  } catch (error) {
    console.error('AdMob initialization failed:', error);
  }
}

// ============================================
// BANNER ADS
// ============================================
export function getBannerAdUnitId(): string {
  return AD_UNIT_IDS.banner;
}

export function getBannerSize() {
  return BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
}

export function trackBannerImpression(): void {
  adStats.bannerImpressions++;
}

// ============================================
// INTERSTITIAL ADS
// ============================================
export async function loadInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (interstitialAd) {
      resolve(true);
      return;
    }

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialAd = ad;
      unsubLoaded();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      resolve(false);
    });

    ad.load();

    setTimeout(() => {
      if (!interstitialAd) {
        unsubLoaded();
        resolve(false);
      }
    }, 30000);
  });
}

export async function showInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!interstitialAd) {
      loadInterstitialAd().then((loaded) => {
        if (loaded) {
          showInterstitialAd().then(resolve);
        } else {
          resolve(false);
        }
      });
      return;
    }

    const unsubClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialAd = null;
      adStats.interstitialImpressions++;
      unsubClosed();
      resolve(true);
      loadInterstitialAd();
    });

    const unsubError = interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      interstitialAd = null;
      unsubClosed();
      resolve(false);
    });

    interstitialAd.show();
  });
}

// ============================================
// REWARDED ADS
// ============================================
export async function loadRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (rewardedAd) {
      resolve(true);
      return;
    }

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedAd = ad;
      unsubLoaded();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener('error', () => {
      unsubLoaded();
      resolve(false);
    });

    ad.load();

    setTimeout(() => {
      if (!rewardedAd) {
        unsubLoaded();
        resolve(false);
      }
    }, 30000);
  });
}

export async function showRewardedAd(): Promise<{success: boolean; reward?: any}> {
  return new Promise((resolve) => {
    if (!rewardedAd) {
      loadRewardedAd().then((loaded) => {
        if (loaded) {
          showRewardedAd().then(resolve);
        } else {
          resolve({success: false});
        }
      });
      return;
    }

    const unsubEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        adStats.rewardedImpressions++;
        unsubEarned();
        rewardedAd = null;
        resolve({success: true, reward});
        loadRewardedAd();
      },
    );

    const unsubClosed = rewardedAd.addAdEventListener('closed', () => {
      unsubEarned();
      rewardedAd = null;
      resolve({success: false});
    });

    rewardedAd.show();
  });
}

// ============================================
// APP OPEN ADS
// ============================================
export async function loadAppOpenAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (appOpenAd) {
      resolve(true);
      return;
    }

    const ad = AppOpenAd.createForAdRequest(AD_UNIT_IDS.appOpen);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      appOpenAd = ad;
      unsubLoaded();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      resolve(false);
    });

    ad.load();

    setTimeout(() => {
      if (!appOpenAd) {
        unsubLoaded();
        resolve(false);
      }
    }, 30000);
  });
}

export async function showAppOpenAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!appOpenAd) {
      loadAppOpenAd().then((loaded) => {
        if (loaded) {
          showAppOpenAd().then(resolve);
        } else {
          resolve(false);
        }
      });
      return;
    }

    const unsubClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      appOpenAd = null;
      adStats.appOpenImpressions++;
      unsubClosed();
      resolve(true);
      loadAppOpenAd();
    });

    appOpenAd.show();
  });
}

// ============================================
// AD ANALYTICS
// ============================================
export function getAdStats() {
  return {...adStats};
}

export function resetAdStats() {
  adStats = {
    bannerImpressions: 0,
    interstitialImpressions: 0,
    rewardedImpressions: 0,
    appOpenImpressions: 0,
    totalRevenue: 0,
  };
}

// ============================================
// AD PLACEMENT STRATEGY
// ============================================
let lastInterstitialShow = 0;
const INTERSTITIAL_COOLDOWN = 60000; // 60 seconds between interstitials

export async function showInterstitialWithCooldown(): Promise<boolean> {
  const now = Date.now();
  if (now - lastInterstitialShow < INTERSTITIAL_COOLDOWN) {
    return false;
  }
  const shown = await showInterstitialAd();
  if (shown) {
    lastInterstitialShow = now;
  }
  return shown;
}

// ============================================
// EXPORTS
// ============================================
export {BannerAd, BannerAdSize};
