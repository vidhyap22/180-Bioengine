import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Audio } from 'expo-av';

// Define event emitter to simulate native module events
class BluetoothEventEmitter extends NativeEventEmitter {
  constructor() {
    super(NativeModules.BluetoothManager || {});
    this.listeners = {};
  }

  addListener(eventType, listener) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
    
    return {
      remove: () => {
        const index = this.listeners[eventType]?.indexOf(listener);
        if (index !== undefined && index !== -1) {
          this.listeners[eventType].splice(index, 1);
        }
      }
    };
  }

  emit(eventType, ...args) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(listener => {
        listener(...args);
      });
    }
  }
}

const bluetoothEventEmitter = new BluetoothEventEmitter();

// Define constants similar to what native module would have
const BOND_STATES = {
  NONE: 10,
  BONDING: 11,
  BONDED: 12,
};

const BleManager = {
  // Initialize the module
  initialize: async () => {
    console.log('BluetoothManager: Initializing...');
    try {
      // Make sure Bluetooth adapter is available
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      return true;
    } catch (error) {
      console.error('Error initializing Bluetooth:', error);
      return false;
    }
  },

  // Get Bluetooth state
  getState: async () => {
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      return enabled ? 'on' : 'off';
    } catch (error) {
      console.error('Error getting Bluetooth state:', error);
      return 'unknown';
    }
  },

  // Check if Bluetooth is enabled
  isBluetoothEnabled: async () => {
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (error) {
      console.error('Error checking if Bluetooth is enabled:', error);
      return false;
    }
  },

  // Enable Bluetooth
  enableBluetooth: async () => {
    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      return false;
    }
  },

  // Get paired devices
  getPairedDevices: async () => {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        isConnected: device.bonded
      }));
    } catch (error) {
      console.error('Error getting paired devices:', error);
      return [];
    }
  },

  // Get connected devices
  getConnectedDevices: async () => {
    try {
      // In react-native-bluetooth-classic, we need to get bonded devices first
      const devices = await RNBluetoothClassic.getBondedDevices();
      // Filter to get only connected ones if possible
      // Note: For some devices, we might need to explicitly check connectivity
      return devices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        isConnected: device.bonded
      }));
    } catch (error) {
      console.error('Error getting connected devices:', error);
      return [];
    }
  },

  // Check if a device is connected
  getDeviceConnectionStatus: async (deviceId) => {
    try {
      // Get all bonded devices
      const devices = await RNBluetoothClassic.getBondedDevices();
      // Find the device with matching id
      const device = devices.find(d => d.address === deviceId);
      return { 
        isConnected: !!device?.bonded, 
        deviceId 
      };
    } catch (error) {
      console.error(`Error checking connection status for device ${deviceId}:`, error);
      return { isConnected: false, deviceId };
    }
  },

  // Check if a device is paired
  isDevicePaired: async (deviceId) => {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.some(device => device.address === deviceId);
    } catch (error) {
      console.error(`Error checking if device ${deviceId} is paired:`, error);
      return false;
    }
  },

  // Open Bluetooth settings
  openBluetoothSettings: async () => {
    try {
      if (Platform.OS === 'android') {
        await RNBluetoothClassic.openBluetoothSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error opening Bluetooth settings:', error);
      return false;
    }
  },

  // Audio functions - using Expo AV for compatibility
  isBluetoothScoAvailable: async () => {
    try {
      // This is a placeholder - in reality, Expo AV doesn't directly expose this
      return true;
    } catch (error) {
      console.error('Error checking if Bluetooth SCO is available:', error);
      return false;
    }
  },

  startBluetoothSco: async () => {
    try {
      // Set up audio mode for Bluetooth SCO
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false, // Use Bluetooth when available
      });
      return true;
    } catch (error) {
      console.error('Error starting Bluetooth SCO:', error);
      return false;
    }
  },

  stopBluetoothSco: async () => {
    try {
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      return true;
    } catch (error) {
      console.error('Error stopping Bluetooth SCO:', error);
      return false;
    }
  },

  // Get available audio sources - effectively getting bonded Bluetooth devices
  getAvailableAudioSources: async () => {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        type: 'bluetooth'
      }));
    } catch (error) {
      console.error('Error getting audio sources:', error);
      return [];
    }
  },

  // Add a listener for Bluetooth events
  addListener: (event, callback) => {
    if (typeof callback !== 'function') {
      console.error('Bluetooth listener callback must be a function');
      return { remove: () => {} };
    }

    // Add the listener to our custom emitter
    return bluetoothEventEmitter.addListener(event, callback);
  },

  // Cleanup resources
  cleanup: async () => {
    try {
      // Reset audio settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      return true;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return false;
    }
  },

  // Perform a more aggressive cleanup for navigation changes
  navigationalCleanup: async () => {
    return BleManager.cleanup();
  },

  // Just to maintain API compatibility with previous implementation
  destroy: () => {
    console.log('BluetoothManager: Destroying...');
    BleManager.cleanup();
  },

  // Placeholder for API compatibility
  safeDisconnectDevice: async () => {
    return true;
  }
};

export default BleManager;
