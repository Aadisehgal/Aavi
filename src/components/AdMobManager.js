// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 10/20 — AdMob Monetization
// File: src/components/AdMobManager.js
// Generated: 2026-06-24

import { NativeModules, NativeEventEmitter, Platform, AppState } from 'react-native';

const { AdMobModule } = NativeModules;
const AdMobEventEmitter = AdMobModule ? new NativeEventEmitter(AdMobModule) : null;

// ─── Production Ad Unit IDs ───
const APP_ID = 'ca-app-pub-3684441716460567~5579379323';
const BANNER_AD_UNIT_ID = 'ca-app-pub-3684441716460567/7116352504';
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3684441716460567/4188433698';
const REWARDED_AD_UNIT_ID = 'ca-app-pub-3684441716460567/7885822933';
const APP_OPEN_AD_UNIT_ID = 'ca-app-pub-3684441716460567/xxxxxxxxxx'; // Production ID needed

// ─── Cooldown Configuration ───
const COOLDOWN_MS = 60000; // 60 seconds shared cooldown

// ─── Singleton State ───
let lastAdShownTime = 0;
let appOpenAdLoaded = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let bannerLoaded = false;
let isInitialized = false;
let appStateSubscription = null;
let eventSubscriptions = [];

// ─── Reward Callback Registry ───
let rewardCallback = null;

/**
 * Check if the shared cooldown has elapsed.
 * @returns {boolean}
 */
function isCooldownElapsed() {
  const now = Date.now();
  return now - lastAdShownTime >= COOLDOWN_MS;
}

/**
 * Record that an ad was shown to enforce cooldown.
 */
function recordAdShown() {
  lastAdShownTime = Date.now();
}

/**
 * Initialize the AdMob SDK and preload ads.
 * Should be called once at app startup.
 */
export async function initializeAdMob() {
  if (isInitialized) return;
  if (!AdMobModule) {
    console.warn('[AdMobManager] Native AdMobModule not available. Ads will not function.');
    return;
  }

  try {
    await AdMobModule.initialize(APP_ID);
    isInitialized = true;

    // Preload all ad types
    await Promise.all([
      loadInterstitial(),
      loadRewarded(),
      loadAppOpen(),
    ]);

    // Listen to app state for App Open Ad
    if (appStateSubscription) {
      appStateSubscription.remove();
    }
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Subscribe to native ad events
    subscribeToEvents();

    console.log('[AdMobManager] Initialized and ads preloaded.');
  } catch (e) {
    console.error('[AdMobManager] Initialization failed:', e.message);
  }
}

/**
 * Subscribe to native ad events from the bridge.
 */
function subscribeToEvents() {
  if (!AdMobEventEmitter) return;

  // Clear existing subscriptions
  eventSubscriptions.forEach((sub) => sub.remove());
  eventSubscriptions = [];

  const sub1 = AdMobEventEmitter.addListener('AdMobInterstitialClosed', () => {
    interstitialLoaded = false;
    recordAdShown();
    loadInterstitial(); // Preload next
  });

  const sub2 = AdMobEventEmitter.addListener('AdMobRewardedEarned', (event) => {
    if (rewardCallback) {
      rewardCallback(event);
      rewardCallback = null;
    }
    rewardedLoaded = false;
    recordAdShown();
    loadRewarded(); // Preload next
  });

  const sub3 = AdMobEventEmitter.addListener('AdMobRewardedClosed', () => {
    rewardedLoaded = false;
    loadRewarded();
  });

  const sub4 = AdMobEventEmitter.addListener('AdMobAppOpenClosed', () => {
    appOpenAdLoaded = false;
    recordAdShown();
    loadAppOpen();
  });

  const sub5 = AdMobEventEmitter.addListener('AdMobBannerLoaded', () => {
    bannerLoaded = true;
  });

  const sub6 = AdMobEventEmitter.addListener('AdMobBannerFailed', () => {
    bannerLoaded = false;
  });

  eventSubscriptions = [sub1, sub2, sub3, sub4, sub5, sub6];
}

/**
 * Handle app state changes to trigger App Open Ad.
 */
function handleAppStateChange(nextAppState) {
  if (nextAppState === 'active') {
    showAppOpenAd();
  }
}

// ─── Banner Ad ───

/**
 * Show a banner ad in the specified parent view.
 * Call from ChatScreen or ToolsScreen.
 * @param {string} screenName - 'chat' | 'tools'
 */
export async function showBanner(screenName) {
  if (!AdMobModule || !isInitialized) return;
  try {
    await AdMobModule.showBanner(BANNER_AD_UNIT_ID, screenName);
    bannerLoaded = true;
  } catch (e) {
    console.error('[AdMobManager] Banner show failed:', e.message);
  }
}

/**
 * Hide the currently displayed banner ad.
 */
export async function hideBanner() {
  if (!AdMobModule || !isInitialized) return;
  try {
    await AdMobModule.hideBanner();
    bannerLoaded = false;
  } catch (e) {
    console.error('[AdMobManager] Banner hide failed:', e.message);
  }
}

/**
 * Check if banner is currently loaded.
 * @returns {boolean}
 */
export function isBannerLoaded() {
  return bannerLoaded;
}

// ─── Interstitial Ad ───

/**
 * Preload an interstitial ad.
 */
