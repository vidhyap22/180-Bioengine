import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const DeviceSelectionModal = ({ visible, onSelect, onClose }) => {
  const deviceOptions = [
    {
      id: 'wifi',
      name: 'WiFi (ESP32)',
      description: 'Transfer data from ESP32 device via WiFi',
      icon: 'wifi',
      color: Colors.lightNavalBlue,
    },
    {
      id: 'bluetooth',
      name: 'Bluetooth',
      description: 'Use Bluetooth audio device for recording',
      icon: 'bluetooth',
      color: '#007AFF',
    },
    {
      id: 'mobile',
      name: 'Mobile Microphone',
      description: 'Use device built-in microphone for recording',
      icon: 'mic',
      color: '#34C759',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Transfer Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.lightNavalBlue} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsContainer}>
            {deviceOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
                  <Ionicons name={option.icon} size={32} color={option.color} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Choose how you want to transfer audio data for the nasalance test
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  closeButton: {
    padding: 5,
  },
  optionsContainer: {
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.lightNavalBlue,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default DeviceSelectionModal;
