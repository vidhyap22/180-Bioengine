import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform
} from "react-native";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import WaveformVisualizer from "../utils/WaveformVisualizer";

const BAR_COUNT = 40;

const MediaPlayer = ({ route, navigation }) => {
  const { nasalUrl, oralUrl, audioUrl, audioFile, audioType, displayedAmplitude, nasalAmplitude, oralAmplitude, duration } = route.params;

  const soundRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [durationMs, setDurationMs] = useState(1);

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownData, setDropdownData] = useState(false);



  const currentBarIndex = Math.floor(
          (position / durationMs) * (BAR_COUNT - 1)
  );

  useEffect(() => {
    loadAudio();
    return () => unloadAudio();
  }, []);

  const loadAudio = async () => {
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false, volume },
      onPlaybackStatusUpdate
    );
    soundRef.current = sound;

    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis != null) {
      setDurationMs(status.durationMillis);
    }
  };

  const unloadAudio = async () => {
    if (soundRef.current) await soundRef.current.unloadAsync();
  };

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    if (status.durationMillis) setDurationMs(status.durationMillis);
    if (status.didJustFinish) setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const restartAudio = async () => {
      if (!soundRef.current) return;
      await soundRef.current.setPositionAsync(0);
      if (isPlaying) await soundRef.current.playAsync();
  };





  const onSeek = async (value) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(value);
  };

  const changeSpeed = async (speed) => {
    setPlaybackSpeed(speed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(speed, true);
    }
  };

  const changeVolume = async (value) => {
    setVolume(value);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(value);
    }
  };




  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playback</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

      {/* Title */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownHeader}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.title}>{audioType} Recording</Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.lightNavalBlue}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdownMenu}>
            {audioType !== "Nasal" && (
              <TouchableOpacity
                onPress={() => {
                  setShowDropdown(false);
                  navigation.replace("MediaPlayer", {
                    nasalUrl: route.params.nasalUrl,
                    oralUrl: route.params.oralUrl,
                    audioUrl: route.params.nasalUrl,
                    audioFile: route.params.audioFile,
                    audioType: "Nasal",
                    displayedAmplitude: route.params.nasalAmplitude,
                    nasalAmplitude: route.params.nasalAmplitude,
                    oralAmplitude: route.params.oralAmplitude,
                    duration: duration,
                  });
                }}
              >
                <Text style={styles.dropdownItem}>Nasal Recording</Text>
              </TouchableOpacity>
            )}

            {audioType !== "Oral" && (
              <TouchableOpacity
                onPress={() => {

                  setShowDropdown(false);
                  navigation.replace("MediaPlayer", {
                    nasalUrl: route.params.nasalUrl,
                    oralUrl: route.params.oralUrl,
                    audioUrl: route.params.oralUrl,
                    audioFile: route.params.audioFile,
                    audioType: "Oral",
                    displayedAmplitude: route.params.oralAmplitude,
                    nasalAmplitude: route.params.nasalAmplitude,
                    oralAmplitude: route.params.oralAmplitude,
                    duration: duration,
                  });
                }}
              >
                <Text style={styles.dropdownItem}>Oral Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>



      {/* Waveform */}
      <WaveformVisualizer
        amplitudes={audioType === "Nasal" ? nasalAmplitude : oralAmplitude}
        height={80}
        width="100%"
        color={Colors.lightNavalBlue}
        bars={BAR_COUNT}
        currentBarIndex={currentBarIndex}
      />


        {/* Progress Bar */}
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={0}
          maximumValue={durationMs}
          value={position}
          minimumTrackTintColor={Colors.lightNavalBlue}
          maximumTrackTintColor="#ccc"
          onSlidingComplete={(v) => soundRef.current.setPositionAsync(v)}
        />

        {/* Time */}
        <View style={styles.timeRow}>
          <Text>{formatTime(position)}</Text>
          <Text>{formatTime(durationMs)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Restart Button */}
          <TouchableOpacity onPress={restartAudio}>
            <Ionicons name="play-skip-back" size={32} color={Colors.lightNavalBlue} />
          </TouchableOpacity>
          {/* Play/Pause Button */}
          <TouchableOpacity onPress={togglePlay}>
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={70}
              color={Colors.lightNavalBlue}
            />
          </TouchableOpacity>

          {/* Volume Button */}
          <View
            onMouseEnter={() => Platform.OS === "web" && setShowVolume(true)}
            onMouseLeave={() => Platform.OS === "web" && setShowVolume(false)}
          >
            <TouchableOpacity onPress={() => setShowVolume(!showVolume)}>
              <Ionicons name="volume-medium" size={28} color="#666" />
            </TouchableOpacity>

            {showVolume && (
              <View style={styles.volumePopup}>
                <Slider
                  style={{ width: 120 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onValueChange={changeVolume}
                />
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Playback Speed Modal */}
        <Modal visible={showSettings} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Playback Speed</Text>

              {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  onPress={() => {
                    changeSpeed(speed);
                    setShowSettings(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color:
                        speed === playbackSpeed
                          ? Colors.lightNavalBlue
                          : "#333",
                      marginVertical: 6,
                    }}
                  >
                    {speed}×
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={{ color: "red", marginTop: 15 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  dropdownContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  dropdownMenu: {
    marginTop: 10,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  dropdownItem: {
    fontSize: 16,
    paddingVertical: 8,
    color: Colors.lightNavalBlue,
    textAlign: "center",
    fontWeight: "bold",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.lightNavalBlue,
    marginLeft: 10,
  },

  content: { padding: 20 },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
    color: Colors.lightNavalBlue,
  },

  waveContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
    marginBottom: 25,
  },

  waveBar: {
    width: 4,
    backgroundColor: Colors.lightNavalBlue,
    borderRadius: 2,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 30,
  },

  volumePopup: {
    position: "absolute",
    top: -50,
    left: -40,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    elevation: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
});

export default MediaPlayer;