export async function loadInterstitial() {
  if (!AdMobModule || !isInitialized) return;
  try {
    await AdMobModule.loadInterstitial(INTERSTITIAL_AD_UNIT_ID);
    interstitialLoaded = true;
  } catch (e) {
    interstitialLoaded = false;
    console.error('[AdMobManager] Interstitial load failed:', e.message);
  }
}

/**
 * Show interstitial ad if cooldown has elapsed and ad is loaded.
 * @returns {boolean} Whether ad was shown
 */
export async function showInterstitial() {
  if (!AdMobModule || !isInitialized || !interstitialLoaded) return false;
  if (!isCooldownElapsed()) {
    console.log('[AdMobManager] Interstitial skipped: cooldown active.');
    return false;
  }
  try {
    await AdMobModule.showInterstitial();
    return true;
  } catch (e) {
    console.error('[AdMobManager] Interstitial show failed:', e.message);
    interstitialLoaded = false;
    loadInterstitial();
    return false;
  }
}

/**
 * Check if interstitial is loaded.
 * @returns {boolean}
 */
export function isInterstitialLoaded() {
  return interstitialLoaded;
}

// ─── Rewarded Ad ───

/**
 * Preload a rewarded ad.
 */
export async function loadRewarded() {
  if (!AdMobModule || !isInitialized) return;
  try {
    await AdMobModule.loadRewarded(REWARDED_AD_UNIT_ID);
    rewardedLoaded = true;
  } catch (e) {
    rewardedLoaded = false;
    console.error('[AdMobManager] Rewarded load failed:', e.message);
  }
}

/**
 * Show rewarded ad with a callback for reward earned.
 * Respects cooldown.
 * @param {Function} onRewarded - Callback(rewardEvent) when user earns reward
 * @returns {boolean} Whether ad was shown
 */
export async function showRewarded(onRewarded) {
  if (!AdMobModule || !isInitialized || !rewardedLoaded) return false;
  if (!isCooldownElapsed()) {
    console.log('[AdMobManager] Rewarded skipped: cooldown active.');
    return false;
  }
  try {
    rewardCallback = onRewarded || null;
    await AdMobModule.showRewarded();
    return true;
  } catch (e) {
    console.error('[AdMobManager] Rewarded show failed:', e.message);
    rewardedLoaded = false;
    loadRewarded();
    return false;
  }
}

/**
 * Check if rewarded ad is loaded.
 * @returns {boolean}
 */
export function isRewardedLoaded() {
  return rewardedLoaded;
}

// ─── App Open Ad ───

/**
 * Preload an App Open ad.
 */
export async function loadAppOpen() {
  if (!AdMobModule || !isInitialized) return;
  try {
    await AdMobModule.loadAppOpen(APP_OPEN_AD_UNIT_ID);
    appOpenAdLoaded = true;
  } catch (e) {
    appOpenAdLoaded = false;
    console.error('[AdMobManager] AppOpen load failed:', e.message);
  }
}

/**
 * Show App Open ad on app resume if cooldown allows.
 * @returns {boolean} Whether ad was shown
 */
export async function showAppOpenAd() {
  if (!AdMobModule || !isInitialized || !appOpenAdLoaded) return false;
  if (!isCooldownElapsed()) {
    console.log('[AdMobManager] AppOpen skipped: cooldown active.');
    return false;
  }
  try {
    await AdMobModule.showAppOpen();
    return true;
  } catch (e) {
    console.error('[AdMobManager] AppOpen show failed:', e.message);
    appOpenAdLoaded = false;
    loadAppOpen();
    return false;
  }
}

/**
 * Check if App Open ad is loaded.
 * @returns {boolean}
 */
export function isAppOpenLoaded() {
  return appOpenAdLoaded;
}

// ─── Utility / Cleanup ───

/**
 * Get the remaining cooldown time in milliseconds.
 * @returns {number}
 */
export function getCooldownRemaining() {
  const remaining = COOLDOWN_MS - (Date.now() - lastAdShownTime);
  return remaining > 0 ? remaining : 0;
}

/**
 * Check if any ad type is ready to show (loaded + cooldown elapsed).
 * @returns {boolean}
 */
export function isAnyAdReady() {
  return isCooldownElapsed() && (interstitialLoaded || rewardedLoaded || appOpenAdLoaded);
}

/**
 * Cleanup all AdMob resources. Call on app destroy or logout.
 */
export function destroyAdMob() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  eventSubscriptions.forEach((sub) => sub.remove());
  eventSubscriptions = [];

  if (AdMobModule && AdMobModule.destroy) {
    AdMobModule.destroy();
  }

  isInitialized = false;
  interstitialLoaded = false;
  rewardedLoaded = false;
  appOpenAdLoaded = false;
  bannerLoaded = false;
  lastAdShownTime = 0;
  rewardCallback = null;

  console.log('[AdMobManager] Destroyed and cleaned up.');
}

// ─── Default Export for convenience ───
export default {
  initializeAdMob,
  showBanner,
  hideBanner,
  isBannerLoaded,
  loadInterstitial,
  showInterstitial,
  isInterstitialLoaded,
  loadRewarded,
  showRewarded,
  isRewardedLoaded,
  loadAppOpen,
  showAppOpenAd,
  isAppOpenLoaded,
  getCooldownRemaining,
  isAnyAdReady,
  destroyAdMob,
  APP_ID,
  BANNER_AD_UNIT_ID,
  INTERSTITIAL_AD_UNIT_ID,
  REWARDED_AD_UNIT_ID,
  APP_OPEN_AD_UNIT_ID,
};
