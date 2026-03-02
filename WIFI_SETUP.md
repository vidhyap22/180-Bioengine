# WiFi Transfer Setup Guide

## Overview
This guide explains how to use WiFi transfer mode to receive audio files from ESP32 and upload them to Supabase.

## Mobile App Flow

1. **Device Selection**: When starting a new test, you'll see a modal to choose:
   - WiFi (ESP32)
   - Bluetooth
   - Mobile Microphone

2. **WiFi Connection Setup**:
   - Select "WiFi (ESP32)" from the modal
   - The app will show ESP32 network details (SSID: `esp32`, Password: `1234567`)
   - Connect your phone to the ESP32 WiFi network manually
   - Tap "Check Connection" to verify connectivity
   - Once connected, tap "Continue to Transfer"

3. **Transfer Step**:
   - Tap "Start Transfer" to download audio files from ESP32
   - The app downloads `/nasal_audio` and `/oral_audio` from ESP32
   - Files are saved locally and then processed

4. **Processing**:
   - Audio files are analyzed to calculate nasalance score
   - Results are prepared for review

5. **Review & Save**:
   - Review the test results
   - Save to Supabase (audio files uploaded to storage, metadata saved to database)

## ESP32 Code for MP3 Files

**For MP3 files**: Use `ESP32_MP3_Server.ino` (included in this project)

**For uploading MP3 files to ESP32**: See `MP3_UPLOAD_INSTRUCTIONS.md` for detailed steps

The ESP32 code serves MP3 files from SPIFFS file system. You need to:
1. Upload your MP3 files to ESP32 SPIFFS (see instructions file)
2. Files must be named: `nasal_audio.mp3` and `oral_audio.mp3`
3. Upload the ESP32 code to your board

## ESP32 Code (Alternative - for testing without files)

If you want to test without uploading files first, here's a simpler version:

**Important**: ESP32 creates an Access Point (AP) with IP address **192.168.4.1** (this is the default AP IP). The mobile app connects to this network.

### Complete ESP32 Code:

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>  // For file system (only needed if using Option 1)

const char* ssid = "esp32";
const char* password = "1234567";

WebServer server(80);

// Track connected stations
int lastStationCount = 0;

// ---------- HANDLERS ----------
void handleRoot() {
  server.send(200, "text/html", "<h1>ESP32 Web Server Working</h1>");
}

void handleData() {
  server.send(200, "text/plain", "123");
}

// Serve nasal audio file
void handleNasalAudio() {
  Serial.println("Nasal audio requested");
  
  // ===== CHOOSE ONE OPTION BELOW =====
  
  // OPTION 1: Serve from SPIFFS file system (for production)
  // Uncomment this section if you have audio files stored in SPIFFS:
  /*
  File file = SPIFFS.open("/nasal_audio.pcm", "r");
  if (!file) {
    Serial.println("Nasal audio file not found in SPIFFS");
    server.send(404, "text/plain", "Nasal audio file not found");
    return;
  }
  server.streamFile(file, "audio/pcm");
  file.close();
  Serial.println("Nasal audio file sent successfully");
  */
  
  // OPTION 2: Serve test data (for testing without real audio files)
  // Use this for initial testing - replace "NASAL_AUDIO_DATA_HERE" with actual PCM data
  // Or generate test audio data here
  server.send(200, "audio/pcm", "NASAL_AUDIO_DATA_HERE");
  Serial.println("Nasal audio test data sent");
}

// Serve oral audio file
void handleOralAudio() {
  Serial.println("Oral audio requested");
  
  // ===== CHOOSE ONE OPTION BELOW =====
  
  // OPTION 1: Serve from SPIFFS file system (for production)
  // Uncomment this section if you have audio files stored in SPIFFS:
  /*
  File file = SPIFFS.open("/oral_audio.pcm", "r");
  if (!file) {
    Serial.println("Oral audio file not found in SPIFFS");
    server.send(404, "text/plain", "Oral audio file not found");
    return;
  }
  server.streamFile(file, "audio/pcm");
  file.close();
  Serial.println("Oral audio file sent successfully");
  */
  
  // OPTION 2: Serve test data (for testing without real audio files)
  // Use this for initial testing - replace "ORAL_AUDIO_DATA_HERE" with actual PCM data
  // Or generate test audio data here
  server.send(200, "audio/pcm", "ORAL_AUDIO_DATA_HERE");
  Serial.println("Oral audio test data sent");
}

void handleNotFound() {
  Serial.print("404 - Not found: ");
  Serial.println(server.uri());
  server.send(404, "text/plain", "Not found");
}

