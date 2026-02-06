import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

const WaveformVisualizer = ({ amplitude = 0, height = 40, width = '100%', color = '#2196f3', bars = 20 }) => {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Generate an array of bar heights based on the amplitude
  const generateBars = () => {
    if (!isMounted.current) return [];
    
    const barWidths = [];
    
    for (let i = 0; i < bars; i++) {
      // Create a wave-like pattern
      const position = i / bars;
      const sinValue = Math.sin(position * Math.PI * 2 + Date.now() / 200);
      
      // Apply amplitude to the sine wave and ensure it's positive
      const barHeight = Math.max(0.1, Math.abs(sinValue) * amplitude);
      
      barWidths.push(barHeight);
    }
    
    return barWidths;
  };

  return (
    <View style={[styles.container, { height, width }]}>
      {amplitude > 0 ? (
        generateBars().map((barHeight, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${barHeight * 100}%`,
                backgroundColor: color,
              },
            ]}
          />
        ))
      ) : (
        <View style={styles.flatLine} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  flatLine: {
    height: 1,
    width: '100%',
    backgroundColor: '#ccc',
  },
});

export default WaveformVisualizer;
