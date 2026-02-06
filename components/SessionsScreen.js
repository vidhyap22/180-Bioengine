import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../constants/Colors';
import AudioVisualizer from '../utils/AudioVisualizer';
import { AudioHandler } from '../utils/AudioHandler';

const SessionsScreen = () => {
  const {
    isRecording,
    timer,
    splData,
    nasalSplData,
    nasalanceData,
    stats,
    startRecording,
    stopRecording
  } = AudioHandler();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sessions</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.visualizerContainer}>
          <AudioVisualizer 
            splData={splData}
            nasalSplData={nasalSplData}
            nasalanceData={nasalanceData}
            stats={stats}
            timer={timer}
          />
        </View>
        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isRecording && styles.stopButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.lightNavalBlue,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  visualizerContainer: {
    marginTop: -20,
  },
  spacer: {
    height: 60,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  // Timer
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  
  // Graph
  graphTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 10,
    marginLeft: 20,
  },

  // Stats
  statsContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.lightNavalBlue,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginVertical: 5,
    fontSize: 14,
  },

  // Button
  button: {
    backgroundColor: Colors.lightNavalBlue,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20, // Reduced from 40 to 20
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SessionsScreen;
