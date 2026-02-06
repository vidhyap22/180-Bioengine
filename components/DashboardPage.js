import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';

const DashboardOption = ({ title, subtitle, icon, onPress }) => (
  <TouchableOpacity style={styles.optionCard} onPress={onPress}>
    <View style={styles.optionIcon}>
      <Ionicons name={icon} size={24} color={Colors.lightNavalBlue} />
    </View>
    <View style={styles.optionText}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>
);

const DashboardPage = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const options = [
    {
      title: 'Start an Evaluation',
      subtitle: 'Begin a new patient evaluation session.',
      icon: 'clipboard-outline',
      onPress: () => navigation.navigate('HomeTab')
    },
    {
      title: 'Patient List',
      subtitle: 'View and manage your patients.',
      icon: 'people-outline',
      onPress: () => navigation.navigate('HomeTab')
    },
    {
      title: 'Settings',
      subtitle: 'Configure app preferences and profile.',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Profile')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>What would you like to do?</Text>
      </View>
      
      {/* Options Grid */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <DashboardOption
            key={index}
            {...option}
          />
        ))}
      </View>

      {/* Footer Section */}
      <View style={styles.footer}>
          <Text style={styles.helpText}>If you think you have a medical emergency, call your doctor or 911 immediately.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  welcomeSection: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
  },
  optionsContainer: {
    flex: 1,
    padding: 20,
    gap: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8eaf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.lightNavalBlue,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  helpText: {
    color: '#666',
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center'
  },
});

export default DashboardPage;
