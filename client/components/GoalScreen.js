// screens/GoalScreen.js
import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View, Text, Image, Alert, TouchableOpacity, StyleSheet,
    ActivityIndicator, Platform, ScrollView, Dimensions
} from 'react-native';
import styles from './Styles'; // Your main styles import (for container, options, etc.)
// Removed Paper Button import as we use TouchableOpacity for consistent style
// import { Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../components/AuthContext'; // Adjust path

// --- API Base URL ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export default function GoalScreen() {
    const { user, getIdToken } = useContext(AuthContext);
    const route = useRoute();
    const previousParams = route.params || {};
    const { uid, firstName } = previousParams; // Use firstName for the title

    const navigation = useNavigation();
    const [selected, setSelected] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Effect to log params (Keep as is)
    useEffect(() => {
         console.log("--- GoalScreen Mounted ---");
         console.log("GoalScreen Received Params:", previousParams);
         console.log("GoalScreen Using UID:", uid);
         if (!uid || !previousParams.userType || !previousParams.firstName || !previousParams.lastName) {
              console.error("GoalScreen Error: Missing data!");
              Alert.alert( "Error", "User info missing.", [{ text: "OK", onPress: () => navigation.goBack() }] );
         }
    }, [previousParams, uid, navigation]);

    // Handle option selection
    const handleOptions = (option) => { setSelected(option); };

    // --- Handle Next Button Press ---
    const handleSelect = async () => {
        if (!selected || !uid) { Alert.alert("Error", !selected ? "Select a goal." : "User info missing."); return; }
        if (isSubmitting) return;
        setIsSubmitting(true);
        const API_ENDPOINT = `${API_BASE_URL}/user/goal`;
        try {
            const idToken = await getIdToken(true); if (!idToken) throw new Error("Session expired.");
            const response = await fetch(API_ENDPOINT, {
                method: "PATCH", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ uid, goal: selected }),
            });
            const responseText = await response.text(); console.log(`Goal Update resp (${response.status}):`, responseText);
            if (!response.ok) { let e=responseText; try{const j=JSON.parse(e); e=j.error||j.message||e;}catch(p){} throw new Error(e || `Failed (${response.status})`); }
            console.log("GoalScreen: Navigating to SettingProfile...");
            navigation.navigate("SettingProfile", { ...previousParams, goal: selected }); 
        } catch (error) { console.error("Error updating goal:", error); Alert.alert("Error", error.message || "Failed."); }
        finally { setIsSubmitting(false); }
    };

    // Determine if form is valid for button state
    const isFormValid = () => selected !== null;

    // --- RENDER ---
    return (
        // Use ScrollView to handle different screen sizes gracefully
        <ScrollView
            style={localstyles.scrollView}
            contentContainerStyle={localstyles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* Use original styles.container for inner layout if needed */}
            <View style={styles.container}>

                {/* Back Button (Uses styles.backButton) */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={30} color={styles.backButton?.color || '#000'}/>
                </TouchableOpacity>

                {/* Decorative Images (Uses styles.topLeaf, styles.bottomLeaf, styles.banana) */}
                <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
                <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />


                {/* Title using consistent style */}
                {/* Allow numberOfLines and adjust size slightly if needed */}
                <Text style={localstyles.screenTitle} numberOfLines={2} adjustsFontSizeToFit={true}>
                    Hello, {firstName || 'User'}!
                </Text>

                {/* Subtitle using consistent style */}
                <Text style={localstyles.screenSubtitle}>What's your main goal?</Text>

                {/* Goal Options (Uses styles.optionsContainer, styles.optionButton, etc.) */}
                <View style={styles.optionsContainer}>
                    {['Losing Weight', 'Maintaining Weight', 'Gaining Weight'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            // Use your existing styles for buttons
                            style={[ styles.optionButton, selected === option && styles.selected ]}
                            onPress={() => handleOptions(option)}
                            disabled={isSubmitting}
                            activeOpacity={0.7}
                        >
                            <Text style={[ styles.optionText, selected === option && styles.selectedOptionText ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Button Container (Uses localstyles.actionButtonContainer) */}
                <View style={localstyles.actionButtonContainer}>
                    <TouchableOpacity
                         // Apply consistent button styles + original disabled style
                         style={[localstyles.primaryActionButton, (!isFormValid() || isSubmitting) && styles.buttonDisabled]}
                         onPress={handleSelect}
                         disabled={!isFormValid() || isSubmitting}
                     >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                             // Use consistent button text style
                             <Text style={localstyles.primaryActionButtonText}>Next</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

// --- Local Styles for Title, Subtitle, Button, and ScrollView ---
// Ensure Quicksand fonts are available/loaded
const localstyles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F5E4C3', // Match theme background
    },
    scrollContentContainer: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
       
    },
   
    screenSubtitle: { // New Subtitle Style
        fontSize: 25,
        fontFamily: 'Quicksand_600SemiBold', // Use SemiBold
        color: '#555555', // Use dark grey
        textAlign: 'center',
        marginBottom: 45, // More space before options
    },
    screenTitle: { // Consistent Title Style
        fontSize: 40, // Adjust size as needed
        fontFamily: 'Quicksand_700Bold',
        color: 'black', // Dark Green
        textAlign: 'center',
        marginBottom: 50, // Space below title
        
    },
    
    actionButtonContainer: { // Consistent Button Container Style
        width: '100%',
        alignItems: 'center', // Center button horizontally
        marginTop: 75, // Space above and below button
   
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
});