/**
 * EnhancedAudioModule.js
 * 
 * A React Native module for advanced audio recording and processing
 * with specialized device detection for stereo microphones
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Native module interface
const { EnhancedAudioModule: NativeEnhancedAudioModule } = NativeModules;

// Event emitter for device events
const audioDeviceEventEmitter = new NativeEventEmitter(NativeEnhancedAudioModule);

/**
 * EnhancedAudioModule provides methods for device selection, stereo recording, and audio processing
 */
class EnhancedAudioModule {
  /**
   * Check if the module is available on this platform
   * @returns {boolean} True if the module is available
   */
  static isAvailable() {
    return NativeEnhancedAudioModule !== null && NativeEnhancedAudioModule !== undefined;
  }

  /**
   * Start scanning for available audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning started
   */
  static startDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.startDeviceScan();
  }

  /**
   * Stop scanning for audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning stopped
   */
  static stopDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.stopDeviceScan();
  }

  /**
   * Get a list of available audio input devices
   * @returns {Promise<Array<AudioDevice>>} Promise resolving to array of device objects
   */
  static getAvailableDevices() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.getAvailableDevices();
  }

  /**
   * Get the currently selected audio input device
   * @returns {Promise<AudioDevice|null>} Promise resolving to current device or null
   */
  static getCurrentDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.getCurrentDevice();
  }

  /**
   * Select an audio device for recording
   * @param {string} deviceId The ID of the device to select
   * @returns {Promise<AudioDevice>} Promise resolving to the selected device
   */
  static selectDevice(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.selectDevice(deviceId);
  }

  /**
   * Reset to default device
   * @returns {Promise<AudioDevice>} Promise resolving to the default device
   */
  static resetToDefaultDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.resetToDefaultDevice();
  }

  /**
   * Check if a device supports stereo recording
   * @param {string} deviceId The ID of the device to check
   * @returns {Promise<boolean>} Promise resolving to true if stereo is supported
   */
  static supportsStereoRecording(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.supportsStereoRecording(deviceId);
  }

  /**
   * Start recording with the selected device
   * @param {string} filePath Path where the recording will be saved
   * @returns {Promise<{path: string}>} Promise resolving to recording file path
   */
  static startRecording(filePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    // Convert to absolute path if needed
    let absolutePath = filePath;
    if (!filePath.startsWith('file://') && !filePath.startsWith('/')) {
      absolutePath = `${FileSystem.documentDirectory}${filePath}`;
    }
    
    return NativeEnhancedAudioModule.startRecording(absolutePath);
  }

  /**
   * Stop recording
   * @returns {Promise<{path: string}>} Promise resolving to recording file path
   */
  static stopRecording() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.stopRecording();
  }

  /**
   * Split a stereo recording into separate left and right channel files
   * @param {string} stereoFilePath Path to the stereo recording
   * @param {string} leftFilePath Path where the left channel file will be saved
   * @param {string} rightFilePath Path where the right channel file will be saved
   * @returns {Promise<{leftPath: string, rightPath: string}>} Promise resolving to the output file paths
   */
  static splitStereoToMono(stereoFilePath, leftFilePath, rightFilePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    // Convert to absolute paths if needed
    let absoluteStereoPath = stereoFilePath;
    if (!stereoFilePath.startsWith('file://') && !stereoFilePath.startsWith('/')) {
      absoluteStereoPath = `${FileSystem.documentDirectory}${stereoFilePath}`;
    }
    
    let absoluteLeftPath = leftFilePath;
    if (!leftFilePath.startsWith('file://') && !leftFilePath.startsWith('/')) {
      absoluteLeftPath = `${FileSystem.documentDirectory}${leftFilePath}`;
    }
    
    let absoluteRightPath = rightFilePath;
    if (!rightFilePath.startsWith('file://') && !rightFilePath.startsWith('/')) {
      absoluteRightPath = `${FileSystem.documentDirectory}${rightFilePath}`;
    }
    
    return NativeEnhancedAudioModule.splitStereoToMono(
      absoluteStereoPath,
      absoluteLeftPath,
      absoluteRightPath
    );
  }

  /**
   * Calculate the RMS (Root Mean Square) value of an audio file
   * @param {string} audioFilePath Path to the audio file
   * @returns {Promise<number>} Promise resolving to the RMS value (0-1 range)
   */
  static calculateRms(audioFilePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    // Convert to absolute path if needed
    let absolutePath = audioFilePath;
    if (!audioFilePath.startsWith('file://') && !audioFilePath.startsWith('/')) {
      absolutePath = `${FileSystem.documentDirectory}${audioFilePath}`;
    }
    
    return NativeEnhancedAudioModule.calculateRms(absolutePath);
  }

  /**
   * Add listener for device connected events
   * @param {function} listener Callback function for device connected events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceConnectedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceConnected', listener);
  }

  /**
   * Add listener for device disconnected events
   * @param {function} listener Callback function for device disconnected events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceDisconnectedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceDisconnected', listener);
  }

  /**
   * Add listener for device list changed events
   * @param {function} listener Callback function for device list changed events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceListChangedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceListChanged', listener);
  }
}

export default EnhancedAudioModule;

/**
 * @typedef {Object} AudioDevice
 * @property {string} id - Unique identifier for the device
 * @property {string} name - Human-readable name of the device
 * @property {string} type - Type of device (e.g., 'usb', 'bluetooth', 'builtin')
 * @property {boolean} isDefault - Whether this is the default device
 * @property {Object} capabilities - Device capabilities
 * @property {boolean} capabilities.stereo - Whether the device supports stereo recording
 * @property {number[]} capabilities.sampleRates - Array of supported sample rates
 * @property {number} capabilities.channelCount - Number of audio channels
 */