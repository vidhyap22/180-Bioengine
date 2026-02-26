import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Colors from '../constants/Colors';

const TestDetailScreen = ({ route, navigation }) => {
  const { test } = route.params;

  const [nasalSound, setNasalSound] = useState(null);
  const [oralSound, setOralSound] = useState(null);
  const [isPlayingNasal, setIsPlayingNasal] = useState(false);
  const [isPlayingOral, setIsPlayingOral] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    if (test.nasalance_data) {
      try {
        setParsedData(
          typeof test.nasalance_data === "string"
            ? JSON.parse(test.nasalance_data)
            : test.nasalance_data
        );
      } catch (error) {
        console.error("Failed to parse nasalance_data:", error);
      }
    }

    return () => {
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
      minute: '2-digit',
    });
  };

  const formatDurationAlt = (seconds) => {
    if (!seconds || seconds === 0 || isNaN(seconds)) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;

    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDuration = (test) => {
    try {
      if (typeof test.nasalance_data === "object") {
        return test.nasalance_data.duration || 0;
      }
      if (typeof test.nasalance_data === "string") {
        const parsed = JSON.parse(test.nasalance_data);
        return parsed.duration || 0;
      }
    } catch {
      return 0;
    }
    return 0;
  };

  return (
    <View style={styles.container}>

      {/* Header */}
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* Date & Time */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{formatDate(test.created_at)}</Text>
          <Text style={styles.timeText}>{formatTime(test.created_at)}</Text>
        </View>

        {/* Score */}
        <View style={styles.scoreCard}>
          <View style = {styles.scoreRow}>
            <View style={styles.sideContainer}>
              <Text style={styles.scoreTitle}>Oral Pressure</Text>
            </View>

            <View style={styles.centerContainer}>
                <Text style={styles.scoreTitle}>Nasalance Score</Text>
            </View>

            <View style={styles.sideContainer}>
              <Text style={styles.scoreTitle}>Nasal Pressure</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.sideContainer}>
              <Text style={styles.sideLabel}>
                {test.pressure_data.oral_pressure_avg_kpa?.toFixed(1) || 'N/A'}
                <Text style={styles.pressureUnit}>kPa</Text>

              </Text>
            </View>

            <View style={styles.centerContainer}>
              <Text style={styles.scoreValue}>
                {test.avg_nasalance_score?.toFixed(1) || 'N/A'}
                <Text style={styles.scoreUnit}>%</Text>
              </Text>
            </View>

            <View style={styles.sideContainer}>
                <Text style={styles.sideLabel}>
                    {test.pressure_data.nasal_pressure_avg_kpa?.toFixed(1) || 'N/A'}
                    <Text style={styles.pressureUnit}>kPa</Text>
                </Text>
            </View>
          </View>


          <View style={styles.scoreInterpretation}>
            <Text style={styles.interpretationText}>
              {test.avg_nasalance_score > 50
                ? 'High'
                : test.avg_nasalance_score > 30
                ? 'Normal'
                : 'Low'} nasalance
            </Text>
          </View>
        </View>

        {/* Audio Recordings */}
        <View style={styles.recordingsCard}>
          <Text style={styles.sectionTitle}>Audio Recordings</Text>

          {/* Nasal */}
          <TouchableOpacity
            style={styles.recordingItem}
            onPress={() =>
              navigation.navigate("MediaPlayer", {
                  nasalUrl: test.nasal_audio,
                  oralUrl: test.oral_audio,
                  audioUrl: test.nasal_audio,
                  audioFile: test.nasal_audio_file,
                  audioType: "Nasal",
                  displayedAmplitude: test.waveform_data?.nasal_waveform || [],
                  nasalAmplitude: test.waveform_data?.nasal_waveform || [],
                  oralAmplitude: test.waveform_data?.oral_waveform || [],
                  duration: formatDurationAlt(getDuration(test)),
              })
            }
            disabled={isLoading}
          >
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>Nasal Recording</Text>
              <Text style={styles.recordingSubtitle}>
                Duration: {formatDurationAlt(getDuration(test))}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Oral */}
          <TouchableOpacity
            style={styles.recordingItem}
            onPress={() =>
              navigation.navigate("MediaPlayer", {
                  nasalUrl: test.nasal_audio,
                  oralUrl: test.oral_audio,
                  audioUrl: test.oral_audio,
                  audioFile: test.oral_audio_file,
                  audioType: "Oral",
                  displayedAmplitude: test.waveform_data?.oral_waveform || [],
                  nasalAmplitude: test.waveform_data?.nasal_waveform || [],
                  oralAmplitude: test.waveform_data?.oral_waveform || [],
                  duration: formatDurationAlt(getDuration(test)),
              })
            }
            disabled={isLoading}
          >
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>Oral Recording</Text>
              <Text style={styles.recordingSubtitle}>
                Duration: {formatDurationAlt(getDuration(test))}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Possibly a combined recording*/}

        </View>

        {/* Device Info */}
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

export default TestDetailScreen;

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

  scoreValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    marginTop: 10,
  },

  sideLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },

  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  scoreUnit: {
    fontSize: 24,
    color: Colors.lightNavalBlue,
  },

  pressureUnit: {
      fontSize: 12,
      color: Colors.lightNavalBlue,
    },

  sideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: "100%",
    marginTop: 10,
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
    justifyContent: 'space-between',
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
});