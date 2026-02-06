import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
  ToastAndroid,
  FlatList,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import { supabase } from '../utils/supabaseClient';
import EnhancedAudioModule from '../modules/EnhancedAudioModule';

const TestScreen = ({ navigation, route }) => {
  const { patient } = route.params || {};
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Device Setup', 'Recording', 'Processing', 'Review'];
  
  // Recording state management
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  
  // Audio data storage
  const [stereoRecording, setStereoRecording] = useState(null);
  const [nasalRecording, setNasalRecording] = useState(null);
  const [oralRecording, setOralRecording] = useState(null);
  const [nasalanceScore, setNasalanceScore] = useState(null);
  
  // Device selection state
  const [isScanning, setIsScanning] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceSelectorVisible, setDeviceSelectorVisible] = useState(false);
  
  // Playback states and objects
  const [nasalSound, setNasalSound] = useState(null);
  const [oralSound, setOralSound] = useState(null);
  const [isPlayingNasal, setIsPlayingNasal] = useState(false);
  const [isPlayingOral, setIsPlayingOral] = useState(false);
  
  // Animation value for recording indicator
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Permission state
  const [hasPermission, setHasPermission] = useState(false);

  // Add loading state
  const [loading, setLoading] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  
  // Event subscription refs
  const deviceConnectedSubscription = useRef(null);
  const deviceDisconnectedSubscription = useRef(null);
  const deviceListChangedSubscription = useRef(null);

  // Request microphone permissions when component mounts
  useEffect(() => {
    (async () => {
      await requestMicrophonePermission();
    })();
    
    // Start device scanning
    startDeviceScan();
    
    return () => {
      // Clean up recordings and sounds when component unmounts
      if (recording) {
        stopRecording();
      }
      
      if (nasalSound) {
        nasalSound.unloadAsync();
      }
      
      if (oralSound) {
        oralSound.unloadAsync();
      }
      
      // Stop device scanning
      stopDeviceScan();
      
      // Unsubscribe from device events
      if (deviceConnectedSubscription.current) {
        deviceConnectedSubscription.current.remove();
      }
      
      if (deviceDisconnectedSubscription.current) {
        deviceDisconnectedSubscription.current.remove();
      }
      
      if (deviceListChangedSubscription.current) {
        deviceListChangedSubscription.current.remove();
      }
    };
  }, []);

  // Setup pulse animation
  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
    
    return () => {
      Animated.timing(pulseAnim).stop();
    };
  }, [recording]);

  // Timer management
  useEffect(() => {
    if (recording) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
      setTimerInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [recording]);

  const isEnhancedAudioAvailable = () => {
    if (!EnhancedAudioModule.isAvailable || !EnhancedAudioModule.isAvailable()) {
      Alert.alert(
        "Enhanced Audio Not Available",
        "The enhanced audio recording module is not available on this device. Some features may not work correctly.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const startDeviceScan = async () => {
    if (!isEnhancedAudioAvailable()) return;
    
    try {
      setIsScanning(true);
      
      // Subscribe to device events
      deviceConnectedSubscription.current = EnhancedAudioModule.addDeviceConnectedListener(
        device => {
          Alert.alert(
            'Device Connected',
            `${device.name} connected`,
            [{ text: 'OK' }]
          );
          refreshDeviceList();
        }
      );
      
      deviceDisconnectedSubscription.current = EnhancedAudioModule.addDeviceDisconnectedListener(
        device => {
          Alert.alert(
            'Device Disconnected',
            `${device.name} disconnected`,
            [{ text: 'OK' }]
          );
          
          // If the disconnected device was selected, reset selection
          if (selectedDevice && selectedDevice.id === device.id) {
            setSelectedDevice(null);
          }
          
          refreshDeviceList();
        }
      );
      
      deviceListChangedSubscription.current = EnhancedAudioModule.addDeviceListChangedListener(
        () => refreshDeviceList()
      );
      
      // Start scanning for devices
      await EnhancedAudioModule.startDeviceScan();
      
      // Get initial device list
      refreshDeviceList();
    } catch (error) {
      console.error('Error starting device scan:', error);
      Alert.alert('Device Scan Error', 'Failed to start scanning for audio devices.');
    }
  };
  
  const stopDeviceScan = async () => {
    if (!isEnhancedAudioAvailable() || !isScanning) return;
    
    try {
      await EnhancedAudioModule.stopDeviceScan();
      setIsScanning(false);
    } catch (error) {
      console.error('Error stopping device scan:', error);
    }
  };
  
  const refreshDeviceList = async () => {
    if (!isEnhancedAudioAvailable()) return;
    
    try {
      const devices = await EnhancedAudioModule.getAvailableDevices();
      
      // Add special check for DJI devices
      const enhancedDevices = devices.map(device => {
        if (device.name && device.name.toLowerCase().includes('dji')) {
          return {
            ...device,
            capabilities: {
              ...device.capabilities,
              stereo: true
            }
          };
        }
        return device;
      });
      
      setAudioDevices(enhancedDevices);
      
      // If no device is selected yet, try to select the default
      if (!selectedDevice) {
        const currentDevice = await EnhancedAudioModule.getCurrentDevice();
        if (currentDevice) {
          setSelectedDevice(currentDevice);
        }
        
        // Auto-select DJI device if available
        const djiDevice = enhancedDevices.find(d => 
          d.name && d.name.toLowerCase().includes('dji'));
        
        if (djiDevice) {
          selectAudioDevice(djiDevice);
        }
      }
    } catch (error) {
      console.error('Error refreshing device list:', error);
    }
  };
  
  const selectAudioDevice = async (device) => {
    if (!isEnhancedAudioAvailable()) return;
    
    try {
      // Do not allow changing devices during recording
      if (recording) {
        Alert.alert('Cannot Change Device', 'Stop recording before changing the input device.');
        return;
      }
      
      const selected = await EnhancedAudioModule.selectDevice(device.id);
      setSelectedDevice(selected);
      setDeviceSelectorVisible(false);
      
      // Check if this device supports stereo recording
      const stereoSupported = await EnhancedAudioModule.supportsStereoRecording(device.id);
      
      if (!stereoSupported) {
        Alert.alert(
          'Stereo Recording Not Supported',
          'This device may not support stereo recording, which is required for nasal/oral calibration.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting device:', error);
      Alert.alert('Device Selection Error', error.message || 'Failed to select audio device.');
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is required for recording audio.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Initialize Audio session for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (err) {
      console.error('Failed to get microphone permission', err);
      Alert.alert('Error', 'Failed to access microphone');
    }
  };

  const handleBackPress = () => {
    if (recording || stereoRecording) {
      Alert.alert(
        "Leave Test?",
        "Any unsaved recordings will be lost.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  const moveToRecordingStep = () => {
    if (!selectedDevice) {
      Alert.alert(
        "No Device Selected",
        "Please select an audio input device before proceeding.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Check if device supports stereo recording
    if (selectedDevice.capabilities && !selectedDevice.capabilities.stereo) {
      Alert.alert(
        "Warning",
        "The selected device may not support stereo recording, which is required for proper nasalance measurement.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue Anyway", onPress: () => setCurrentStep(1) }
        ]
      );
      return;
    }
    
    setCurrentStep(1);
  };
  
  const startRecording = async () => {
    if (!hasPermission) {
      await requestMicrophonePermission();
      if (!hasPermission) return;
    }
    
    if (!isEnhancedAudioAvailable()) return;
    
    try {
      setTimer(0);
      
      const timestamp = Date.now();
      const fileName = `stereo_recording_${timestamp}.pcm`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log("Starting recording to path:", filePath);
      
      const result = await EnhancedAudioModule.startRecording(filePath);
      console.log("Recording started, result:", result);
      
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Recording Error', 'Failed to start recording: ' + error.message);
    }
  };
  
  const stopRecording = async () => {
    if (!isEnhancedAudioAvailable() || !recording) return;
    
    try {
      setRecording(false);
      
      const result = await EnhancedAudioModule.stopRecording();
      console.log("Recording stopped, result:", result);
      
      const uri = result.path;
      
      setStereoRecording({
        duration: timer,
        timestamp: new Date().toISOString(),
        uri: uri,
        localPath: uri
      });
      
      // Move to processing step
      setCurrentStep(2);
      processRecording(uri);
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Recording Error', 'Failed to save recording: ' + error.message);
      setRecording(false);
    }
  };

  const processRecording = async (stereoPath) => {
    if (!isEnhancedAudioAvailable()) return;
    
    try {
      setProcessingAudio(true);
      
      const timestamp = Date.now();
      const nasalFileName = `nasal_${timestamp}.pcm`;
      const oralFileName = `oral_${timestamp}.pcm`;
      
      const nasalPath = `${FileSystem.documentDirectory}${nasalFileName}`;
      const oralPath = `${FileSystem.documentDirectory}${oralFileName}`;
      
      console.log(`Processing stereo recording: ${stereoPath}`);
      console.log(`Target paths - Nasal: ${nasalPath}, Oral: ${oralPath}`);
      
      // Use the native module to split the stereo recording into mono channels
      const result = await EnhancedAudioModule.splitStereoToMono(
        stereoPath,
        nasalPath, // left channel = nasal mic
        oralPath   // right channel = oral mic
      );
      
      console.log("Split complete, result:", result);
      
      // Calculate RMS values for both channels using the native module
      const nasalRms = await EnhancedAudioModule.calculateRms(result.leftPath);
      const oralRms = await EnhancedAudioModule.calculateRms(result.rightPath);
      
      console.log(`RMS values - Nasal: ${nasalRms}, Oral: ${oralRms}`);
      
      // Calculate nasalance score (nasal / (nasal + oral) * 100)
      const calculatedScore = (nasalRms / (nasalRms + oralRms)) * 100;
      
      console.log(`Calculated nasalance score: ${calculatedScore}`);
      
      // Store the processed files and score
      const recordingDuration = stereoRecording ? stereoRecording.duration : timer;
      
      setNasalRecording({
        duration: recordingDuration,
        timestamp: new Date().toISOString(),
        uri: result.leftPath,
        localPath: result.leftPath
      });
      
      setOralRecording({
        duration: recordingDuration,
        timestamp: new Date().toISOString(),
        uri: result.rightPath,
        localPath: result.rightPath
      });
      
      setNasalanceScore(calculatedScore);
      setProcessingAudio(false);
      
      // Move to review step
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to process recording', error);
      Alert.alert('Processing Error', 'Failed to process recording: ' + error.message);
      setProcessingAudio(false);
    }
  };
  
  const togglePlayNasal = async () => {
    if (isPlayingNasal) {
      if (nasalSound) {
        await nasalSound.stopAsync();
        setIsPlayingNasal(false);
      }
    } else {
      try {
        let sound = nasalSound;
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: nasalRecording.uri },
            { shouldPlay: true }
          );
          sound = newSound;
          setNasalSound(sound);
        } else {
          await sound.playFromPositionAsync(0);
        }
        
        setIsPlayingNasal(true);
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingNasal(false);
          }
        });
      } catch (error) {
        console.error('Failed to play nasal recording', error);
        Alert.alert('Playback Error', 'Failed to play recording');
      }
    }
  };
  
  const togglePlayOral = async () => {
    if (isPlayingOral) {
      if (oralSound) {
        await oralSound.stopAsync();
        setIsPlayingOral(false);
      }
    } else {
      try {
        let sound = oralSound;
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: oralRecording.uri },
            { shouldPlay: true }
          );
          sound = newSound;
          setOralSound(sound);
        } else {
          await sound.playFromPositionAsync(0);
        }
        
        setIsPlayingOral(true);
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingOral(false);
          }
        });
      } catch (error) {
        console.error('Failed to play oral recording', error);
        Alert.alert('Playback Error', 'Failed to play recording');
      }
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadAudioToStorage = async (uri, fileName) => {
    try {
      console.log(`Starting upload for ${fileName} from ${uri}`);
      
      // Ensure we're using an internal URI that we have permission to read
      let fileUri = uri;
      if (!uri.startsWith(FileSystem.documentDirectory) && !uri.startsWith('file:///data/')) {
        console.log('URI is not from app storage, attempting to create a local copy...');
        fileUri = `${FileSystem.documentDirectory}temp_${fileName}`;
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri
        });
        console.log(`Created local copy at: ${fileUri}`);
      }
      
      // Now read from our accessible path
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      if (!fileBase64) {
        throw new Error('Failed to read audio file');
      }
      
      console.log(`File read successfully: ${fileName}, length: ${fileBase64.length}`);
      
      // Clean up temp file if we created one
      if (fileUri !== uri) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
      
      const { data, error } = await supabase
        .storage
        .from('patients_audio')
        .upload(fileName, fileBase64, {
          contentType: 'audio/mpeg',
          upsert: true
        });
      
      if (error) throw error;
      
      console.log(`Upload successful for ${fileName}`);
      
      const { data: publicURLData } = supabase
        .storage
        .from('patients_audio')
        .getPublicUrl(fileName);
      
      if (!publicURLData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log(`Public URL generated: ${publicURLData.publicUrl}`);
      
      return publicURLData.publicUrl;
    } catch (err) {
      console.error(`Error uploading audio file ${fileName}:`, err);
      throw err;
    }
  };
  
  const saveTestResults = async () => {
    try {
      if (!nasalRecording || !oralRecording || nasalanceScore === null) {
        Alert.alert("Error", "Processing must be completed before saving");
        return;
      }
      
      setLoading(true);
      
      const testDate = new Date().toISOString();
      const timestamp = Date.now();
      
      console.log('Nasal recording local path:', nasalRecording.localPath || 'Not available');
      console.log('Oral recording local path:', oralRecording.localPath || 'Not available');
      
      const nasalFileName = `${patient.mrn}_nasal_${timestamp}.pcm`;
      const oralFileName = `${patient.mrn}_oral_${timestamp}.pcm`;
      
      console.log('Starting uploads to Supabase...');
      
      let nasalAudioUrl, oralAudioUrl;
      let nasalLocalPath = nasalRecording.localPath;
      let oralLocalPath = oralRecording.localPath;
      
      const uploadWithRetry = async (uri, fileName, attempt = 1, maxAttempts = 3) => {
        try {
          return await uploadAudioToStorage(uri, fileName);
        } catch (error) {
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Upload failed. Retrying in ${delay/1000}s (${attempt}/${maxAttempts-1})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return uploadWithRetry(uri, fileName, attempt + 1, maxAttempts);
          }
          throw error;
        }
      };
      
      // First upload nasal recording
      try {
        console.log('Uploading nasal recording...');
        const sourceUri = nasalLocalPath || nasalRecording.uri;
        nasalAudioUrl = await uploadWithRetry(sourceUri, nasalFileName);
        console.log('Nasal recording uploaded successfully');
      } catch (uploadError) {
        console.error('Failed to upload nasal recording:', uploadError);
        throw new Error(`Failed to upload nasal recording: ${uploadError.message}`);
      }
      
      // Then upload oral recording
      try {
        console.log('Uploading oral recording...');
        const sourceUri = oralLocalPath || oralRecording.uri;
        oralAudioUrl = await uploadWithRetry(sourceUri, oralFileName);
        console.log('Oral recording uploaded successfully');
      } catch (uploadError) {
        console.error('Failed to upload oral recording:', uploadError);
        throw new Error(`Failed to upload oral recording: ${uploadError.message}`);
      }
      
      // Use the actual calculated nasalance score
      const calculatedNasalanceScore = Math.round(nasalanceScore);
      
      // Generate a unique ID
      const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const testDataId = parseInt(`${timestamp}${randomPart}`.substring(0, 10));
      console.log(`Generated test ID: ${testDataId}`);

      const testData = {
        mrn: patient?.mrn,
        created_at: testDate,
        avg_nasalance_score: calculatedNasalanceScore,
        nasal_audio: nasalAudioUrl,
        oral_audio: oralAudioUrl,
        nasalance_data: JSON.stringify({
          score: calculatedNasalanceScore,
          nasal_device: selectedDevice?.name || 'Internal Microphone',
          oral_device: selectedDevice?.name || 'Internal Microphone',
          duration: nasalRecording.duration,
          recording_date: testDate
        })
      };
      
      console.log('Saving test data to database...');
      
      const { data, error } = await supabase
        .from('patient_data')
        .insert(testData)
        .select();  // Get the inserted record with auto-generated ID
      
      if (error) {
        console.error('Database insert error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          throw new Error('Unable to save test: duplicate record. Please try again.');
        } else {
          throw error;
        }
      }
      
      console.log('Test results saved successfully', data);
      
      // Now that everything is saved, delete the local files
      try {
        // Delete nasal recording
        if (nasalLocalPath && nasalLocalPath.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(nasalLocalPath, { idempotent: true });
          console.log('Deleted nasal recording file');
        }
        
        // Delete oral recording
        if (oralLocalPath && oralLocalPath.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(oralLocalPath, { idempotent: true });
          console.log('Deleted oral recording file');
        }
        
        // Delete stereo recording
        if (stereoRecording && stereoRecording.localPath && 
            stereoRecording.localPath.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(stereoRecording.localPath, { idempotent: true });
          console.log('Deleted stereo recording file');
        }
      } catch (deleteError) {
        console.warn('Error deleting local files:', deleteError);
      }
      
      Alert.alert(
        "Success",
        "Test results and audio recordings saved successfully.",
        [{ text: "OK", onPress: () => navigation.navigate('PatientDetail', { patient }) }]
      );
    } catch (error) {
      console.error("Error saving test results:", error);
      Alert.alert(
        "Error", 
        `Failed to save test results: ${error.message}. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={[
              styles.stepDot,
              currentStep === index ? styles.activeDot : null,
              currentStep > index ? styles.completedDot : null
            ]}>
              {currentStep > index ? (
                <Ionicons name="checkmark" size={14} color="white" />
              ) : (
                <Text style={
                  currentStep === index ? styles.activeStepNumber : styles.stepNumber
                }>{index + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              currentStep === index ? styles.activeStepLabel : null
            ]}>{step}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDeviceItem = ({ item }) => {
    const isSelected = selectedDevice && selectedDevice.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          isSelected && styles.deviceItemSelected
        ]}
        onPress={() => selectAudioDevice(item)}
      >
        <View style={styles.deviceIconContainer}>
          {item.type === 'usb' && (
            <Ionicons name="usb" size={20} color={isSelected ? "#fff" : Colors.lightNavalBlue} />
          )}
          {item.type === 'bluetooth' && (
            <Ionicons name="bluetooth" size={20} color={isSelected ? "#fff" : Colors.lightNavalBlue} />
          )}
          {item.type === 'builtin' && (
            <Ionicons name="mic" size={20} color={isSelected ? "#fff" : Colors.lightNavalBlue} />
          )}
          {item.type === 'wired' && (
            <Ionicons name="headset" size={20} color={isSelected ? "#fff" : Colors.lightNavalBlue} />
          )}
          {item.type !== 'usb' && item.type !== 'bluetooth' && 
            item.type !== 'builtin' && item.type !== 'wired' && (
            <Ionicons name="hardware-chip" size={20} color={isSelected ? "#fff" : Colors.lightNavalBlue} />
          )}
        </View>
        
        <View style={styles.deviceInfoContainer}>
          <Text style={[
            styles.deviceName,
            isSelected && styles.deviceNameSelected
          ]}>
            {item.name}
          </Text>
          
          <Text style={[
            styles.deviceType,
            isSelected && styles.deviceTypeSelected
          ]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} 
            {item.capabilities && item.capabilities.stereo ? ' • Stereo' : ' • Mono'}
          </Text>
        </View>
        
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };
  
  const renderDeviceSelection = () => {
    return (
      <View style={styles.deviceSelectionContainer}>
        <Text style={styles.sectionTitle}>Audio Input Device</Text>
        
        <Text style={styles.instructions}>
          Select a stereo audio device for recording.
        </Text>
        
        {selectedDevice ? (
          <View style={styles.selectedDeviceContainer}>
            <View style={styles.deviceIconLarge}>
              {selectedDevice.type === 'usb' && <Ionicons name="headset" size={24} color="#fff" />}
              {selectedDevice.type === 'bluetooth' && <Ionicons name="bluetooth" size={24} color="#fff" />}
              {selectedDevice.type === 'builtin' && <Ionicons name="mic" size={24} color="#fff" />}
              {selectedDevice.type === 'wired' && <Ionicons name="headset" size={24} color="#fff" />}
              {selectedDevice.type !== 'usb' && selectedDevice.type !== 'bluetooth' && 
               selectedDevice.type !== 'builtin' && selectedDevice.type !== 'wired' && (
                <Ionicons name="hardware-chip" size={24} color="#fff" />
              )}
            </View>
            
            <View style={styles.selectedDeviceInfo}>
              <Text style={styles.selectedDeviceName}>{selectedDevice.name}</Text>
              <Text style={styles.selectedDeviceType}>
                {selectedDevice.type.charAt(0).toUpperCase() + selectedDevice.type.slice(1)} 
                {selectedDevice.capabilities && selectedDevice.capabilities.stereo ? ' • Stereo' : ' • Mono'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.changeDeviceButton}
              onPress={() => setDeviceSelectorVisible(true)}>
              <Text style={styles.changeDeviceText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.selectDeviceButton}
            onPress={() => setDeviceSelectorVisible(true)}>
            <Ionicons name="hardware-chip-outline" size={20} color="#fff" />
            <Text style={styles.selectDeviceButtonText}>Select Audio Device</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.deviceTips}>
          <Text style={styles.deviceTipsTitle}>For the Best Results:</Text>
          
          {/* <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.lightNavalBlue} />
            <Text style={styles.tipText}>Use a stereo microphone like the DJI Mic 2</Text>
          </View>
          
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.lightNavalBlue} />
            <Text style={styles.tipText}>Position one microphone near the nose and one near the mouth</Text>
          </View> */}
          
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.lightNavalBlue} />
            <Text style={styles.tipText}>Ensure the environment is quiet during recording.</Text>
          </View>
          
        </View>
        
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !selectedDevice && styles.buttonDisabled
          ]}
          onPress={moveToRecordingStep}
          disabled={!selectedDevice}
        >
          <Text style={styles.continueButtonText}>Continue to Recording</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderRecordingControls = () => {
    return (
      <View style={styles.recordingControls}>
        {recording ? (
          <TouchableOpacity 
            style={styles.stopButton} 
            onPress={stopRecording}
          >
            <Ionicons name="square" size={24} color="white" />
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={startRecording}
          >
            <Animated.View style={{
              transform: [{ scale: pulseAnim }]
            }}>
              <Ionicons name="radio-button-on" size={24} color="white" />
            </Animated.View>
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  const renderStereoRecording = () => {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.microphoneInfo}>
          <View style={styles.microphoneIconsContainer}>
            <Ionicons name="mic" size={32} color={Colors.lightNavalBlue} />
            <Ionicons name="mic-outline" size={32} color={Colors.lightNavalBlue} />
          </View>
          <Text style={styles.recordingTitle}>Stereo Recording</Text>
          <Text style={styles.instructions}>
            Position both microphones (nasal and oral) and record the subject reading a provided passage.
          </Text>
        </View>
        
        <View style={styles.selectedDeviceReminder}>
          <Text style={styles.selectedDeviceReminderText}>
            Recording with: {selectedDevice?.name || 'Unknown Device'}
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
          {recording && (
            <Animated.View 
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          )}
        </View>
        
        {renderRecordingControls()}
      </View>
    );
  };
  
  const renderProcessing = () => {
    return (
      <View style={styles.processingContainer}>
        <View style={styles.processingContent}>
          <ActivityIndicator size="large" color={Colors.lightNavalBlue} />
          <Text style={styles.processingText}>Processing Audio</Text>
          <Text style={styles.processingSubtext}>
            Splitting stereo recording into nasal and oral channels...
          </Text>
        </View>
      </View>
    );
  };
  
  const renderReview = () => {
  // Check if MRN is available and valid
  const isMrnValid = patient?.mrn && patient.mrn !== 'N/A' && patient.mrn !== '';
  
  return (
    <View style={styles.reviewContainer}>
      <Text style={styles.reviewTitle}>Review Results</Text>
      
      {/* Nasalance Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Nasalance Score</Text>
        <Text style={styles.scoreValue}>{Math.round(nasalanceScore)}%</Text>
      </View>
      
      {/* Device info */}
      <View style={styles.reviewDeviceInfo}>
        <Text style={styles.reviewDeviceTitle}>Recording Device</Text>
        <Text style={styles.reviewDeviceName}>{selectedDevice?.name || 'Unknown Device'}</Text>
      </View>
      
      {/* Show warning if MRN is missing */}
      {!isMrnValid && (
        <View style={styles.warningContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#ff9800" />
          <Text style={styles.warningText}>
            Exit "Test Microphones" to save results.
          </Text>
        </View>
      )}
      
      {/* Nasal Recording Review */}
      <View style={styles.recordingReview}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingTypeLabel}>Nasal Channel</Text>
          <Text style={styles.recordingDuration}>Duration: {formatTime(nasalRecording?.duration || 0)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={togglePlayNasal}
          disabled={loading}
        >
          <Ionicons 
            name={isPlayingNasal ? "pause" : "play"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Oral Recording Review */}
      <View style={styles.recordingReview}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingTypeLabel}>Oral Channel</Text>
          <Text style={styles.recordingDuration}>Duration: {formatTime(oralRecording?.duration || 0)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={togglePlayOral}
          disabled={loading}
        >
          <Ionicons 
            name={isPlayingOral ? "pause" : "play"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.navigationRow}>
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            (loading || !isMrnValid) && styles.disabledButton
          ]}
          onPress={saveTestResults}
          disabled={loading || !isMrnValid}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="white" />
              <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Saving...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Results</Text>
              <Ionicons name="save-outline" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
  
  const renderCurrentStep = () => {
    switch(currentStep) {
      case 0:
        return renderDeviceSelection();
      case 1:
        return renderStereoRecording();
      case 2:
        return renderProcessing();
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar 
        title="Nasalance Test"
        onBack={handleBackPress}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient info */}
        <Text style={styles.patientName}>{patient?.full_name || 'Unknown Patient'}</Text>
        <Text style={styles.patientDetail}>MRN: {patient?.mrn || 'N/A'}</Text>
        
        {renderStepIndicator()}
        
        {renderCurrentStep()}
      </ScrollView>
      
      {/* Device Selector Modal */}
      <Modal
        visible={deviceSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeviceSelectorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Audio Device</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setDeviceSelectorVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {audioDevices.length > 0 ? (
              <FlatList
                data={audioDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                contentContainerStyle={styles.deviceListContent}
              />
            ) : (
              <View style={styles.noDevicesContainer}>
                <Ionicons name="alert-circle-outline" size={40} color="#999" />
                <Text style={styles.noDevicesText}>No audio devices found</Text>
                <Text style={styles.noDevicesSubtext}>
                  Connect a USB or Bluetooth audio device and try again
                </Text>
                
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={refreshDeviceList}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.refreshButtonText}>Refresh Devices</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Export the component
export default TestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  
  // Step indicator styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeDot: {
    backgroundColor: Colors.lightNavalBlue,
  },
  completedDot: {
    backgroundColor: '#4caf50',
  },
  stepNumber: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeStepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeStepLabel: {
    color: Colors.lightNavalBlue,
    fontWeight: 'bold',
  },
  
  // Device selection styles
  deviceSelectionContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 12,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectDeviceButton: {
    backgroundColor: Colors.lightNavalBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectDeviceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedDeviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 20,
  },
  deviceIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightNavalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDeviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedDeviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedDeviceType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  changeDeviceButton: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 6,
  },
  changeDeviceText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  deviceTips: {
    marginBottom: 20,
  },
  deviceTipsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.lightNavalBlue,
    marginBottom: 10,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  continueButton: {
    backgroundColor: Colors.lightNavalBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  modalCloseButton: {
    padding: 6,
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceListContent: {
    padding: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  deviceItemSelected: {
    backgroundColor: Colors.lightNavalBlue,
  },
  deviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  deviceNameSelected: {
    color: '#fff',
  },
  deviceType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceTypeSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noDevicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: Colors.lightNavalBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: 150,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  
  // Recording container styles
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
    paddingHorizontal: 15,
  },
  microphoneInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  microphoneIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: 100,
    justifyContent: 'space-between',
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 10,
    marginBottom: 8,
  },
  selectedDeviceReminder: {
    backgroundColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  selectedDeviceReminderText: {
    color: '#555',
    fontSize: 14,
  },
  
  // Processing styles
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
    paddingHorizontal: 15,
    minHeight: 300,
    justifyContent: 'center',
  },
  processingContent: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtext: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  
  // Timer styles
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  recordingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    marginLeft: 16,
  },
  
  // Recording controls
  recordingControls: {
    marginTop: 10,
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  
  // Navigation buttons
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  
  // Review styles
  reviewContainer: {
    paddingVertical: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
    paddingHorizontal: 15,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
    backgroundColor: Colors.lightNavalBlue,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  scoreValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  reviewDeviceInfo: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  reviewDeviceTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewDeviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  recordingReview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  recordingDuration: {
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    backgroundColor: Colors.lightNavalBlue,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
});