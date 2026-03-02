# WiFi Transfer Testing Guide

## Your Setup
- **WiFi Network:** Six/seven67
- **WiFi Password:** 13471352
- **Mode:** Station Mode (both devices on same network)

---

## Step 1: Prepare MP3 Files

1. **Rename your test files:**
   - `1234567_nasal_JakobRandomRecording.mp3` → `nasal_audio.mp3`
   - `1234567_oral_JakobRandomRecording.mp3` → `oral_audio.mp3`

2. **Create the data folder:**
   - Locate your ESP32 sketch folder (where `ESP32_WiFi_Station.ino` lives)
   - Create a folder named `data` inside it
   - Put `nasal_audio.mp3` and `oral_audio.mp3` inside `data/`

   ```
   YourFolder/
   ├── ESP32_WiFi_Station.ino
   └── data/
       ├── nasal_audio.mp3
       └── oral_audio.mp3
   ```

---

## Step 2: Upload Files to ESP32 SPIFFS

1. Open **Arduino IDE**
2. **Close Serial Monitor** (if open)
3. Go to **Tools > ESP32 Sketch Data Upload**
4. Wait for upload to complete
5. You should see: "SPIFFS Image Uploaded" or similar

**Note:** If you don't see "ESP32 Sketch Data Upload":
- Install ESP32 board support: File > Preferences > Add URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Then Tools > Board > Boards Manager > Search "ESP32" > Install

---

## Step 3: Upload ESP32 Code

1. **WiFi credentials are already set** in `ESP32_WiFi_Station.ino`:
   - SSID: Six/seven67
   - Password: 13471352

2. **Connect ESP32** to your computer via USB

3. **Select board:**
   - Tools > Board > ESP32 Dev Module (or your specific ESP32 board)

4. **Select port:**
   - Tools > Port > [Your ESP32's COM port]

5. **Upload:**
   - Click Upload button (→) or Ctrl+U

6. **Open Serial Monitor:**
   - Tools > Serial Monitor
   - Set baud rate to **115200**

7. **Press ESP32 reset button** (or reconnect power)

8. **Check output** - you should see:
   ```
   ✓ Connected to WiFi successfully!
     IP address: 192.168.x.xxx   <-- WRITE THIS DOWN!
   ```

   **Important:** Write down the ESP32 IP address (e.g., `192.168.1.105`)

---

## Step 4: Connect Phone to Same WiFi

1. On your **Android phone:**
   - Open Settings > WiFi
   - Connect to **Six/seven67** (password: 13471352)
   - Make sure you're connected and have internet

---

## Step 5: Configure Mobile App for ESP32 IP (if needed)

The app tries to find ESP32 automatically. If it doesn't connect:

1. **Find your ESP32 IP** from Serial Monitor (from Step 3.8)

2. **Check if it's in the discovery list** - the app tries:
   - 192.168.1.100, 192.168.1.101
   - 192.168.0.100, 192.168.0.101

3. **If your ESP32 got a different IP** (e.g., 192.168.1.105):
   - You may need to add it to `WiFiTransfer.js` in the `commonIPs` array
   - Or the "Check Connection" button might find it - try first!

---

## Step 6: Start the Mobile App

1. **Start Expo:**
   ```bash
   cd "/Users/arshiyasalehi/Desktop/cs 180A repo/180-Bioengine"
   npx expo start
   ```

2. **Open on phone:**
   - Scan QR code with Expo Go app, OR
   - Press `a` for Android in the terminal

3. **Make sure** your phone is on **Six/seven67** WiFi with internet

---

## Step 7: Test the WiFi Transfer Flow

1. **Open the app** and log in (if needed)

2. **Select a patient** (or create one for testing)

3. **Tap "New Test"** or similar to start a test

4. **Select "WiFi (ESP32)"** from the transfer method modal

5. **Check Connection:**
   - Tap "Check Connection" button
   - You should see: "Connected! ESP32 found at [IP address]"
   - If it fails, verify ESP32 is on and connected (check Serial Monitor)

6. **Continue to Transfer:**
   - Tap "Continue to Transfer"
   - You should see the Transfer step

7. **Start Transfer:**
   - Tap "Start Transfer"
   - App will download nasal_audio.mp3 and oral_audio.mp3 from ESP32
   - Progress should show, then move to Processing step

8. **Processing:**
   - App calculates nasalance score
   - Moves to Review step

9. **Review & Save:**
   - Review the test results
   - Tap "Save" to upload to Supabase
   - Should succeed (phone has internet on same WiFi)

---

## Troubleshooting

### "Connection Failed" in app
- **Check ESP32 Serial Monitor** - is it connected to WiFi?
- **Verify IP address** - note it from Serial Monitor
- **Same network?** - Phone must be on Six/seven67
- **Try "Check Connection"** again after a few seconds

### "Nasal audio file not found" in Serial Monitor
- SPIFFS files not uploaded - repeat Step 2
- Verify file names are exactly: `nasal_audio.mp3` and `oral_audio.mp3`

### "Failed to upload nasal recording" when saving
- **Internet check** - Phone might have lost connection
- Verify phone is still on Six/seven67
- Check Supabase credentials in `.env`

### ESP32 won't connect to WiFi
- **Double-check SSID** - "Six/seven67" (case-sensitive)
- **Double-check password** - 13471352
- Some routers use 5GHz only - ESP32 needs 2.4GHz
- Try moving ESP32 closer to router

### App can't find ESP32
- **Get ESP32 IP** from Serial Monitor
- **Add to discovery** - Edit `utils/WiFiTransfer.js`, add your IP to `commonIPs` array (around line 47):
   ```javascript
   const commonIPs = [
     '192.168.1.100',
     '192.168.1.101',
     '192.168.x.xxx',  // Add your ESP32 IP here
     // ...
   ];
   ```

---

## Quick Checklist

- [ ] MP3 files renamed and in `data/` folder
- [ ] SPIFFS data uploaded to ESP32
- [ ] ESP32 code uploaded
- [ ] ESP32 connected to Six/seven67 (check Serial Monitor)
- [ ] ESP32 IP address noted
- [ ] Phone connected to Six/seven67
- [ ] Phone has internet access
- [ ] Expo app running
- [ ] App shows "Connected" when checking
- [ ] Transfer completes successfully
- [ ] Save to Supabase succeeds

---

## Security Note

**Do not commit your WiFi password to version control!** If you share this code:
- Remove or replace credentials before pushing to Git
- Consider using a separate config file that's in `.gitignore`
