package com.jasperdoan.nasomEATR.audiodevice;

import android.app.PendingIntent;
import android.content.Context;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;
import android.net.Uri;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.BufferedOutputStream;
import java.io.DataOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.ShortBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class EnhancedAudioModule extends ReactContextBaseJavaModule {
    private static final String TAG = "EnhancedAudioModule";
    private static final String E_RECORDING_ERROR = "E_RECORDING_ERROR";
    private static final String E_PROCESSING_ERROR = "E_PROCESSING_ERROR";
    
    // Audio format constants
    private static final int SAMPLE_RATE = 44100;  // 44.1 kHz
    private static final int BITS_PER_SAMPLE = 16; // 16 bits
    private static final int STEREO_CHANNELS = 2;  // Stereo
    private static final int MONO_CHANNELS = 1;    // Mono
    
    private final ReactApplicationContext reactContext;
    private AudioManager audioManager;
    private UsbManager usbManager;
    private AudioDeviceInfo selectedDevice = null;
    private boolean isScanning = false;
    private BroadcastReceiver usbReceiver;
    
    // Audio recording variables
    private boolean isRecording = false;
    private AudioRecord audioRecord = null;
    private Thread recordingThread = null;
    private int bufferSize = 0;
    private String recordingFilePath = null;
    private Executor audioProcessingExecutor = Executors.newSingleThreadExecutor();

    private static final String ACTION_USB_PERMISSION = "com.jasperdoan.nasomEATR.USB_PERMISSION";
    private String pendingDeviceId = null;
    private Promise pendingPromise = null;

    public EnhancedAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        this.usbManager = (UsbManager) reactContext.getSystemService(Context.USB_SERVICE);
        
        // Create USB broadcast receiver
        setupUsbReceiver();
        registerUsbPermissionReceiver();
    }

    @Override
    public String getName() {
        return "EnhancedAudioModule";
    }

    /**
     * Helper method to normalize file paths by removing "file://" prefix if present
     */
    

