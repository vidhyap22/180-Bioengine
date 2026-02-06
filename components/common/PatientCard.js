import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../../constants/Colors';

const PatientCard = ({ patient, formatDate, minimal = false }) => {
  const getProfileImage = () => {
    if (patient?.picture_url && patient.picture_url.trim() !== '') {
      return { uri: patient.picture_url };
    }
    return require('../../assets/splash-icon.png');
  };

  if (minimal) {
    return (
      <View style={styles.minimalCard}>
        <Text style={styles.patientName}>{patient.name || patient.full_name}</Text>
        <Text style={styles.patientInfo}>MRN: {patient.mrn}</Text>
        <Text style={styles.patientInfo}>DOB: {formatDate(patient.dob)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.profileCard}>
      <Image
        source={getProfileImage()}
        style={styles.profileImage}
        onError={(e) => {
          console.log('Error loading image:', e.nativeEvent.error);
          e.target.src = require('../../assets/splash-icon.png');
        }}
      />
      <View style={styles.profileInfo}>
        <Text style={styles.name}>{patient.name || patient.full_name}</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MRN</Text>
            <Text style={styles.infoValue}>{patient.mrn}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{patient.gender}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DOB</Text>
            <Text style={styles.infoValue}>{formatDate(patient.dob)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    marginBottom: 15,
    alignSelf: 'center',
  },
  profileInfo: {
    width: '100%',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  minimalCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  patientInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default PatientCard;
