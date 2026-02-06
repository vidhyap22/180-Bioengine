import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import { calculateSPL, calculateStats } from './AudioUtils';

export const AudioHandler = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [timer, setTimer] = useState(0);
  const [splData, setSplData] = useState([]);
  const [nasalSplData, setNasalSplData] = useState([]);
  const [nasalanceData, setNasalanceData] = useState([]);
  const [stats, setStats] = useState({ max: 0, min: 0, mean: 0, sd: 0 });

  useEffect(() => {
    requestPermissions();
    return () => cleanupRecording();
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'This app needs access to your microphone to record audio.',
          [{ text: 'OK', onPress: () => requestPermissions() }]
        );
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
    }
  };

  const cleanupRecording = async () => {
    try {
      if (recording) {
        if (recording.monitorInterval) {
          clearInterval(recording.monitorInterval);
        }
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
        setRecording(null);
      }
    } catch (err) {
      console.error('Error cleaning up recording:', err);
    }
  };

  const startRecording = async () => {
    try {
      await cleanupRecording();
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          meteringEnabled: true
        },
        ios: {
          extension: '.m4a',
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          meteringEnabled: true
        }
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setTimer(0);

      const monitorInterval = setInterval(async () => {
        if (newRecording) {
          try {
            const status = await newRecording.getStatusAsync();
            if (status.isRecording) {
              const dB = status.metering || -160;
              const oralSpl = calculateSPL(Math.pow(10, dB/20));
              const nasalRatio = 0.3 + (Math.random() * 0.2);
              const nasalSpl = Math.max(0, oralSpl * nasalRatio);
              
              const totalSpl = nasalSpl + oralSpl;
              const nasalanceScore = totalSpl > 0 ? (nasalSpl / totalSpl) * 100 : 0;
              
              setSplData(prev => [...prev, oralSpl].slice(-20));
              setNasalSplData(prev => [...prev, nasalSpl].slice(-20));
              setNasalanceData(prev => {
                const newData = [...prev, nasalanceScore].slice(-20);
                const newStats = calculateStats(newData);
                setStats(newStats);
                return newData;
              });
            }
          } catch (err) {
            console.error('Error in monitor interval:', err);
          }
        }
      }, 50);

      setRecording(Object.assign(newRecording, { monitorInterval }));
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await cleanupRecording();
      setIsRecording(false);
      setSplData([]);
      setNasalSplData([]);
      setNasalanceData([]);
      setStats({ max: 0, min: 0, mean: 0, sd: 0 });
    } catch (err) {
      console.error('Failed to stop recording:', err);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  return {
    isRecording,
    timer,
    splData,
    nasalSplData,
    nasalanceData,
    stats,
    startRecording,
    stopRecording
  };
};