import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Colors from '../constants/Colors';

const AudioVisualizer = ({ 
  splData, 
  nasalSplData, 
  nasalanceData, 
  stats, 
  timer 
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSplGraph = () => (
    <LineChart
      data={{
        labels: [],
        datasets: [
          {
            data: splData.length > 0 ? splData : [0],
            color: () => Colors.lightNavalBlue
          },
          {
            data: nasalSplData.length > 0 ? nasalSplData : [0],
            color: () => Colors.darkRed
          }
        ]
      }}
      width={Dimensions.get('window').width}
      height={160}
      chartConfig={{
        backgroundColor: 'transparent',
        backgroundGradientFrom: Colors.white,
        backgroundGradientTo: Colors.white,
        decimalPlaces: 1,
        color: () => Colors.lightNavalBlue,
        propsForBackgroundLines: {
          stroke: 'transparent',
        }
      }}
      withDots={false}
      bezier
      style={styles.chart}
    />
  );

  const renderNasalanceGraph = () => (
    <LineChart
      data={{
        labels: [],
        datasets: [{
          data: nasalanceData.length > 0 ? nasalanceData : [0]
        }]
      }}
      width={Dimensions.get('window').width}
      height={160}
      chartConfig={{
        backgroundColor: 'transparent',
        backgroundGradientFrom: Colors.white,
        backgroundGradientTo: Colors.white,
        decimalPlaces: 1,
        color: () => Colors.teal,
        propsForBackgroundLines: {
          stroke: 'transparent',
        }
      }}
      withDots={false}
      bezier
      style={styles.chart}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(timer)}</Text>
      </View>
      
      <Text style={styles.graphTitle}>Oral & Nasal SPL</Text>
      {renderSplGraph()}
      <Text style={styles.graphTitle}>Nasalance Score</Text>
      {renderNasalanceGraph()}

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Statistics / Nasalance Score (%)</Text>
        <View style={styles.statsGrid}>
          <Text style={styles.statItem}>Max: {stats.max.toFixed(1)}%</Text>
          <Text style={styles.statItem}>Min: {stats.min.toFixed(1)}%</Text>
          <Text style={styles.statItem}>Mean: {stats.mean.toFixed(1)}%</Text>
          <Text style={styles.statItem}>SD: {stats.sd.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  graphTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 10,
    marginLeft: 20,
  },
  chart: {
    marginVertical: 8,
    marginHorizontal: -40,
    borderRadius: 16
  },
  statsContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.lightNavalBlue,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginVertical: 5,
    fontSize: 14,
  },
});

export default AudioVisualizer;