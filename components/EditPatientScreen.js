import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import HeaderBar from './common/HeaderBar';
import PatientFormFields from './common/PatientFormFields';
import LoadingIndicator from './common/LoadingIndicator';

const EditPatientScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const [name, setName] = useState(patient.full_name);
  const [gender, setGender] = useState(patient.gender);
  const [mrn, setMrn] = useState(patient.mrn.toString());
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState({
    year: new Date(patient.dob).getFullYear().toString(),
    month: (new Date(patient.dob).getMonth() + 1).toString().padStart(2, '0'),
    day: new Date(patient.dob).getDate().toString().padStart(2, '0')
  });

  // Demographic fields
  const [firstLanguage, setFirstLanguage] = useState(patient.first_language || '');
  const [secondLanguage, setSecondLanguage] = useState(patient.second_language || '');
  const [ethnicity, setEthnicity] = useState(patient.ethnicity || '');
  const [race, setRace] = useState(patient.race || '');
  const [country, setCountry] = useState(patient.country || '');

  const handleDateChange = (text, type) => {
    // actually call setBirthDate instead of validateDate(text, type);
    setBirthDate(prev => ({ ...prev, [type]: text }));
  };

  const validateDate = (text, type) => {
    const year = parseInt(birthDate.year);
    const month = parseInt(birthDate.month);
    const day = parseInt(birthDate.day);
    const currentYear = new Date().getFullYear();

    // Check if all fields have values and are numbers
    if (!birthDate.year.trim() || !birthDate.month.trim() || !birthDate.day.trim()) {
      return { isValid: false, message: 'Please enter a complete date of birth' };
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { isValid: false, message: 'Please enter valid numbers for the date' };
    }

    // Validate ranges; switched from using switch to if
    if (year < 1900 || year > currentYear) {
      return { isValid: false, message: `Please enter a valid year (1900-${currentYear})` };
    }

    if (month < 1 || month > 12) {
      return { isValid: false, message: 'Please enter a valid month (1-12)' };
    }

    if (day < 1 || day > 31) {
      return { isValid: false, message: 'Please enter a valid day (1-31)' };
    }

    // Try to create a valid date
    try {
      const testDate = new Date(year, month - 1, day);
      if (testDate.getFullYear() !== year ||
          testDate.getMonth() !== month - 1 ||
          testDate.getDate() !== day) {
        return { isValid: false, message: 'Please enter a valid date' };
      }
    } catch (error) {
      return { isValid: false, message: 'Please enter a valid date' };
    }

    return { isValid: true };
  };

  const handleSave = async () => {
    if (!name || !gender) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // call validation here
    const dateValidation = validateDate();
    if (!dateValidation.isValid) {
      Alert.alert('Error', dateValidation.message);
      return;
    }

    try {
      setLoading(true);

      const dob = new Date(
        parseInt(birthDate.year),
        parseInt(birthDate.month) - 1,
        parseInt(birthDate.day),
        12, 0, 0
      ).toISOString().split('T')[0];

      const { error } = await supabase
        .from('patient')
        .update({
          full_name: name,
          gender,
          picture_url: patient.picture_url, // Keep existing picture URL if any
          dob: dob,
          first_language: firstLanguage || null,
          second_language: secondLanguage || null,
          ethnicity: ethnicity || null,
          race: race || null,
          country: country || null
        })
        .eq('mrn', patient.mrn);

      if (error) throw error;

      Alert.alert('Success', 'Patient updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const rightComponent = (
    <TouchableOpacity onPress={handleSave} disabled={loading}>
      <Text style={[styles.saveButton, loading && styles.buttonDisabled]}>
        {loading ? 'Saving...' : 'Save'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingIndicator text="Saving changes..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      <HeaderBar 
        title="Edit Patient" 
        onBack={() => navigation.goBack()}
        rightComponent={rightComponent}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <PatientFormFields
            name={name}
            setName={setName}
            gender={gender}
            setGender={setGender}
            birthDate={birthDate}
            onDateChange={handleDateChange}
            mrn={mrn}
            mrnEditable={false}
            setMrn={setMrn}
            firstLanguage={firstLanguage}
            setFirstLanguage={setFirstLanguage}
            secondLanguage={secondLanguage}
            setSecondLanguage={setSecondLanguage}
            ethnicity={ethnicity}
            setEthnicity={setEthnicity}
            race={race}
            setRace={setRace}
            country={country}
            setCountry={setCountry}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// Styles unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  form: {
    padding: 20,
  },
  saveButton: {
    color: Colors.lightNavalBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  }
});

export default EditPatientScreen;
