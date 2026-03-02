import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

const WaveformVisualizer = ({
  amplitudes = [],
  height = 40,
  width = '100%',
  color = '#2196f3',
  bars = 20,
  currentBarIndex = -1
}) => {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <View style={[styles.container, { height, width }]}>
      {amplitudes.map((value, index) => {
        const isActive = index === currentBarIndex;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${Math.max(0.05, value) * 100}%`,
                backgroundColor: isActive ? color : "#cbd5e1",
                opacity: isActive ? 1 : 0.5,
              },
            ]}
          />
        );
      })}
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
});

export default WaveformVisualizer;