private String normalizeFilePath(String path) {
    if (path == null) return null;

    // Handle file:///, file://, file:/ consistently
    if (path.startsWith("file:")) {
        try {
            Uri uri = Uri.parse(path);
            String p = uri.getPath(); // returns "/data/user/0/..." for file://...
            if (p != null) return p;
        } catch (Exception ignored) {}
        // Fallback: strip common prefixes manually
        return path.replaceFirst("^file:(//)?", "");
    }

    return path;
}
    /**
     * Ensure the file has a .wav extension
     */
    private String ensureWavExtension(String path) {
        if (path == null) return null;
        if (!path.toLowerCase().endsWith(".wav")) {
            return path.replaceAll("\\.[^.]*$", "") + ".wav";
        }
        return path;
    }
    
    /**
     * Write a WAV header to the output stream
     */
    private void writeWavHeader(FileOutputStream out, int channels, int sampleRate, 
                               int bitsPerSample, int audioLength) throws IOException {
        // WAV header structure
        
        // RIFF header
        out.write("RIFF".getBytes()); // ChunkID
        out.write(intToByteArray(36 + audioLength)); // ChunkSize
        out.write("WAVE".getBytes()); // Format
        
        // fmt subchunk
        out.write("fmt ".getBytes()); // Subchunk1ID
        out.write(intToByteArray(16)); // Subchunk1Size (16 for PCM)
        out.write(shortToByteArray((short) 1)); // AudioFormat (1 for PCM)
        out.write(shortToByteArray((short) channels)); // NumChannels
        out.write(intToByteArray(sampleRate)); // SampleRate
        out.write(intToByteArray(sampleRate * channels * bitsPerSample / 8)); // ByteRate
        out.write(shortToByteArray((short) (channels * bitsPerSample / 8))); // BlockAlign
        out.write(shortToByteArray((short) bitsPerSample)); // BitsPerSample
        
        // data subchunk
        out.write("data".getBytes()); // Subchunk2ID
        out.write(intToByteArray(audioLength)); // Subchunk2Size
    }

    /**
     * Convert an integer to a little-endian byte array
     */
    private byte[] intToByteArray(int value) {
        byte[] result = new byte[4];
        result[0] = (byte) (value & 0xFF);
        result[1] = (byte) ((value >> 8) & 0xFF);
        result[2] = (byte) ((value >> 16) & 0xFF);
        result[3] = (byte) ((value >> 24) & 0xFF);
        return result;
    }

    /**
     * Convert a short to a little-endian byte array
     */
    private byte[] shortToByteArray(short value) {
        byte[] result = new byte[2];
        result[0] = (byte) (value & 0xFF);
        result[1] = (byte) ((value >> 8) & 0xFF);
        return result;
    }

    private void setupUsbReceiver() {
        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (isAudioDevice(device)) {
                        sendDeviceEvent("onDeviceConnected", deviceToMap(device));
                        sendDeviceListChanged();
                    }
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (isAudioDevice(device)) {
                        sendDeviceEvent("onDeviceDisconnected", deviceToMap(device));
                        sendDeviceListChanged();
                    }
                }
            }
        };
    }

    private void registerUsbPermissionReceiver() {
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        BroadcastReceiver usbPermissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (ACTION_USB_PERMISSION.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                    
                    if (granted && device != null && pendingPromise != null) {
                        pendingPromise.resolve(deviceToMap(device));
                    } else if (pendingPromise != null) {
                        pendingPromise.reject("PERMISSION_DENIED", "User denied USB device permission");
                    }
                    
                    pendingDeviceId = null;
                    pendingPromise = null;
                }
            }
        };
        
        // Add the required export flag
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(usbPermissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            reactContext.registerReceiver(usbPermissionReceiver, filter);
        }
    }

    private boolean isAudioDevice(UsbDevice device) {
        // Special handling for DJI devices
        if (device.getManufacturerName() != null && 
            device.getManufacturerName().toLowerCase().contains("dji")) {
            return true;
        }
        
        // USB classes: https://www.usb.org/defined-class-codes
        // Audio class: 0x01
        return device.getDeviceClass() == 0x01 || 
               (device.getInterfaceCount() > 0 && device.getInterface(0).getInterfaceClass() == 0x01);
    }

    private void registerUsbReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        
        // Add the required export flag
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            reactContext.registerReceiver(usbReceiver, filter);
        }
    }

    private void unregisterUsbReceiver() {
        try {
            reactContext.unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            // Receiver might not be registered
        }
    }

    private void sendDeviceEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    private void sendDeviceListChanged() {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("onDeviceListChanged", null);
    }

    private WritableMap deviceToMap(UsbDevice device) {
        WritableMap deviceMap = Arguments.createMap();
        deviceMap.putString("id", String.valueOf(device.getDeviceId()));
        
        String name = device.getProductName() != null ? 
                     device.getProductName().toString() : 
                     "USB Audio Device " + device.getDeviceId();
                     
        // Special handling for DJI devices to ensure they're properly identified
        boolean isDJI = false;
        if (device.getManufacturerName() != null && 
            device.getManufacturerName().toLowerCase().contains("dji")) {
            isDJI = true;
            if (!name.contains("DJI") && !name.contains("Mic")) {
                name = "DJI Mic " + name;
            }
        }
        
        deviceMap.putString("name", name);
        deviceMap.putString("type", "usb");
        deviceMap.putBoolean("isDefault", false);

        WritableMap capabilities = Arguments.createMap();
        // Force DJI devices to be recognized as stereo
        capabilities.putBoolean("stereo", isDJI || true); // Assume USB audio devices support stereo
        WritableArray sampleRates = Arguments.createArray();
        sampleRates.pushInt(44100);
        sampleRates.pushInt(48000);
        capabilities.putArray("sampleRates", sampleRates);
        capabilities.putInt("channelCount", isDJI ? 2 : 2); // Force DJI to have 2 channels
        
        deviceMap.putMap("capabilities", capabilities);
        
        return deviceMap;
    }

    private WritableMap audioDeviceInfoToMap(AudioDeviceInfo device) {
        WritableMap deviceMap = Arguments.createMap();
        deviceMap.putString("id", String.valueOf(device.getId()));
        
        String name = device.getProductName() != null ? 
                     device.getProductName().toString() : 
                     "Audio Device " + device.getId();
                    
        // Special handling for DJI devices
        boolean isDJI = false;
        if (name.toLowerCase().contains("dji")) {
            isDJI = true;
        }
        
        deviceMap.putString("name", name);
        
        String type = "unknown";
        switch (device.getType()) {
            case AudioDeviceInfo.TYPE_BUILTIN_MIC:
                type = "builtin";
                break;
            case AudioDeviceInfo.TYPE_USB_DEVICE:
            case AudioDeviceInfo.TYPE_USB_HEADSET:
                type = "usb";
                break;
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP:
                type = "bluetooth";
                break;
            case AudioDeviceInfo.TYPE_WIRED_HEADSET:
                type = "wired";
                break;
        }
        deviceMap.putString("type", type);
        
        deviceMap.putBoolean("isDefault", false); // Need to check with audio manager
        
        WritableMap capabilities = Arguments.createMap();
        
        // Force DJI devices to be recognized as stereo
        boolean supportsStereo = isDJI || (device.getChannelCounts().length > 0 && 
                              device.getChannelCounts()[0] >= 2);
        capabilities.putBoolean("stereo", supportsStereo);
        
        WritableArray sampleRates = Arguments.createArray();
        for (int rate : device.getSampleRates()) {
            sampleRates.pushInt(rate);
        }
        capabilities.putArray("sampleRates", sampleRates);
        
        int maxChannels = 0;
        for (int channelCount : device.getChannelCounts()) {
            maxChannels = Math.max(maxChannels, channelCount);
        }
        // Ensure DJI devices are at least 2 channels
        capabilities.putInt("channelCount", isDJI ? Math.max(2, maxChannels) : maxChannels);
        
        deviceMap.putMap("capabilities", capabilities);
        
        return deviceMap;
    }

    @ReactMethod
    public void startDeviceScan(Promise promise) {
        if (isScanning) {
            promise.resolve(true);
            return;
        }
        
        try {
            registerUsbReceiver();
            isScanning = true;
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to start device scan: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopDeviceScan(Promise promise) {
        if (!isScanning) {
            promise.resolve(true);
            return;
        }
        
        try {
            unregisterUsbReceiver();
            isScanning = false;
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to stop device scan: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getAvailableDevices(Promise promise) {
        try {
            WritableArray deviceArray = Arguments.createArray();
            
            // Get audio devices if on Android M or higher
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                for (AudioDeviceInfo device : devices) {
                    deviceArray.pushMap(audioDeviceInfoToMap(device));
                }
            }
            
            // Get USB devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (isAudioDevice(device)) {
                    deviceArray.pushMap(deviceToMap(device));
                }
            }
            
            promise.resolve(deviceArray);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get available devices: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentDevice(Promise promise) {
        if (selectedDevice != null) {
            promise.resolve(audioDeviceInfoToMap(selectedDevice));
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void selectDevice(String deviceId, Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                
                for (AudioDeviceInfo device : devices) {
                    if (String.valueOf(device.getId()).equals(deviceId)) {
                        selectedDevice = device;
                        
                        // On Android 10+ we can actually select the device
                        if (Build.VERSION.SDK_INT >= 29) { // Android Q
                            try {
                                // Use reflection to call the method to avoid compilation issues on lower API levels
                                audioManager.getClass()
                                    .getMethod("setPreferredDevice", AudioDeviceInfo.class)
                                    .invoke(audioManager, device);
                            } catch (Exception e) {
                                // Fallback if method not available
                                // Just log the error and continue
                                e.printStackTrace();
                            }
                        }
                        
                        promise.resolve(audioDeviceInfoToMap(device));
                        return;
                    }
                }
            }
            
            // Check USB devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (String.valueOf(device.getDeviceId()).equals(deviceId) && isAudioDevice(device)) {
                    // Request permission to access USB device if needed
                    if (!usbManager.hasPermission(device)) {
                        // Create a PendingIntent for permission request
                        int flags = 0;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            flags = PendingIntent.FLAG_IMMUTABLE;
                        }
                        
                        PendingIntent permissionIntent = PendingIntent.getBroadcast(
                            reactContext,
                            0,
                            new Intent(ACTION_USB_PERMISSION),
                            flags
                        );
                        
                        // Store the promise for later resolution
                        pendingPromise = promise;
                        pendingDeviceId = deviceId;
                        
                        // Request the permission
                        usbManager.requestPermission(device, permissionIntent);
                        
                        // The promise will be resolved in the permission broadcast receiver
                        return;
                    }
                    
                    // We don't have an AudioDeviceInfo for USB devices directly
                    // So we'll need to handle this specially in the recording function
                    selectedDevice = null; // Clear any previous AudioDeviceInfo
                    
                    promise.resolve(deviceToMap(device));
                    return;
                }
            }
            
            promise.reject("DEVICE_NOT_FOUND", "Could not find device with ID: " + deviceId);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to select device: " + e.getMessage());
        }
    }

    @ReactMethod
    public void resetToDefaultDevice(Promise promise) {
        try {
            selectedDevice = null;
            
            if (Build.VERSION.SDK_INT >= 29) { // Android Q
                try {
                    // Use reflection to call the method to avoid compilation issues on lower API levels
                    audioManager.getClass()
                        .getMethod("clearPreferredDevice")
                        .invoke(audioManager);
                } catch (Exception e) {
                    // Fallback if method not available
                    // Just log the error and continue
                    e.printStackTrace();
                }
            }
            
            // Return the current default device
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                if (devices.length > 0) {
                    // First device is typically the default
                    selectedDevice = devices[0];
                    promise.resolve(audioDeviceInfoToMap(devices[0]));
                    return;
                }
            }
            
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to reset to default device: " + e.getMessage());
        }
    }

    @ReactMethod
    public void supportsStereoRecording(String deviceId, Promise promise) {
        try {
            // Special case for DJI devices
            if (deviceId.toLowerCase().contains("dji")) {
                promise.resolve(true);
                return;
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                
                for (AudioDeviceInfo device : devices) {
                    if (String.valueOf(device.getId()).equals(deviceId)) {
                        for (int channelCount : device.getChannelCounts()) {
                            if (channelCount >= 2) {
                                promise.resolve(true);
                                return;
                            }
                        }
                        promise.resolve(false);
                        return;
                    }
                }
            }
            
            // For USB devices, assume they support stereo if they're audio devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (String.valueOf(device.getDeviceId()).equals(deviceId) && isAudioDevice(device)) {
                    promise.resolve(true);
                    return;
                }
            }
            
            promise.reject("DEVICE_NOT_FOUND", "Could not find device with ID: " + deviceId);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check stereo support: " + e.getMessage());
        }
    }
    
 @ReactMethod
