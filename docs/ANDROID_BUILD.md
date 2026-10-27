# Android Application Packaging Guide: Aarogya Drishti
**Target Architecture:** Capacitor Hybrid Android Application (API Level 26+ / Android 8.0 to Android 15+)  
**App ID:** `in.gov.aarogya.drishti`  
**App Name:** Aarogya Drishti (ఆరోగ్య దృష్టి)

---

## 1. Prerequisites
- **Android Studio:** Ladybug (2024.2+) or Jellyfish with Android SDK Platform 34 / 35.
- **Java Development Kit (JDK):** JDK 17 or JDK 21 (configured in `JAVA_HOME`).
- **Android Build Tools:** Version 34.0.0+.
- **Node.js & npm:** Node v20+ / npm v10+.
- **Hardware/Virtual Device:** Physical Android phone or Android Virtual Device (AVD) running API 26+.

---

## 2. Step-by-Step Android Packaging Commands

### Step 1: Install Capacitor in Frontend
Navigate to the frontend directory:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera
```

### Step 2: Build the Production Web Bundle
```bash
npm run build
```
This generates the optimized bundle in `frontend/dist/`.

### Step 3: Initialize and Add Android Platform
```bash
npx cap add android
```
This generates the native Android Studio project in `frontend/android/`.

### Step 4: Sync Web Assets to Android Shell
Whenever you update frontend code or translations:
```bash
npm run build
npx cap sync android
```

### Step 5: Open in Android Studio & Generate APK
```bash
npx cap open android
```
Inside Android Studio:
1. Wait for Gradle sync to complete.
2. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. The debug APK is generated at:  
   `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 3. Required Android Permissions (`AndroidManifest.xml`)

Capacitor automatically configures permissions in `frontend/android/app/src/main/AndroidManifest.xml`:
```xml
<!-- Network Access for REST API & Telemedicine WebRTC -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Camera & Storage for Visible Health Screening & Chat Attachments -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- Audio for WebRTC Tele-consultations -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

---

## 4. Hardware & Viewport Optimizations
- **Safe Area Insets:** The interface respects Android notch and navigation pill via `viewport-fit=cover` and CSS env variables:
  ```css
  padding-bottom: env(safe-area-inset-bottom);
  ```
- **Hardware Back Button:** Managed via `@capacitor/app` so that pressing back closes modals or returns to the previous screen rather than quitting the app.
- **Low-Memory Devices:** Images are client-validated before upload, keeping memory usage minimal on 2GB RAM entry-level Android smartphones.
