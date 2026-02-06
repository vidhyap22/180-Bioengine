/**
 * AudioDeviceModule.js
 * 
 * A React Native module for managing audio input devices
 * Allows for device discovery, selection, and configuration
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Native module interface
const { RNAudioDeviceModule } = NativeModules;

// Event emitter for device events
const audioDeviceEventEmitter = new NativeEventEmitter(RNAudioDeviceModule);

/**
 * AudioDeviceModule provides methods for managing audio input devices
 */
class AudioDeviceModule {
  /**
   * Check if the module is available on this platform
   * @returns {boolean} True if the module is available
   */
  static isAvailable() {
    return RNAudioDeviceModule !== null && RNAudioDeviceModule !== undefined;
  }

  /**
   * Start scanning for available audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning started
   */
  static startDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.startDeviceScan();
  }

  /**
   * Stop scanning for audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning stopped
   */
  static stopDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.stopDeviceScan();
  }

  /**
   * Get a list of available audio input devices
   * @returns {Promise<Array<AudioDevice>>} Promise resolving to array of device objects
   */
  static getAvailableDevices() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.getAvailableDevices();
  }

  /**
   * Get the currently selected audio input device
   * @returns {Promise<AudioDevice|null>} Promise resolving to current device or null
   */
  static getCurrentDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.getCurrentDevice();
  }

  /**
   * Select an audio device for recording
   * @param {string} deviceId The ID of the device to select
   * @returns {Promise<AudioDevice>} Promise resolving to the selected device
   */
  static selectDevice(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.selectDevice(deviceId);
  }

  /**
   * Reset to default device
   * @returns {Promise<AudioDevice>} Promise resolving to the default device
   */
  static resetToDefaultDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.resetToDefaultDevice();
  }

  /**
   * Check if a device supports stereo recording
   * @param {string} deviceId The ID of the device to check
   * @returns {Promise<boolean>} Promise resolving to true if stereo is supported
   */
  static supportsStereoRecording(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.supportsStereoRecording(deviceId);
  }

  /**
   * Set the channel configuration for a device
   * @param {string} deviceId The ID of the device to configure
   * @param {object} channelConfig Channel configuration options
   * @returns {Promise<boolean>} Promise resolving to true if successful
   */
  static setChannelConfiguration(deviceId, channelConfig) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('RNAudioDeviceModule is not available'));
    }
    return RNAudioDeviceModule.setChannelConfiguration(deviceId, channelConfig);
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

  /**
   * Add listener for errors
   * @param {function} listener Callback function for error events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addErrorListener(listener) {
    return audioDeviceEventEmitter.addListener('onError', listener);
  }
}

export default AudioDeviceModule;

/**
 * @typedef {Object} AudioDevice
 * @property {string} id - Unique identifier for the device
 * @property {string} name - Human-readable name of the device
 * @property {string} type - Type of device (e.g., 'usb', 'bluetooth', 'builtin')
 * @property {boolean} isDefault - Whether this is the default device
 * @property {Object} capabilities - Device capabilities
 * @property {boolean} capabilities.stereo - Whether the device supports stereo recording
 * @property {number} capabilities.sampleRates - Array of supported sample rates
 * @property {number} capabilities.channelCount - Number of audio channels
 */