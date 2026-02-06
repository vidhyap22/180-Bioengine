import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { supabase } from '../utils/supabaseClient';
import Colors from '../constants/Colors';

const TestDetailScreen = ({ route, navigation }) => {
  const { test } = route.params;
  
  // Audio playback states
  const [nasalSound, setNasalSound] = useState(null);
  const [oralSound, setOralSound] = useState(null);
  const [isPlayingNasal, setIsPlayingNasal] = useState(false);
  const [isPlayingOral, setIsPlayingOral] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Parsed data
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    // Parse nasalance_data JSON if available
    if (test.nasalance_data) {
      try {
        setParsedData(JSON.parse(test.nasalance_data));
      } catch (error) {
        console.error("(TestDetailScreen - useEffect)Failed to parse nasalance_data:", error);
      }
    }
    
    return () => {
      // Clean up audio resources when unmounting
      if (nasalSound) nasalSound.unloadAsync();
      if (oralSound) oralSound.unloadAsync();
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

//  const formatDuration = (seconds) => {
//    if (!seconds) return '0:00';
//    const minutes = Math.floor(seconds / 60);
//    const remainingSeconds = seconds % 60;
//    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//  };
  const formatDurationAlt = (seconds) =>{
    if (!seconds || seconds === 0 || isNaN(seconds)) {
      return 'N/A';
    }

    // under 60 seconds, show seconds with 1 decimal
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }

    //  convert to minutes:seconds for longer durations
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  const getDuration = (test) => {
    // Handle if nasalance_data is already an object
    if (test.nasalance_data && typeof test.nasalance_data === 'object') {
      return test.nasalance_data.duration || 0;
    }

    // Handle if nasalance_data is a JSON string that needs parsing
    if (test.nasalance_data && typeof test.nasalance_data === 'string') {
      try {
        const parsed = JSON.parse(test.nasalance_data);
        return parsed.duration || 0;
      } catch (e) {
        console.warn('(Test Detail Screen - getDuration) Failed to parse nasalance_data:', e);
        return 0;
      }
    }
  };

  // Play nasal recording with improved error handling
  const togglePlayNasal = async () => {
    try {
      if (isPlayingNasal && nasalSound) {
        await nasalSound.stopAsync();
        setIsPlayingNasal(false);
        return;
      }
      
      setIsLoading(true);
      
      // Log the audio URL for debugging
      console.log('Attempting to play nasal audio from:', test.nasal_audio);
      
      // If sound isn't loaded yet or failed before, load it
      if (!nasalSound) {
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: test.nasal_audio },
            { shouldPlay: true },
            (status) => {
              console.log('Nasal playback status:', status);
              if (status.didJustFinish) {
                setIsPlayingNasal(false);
              }
              if (status.error) {
                console.error('Playback error:', status.error);
                Alert.alert('Playback Error', `Error playing recording: ${status.error}`);
                setIsPlayingNasal(false);
              }
            }
          );
          
          setNasalSound(newSound);
          setIsPlayingNasal(true);
        } catch (loadError) {
          console.error('Failed to load nasal recording:', loadError);
          console.log('Audio URL that failed:', test.nasal_audio);
          
          Alert.alert(
            'Error', 
            `Failed to play recording. The audio file may be corrupted or in an unsupported format. Error: ${loadError.message}`
          );
          setIsPlayingNasal(false);
        }
      } else {
        // Otherwise just play it
        await nasalSound.playFromPositionAsync(0);
        setIsPlayingNasal(true);
      }
    } catch (err) {
      console.error('Failed to play nasal recording:', err);
      Alert.alert('Error', `Failed to play recording: ${err.message}`);
      setIsPlayingNasal(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Play oral recording with improved error handling
  const togglePlayOral = async () => {
    try {
      if (isPlayingOral && oralSound) {
        await oralSound.stopAsync();
        setIsPlayingOral(false);
        return;
      }
      
      setIsLoading(true);
      
      // Log the audio URL for debugging
      console.log('Attempting to play oral audio from:', test.oral_audio);
      
      // If sound isn't loaded yet or failed before, load it
      if (!oralSound) {
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: test.oral_audio },
            { shouldPlay: true },
            (status) => {
              console.log('Oral playback status:', status);
              if (status.didJustFinish) {
                setIsPlayingOral(false);
              }
              if (status.error) {
                console.error('Playback error:', status.error);
                Alert.alert('Playback Error', `Error playing recording: ${status.error}`);
                setIsPlayingOral(false);
              }
            }
          );
          
          setOralSound(newSound);
          setIsPlayingOral(true);
        } catch (loadError) {
          console.error('Failed to load oral recording:', loadError);
          console.log('Audio URL that failed:', test.oral_audio);
          
          Alert.alert(
            'Error', 
            `Failed to play recording. The audio file may be corrupted or in an unsupported format. Error: ${loadError.message}`
          );
          setIsPlayingOral(false);
        }
      } else {
        // Otherwise just play it
        await oralSound.playFromPositionAsync(0);
        setIsPlayingOral(true);
      }
    } catch (err) {
      console.error('Failed to play oral recording:', err);
      Alert.alert('Error', `Failed to play recording: ${err.message}`);
      setIsPlayingOral(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Details</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Test Date and Time */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{formatDate(test.created_at)}</Text>
          <Text style={styles.timeText}>{formatTime(test.created_at)}</Text>
        </View>
        
        {/* Nasalance Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Nasalance Score</Text>
          <View style={styles.scoreValueContainer}>
            <Text style={styles.scoreValue}>
              {test.avg_nasalance_score?.toFixed(1) || 'N/A'}
              <Text style={styles.scoreUnit}>%</Text>
            </Text>
          </View>
          <View style={styles.scoreInterpretation}>
            <Text style={styles.interpretationText}>
              {test.avg_nasalance_score > 50 ? 'High' : test.avg_nasalance_score > 30 ? 'Normal' : 'Low'} nasalance
            </Text>
          </View>
        </View>
        
        {/* Audio Recordings */}
        <View style={styles.recordingsCard}>
          <Text style={styles.sectionTitle}>Audio Recordings</Text>
          
          {/* Nasal Recording */}
          <View style={styles.recordingItem}>
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>Nasal Recording</Text>
              <Text style={styles.recordingSubtitle}>
                Duration: {formatDurationAlt(getDuration(test))}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.playButton, isPlayingNasal && styles.pauseButton]}
              onPress={togglePlayNasal}
              disabled={isLoading}
            >
              {isLoading && isPlayingNasal ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={isPlayingNasal ? "pause" : "play"} 
                  size={24} 
                  color="white" 
                />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Oral Recording */}
          <View style={styles.recordingItem}>
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>Oral Recording</Text>
              <Text style={styles.recordingSubtitle}>
                Duration: {formatDurationAlt(getDuration(test))}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.playButton, isPlayingOral && styles.pauseButton]}
              onPress={togglePlayOral}
              disabled={isLoading}
            >
              {isLoading && isPlayingOral ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={isPlayingOral ? "pause" : "play"} 
                  size={24} 
                  color="white" 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Device Information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nasal Device:</Text>
            <Text style={styles.infoValue}>{parsedData?.nasal_device || 'Unknown'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Oral Device:</Text>
            <Text style={styles.infoValue}>{parsedData?.oral_device || 'Unknown'}</Text>
          </View>
        </View>

        {/* Placeholder for future features */}
        {/* <View style={styles.placeholderCard}>
          <View style={styles.placeholderHeader}>
            <Text style={styles.sectionTitle}>Nasalance Graph</Text>
          </View>
          <View style={styles.placeholderContent}>
            <Ionicons name="analytics-outline" size={40} color="#DDD" />
            <Text style={styles.placeholderText}>
              Detailed analysis will be available in future updates
            </Text>
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateTimeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  scoreCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  scoreValueContainer: {
    marginVertical: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  scoreUnit: {
    fontSize: 24,
    fontWeight: 'normal',
  },
  scoreInterpretation: {
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginTop: 10,
  },
  interpretationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  recordingsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  recordingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    backgroundColor: Colors.lightNavalBlue,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#ff6b6b',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 2,
    fontSize: 14,
    color: Colors.lightNavalBlue,
  },
  placeholderCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  placeholderHeader: {
    marginBottom: 10,
  },
  placeholderContent: {
    height: 150,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#888',
  },
});

export default TestDetailScreen;
