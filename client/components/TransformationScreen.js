import React from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {Button} from 'react-native-paper';
import styles from './Styles';
import {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import { auth } from '../firebaseConfig'; 

const BottomPopup = ({visible}) =>{
  return (
    
     <Modal animationType ='slide' transparent={true} visible={visible} >
      <View style={styles.popupContainer}>
        <TouchableOpacity style={styles.popup}>
           <Image source={require('../assets/Images/Pear.png')} style= {styles.smallPear}/>
           <Text style={styles.mainText}>Your plan has been {'\n'}updated !</Text>
           <Text style= {styles.popupSubText}>We're setting everything up for you</Text>
        </TouchableOpacity>
      </View>
     </Modal> 
  )

}
export default function TransformationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const allPassedParams = route.params || {};
  console.log("TransformationScreen received params:", JSON.stringify(allPassedParams, null, 2)); // ADD THIS LINE
  const uid = allPassedParams.uid;
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([]);

  const handleOptions = (option) => {
    setSelectedOptions((prevSelected) =>
      prevSelected.includes(option)
        ? prevSelected.filter((item) => item !== option) // Deselect
        : [...prevSelected, option] // Select
    );
  };

  const handleSelect = async () => {
    if (selectedOptions.length === 0) {
      Alert.alert("Please select at least one option");
      return;
    }

  setVisible(true);

 
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
  const API_URL = `${API_BASE_URL}/user/transformation`; 

  const requestBody = {
    uid,
    transformationGoals: selectedOptions, // Send all selected goals
  };

  try {
    const idToken = await auth.currentUser.getIdToken(true);
    const response = await fetch(API_URL, {
      method: "patch",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Transformation Goals Updated:", data);

      // Wait for 2 seconds, then navigate
      setTimeout(() => {
        setVisible(false);
        const nextScreenParams = {
            ...allPassedParams, 
            transformationGoals: selectedOptions 
          };
          navigation.navigate("DietaryPreferences", nextScreenParams);
        }, 2000);
    } else {
      setVisible(false);
      Alert.alert("Error", data.error || "Failed to update transformation goals");
    }
  } catch (error) {
    setVisible(false);
    console.error("Error:", error);
    Alert.alert("Error", "Something went wrong. Please try again.");
  }
};


    
  return (
    <View style = {styles.container}>
    
         <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
           <Ionicons name="arrow-back" size={30}/>
         </TouchableOpacity>
 
       <Image source={require('../assets/Images/leaf.png')} style= {styles.topLeaf}/>
       <Image source={require('../assets/Images/leaf.png')} style= {styles.bottomLeaf}/>
      <Text style={ localstyles.screenTitle}>What's driving your transformation?</Text>
      <View style={styles.optionsTransformationContainer}> {['I want to feel more confident in my body', 'I want to improve my energy and overall health', 'I want to build strength and endurance', 'I want to develop better eating habits','I have a specific goal (event, sport, lifestyle change)'].map((option) => (
         <TouchableOpacity
         key={option}
         style={[
           styles.optionButton,
           selectedOptions.includes(option) && styles.selected,
         ]}
         onPress={() => handleOptions(option)}
       >
         <Text style={styles.optionTransformationText}>{option}</Text>
       </TouchableOpacity>
      ))}</View>
      <View style={localstyles.actionButtonContainer}>
            <Button mode= 'contained' style={localstyles.primaryActionButton} labelStyle={localstyles.primaryActionButtonText} onPress={() => {
              handleSelect(); 
             } }>Next</Button>
      </View>
      <BottomPopup visible={visible} onClose={() => setVisible(false)} />
    </View>
  );
}
const localstyles = StyleSheet.create({
    screenSubtitle: {
        fontSize: 20,
        fontFamily: 'Quicksand_600SemiBold',
        color: '#555555',
        textAlign: 'center',
        marginVertical: 20,
    },
    screenTitle: { // Consistent Title Style
      fontSize: 30, // Adjust size as needed
      fontFamily: 'Quicksand_700Bold',
      color: 'black', // Dark Green
      textAlign: 'center',
      marginBottom: 20, // Space below title
      marginTop: 50, // Removed top margin, rely on container padding
  },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 75,
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
   
});
