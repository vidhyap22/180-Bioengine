import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const SettingsItem = ({ icon, text, onPress, badge, showChevron = true }) => (
  <TouchableOpacity 
    style={styles.container} 
    onPress={onPress}
  >
    <View style={styles.leftContent}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color={Colors.lightNavalBlue} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
    
    <View style={styles.rightContent}>
      {badge && <Text style={styles.badge}>{badge}</Text>}
      {showChevron && (
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: Colors.white,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    color: Colors.lightNavalBlue,
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  chevronContainer: {
    width: 24,
    alignItems: 'center',
  },
});

export default SettingsItem;
