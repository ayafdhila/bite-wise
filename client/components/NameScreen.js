// screens/NameScreen.js
import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    View, Text, Image, Alert, TouchableOpacity, TextInput,
    StyleSheet, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    ScrollView 
} from 'react-native';
import styles from './Styles';
import { Button } from 'react-native-paper'; 
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../components/AuthContext'; 


export default function NameScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const lastNameInputRef = useRef(null); 

    const { user, getIdToken } = useContext(AuthContext);
    const uid = user?.uid;
    const userType = user?.userType; 

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLoading, setIsLoading] = useState(false); 

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 



useEffect(() => {
  if (!firstName.trim() || !lastName.trim() || !uid) return;

  const sendProfileUpdate = async () => {
    setIsLoading(true);
    try {

      const idToken = await getIdToken(true);
      if (!idToken) throw new Error("Session expirée");

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',

          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      if (!response.ok) {
        let errMsg;
        try {
          const errJson = await response.json();
          errMsg = errJson.error || errJson.message;
        } catch {
          errMsg = await response.text();
        }
        throw new Error(errMsg || `Erreur ${response.status}`);
      }
      const data = await response.json();


    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  sendProfileUpdate();
}, [firstName, lastName, uid]);

    const handleNext = () => {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        if (!trimmedFirstName || !trimmedLastName) { Alert.alert('Input Required', 'Please enter both names.'); return; }
        if (!uid || !userType) { Alert.alert("Error", "User info missing."); return; }

        const onboardingData = {
            ...(route.params || {}), 
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            uid: uid,
            userType: userType,
        };
         delete onboardingData.firstName;
         delete onboardingData.lastName;
         onboardingData.firstName = trimmedFirstName;
         onboardingData.lastName = trimmedLastName;


        if (userType === "Professional") navigation.navigate("NutritionForm", onboardingData);
        else if (userType === "Personal") navigation.navigate("GoalScreen", onboardingData);
        else Alert.alert("Error", "Unknown user type.");
    };

    return (

        <KeyboardAvoidingView style={localstyles.keyboardAvoiding} >
            <ScrollView
                style={localstyles.scrollView}
                contentContainerStyle={localstyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >

                <View style={styles.container}>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={30} color={styles.backButton?.color || '#000'} />
                    </TouchableOpacity>
        
                    <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
                    <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />

    
                    <Text style={localstyles.screenTitle}>Welcome to {'\n'}BiteWise</Text>
*
                    <View style={styles.orangeContainer}>
                        <Image style={styles.orange} source={require('../assets/Images/orangeExtraction.png')} />
                    </View>

                    <Text style={styles.secondaryText}>What is your first name?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='First Name'
                        value={firstName}
                        onChangeText={setFirstName}
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameInputRef.current?.focus()}
                        blurOnSubmit={false} 
                        autoCapitalize="words"
                        editable={!isLoading}
                    />
                    <Text style={styles.secondaryText}>What is your last name?</Text>
                    <TextInput
                        ref={lastNameInputRef}
                        style={styles.input}
                        placeholder='Last Name'
                        value={lastName}
                        onChangeText={setLastName}
                        returnKeyType="done"
                        autoCapitalize="words"
                   
                    />

                    <View style={localstyles.actionButtonContainer}>
                        <TouchableOpacity
                            // Use local button style + original disabled style
                            style={[localstyles.primaryActionButton, (!firstName.trim() || !lastName.trim() || isLoading) && styles.buttonDisabled]}
                            onPress={handleNext}
                            disabled={!firstName.trim() || !lastName.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={localstyles.primaryActionButtonText}>Next</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- V V V --- LOCAL STYLES --- V V V ---
// Define consistent styles locally. You can move these to Styles.js if preferred,
// ensuring the names don't clash or updating references here.
const localstyles = StyleSheet.create({
    keyboardAvoiding: {
        flex: 1,
        backgroundColor: '#F5E4C3', // Match main background from styles.container
    },
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
       
    },
    screenTitle: { // Consistent Title Style
        fontSize: 40, // Adjust size as needed
        fontFamily: 'Quicksand_700Bold',
        color: 'black', // Dark Green
        textAlign: 'center',
        marginBottom: 20, // Space below title
        marginTop: 20, // Removed top margin, rely on container padding
    },
    
    actionButtonContainer: { // Consistent Button Container Style
        width: '100%',
        alignItems: 'center', // Center button horizontally
        marginTop: 30, // Space above and below button
        marginBottom: 10, // Space below button
    },
    primaryActionButton: { // Consistent Primary Button Style
        width: '90%', // Responsive width
        maxWidth: 350, // Max width on larger screens
        height: 55, // Standard height
        borderRadius: 25, // More rounded
        backgroundColor: '#2E4A32', // Dark Green
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    primaryActionButtonText: { // Consistent Button Text Style
        color: '#FFFFFF', // White text
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18, // Standard button text size
    },
    // Adjust password placeholder if needed
    });