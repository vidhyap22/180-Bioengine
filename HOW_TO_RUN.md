# 180-Bioengine - Running Instructions

This guide provides instructions on how to run the **nasomEATR** (180-Bioengine) application. This is an **Expo** project with native modules, requiring a development build to run on an emulator or physical device.

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18+) & **npm**
- **Android Studio** & **Android SDK**
- **Java Development Kit (JDK)** (v17+ recommended)

### 1. Install Dependencies
Run the following command in the project root:
```bash
npm install
```

### 2. Configure Android SDK Path
The project needs to know where your Android SDK is located. Create or edit the `android/local.properties` file:

**macOS / Linux:**
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```
*(Replace `YOUR_USERNAME` with your actual system username)*

**Windows:**
```properties
sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

---

## 💻 Running on an Emulator

### 1. Find and Start your Emulator
You can list your available Android Virtual Devices (AVDs) with:
```bash
~/Library/Android/sdk/emulator/emulator -list-avds
```
Once you have the name (e.g., `Pixel_7_API_35`), start it:
```bash
~/Library/Android/sdk/emulator/emulator -avd YOUR_EMULATOR_NAME &
```

### 2. Launch the Application
With the emulator running, execute:
```bash
npm run android
```
*Note: The first run will take a few minutes as it builds the native Android project.*

---

## 📱 Running on a Physical Phone

1. **Connect your phone** via USB.
2. **Enable USB Debugging**:
   - Go to **Settings > About Phone** and tap **Build Number** 7 times.
   - Go to **Settings > Developer Options** and enable **USB Debugging**.
3. **Verify Connection**:
   Check if your device is recognized:
   ```bash
   adb devices
   ```
   *Note: If `adb` is not found, it is located in your SDK's `platform-tools` folder.*
4. **Launch**:
   ```bash
   npm run android
   ```

---

## 🔄 Switching Between Devices

If you have multiple devices (e.g., an emulator and a physical phone) and want to choose where to run:

### 1. Interactive Device Selection
Run the following command to see a list of all connected devices and emulators:
```bash
npx expo run:android --device
```
Use the arrow keys to select your desired device and press **Enter**.

### 2. Default Behavior
By default, `npm run android` will attempt to run on the first available device it finds. If an emulator is already running, it often defaults to that. Use the `--device` flag above to override this.


---

## 🚀 Running Offline (ESP32 / Production Mode)

If you need to connect to an **ESP32 WiFi** (which has no internet) or run the app without being connected to your laptop, you must build a **Release** version.

### 1. Build and Install Release APK (Standalone)
This command builds the app and installs it directly onto your connected phone. Once this finishes, the app is permanent and **no longer needs the laptop**.
```bash
npx expo run:android --variant release
```

### 2. Generate a Shareable APK File
If you want to create an `.apk` file that you can send to other people or install later without a terminal:
1. Run the build command:
   ```bash
   cd android && ./gradlew assembleRelease
   ```
2. Your APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`
3. You can copy this file to your phone and install it manually.

### 2. Debugging while on ESP32 WiFi (USB required)
If you want to keep debugging but need to switch the phone to the ESP32 WiFi:
1. Connect via USB.
2. Run `npm run android`.
3. In a new terminal, run:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
This forwards the Metro Bundler over the USB cable, allowing the app to stay connected even if the phone's WiFi changes.

---

## ⚙️ Environment Configuration

If the app requires connection to Supabase or other services, create a `.env` file in the root directory:
```env
REACT_APP_SB_API_KEY="your_supabase_api_key"
```

---

## 🛠 Troubleshooting

- **Native Build Errors**: Try cleaning the Gradle build:
  ```bash
  cd android && ./gradlew clean && cd ..
  ```
- **Connection Lost when switching WiFi**: Use the `adb reverse` command mentioned above.
- **White Screen on Physical Phone**:
  1. Connect your phone via USB.
  2. Run: `adb reverse tcp:8081 tcp:8081`
  3. Reload the app (shake the phone or press `r` in the terminal).
- **SDK Not Found**: Double-check that the path in `android/local.properties` exists and uses forward slashes (or escaped backslashes on Windows).
- **Node Modules**: If you encounter dependency issues, try `rm -rf node_modules && npm install`.


