# 180-Bioengine - Running Instructions

This guide provides instructions on how to run the **nasomEATR** (180-Bioengine) application on an emulator or physical phone. Since this is an **Expo** project with native modules, follow these steps.

## Prerequisites

1.  **Dependencies**: Run `npm install` in the project root.
2.  **Android SDK**: Ensure the Android SDK is installed.
3.  **Local Properties**: Create `android/local.properties` if it doesn't exist:
    `sdk.dir=/Users/arshiyasalehi/Library/Android/sdk`

---

## 💻 Running on an Emulator

### 1. Start the Emulator (Terminal)
You can start your emulator without opening Android Studio:
```bash
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &
```

### 2. Launch the Application
Once the emulator is booted, run:
```bash
npm run android
```
*Note: This will build the development client and install it on the emulator.*

---

## 📱 Running on a Physical Phone

### Option A: Via USB (Native Features)
1. Connect your phone via USB with **USB Debugging** enabled.
2. Run:
   ```bash
   npm run android
   ```

### Option B: Via Expo Go (Quick UI Check)
1. Install the **Expo Go** app on your phone.
2. Run:
   ```bash
   npx expo start
   ```
3. Scan the QR code with your phone.

---

## 🛠 Troubleshooting

- **Clean Build**: If you see native errors, try:
  `cd android && ./gradlew clean && cd ..`
- **SDK Path**: If Gradle says "SDK not found", double-check your `android/local.properties` file.
