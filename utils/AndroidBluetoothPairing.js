import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const { BluetoothManager } = NativeModules;

// Create an empty implementation for iOS
const defaultImplementation = {
  isDevicePaired: async () => false,
  pairDevice: async () => ({ success: false, error: 'Not supported on this platform' }),
  openBluetoothSettings: async () => false,
  addPairingListener: () => (() => {}),
};

// Android specific implementation
const androidImplementation = {
  /**
   * Check if a device is paired at the system level
   * @param {string} deviceId - The Bluetooth device ID
   * @returns {Promise<boolean>}
   */
  isDevicePaired: async (deviceId) => {
    if (!deviceId) return false;
    try {
      return await BluetoothManager.isDevicePaired(deviceId);
    } catch (error) {
      console.error(`Error checking if device ${deviceId} is paired:`, error);
      return false;
    }
  },
  
  /**
   * Attempt to pair with a device
   * @param {string} deviceId - The Bluetooth device ID
   * @returns {Promise<object>} A result object with success and error properties
   */
  pairDevice: async (deviceId) => {
    if (!deviceId) {
      return { success: false, error: 'Device ID is required' };
    }
    
    try {
      return await BluetoothManager.pairDevice(deviceId);
    } catch (error) {
      console.error(`Error pairing device ${deviceId}:`, error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Open system Bluetooth settings
   * @returns {Promise<boolean>}
   */
  openBluetoothSettings: async () => {
    try {
      return await BluetoothManager.openBluetoothSettings();
    } catch (error) {
      console.error('Error opening Bluetooth settings:', error);
      return false;
    }
  },
  
  /**
   * Add a listener for pairing events
   * @param {function} callback - The callback function to call when pairing state changes
   * @returns {function} A function to remove the listener
   */
  addPairingListener: (callback) => {
    if (!BluetoothManager) {
      return () => {};
    }
    
    try {
      const emitter = new NativeEventEmitter(BluetoothManager);
      const subscription = emitter.addListener('devicePaired', callback);
      return () => subscription.remove();
    } catch (error) {
      console.error('Error adding pairing listener:', error);
      return () => {};
    }
  }
};

// Export the appropriate implementation based on platform
const BluetoothPairing = Platform.OS === 'android' ? androidImplementation : defaultImplementation;

export default BluetoothPairing;
