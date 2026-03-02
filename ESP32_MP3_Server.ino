#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>

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

// Serve nasal audio file (MP3)
void handleNasalAudio() {
  Serial.println("Nasal audio (MP3) requested");
  
  // Open MP3 file from SPIFFS
  File file = SPIFFS.open("/nasal_audio.mp3", "r");
  if (!file) {
    Serial.println("ERROR: Nasal audio file not found in SPIFFS");
    server.send(404, "text/plain", "Nasal audio file not found");
    return;
  }
  
  // Get file size
  size_t fileSize = file.size();
  Serial.print("Sending nasal audio file, size: ");
  Serial.print(fileSize);
  Serial.println(" bytes");
  
  // Set proper content type for MP3
  server.sendHeader("Content-Type", "audio/mpeg");
  server.sendHeader("Content-Length", String(fileSize));
  
  // Stream the file
  server.streamFile(file, "audio/mpeg");
  file.close();
  
  Serial.println("Nasal audio file sent successfully");
}

// Serve oral audio file (MP3)
void handleOralAudio() {
  Serial.println("Oral audio (MP3) requested");
  
  // Open MP3 file from SPIFFS
  File file = SPIFFS.open("/oral_audio.mp3", "r");
  if (!file) {
    Serial.println("ERROR: Oral audio file not found in SPIFFS");
    server.send(404, "text/plain", "Oral audio file not found");
    return;
  }
  
  // Get file size
  size_t fileSize = file.size();
  Serial.print("Sending oral audio file, size: ");
  Serial.print(fileSize);
  Serial.println(" bytes");
  
  // Set proper content type for MP3
  server.sendHeader("Content-Type", "audio/mpeg");
  server.sendHeader("Content-Length", String(fileSize));
  
  // Stream the file
  server.streamFile(file, "audio/mpeg");
  file.close();
  
  Serial.println("Oral audio file sent successfully");
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
    } else {
      Serial.println("✗ No devices connected");
    }
  }
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 WiFi Transfer Server (MP3) ===");

  // Initialize SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("ERROR: SPIFFS Mount Failed");
    Serial.println("Please upload files using Arduino IDE: Tools > ESP32 Sketch Data Upload");
    return;
  }
  Serial.println("✓ SPIFFS initialized successfully");
  
  // List files in SPIFFS
  File root = SPIFFS.open("/");
  File file = root.openNextFile();
  Serial.println("\nFiles in SPIFFS:");
  while (file) {
    Serial.print("  - ");
    Serial.print(file.name());
    Serial.print(" (");
    Serial.print(file.size());
    Serial.println(" bytes)");
    file = root.openNextFile();
  }
  Serial.println();

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
  Serial.println("  Endpoints:");
  Serial.println("    - http://192.168.4.1/nasal_audio");
  Serial.println("    - http://192.168.4.1/oral_audio");
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
