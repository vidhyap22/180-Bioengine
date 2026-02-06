import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import Button from './common/Button';
import Colors from '../constants/Colors';

const VerificationScreen = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>We've sent you a verification link. Please click it to continue.</Text>
      <Button
        title="Go to Login"
        onPress={handleLogout}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.lightNavalBlue,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    marginTop: 20,
  }
});

export default VerificationScreen;
