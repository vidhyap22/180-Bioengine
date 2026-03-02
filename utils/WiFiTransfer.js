import * as FileSystem from 'expo-file-system';

// ESP32 Configuration
const ESP32_SSID = 'esp32';
const ESP32_PASSWORD = '1234567';
const ESP32_IP_AP = '192.168.4.1'; // Default AP IP for ESP32 (when ESP32 creates its own network)
const ESP32_IP_STATION = null; // Will be set dynamically when ESP32 connects to your WiFi
const ESP32_PORT = 80;

// Current ESP32 IP (can be AP mode or Station mode)
let currentESP32IP = ESP32_IP_AP;

/**
 * Check if device can reach ESP32 server
 * Tries both AP mode IP and Station mode IP (if set)
 */
export const checkWiFiConnection = async (esp32IP = null) => {
  const ipToTry = esp32IP || currentESP32IP;
  
  try {
    // Try to connect to ESP32 server
    const response = await fetch(`http://${ipToTry}/`, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (response.ok) {
      currentESP32IP = ipToTry; // Update current IP
      return {
        connected: true,
        ip: ipToTry,
        mode: ipToTry === ESP32_IP_AP ? 'AP' : 'Station',
        message: `Connected to ESP32 (${ipToTry === ESP32_IP_AP ? 'AP mode' : 'Station mode'})`
      };
    }
    
    return {
      connected: false,
      message: 'Cannot reach ESP32 server'
    };
  } catch (error) {
    console.log('WiFi connection check error:', error.message);
    
    // If AP mode failed, try common Station mode IPs
    if (ipToTry === ESP32_IP_AP) {
      // Try to discover ESP32 on local network (common IP ranges)
      // Common DHCP ranges - ESP32 typically gets higher addresses
      const commonIPs = [
        '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.105',
        '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.105',
      ];
      
      for (const ip of commonIPs) {
        try {
          const testResponse = await fetch(`http://${ip}/`, {
            method: 'GET',
            timeout: 2000,
          });
          if (testResponse.ok) {
            currentESP32IP = ip;
            return {
              connected: true,
              ip: ip,
              mode: 'Station',
              message: `Found ESP32 on local network (${ip})`
            };
          }
        } catch (e) {
          // Continue trying
        }
      }
    }
    
    return {
      connected: false,
      message: `Not connected to ESP32 network: ${error.message}`
    };
  }
};

/**
 * Set ESP32 IP address (for Station mode)
 */
export const setESP32IP = (ip) => {
  currentESP32IP = ip;
};

/**
 * Download audio file from ESP32
 * @param {string} endpoint - ESP32 endpoint (e.g., '/nasal_audio' or '/oral_audio')
 * @param {string} localFileName - Local filename to save the file (should include .mp3 extension)
 * @returns {Promise<string>} - Local file path
 */
export const downloadAudioFromESP32 = async (endpoint, localFileName, esp32IP = null) => {
  try {
    const ip = esp32IP || currentESP32IP;
    const url = `http://${ip}${endpoint}`;
    console.log(`Downloading audio from ESP32: ${url}`);
    console.log(`Saving as: ${localFileName}`);
    
    // Ensure filename has proper extension
    const fileName = localFileName.endsWith('.mp3') || localFileName.endsWith('.pcm') 
      ? localFileName 
      : `${localFileName}.mp3`;
    
    // Download file
    const downloadResult = await FileSystem.downloadAsync(
      url,
      `${FileSystem.documentDirectory}${fileName}`
    );
    
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status: ${downloadResult.status}`);
    }
    
    // Get file info to verify download
    const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
    console.log(`Audio downloaded successfully:`);
    console.log(`  Path: ${downloadResult.uri}`);
    console.log(`  Size: ${fileInfo.size} bytes`);
    
    return downloadResult.uri;
  } catch (error) {
    console.error(`Error downloading audio from ${endpoint}:`, error);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
};

/**
 * Fetch data from ESP32 endpoint
 * @param {string} endpoint - ESP32 endpoint
 * @returns {Promise<string>} - Response data
 */
export const fetchDataFromESP32 = async (endpoint = '/data') => {
  try {
    const url = `http://${esp32IP || currentESP32IP}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    return data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
};

/**
 * Get ESP32 configuration
 */
export const getESP32Config = () => {
  return {
    ssid: ESP32_SSID,
    password: ESP32_PASSWORD,
    ip: currentESP32IP,
    ipAP: ESP32_IP_AP,
    port: ESP32_PORT,
  };
};
