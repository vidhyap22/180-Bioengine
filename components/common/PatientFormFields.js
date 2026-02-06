import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Keyboard} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { debounce } from 'lodash';


const suggestions = {
  languages: ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'Bengali', 'Russian', 'Japanese', 'German', 'Italian', 'Korean', 'Turkish', 'Vietnamese', 'Polish', 'Ukrainian', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Swahili', 'Persian (Farsi)', 'Thai', 'Indonesian', 'Malay', 'Tagalog', 'Romanian', 'Hungarian', 'Czech', 'Slovak', 'Croatian', 'Serbian', 'Bulgarian', 'Catalan', 'Basque', 'Galician', 'Welsh', 'Irish', 'Scottish Gaelic', 'Latin'],
  ethnicities: ['Hispanic or Latino', 'Not Hispanic or Latino', 'Prefer not to say'],
  races: ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Prefer not to say'],
  countries: ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Australia', 'China', 'India', 'Japan', 'Brazil', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'South Korea', 'Saudi Arabia', 'Indonesia', 'Turkey', 'Iran', 'Egypt', 'Nigeria', 'South Africa', 'Argentina', 'Colombia', 'Poland', 'Ukraine', 'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Austria', 'Ireland', 'Portugal', 'Greece', 'Hungary', 'Czech Republic', 'Romania', 'Israel', 'Singapore', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Pakistan', 'Bangladesh', 'Ethiopia', 'Kenya', 'Ghana', 'Morocco', 'Algeria', 'Iraq', 'Afghanistan', 'Venezuela', 'Peru', 'Chile', 'Ecuador', 'Cuba', 'Dominican Republic', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Uruguay', 'Paraguay', 'Bolivia', 'Azerbaijan', 'Belarus', 'Georgia', 'Kazakhstan', 'Kyrgyzstan', 'Lithuania', 'Latvia', 'Estonia', 'Moldova', 'Tajikistan', 'Turkmenistan', 'Uzbekistan', 'Albania', 'Armenia', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Iceland', 'Luxembourg', 'Macedonia', 'Malta', 'Monaco', 'Montenegro', 'Serbia', 'Slovakia', 'Slovenia', 'Vatican City']
};

const AutocompleteInput = ({ placeholder, value, onChangeText, data, style }) => {
  const [filteredData, setFilteredData] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleChangeText = (text) => {
    onChangeText(text);
    debouncedFilterData(text);
  };

  const filterData = (text) => {
    if (text.length > 0) {
      const filtered = data
        .filter((item) => item.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 5); // Limit to 5 suggestions
      setFilteredData(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredData([]);
      setShowSuggestions(false);
    }
  };

  const debouncedFilterData = useRef(debounce(filterData, 300)).current; 

  const handleSelectItem = (item) => {
    onChangeText(item);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    if (value.length > 0 && filteredData.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow onPress events to register
    setTimeout(() => setShowSuggestions(false), 100);
  };

  return (
    <View style={styles.autocompleteContainer}>
      <TextInput
        ref={inputRef}
        style={[styles.input, style]}
        placeholder={placeholder}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {filteredData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSelectItem(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const PatientFormFields = ({ 
  name, 
  setName, 
  gender, 
  setGender, 
  birthDate, 
  onDateChange, 
  mrn, 
  mrnEditable = true, 
  setMrn,
  // New fields
  firstLanguage = '',
  setFirstLanguage = () => {},
  secondLanguage = '',
  setSecondLanguage = () => {},
  ethnicity = '',
  setEthnicity = () => {},
  race = '',
  setRace = () => {},
  country = '',
  setCountry = () => {},
}) => {

  return (
    <View>
      {/* Basic Information */}
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <Text style={styles.label}>Patient Name*</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />
      
      <Text style={styles.label}>Medical Record Number*</Text>
      <TextInput
        style={styles.input}
        placeholder="MRN"
        value={mrn}
        onChangeText={setMrn}
        keyboardType="numeric"
        editable={mrnEditable}
      />
      
      <Text style={styles.label}>Gender*</Text>
      <View style={styles.genderContainer}>
        {['M', 'F'].map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderOption,
              gender === option && styles.selectedGender
            ]}
            onPress={() => setGender(option)}
          >
            <Text style={[
              styles.genderText,
              gender === option && styles.selectedGenderText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.label}>Date of Birth*</Text>
      <View style={styles.dateContainer}>
        <TextInput
          style={[styles.dateInput, { flex: 2 }]}
          placeholder="MM"
          value={birthDate.month}
          onChangeText={(text) => onDateChange(text, 'month')}
          maxLength={2}
          keyboardType="numeric"
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          style={[styles.dateInput, { flex: 2 }]}
          placeholder="DD"
          value={birthDate.day}
          onChangeText={(text) => onDateChange(text, 'day')}
          maxLength={2}
          keyboardType="numeric"
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          style={[styles.dateInput, { flex: 3 }]}
          placeholder="YYYY"
          value={birthDate.year}
          onChangeText={(text) => onDateChange(text, 'year')}
          maxLength={4}
          keyboardType="numeric"
        />
      </View>

      {/* Demographic Information */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Demographic Information</Text>
      
      <Text style={styles.label}>First Language</Text>
      <AutocompleteInput
        placeholder="Primary Language"
        value={firstLanguage}
        onChangeText={setFirstLanguage}
        data={suggestions.languages}
      />
      
      <Text style={styles.label}>Second Language</Text>
      <AutocompleteInput
        placeholder="Secondary Language (if any)"
        value={secondLanguage}
        onChangeText={setSecondLanguage}
        data={suggestions.languages}
      />
      
      <Text style={styles.label}>Ethnicity</Text>
      <AutocompleteInput
        placeholder="Ethnicity"
        value={ethnicity}
        onChangeText={setEthnicity}
        data={suggestions.ethnicities}
      />
      
      <Text style={styles.label}>Race</Text>
      <AutocompleteInput
        placeholder="Race"
        value={race}
        onChangeText={setRace}
        data={suggestions.races}
      />
      
      <Text style={styles.label}>Country of Origin</Text>
      <AutocompleteInput
        placeholder="Country"
        value={country}
        onChangeText={setCountry}
        data={suggestions.countries}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
    marginTop: 10,
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
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedGender: {
    backgroundColor: Colors.lightNavalBlue,
    borderColor: Colors.lightNavalBlue,
  },
  genderText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedGenderText: {
    color: 'white',
  },
  dateContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  dateSeparator: {
    marginHorizontal: 8,
    fontSize: 20,
    color: '#666',
  },
  autocompleteContainer: {
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
  },
});

export default PatientFormFields;