// Function to check and display connected stations
void checkConnectedStations() {
  int stationCount = WiFi.softAPgetStationNum();
  
  if (stationCount != lastStationCount) {
    lastStationCount = stationCount;
    
    if (stationCount > 0) {
      Serial.print("✓ Device connected! Total stations: ");
      Serial.println(stationCount);
      
      // Get station info (if available)
      // Note: ESP32 doesn't provide detailed station info easily, but we can see the count
    } else {
      Serial.println("✗ No devices connected");
    }
  }
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 WiFi Transfer Server ===");

  // Initialize SPIFFS (only needed if using Option 1 - SPIFFS file serving)
  // Uncomment if you're using SPIFFS to store audio files:
  /*
  if (!SPIFFS.begin(true)) {
    Serial.println("ERROR: SPIFFS Mount Failed");
    return;
  }
  Serial.println("SPIFFS initialized successfully");
  */

  // Set up WiFi Access Point
  WiFi.mode(WIFI_AP);
  bool apStarted = WiFi.softAP(ssid, password);

  if (apStarted) {
    Serial.println("\n✓ ESP32 Access Point started successfully");
    Serial.print("  SSID: ");
    Serial.println(ssid);
    Serial.print("  Password: ");
    Serial.println(password);
    Serial.print("  AP IP address: ");
    Serial.println(WiFi.softAPIP());  // Should show 192.168.4.1
  } else {
    Serial.println("ERROR: Failed to start Access Point");
    return;
  }

  // Set up web server routes
  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.on("/nasal_audio", handleNasalAudio);
  server.on("/oral_audio", handleOralAudio);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("\n✓ HTTP server started");
  Serial.println("  Listening on: http://192.168.4.1");
  Serial.println("\nWaiting for device connections...\n");
}

// ---------- LOOP ----------
void loop() {
  server.handleClient();
  
  // Check for connected stations every 2 seconds
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 2000) {
    checkConnectedStations();
    lastCheck = millis();
  }
}
```

### Which Option to Use?

- **Option 2 (Test Data)**: Use this initially for testing. It sends simple text data so you can verify the connection and transfer flow works.
- **Option 1 (SPIFFS)**: Use this when you have actual audio files stored on ESP32. You'll need to:
  1. Uncomment the SPIFFS initialization code in `setup()`
  2. Uncomment Option 1 code in both `handleNasalAudio()` and `handleOralAudio()`
  3. Comment out Option 2 code
  4. Upload audio files to SPIFFS (use Arduino IDE SPIFFS Data Upload tool or similar)

### Connection Monitoring

The code includes connection monitoring that prints to Serial Monitor:
- Shows when devices connect/disconnect
- Displays total number of connected stations
- Prints all HTTP requests received

**To view connection status**: Open Serial Monitor (115200 baud) and you'll see:
- `✓ Device connected! Total stations: 1` when phone connects
- `✗ No devices connected` when phone disconnects
- Request logs for each HTTP endpoint accessed

## Important Notes

1. **ESP32 IP Address**: ESP32 Access Point uses **192.168.4.1** (default AP IP). This is automatically assigned when ESP32 creates the WiFi network.

2. **Audio File Format**: The app expects PCM audio files. Make sure ESP32 serves files in the correct format.

3. **File Endpoints**: ESP32 must serve audio files at:
   - `http://192.168.4.1/nasal_audio` - Nasal microphone recording
   - `http://192.168.4.1/oral_audio` - Oral microphone recording

4. **Connection Check**: The app checks connectivity by accessing `http://192.168.4.1/` endpoint.

5. **File Storage**: Downloaded files are temporarily stored in app's document directory, then uploaded to Supabase storage bucket `patients_audio`.

6. **Error Handling**: If WiFi connection is lost during transfer, the app will show an error and require reconnection.

7. **Monitoring Connections**: Open Serial Monitor (115200 baud) to see:
   - When devices connect/disconnect
   - HTTP requests received
   - Any errors during file serving

## Testing

1. Upload the updated ESP32 code
2. Start ESP32 access point
3. Open the mobile app and start a new test
4. Select "WiFi (ESP32)" option
5. Connect phone to ESP32 network
6. Complete the transfer flow

## Troubleshooting

- **Connection fails**: Make sure ESP32 AP is running and phone is connected
- **Transfer fails**: Check ESP32 serial monitor for errors, verify endpoints are working
- **Files not found**: Ensure ESP32 serves files at `/nasal_audio` and `/oral_audio` endpoints