public void startRecording(String filePath, Promise promise) {
    if (isRecording) {
        promise.reject(E_RECORDING_ERROR, "Already recording");
        return;
    }

    try {
        if (filePath == null || filePath.trim().isEmpty()) {
            promise.reject(E_RECORDING_ERROR, "filePath is null/empty");
            return;
        }

        String normalizedPath = normalizeFilePath(filePath);
        normalizedPath = ensureWavExtension(normalizedPath);

        if (normalizedPath == null || normalizedPath.trim().isEmpty()) {
            promise.reject(E_RECORDING_ERROR, "normalizedPath is null/empty");
            return;
        }

        Log.d(TAG, "Starting recording to: " + normalizedPath);

        File outputFile = new File(normalizedPath);

        // ✅ If caller gave us a filename with no parent, put it in app files dir
        File parent = outputFile.getParentFile();
        if (parent == null) {
            File dir = reactContext.getFilesDir();
            outputFile = new File(dir, outputFile.getName());
            normalizedPath = outputFile.getAbsolutePath();
            parent = outputFile.getParentFile();
            Log.d(TAG, "No parent dir provided; using app files dir: " + normalizedPath);
        }

        if (parent != null && !parent.exists()) {
            boolean ok = parent.mkdirs();
            Log.d(TAG, "Created parent directories: " + ok + " (" + parent.getAbsolutePath() + ")");
        }

        // ... rest of your AudioRecord init exactly as you already have ...

        recordingFilePath = normalizedPath;
        isRecording = true;

        audioRecord.startRecording();

        recordingThread = new Thread(() -> writeAudioDataToFile(), "AudioRecorder Thread");
        recordingThread.start();

        WritableMap result = Arguments.createMap();
        result.putString("path", recordingFilePath);
        promise.resolve(result);

    } catch (Exception e) {
        Log.e(TAG, "Error starting recording", e);
        isRecording = false;
        if (audioRecord != null) {
            audioRecord.release();
            audioRecord = null;
        }
        promise.reject(E_RECORDING_ERROR, e.getMessage());
    }
}
    private void writeAudioDataToFile() {
        // Write audio data as WAV file
        byte[] data = new byte[bufferSize];
        ByteArrayOutputStream tempBuffer = new ByteArrayOutputStream();
        int totalBytesRead = 0;
        
        try {
            Log.d(TAG, "Recording to WAV file: " + recordingFilePath);
            
            // Record audio data to temporary buffer first to get total length
            while (isRecording) {
                int read = audioRecord.read(data, 0, bufferSize);
                
                if (read > 0) {
                    tempBuffer.write(data, 0, read);
                    totalBytesRead += read;
                    
                    // Log progress periodically
                    if (totalBytesRead % (bufferSize * 100) == 0) {
                        Log.d(TAG, "Recording progress: " + totalBytesRead + " bytes read");
                    }
                } else if (read == AudioRecord.ERROR_INVALID_OPERATION) {
                    Log.e(TAG, "Error reading audio data: INVALID_OPERATION");
                } else if (read == AudioRecord.ERROR_BAD_VALUE) {
                    Log.e(TAG, "Error reading audio data: BAD_VALUE");
                } else if (read == AudioRecord.ERROR) {
                    Log.e(TAG, "Error reading audio data: ERROR");
                }
            }
            
            Log.d(TAG, "Recording finished. Total bytes read: " + totalBytesRead);
            
            // Now write WAV file with header and audio data
            byte[] audioData = tempBuffer.toByteArray();
            FileOutputStream out = new FileOutputStream(recordingFilePath);
            
            // Write WAV header
            writeWavHeader(out, STEREO_CHANNELS, SAMPLE_RATE, BITS_PER_SAMPLE, audioData.length);
            
            // Write audio data
            out.write(audioData);
            out.close();
            
            File outputFile = new File(recordingFilePath);
            Log.d(TAG, "WAV file created successfully. Size: " + outputFile.length() + " bytes");
            
        } catch (Exception e) {
            Log.e(TAG, "Error writing audio data: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void stopRecording(Promise promise) {
        if (!isRecording) {
            promise.reject(E_RECORDING_ERROR, "Not recording");
            return;
        }
        
        try {
            isRecording = false;
            if (audioRecord != null) {
                audioRecord.stop();
                audioRecord.release();
                audioRecord = null;
            }
            
            // Wait for recording thread to complete
            if (recordingThread != null) {
                try {
                    recordingThread.join(2000); // Wait up to 2 seconds for thread to finish
                } catch (InterruptedException e) {
                    Log.e(TAG, "Interrupted while waiting for recording thread to finish", e);
                }
                recordingThread = null;
            }
            
            // Verify the file exists and has content
            File recordingFile = new File(recordingFilePath);
            if (!recordingFile.exists()) {
                Log.e(TAG, "Recording file does not exist: " + recordingFilePath);
                promise.reject(E_RECORDING_ERROR, "Recording file does not exist: " + recordingFilePath);
                return;
            }
            
            if (recordingFile.length() == 0) {
                Log.e(TAG, "Recording file is empty: " + recordingFilePath);
                promise.reject(E_RECORDING_ERROR, "Recording file is empty: " + recordingFilePath);
                return;
            }
            
            Log.d(TAG, "Recording stopped successfully. File size: " + recordingFile.length() + " bytes");
            
            WritableMap result = Arguments.createMap();
            result.putString("path", recordingFilePath);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            promise.reject(E_RECORDING_ERROR, e.getMessage());
        }
    }
    
    @ReactMethod
    public void splitStereoToMono(String stereoFilePath, final String leftFilePath, final String rightFilePath, final Promise promise) {
        audioProcessingExecutor.execute(new Runnable() {
            @Override
            public void run() {
                FileInputStream fis = null;
                FileOutputStream leftOS = null;
                FileOutputStream rightOS = null;
                
                try {
                    // Normalize paths - just remove file:// prefix
                    String normalizedStereoPath = normalizeFilePath(stereoFilePath);
                    String normalizedLeftPath = normalizeFilePath(leftFilePath);
                    String normalizedRightPath = normalizeFilePath(rightFilePath);
                    
                    // Always ensure WAV extension for output files
                    normalizedLeftPath = ensureWavExtension(normalizedLeftPath);
                    normalizedRightPath = ensureWavExtension(normalizedRightPath);
                    
                    Log.d(TAG, "Splitting stereo file: " + normalizedStereoPath);
                    Log.d(TAG, "Output paths - Left: " + normalizedLeftPath + ", Right: " + normalizedRightPath);
                    
                    // Check input file
                    File stereoFile = new File(normalizedStereoPath);
                    if (!stereoFile.exists()) {
                        String errMsg = "Stereo file does not exist: " + normalizedStereoPath;
                        Log.e(TAG, errMsg);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, errMsg);
                            }
                        });
                        return;
                    }
                    
                    // Create directories for output files
                    File leftFile = new File(normalizedLeftPath);
                    File rightFile = new File(normalizedRightPath);
                    leftFile.getParentFile().mkdirs();
                    rightFile.getParentFile().mkdirs();
                    
                    // Read WAV file header
                    fis = new FileInputStream(stereoFile);
                    byte[] header = new byte[44]; // Standard WAV header
                    fis.read(header);
                    
                    // Verify WAV format
                    if (!new String(header, 0, 4).equals("RIFF") || 
                        !new String(header, 8, 4).equals("WAVE")) {
                        fis.close();
                        String errMsg = "Input is not a valid WAV file: " + normalizedStereoPath;
                        Log.e(TAG, errMsg);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, errMsg);
                            }
                        });
                        return;
                    }
                    
                    // Extract WAV parameters
                    int channels = header[22] & 0xFF | (header[23] & 0xFF) << 8;
                    int sampleRate = header[24] & 0xFF | 
                                   (header[25] & 0xFF) << 8 | 
                                   (header[26] & 0xFF) << 16 | 
                                   (header[27] & 0xFF) << 24;
                    int bitsPerSample = header[34] & 0xFF | (header[35] & 0xFF) << 8;
                    
                    if (channels != 2) {
                        fis.close();
                        String errMsg = "Not a stereo WAV file (channels: " + channels + ")";
                        Log.e(TAG, errMsg);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, errMsg);
                            }
                        });
                        return;
                    }
                    
                    // Skip to the data chunk
                    boolean foundData = false;
                    int dataSize = 0;
                    byte[] chunkHeader = new byte[8];
                    
                    // Reset to beginning of file
                    fis.close();
                    fis = new FileInputStream(stereoFile);
                    fis.skip(12); // Skip "RIFF", size, and "WAVE"
                    
                    while (!foundData) {
                        if (fis.read(chunkHeader) < 8) break;
                        
                        String id = new String(chunkHeader, 0, 4);
                        int size = chunkHeader[4] & 0xFF | 
                                 (chunkHeader[5] & 0xFF) << 8 | 
                                 (chunkHeader[6] & 0xFF) << 16 | 
                                 (chunkHeader[7] & 0xFF) << 24;
                        
                        if (id.equals("data")) {
                            foundData = true;
                            dataSize = size;
                        } else {
                            // Skip this chunk
                            fis.skip(size);
                        }
                    }
                    
                    if (!foundData) {
                        fis.close();
                        String errMsg = "No data chunk found in WAV file";
                        Log.e(TAG, errMsg);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, errMsg);
                            }
                        });
                        return;
                    }
                    
                    // Create output files
                    leftOS = new FileOutputStream(leftFile);
                    rightOS = new FileOutputStream(rightFile);
                    
                    // Write WAV headers for mono files
                    writeWavHeader(leftOS, 1, sampleRate, bitsPerSample, dataSize / 2);
                    writeWavHeader(rightOS, 1, sampleRate, bitsPerSample, dataSize / 2);
                    
                    // Split stereo data into two mono channels
                    int bytesPerSample = bitsPerSample / 8;
                    byte[] buffer = new byte[bytesPerSample * 2]; // One stereo frame
                    int framesRead = 0;
                    int bytesRead;
                    
                    while ((bytesRead = fis.read(buffer)) == buffer.length) {
                        // Write left channel
                        leftOS.write(buffer, 0, bytesPerSample);
                        
                        // Write right channel
                        rightOS.write(buffer, bytesPerSample, bytesPerSample);
                        
                        framesRead++;
                    }
                    
                    // Close all streams
                    fis.close();
                    leftOS.close();
                    rightOS.close();
                    
                    Log.d(TAG, "Split completed successfully, processed " + framesRead + " frames");
                    Log.d(TAG, "Left file: " + leftFile.length() + " bytes, Right file: " + rightFile.length() + " bytes");
                    
                    // Return paths that match the actual file extensions created
                    String outputLeftPath = ensureWavExtension(leftFilePath);
                    String outputRightPath = ensureWavExtension(rightFilePath);
                    
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            WritableMap result = Arguments.createMap();
                            result.putString("leftPath", outputLeftPath);
                            result.putString("rightPath", outputRightPath);
                            promise.resolve(result);
                        }
                    });
                    
                } catch (final Exception e) {
                    Log.e(TAG, "Error splitting stereo audio: " + e.getMessage(), e);
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            promise.reject(E_PROCESSING_ERROR, "Failed to split stereo audio: " + e.getMessage());
                        }
                    });
                } finally {
                    try {
                        if (fis != null) fis.close();
                        if (leftOS != null) leftOS.close();
                        if (rightOS != null) rightOS.close();
                    } catch (IOException e) {
                        Log.e(TAG, "Error closing streams", e);
                    }
                }
            }
        });
    }
    
    @ReactMethod
    public void calculateRms(String audioFilePath, final Promise promise) {
        audioProcessingExecutor.execute(new Runnable() {
            @Override
            public void run() {
                FileInputStream fis = null;
                
                try {
                    // Normalize the file path
                    final String normalizedPath = normalizeFilePath(audioFilePath);
                    Log.d(TAG, "Calculating RMS for: " + normalizedPath);
                    
                    // First verify the file exists
                    File audioFile = new File(normalizedPath);
                    if (!audioFile.exists()) {
                        Log.e(TAG, "Audio file does not exist: " + normalizedPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Audio file does not exist: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    if (audioFile.length() == 0) {
                        Log.e(TAG, "Audio file is empty: " + normalizedPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Audio file is empty: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    // Parse WAV file
                    fis = new FileInputStream(audioFile);
                    
                    // Skip WAV header to get to PCM data
                    byte[] headerBuffer = new byte[44]; // Standard WAV header is 44 bytes
                    fis.read(headerBuffer);
                    
                    // Verify it's a WAV file with PCM format
                    if (!new String(headerBuffer, 0, 4).equals("RIFF") || 
                        !new String(headerBuffer, 8, 4).equals("WAVE")) {
                        fis.close();
                        Log.e(TAG, "Not a valid WAV file: " + normalizedPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Not a valid WAV file: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    // Parse format chunk
                    int channels = headerBuffer[22] & 0xFF | (headerBuffer[23] & 0xFF) << 8;
                    int bitsPerSample = headerBuffer[34] & 0xFF | (headerBuffer[35] & 0xFF) << 8;
                    
                    Log.d(TAG, "WAV file properties - Channels: " + channels + 
                            ", Bits Per Sample: " + bitsPerSample);
                    
                    // Find data chunk - reset file position and skip RIFF header
                    fis.close();
                    fis = new FileInputStream(audioFile);
                    fis.skip(12); // Skip "RIFF", size, and "WAVE"
                    
                    boolean foundDataChunk = false;
                    byte[] chunkHeader = new byte[8]; // 4 bytes ID, 4 bytes size
                    int dataSize = 0;
                    
                    // Find the data chunk
                    while (!foundDataChunk) {
                        if (fis.read(chunkHeader) < 8) {
                            fis.close();
                            Log.e(TAG, "Failed to find data chunk");
                            reactContext.runOnUiQueueThread(new Runnable() {
                                @Override
                                public void run() {
                                    promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                                }
                            });
                            return;
                        }
                        
                        String id = new String(chunkHeader, 0, 4);
                        int size = chunkHeader[4] & 0xFF | 
                                (chunkHeader[5] & 0xFF) << 8 | 
                                (chunkHeader[6] & 0xFF) << 16 | 
                                (chunkHeader[7] & 0xFF) << 24;
                        
                        if (id.equals("data")) {
                            foundDataChunk = true;
                            dataSize = size;
                        } else {
                            // Skip this chunk
                            fis.skip(size);
                        }
                    }
                    
                    if (!foundDataChunk) {
                        fis.close();
                        Log.e(TAG, "No data chunk found");
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                            }
                        });
                        return;
                    }
                    
                    Log.d(TAG, "Found data chunk with size: " + dataSize + " bytes");
                    
                    // Calculate RMS for 16-bit audio (most common)
                    if (bitsPerSample == 16) {
                        double sumSquares = 0;
                        int samplesProcessed = 0;
                        int bytesPerSample = bitsPerSample / 8;
                        
                        // Process in small chunks to save memory
                        byte[] buffer = new byte[1024 * bytesPerSample];
                        int bytesRead;
                        
                        while ((bytesRead = fis.read(buffer)) > 0) {
                            int samplesInBuffer = bytesRead / bytesPerSample;
                            
                            for (int i = 0; i < samplesInBuffer; i++) {
                                int sampleOffset = i * bytesPerSample;
                                
                                // Convert bytes to short (16-bit sample)
                                short sample = (short) ((buffer[sampleOffset + 1] & 0xff) << 8 | 
                                                    (buffer[sampleOffset] & 0xff));
                                
                                sumSquares += sample * sample;
                                samplesProcessed++;
                            }
                        }
                        
                        if (samplesProcessed == 0) {
                            Log.e(TAG, "No samples processed for RMS calculation");
                            reactContext.runOnUiQueueThread(new Runnable() {
                                @Override
                                public void run() {
                                    promise.reject(E_PROCESSING_ERROR, "No valid samples found for RMS calculation");
                                }
                            });
                            return;
                        }
                        
                        // Calculate RMS (Root Mean Square)
                        double rms = Math.sqrt(sumSquares / samplesProcessed);
                        
                        // Normalize to 0-1 range (16-bit PCM has range -32768 to 32767)
                        double normalizedRms = rms / 32768.0;
                        
                        Log.d(TAG, "Calculated RMS: " + normalizedRms + " from " + samplesProcessed + " samples");
                        
                        // Return result
                        final double finalRms = normalizedRms;
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.resolve(finalRms);
                            }
                        });
                    } else {
                        // Skip other bit depths for simplicity
                        Log.e(TAG, "Unsupported bit depth: " + bitsPerSample);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Unsupported bit depth: " + bitsPerSample);
                            }
                        });
                    }
                    
                } catch (final Exception e) {
                    Log.e(TAG, "Error calculating RMS: " + e.getMessage(), e);
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            promise.reject(E_PROCESSING_ERROR, "Failed to calculate RMS: " + e.getMessage());
                        }
                    });
                } finally {
                    try {
                        if (fis != null) fis.close();
                    } catch (IOException e) {
                        Log.e(TAG, "Error closing file stream", e);
                    }
                }
            }
        });
    }
    
    /**
     * Utility method to help with ByteArrayOutputStream
     */
    private static class ByteArrayOutputStream extends java.io.ByteArrayOutputStream {
        public byte[] getBuffer() {
            return buf;
        }
    }
}