/**
 * WifiDeviceManager.js
 * 
 * Utility for communicating with the ESP32 Nasomeater device over Wi-Fi using WebSockets.
 */
import * as FileSystem from "expo-file-system/legacy";
import { encode } from "base64-arraybuffer";

const DEFAULT_ESP32_IP = '192.168.4.1'; // Default IP when phone is connected to ESP32 SoftAP
const WS_PORT = 81;

class WifiDeviceManager {
  constructor(ip = DEFAULT_ESP32_IP) {
    this.ip = ip;
    this.wsUri = `ws://${ip}:${WS_PORT}/`;
    this.ws = null;
    this.leftBuffer = [];
    this.rightBuffer = [];
  }

  /**
   * Ping the device to check connection by attempting to open a WebSocket
   */
  async ping() {
    return new Promise((resolve) => {
      try {
        const socket = new WebSocket(this.wsUri);
        
        // Timeout after 2 seconds
        const timeoutId = setTimeout(() => {
          socket.close();
          resolve(false);
        }, 2000);

        socket.onopen = () => {
          clearTimeout(timeoutId);
          socket.close();
          resolve(true);
        };

        socket.onerror = () => {
          clearTimeout(timeoutId);
          socket.close();
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Start recording on the ESP32
   */
  async startRecording() {
    this.leftBuffer = [];
    this.rightBuffer = [];

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('START');
      return { status: 'recording' };
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUri);
        this.ws.binaryType = 'arraybuffer';
        
        const connectionTimeout = setTimeout(() => {
          reject(new Error("WebSocket connection timed out"));
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.ws.send('START');
          resolve({ status: 'recording' });
        };

        this.ws.onerror = (e) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket Error: ", e);
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onmessage = (e) => {
          if (e.data instanceof ArrayBuffer) {
            const data = new Int32Array(e.data);
            // Parse 32-bit interleaved data (right then left)
            for (let i = 0; i < data.length; i += 2) {
              this.rightBuffer.push(data[i] >> 14);
              this.leftBuffer.push(data[i + 1] >> 14);
            }
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Stop recording on the ESP32
   */
  async stopRecording() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('STOP');
      // Wait a short moment to allow the final stream packets to arrive
      await new Promise(resolve => setTimeout(resolve, 500));
      this.ws.close();
      this.ws = null;
    }
    return { status: 'idle' };
  }

  /**
   * Construct a standard WAV file header and write to FileSystem
   */
  async saveWavFile(filePath, samplesArray) {
    const sampleRate = 22050;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    // Header is 44 bytes, data is samples.length * 2 bytes
    const buffer = new ArrayBuffer(44 + samplesArray.length * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // RIFF chunk
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samplesArray.length * 2, true);
    writeString(8, 'WAVE');
    
    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    view.setUint16(32, numChannels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samplesArray.length * 2, true);
    
    // Write audio samples
    let offset = 44;
    for (let i = 0; i < samplesArray.length; i++) {
      // Clamp values to prevent wrap-around static
      let sample = Math.max(-32768, Math.min(32767, samplesArray[i]));
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    
    const base64Data = encode(buffer);
    
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return filePath;
  }

  /**
   * Fetch recorded data from the ESP32 (now generates WAVs locally)
   */
  async fetchData(nasalPath, oralPath) {
    // Save buffers to the requested file paths
    await this.saveWavFile(nasalPath, this.leftBuffer);
    await this.saveWavFile(oralPath, this.rightBuffer);

    return {
      nasal: this.leftBuffer,
      oral: this.rightBuffer,
      nasalPath: nasalPath,
      oralPath: oralPath
    };
  }

  /**
   * Calculate RMS from a numeric array
   */
  calculateRms(samples) {
    if (!samples || samples.length === 0) return 0;
    
    const sumOfSquares = samples.reduce((acc, val) => {
      // Audio samples are already centered around 0 in our buffer (-32768 to 32767)
      // Normalize to -1.0 to 1.0 for RMS calculation to match native logic
      const normalized = val / 32768.0;
      return acc + (normalized * normalized);
    }, 0);
    
    return Math.sqrt(sumOfSquares / samples.length);
  }
}

export default new WifiDeviceManager();
