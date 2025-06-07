import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet} from 'react-native';
import styles from './Styles';
import { useState} from 'react';
import { Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig'; 
import { AuthContext } from './AuthContext';
import { useContext } from 'react';
export default function DietaryPreferences() {
  const { user } = useContext(AuthContext);
    const uid = user?.uid;
  const navigation = useNavigation();
  const route = useRoute();
const allPassedParams = route.params || {};
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [customDiet, setCustomDiet] = useState(''); 
  const [isOtherSelected, setIsOtherSelected] = useState(false); 

  const handleOptions = (option) => {
    if (option === "Other ✏️") {
      setIsOtherSelected((prev) => !prev); 
      if (!isOtherSelected) {
        setSelectedOptions([...selectedOptions, option]);
      } else {
        setSelectedOptions(selectedOptions.filter((item) => item !== "Other ✏️")); 
        setCustomDiet(""); 
      }
    } else {
      setSelectedOptions((prevSelected) =>
        prevSelected.includes(option)
          ? prevSelected.filter((item) => item !== option)
          : [...prevSelected, option]
      );
    }
  };
  const handleSelect = async () => {
    if (selectedOptions.length === 0 && !customDiet.trim()) {
      Alert.alert("Please select at least one option");
      return;
    }
  
    const finalSelection = isOtherSelected && customDiet.trim() !== ""
      ? [...selectedOptions.filter(item => item !== "Other ✏️"), customDiet.trim()]
      : selectedOptions;
  
      const API_ENDPOINT = `${API_BASE_URL}/user/dietary-preferences`;
  
      const requestBody = { uid, dietaryPreferences: finalSelection };
  
      try {
        const idToken = await auth.currentUser.getIdToken(true);
        const response = await fetch(API_ENDPOINT, { 
          method: "patch",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
          body: JSON.stringify(requestBody),
        });
  
      const data = await response.json();
      if (response.ok) {
        console.log("Dietary Preferences Updated:", data);
    const nextScreenParams = {
    ...allPassedParams, // Spread ALL parameters received by this screen
    dietaryPreferences: finalSelection // Add the data collected by this screen
};
navigation.navigate("ActivityLevel", nextScreenParams);

      } else {
        Alert.alert("Error", data.error || "Failed to update dietary preferences");
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };
  

  return (
    <View style= {[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
 
      <TouchableOpacity onPress={() => navigation.goBack() } style={[localstyles.backButton]}>
        <Ionicons name="arrow-back" size={30}/>
      </TouchableOpacity>
   
      <Image source={require('../assets/Images/leaf.png')} style= {styles.topLeaf}/>
      <Image source={require('../assets/Images/leaf.png')} style= {styles.bottomLeaf}/>
      
      <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', paddingVertical: 40, marginVertical: 55 }}>
      <Text style={localstyles.screenTitle}>Diet & Restrictions?  </Text>
  <View style={styles.optionsTransformationContainer}>
    {[
      "Vegan 🌱",
      "Vegetarian 🥕",
      "Pescatarian 🐟",
      "Gluten-Free 🌾",
      "Lactose Intolerant 🥛",
      "Low-Sodium Diet 🧂",
      "Seafood or Shellfish Allergy 🦐",
      "Diabetic-Friendly Diet 🍬",
      "No Restrictions ✅",
      "Other ✏️",
    ].map((option) => (
      <TouchableOpacity
        key={option}
        style={[
          styles.optionButton,
          selectedOptions.includes(option) && styles.selected,
        ]}
        onPress={() => handleOptions(option)}
      >
        <Text style={styles.optionText}>{option}</Text>
      </TouchableOpacity>
    ))}

 
    {isOtherSelected && (
      <TextInput
        style={[styles.optionButton, styles.optionText]}
        placeholder="Enter your dietary preference"
        value={customDiet}
        onChangeText={setCustomDiet}
      />
    )}

    <View style={localstyles.actionButtonContainer}>
      <Button
        mode="contained"
        style={localstyles.primaryActionButton}
        labelStyle={localstyles.primaryActionButtonText}
        onPress={handleSelect}
      >
        Next
      </Button>
    </View>
  </View>
</ScrollView>
    </View>
  );
}
const localstyles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F5E4C3',
    },
    scrollContentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    screenSubtitle: {
        fontSize: 20,
        fontFamily: 'Quicksand_600SemiBold',
        color: '#555555',
        textAlign: 'center',
        marginVertical: 20,
    },
    screenTitle: {
        fontSize: 35,
        fontFamily: 'Quicksand_700Bold',
        color: 'black',
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 50,
    },
    primaryActionButton: {
        width: '90%',
        maxWidth: 350,
        height: 55,
        borderRadius: 25,
        backgroundColor: '#2E4A32',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    primaryActionButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18,
    },
    backButton: {
        position: 'absolute',
        left: 10,
        top: 50,
        backgroundColor: 'transparent',
        padding: 10,
    },
});