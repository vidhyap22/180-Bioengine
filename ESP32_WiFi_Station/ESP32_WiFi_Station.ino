#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>

// ===== CONFIGURATION =====
// Option 1: ESP32 connects to your existing WiFi (RECOMMENDED)
// This allows phone to stay on same WiFi and access internet + ESP32
const char* wifi_ssid = "Six/seven67";           // Your WiFi network name
const char* wifi_password = "13471352";          // Your WiFi password

// Option 2: ESP32 creates Access Point (fallback if WiFi connection fails)
const char* ap_ssid = "esp32";
const char* ap_password = "1234567";

WebServer server(80);

// Track connection mode
bool isStationMode = false;
IPAddress stationIP;

// Track connected stations (for AP mode)
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
  
  File file = SPIFFS.open("/nasal_audio.mp3", "r");
  if (!file) {
    Serial.println("ERROR: Nasal audio file not found in SPIFFS");
    server.send(404, "text/plain", "Nasal audio file not found");
    return;
  }
  
  size_t fileSize = file.size();
  Serial.print("Sending nasal audio file, size: ");
  Serial.print(fileSize);
  Serial.println(" bytes");
  
  server.sendHeader("Content-Type", "audio/mpeg");
  server.sendHeader("Content-Length", String(fileSize));
  server.streamFile(file, "audio/mpeg");
  file.close();
  
  Serial.println("Nasal audio file sent successfully");
}

// Serve oral audio file (MP3)
void handleOralAudio() {
  Serial.println("Oral audio (MP3) requested");
  
  File file = SPIFFS.open("/oral_audio.mp3", "r");
  if (!file) {
    Serial.println("ERROR: Oral audio file not found in SPIFFS");
    server.send(404, "text/plain", "Oral audio file not found");
    return;
  }
  
  size_t fileSize = file.size();
  Serial.print("Sending oral audio file, size: ");
  Serial.print(fileSize);
  Serial.println(" bytes");
  
  server.sendHeader("Content-Type", "audio/mpeg");
  server.sendHeader("Content-Length", String(fileSize));
  server.streamFile(file, "audio/mpeg");
  file.close();
  
  Serial.println("Oral audio file sent successfully");
}

void handleNotFound() {
  Serial.print("404 - Not found: ");
  Serial.println(server.uri());
  server.send(404, "text/plain", "Not found");
}

// Function to check and display connected stations (AP mode only)
void checkConnectedStations() {
  if (!isStationMode) {
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
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 WiFi Transfer Server ===");

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

  // Try to connect to existing WiFi first (Station Mode)
  Serial.println("Attempting to connect to WiFi network...");
  Serial.print("SSID: ");
  Serial.println(wifi_ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    // Successfully connected to WiFi
    isStationMode = true;
    stationIP = WiFi.localIP();
    
    Serial.println("\n✓ Connected to WiFi successfully!");
    Serial.print("  IP address: ");
    Serial.println(stationIP);
    Serial.print("  Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("  Subnet: ");
    Serial.println(WiFi.subnetMask());
    Serial.println("\n📱 IMPORTANT: Use this IP address in your mobile app!");
    Serial.print("  ESP32 URL: http://");
    Serial.print(stationIP);
    Serial.println("/");
  } else {
    // Failed to connect, fall back to Access Point mode
    Serial.println("\n✗ Failed to connect to WiFi");
    Serial.println("Falling back to Access Point mode...");
    
    WiFi.mode(WIFI_AP);
    bool apStarted = WiFi.softAP(ap_ssid, ap_password);
    
    if (apStarted) {
      isStationMode = false;
      Serial.println("\n✓ ESP32 Access Point started");
      Serial.print("  SSID: ");
      Serial.println(ap_ssid);
      Serial.print("  Password: ");
      Serial.println(ap_password);
      Serial.print("  AP IP address: ");
      Serial.println(WiFi.softAPIP());
      Serial.println("\n⚠️  NOTE: In AP mode, phone will lose internet connection");
      Serial.println("   You'll need to reconnect to regular WiFi after downloading files");
    } else {
      Serial.println("ERROR: Failed to start Access Point");
      return;
    }
  }

  // Set up web server routes
  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.on("/nasal_audio", handleNasalAudio);
  server.on("/oral_audio", handleOralAudio);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("\n✓ HTTP server started");
  if (isStationMode) {
    Serial.print("  Listening on: http://");
    Serial.println(stationIP);
  } else {
    Serial.println("  Listening on: http://192.168.4.1");
  }
  Serial.println("  Endpoints:");
  Serial.println("    - /nasal_audio");
  Serial.println("    - /oral_audio");
  Serial.println("\nWaiting for requests...\n");
}

// ---------- LOOP ----------
void loop() {
  server.handleClient();
  
  // Check WiFi connection status in Station mode
  if (isStationMode) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost! Attempting to reconnect...");
      WiFi.begin(wifi_ssid, wifi_password);
      delay(5000);
    }
  }
  
  // Check for connected stations (AP mode only)
  if (!isStationMode) {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 2000) {
      checkConnectedStations();
      lastCheck = millis();
    }
  }
}
