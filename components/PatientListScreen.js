import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import HeaderBar from './common/HeaderBar';
import PatientCard from './common/PatientCard';
import LoadingIndicator from './common/LoadingIndicator';

// HomeScreen -> PatientListScreen
const PatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  }, []);

  const fetchPatients = async () => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('patient')
        .select(`
          mrn,
          full_name,
          dob,
          created_at,
          gender,
          picture_url,
          notes,
          first_language,
          second_language,
          ethnicity,
          race,
          country,
          patient_data(
            created_at
          )
        `)
        .eq('assigned_clinician', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedPatients = data.map(patient => ({
        mrn: patient.mrn,
        name: patient.full_name,
        full_name: patient.full_name,  // Add this to ensure compatibility
        testsCount: patient.patient_data?.length || 0,
        lastTestDate: patient.patient_data?.[0]?.created_at || null,
        dob: patient.dob,
        gender: patient.gender,
        picture_url: patient.picture_url,
        notes: patient.notes,
        // Add the new demographic fields
        first_language: patient.first_language,
        second_language: patient.second_language,
        ethnicity: patient.ethnicity,
        race: patient.race,
        country: patient.country
      }));

      setPatients(processedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No tests yet';
    // Create date and adjust for timezone
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Update the search filter function
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredPatients(patients); // Show all patients when search is empty
      return;
    }

    const filtered = patients.filter(patient => {
      const searchTerms = text.toLowerCase().split(' ');
      const patientName = patient.name.toLowerCase();
      const patientMRN = patient.mrn.toString().toLowerCase();
      
      return searchTerms.every(term => 
        patientName.includes(term) || patientMRN.includes(term)
      );
    });

    setFilteredPatients(filtered);
  };

  // Add this useEffect to initialize filteredPatients with all patients
  useEffect(() => {
    setFilteredPatients(patients);
  }, [patients]);

  return (
    <View style={styles.container}>
      {/* Header with Welcome Message */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
          </TouchableOpacity>
          <Text style={styles.welcomeText}>My Patients</Text>
        </View>
        <Text style={styles.patientCount}>
          {patients.length} {patients.length === 1 ? 'patient' : 'patients'} assigned
        </Text>
      </View>

      {/* Enhanced Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { borderColor: 'white' }]}>
          <Ionicons 
            name="search" 
            size={20} 
            color="#666" 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or MRN"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => handleSearch('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.patientList}
        contentContainerStyle={styles.patientListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.lightNavalBlue]}
            tintColor={Colors.lightNavalBlue}
          />
        }
      >
        {loading ? (
          <LoadingIndicator text="Loading patients..." />
        ) : patients.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="people-outline" size={48} color="#666" />
            <Text style={styles.noPatients}>No patients assigned yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the button below to add your first patient
            </Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="search-outline" size={48} color="#666" />
            <Text style={styles.noResults}>No matching patients found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try searching with a different term
            </Text>
          </View>
        ) : (
          filteredPatients.map((patient) => (
            <TouchableOpacity 
              key={patient.mrn}
              onPress={() => navigation.navigate('PatientDetail', { patient })}
              style={styles.patientCardWrapper}
            >
              <PatientCard 
                patient={patient}
                formatDate={formatDate}
                minimal={true}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Patient FAB */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPatient')}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>New Patient</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    marginRight: 15,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  patientCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 39, // Same as backButton width + marginRight
  },
  searchWrapper: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'white',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  patientList: {
    flex: 1,
  },
  patientListContent: {
    padding: 15,
    paddingBottom: 100,
  },
  patientCardWrapper: {
    marginBottom: 10,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  noPatients: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noResults: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

// HomeScreen -> PatientListScreen
export default PatientListScreen;