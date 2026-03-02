import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import HeaderBar from './common/HeaderBar';
import LoadingIndicator from './common/LoadingIndicator';

const EditProfileScreen = ({ route, navigation }) => {
  const { clinician } = route.params;
  console.log('clinician data:', clinician);

  if (!clinician) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No profile data found.</Text>
      </View>
    );
  }

  const [fullName, setFullName] = useState(clinician.full_name || '');
  const [username, setUsername] = useState(clinician.username || '');
  // Email is shown read-only — changing email requires Supabase Auth flow
  const email = clinician.email || '';
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('clinician')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
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
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        rightComponent={rightComponent}
      />

      <ScrollView style={styles.container}>
        <View style={styles.form}>

          <Text style={styles.label}>Full Name*</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Username*</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
          />
          <Text style={styles.helperText}>
            To change your email, please contact your administrator.
          </Text>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#efefef',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: -10,
    marginBottom: 16,
  },
  saveButton: {
    color: Colors.lightNavalBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default EditProfileScreen;