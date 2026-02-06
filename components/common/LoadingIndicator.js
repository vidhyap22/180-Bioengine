import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

const LoadingIndicator = ({ 
  text = 'Loading...', 
  size = 'large',
  fullScreen = false,
  backgroundColor = 'rgba(255, 255, 255, 0.9)',
  color = Colors.lightNavalBlue
}) => {
  const containerStyle = [
    styles.container,
    fullScreen && styles.fullScreen,
    { backgroundColor }
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  text: {
    marginTop: 10,
    color: Colors.lightNavalBlue,
    fontSize: 16,
    textAlign: 'center',
  }
});

export default LoadingIndicator;
