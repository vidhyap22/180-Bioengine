import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import SettingsItem from './common/SettingsItem';
import LoadingIndicator from './common/LoadingIndicator';
import Button from './common/Button';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('clinician')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const settingsSections = [
    {
      label: 'Hardware',
      icon: 'hardware-chip-outline',
      items: [
        // { 
        //   icon: 'options-outline', 
        //   text: 'Calibration Settings', 
        //   onPress: () => navigation.navigate('Calibration'),
        //   badge: 'Required'
        // },
        { 
          icon: 'mic-outline', 
          text: 'Test Microphones',
          onPress: () => navigation.navigate('Test'),
        }
      ]
    },
    {
      label: 'Account',
      icon: 'person',
      items: [
        { icon: 'person-outline', text: 'Edit Profile', chevron: true },
        { icon: 'lock-closed-outline', text: 'Change Password', chevron: true },
        // { icon: 'notifications-outline', text: 'Notifications', chevron: true }
      ]
    },
    // {
    //   label: 'Data Management',
    //   icon: 'server',
    //   items: [
    //     { icon: 'download-outline', text: 'Export Patient Data', chevron: true },
    //     { icon: 'sync-outline', text: 'Backup Settings', chevron: true }
    //   ]
    // },
    // {
    //   label: 'Help & Info',
    //   icon: 'information-circle',
    //   items: [
    //     { icon: 'help-circle-outline', text: 'User Guide', chevron: true },
    //     { icon: 'information-circle-outline', text: 'About nasomEATR', chevron: true }
    //   ]
    // }
  ];

  if (loading) return <LoadingIndicator text="Loading profile..." fullScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userData?.full_name?.charAt(0) || '?'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{userData?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{userData?.email || 'No email'}</Text>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, index) => (
          <View key={section.label} style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={20} color={Colors.lightNavalBlue} />
              <Text style={styles.sectionLabel}>{section.label}</Text>
            </View>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <SettingsItem
                  key={item.text}
                  icon={item.icon}
                  text={item.text}
                  onPress={item.onPress}
                  badge={item.badge}
                  showChevron={item.chevron}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          icon="exit-outline"
          onPress={handleSignOut}
          variant="primary"
          style={styles.signOutButton}
        />
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
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightNavalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    color: Colors.white,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.lightNavalBlue,
    marginLeft: 10,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 40,
  },
});

export default ProfileScreen;
