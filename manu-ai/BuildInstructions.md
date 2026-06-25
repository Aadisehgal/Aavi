# MANU AI - Build Instructions

## Target: ARM64 Android via Termux

### Prerequisites
- ARM64 Android device (NOT x86_64)
- 4GB+ storage, Android 7+, Microphone, Internet

### Step 1: Install Termux (F-Droid, NOT Play Store)
### Step 2: Setup Environment
```bash
pkg update && pkg upgrade -y
pkg install git nodejs openjdk-17 gradle python3 make -y
```
### Step 3: Install Android SDK
```bash
mkdir -p $PREFIX/opt/android-sdk && cd $PREFIX/opt/android-sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
```
### Step 4: Environment Variables (add to ~/.bashrc)
```bash
export ANDROID_HOME=$PREFIX/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
source ~/.bashrc
```
### Step 5: SDK Packages
```bash
sdkmanager --licenses
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
```
### Step 6: NDK
```bash
cd $PREFIX/opt/android-sdk
wget https://dl.google.com/android/repository/android-ndk-r26b-linux.zip
unzip android-ndk-r26b-linux.zip
mv android-ndk-r26b ndk/26.1.10909125
```
### Step 7: ARM64 Symlink Fix (CRITICAL)
```bash
cd $PREFIX/opt/android-sdk/ndk/26.1.10909125/prebuilt
ln -s linux-aarch64 linux-x86_64
```
### Step 8: Build
```bash
cd ~/manu-ai/android
cp local.properties.template local.properties
npm install
cd android
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```
### Step 9: Grant Permissions
- Accessibility: Settings > Accessibility > MANU AI
- Notification Access: Settings > Apps > Special Access
- Microphone & Overlay: When prompted
### Step 10: Termux API (for real shell)
```bash
pkg install termux-api
echo "allow-external-apps=true" >> ~/.termux/termux.properties
termux-reload-settings
```
### Step 11: Enroll Voice in Settings

## Troubleshooting
- **No toolchains**: Check NDK symlink fix
- **Hermes error**: Already disabled, uses JSC
- **x86_64 binaries**: Ensure symlink exists
- **Build fails**: Check `reactNativeArchitectures=arm64-v8a`

## Known Limitations
- aircrack-ng: BLOCKED (Root required)
- Silent screenshots: BLOCKED (MediaProjection consent)
- Other apps' private files: BLOCKED (Android sandbox)
- Permission bypass: BLOCKED (Security model)
- Real shell: NEEDS TERMUX
- Voice fingerprint: 60-80% accuracy (PIN fallback)
