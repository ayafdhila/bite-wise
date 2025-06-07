// screens/ActivityLevel.js
import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    View, Text, Image, ScrollView,
    TouchableOpacity, Alert, StyleSheet,
    ActivityIndicator,
    Keyboard
} from 'react-native';
import stylesFromSheet from './Styles'; // Your main styles import
import { Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../components/AuthContext'; // Adjust path
// import axios from 'axios'; // Keep if you switch back, otherwise fetch is used below

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

if (!API_BASE_URL) {
    console.warn("WARN: API_BASE_URL not defined in ActivityLevel.js.");
}

// Use imported styles primarily
const styles = stylesFromSheet;

export default function ActivityLevel() {
    const navigation = useNavigation();
    const route = useRoute();

    // --- V V V --- Assign route.params to previousParams --- V V V ---
    const previousParams = route.params || {}; // All data accumulated so far
    const {
        uid: passedUid, // UID passed from previous onboarding steps
        firstName, lastName, userType, goal,
        age: prevAge, gender: prevGender,
        weight: prevWeight, height: prevHeight,
        targetWeight: prevTargetWeight, // Assuming targetWeight is also passed along
        dietaryPreferences: prevDietaryPreferences,
        // activityLevel will be set by this screen
    } = previousParams;
    // --- ^ ^ ^ --- End Assignment --- ^ ^ ^ ---

    const { user: contextUser, getIdToken } = useContext(AuthContext);
    // Prioritize UID from params (onboarding flow), fallback to context (should be same)
    const currentUid = passedUid || contextUser?.uid;

    // --- Initialize 'selected' state using activityLevel from params if it exists ---
    const [selected, setSelected] = useState(previousParams.activityLevel || null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activityOptions = [
        "Mostly Sitting 🪑",
        "Lightly Active 🚶",
        "Active Lifestyle 🚴",
        "Highly Active 💪"
    ];

     useEffect(() => {
         console.log("--- ActivityLevel Mounted ---");
         console.log("ActivityLevel Received ALL Params (previousParams):", previousParams); // Log all received
         console.log("ActivityLevel Using currentUid:", currentUid);
         if (!currentUid) { Alert.alert("Error", "User ID not found for ActivityLevel."); }
         // If an activityLevel was passed (e.g., navigating back), and 'selected' isn't set yet, set it.
         if (previousParams.activityLevel && !selected) {
             console.log("ActivityLevel: Setting selected state from previousParams.activityLevel:", previousParams.activityLevel);
             setSelected(previousParams.activityLevel);
         }
     }, [previousParams, currentUid, selected]); // Dependencies


    const handleOptions = (option) => {
        setSelected(option);
    };

    const handleSelect = async () => {
        if (!currentUid) { Alert.alert("Error", "User session error."); return; }
        if (!selected) { Alert.alert("Selection Needed", "Please select your activity level."); return; }
        if (!API_BASE_URL) { Alert.alert("Config Error", "Cannot connect to server."); return; }
        if (isSubmitting) return;

        Keyboard.dismiss();
        setIsSubmitting(true);

        const API_ENDPOINT = `${API_BASE_URL}/user/activity-level`;
        const requestBody = {
            uid: currentUid,
            activityLevel: selected,
        };
        console.log("ActivityLevel: Sending activity level update:", requestBody);
        console.log(`ActivityLevel: Calling ${API_ENDPOINT} with method PATCH`);

        try {
            const idToken = await getIdToken(true);
            if (!idToken) { throw new Error("Authentication session expired or invalid."); }

            // Using fetch for consistency with other onboarding screens
            const response = await fetch(API_ENDPOINT, {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(requestBody),
            });

            const contentType = response.headers.get("content-type");
            let data;
            if (contentType?.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error("ActivityLevel: Non-JSON response from backend:", text);
                throw new Error(`Server returned an unexpected response. Status: ${response.status}`);
            }
            console.log("ActivityLevel: Backend update response:", data);

            if (!response.ok) {
                throw new Error(data.error || data.message || `Failed to update activity level (${response.status})`);
            }

            // --- Construct params for EstimationScreen ---
            // Pass ALL accumulated data from previousParams, and add/overwrite with current screen's data
           const nextScreenParams = {
    ...previousParams,        // previousParams already contains the correct uid, userType, etc.
    activityLevel: selected,  // Add/overwrite with this screen's data
};
// No need for `uid: currentUid,` if previousParams.uid is correctly propagated.
// currentUid is still used for the API call on this screen, which is fine.
navigation.navigate("EstimationScreen", nextScreenParams);
        } catch (error) {
            console.error("Update Activity Level Error:", error);
            Alert.alert("Update Error", error.message || "Failed to update activity level. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        // Ensure styles.container exists and provides primary background and padding
        <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={30} color={styles.backButton?.color || localstyles.backButtonDefaultColor.color} />
            </TouchableOpacity>
            <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
            <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />

            {/* ScrollView added to ensure content visibility on all screen sizes */}
            <ScrollView contentContainerStyle={localstyles.scrollContentContainer} keyboardShouldPersistTaps="handled">
                <Text style={localstyles.screenTitle}>How active are you in your daily life?</Text>

                <View style={styles.optionsContainer}>
                    {activityOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[ styles.optionButton, selected === option && styles.selected ]}
                            onPress={() => handleOptions(option)}
                            activeOpacity={0.7}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.optionText, selected === option && styles.selectedOptionText]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[localstyles.actionButtonContainer]}>
                    <Button /* Using React Native Paper Button from your import */
                        mode='contained'
                        style={[localstyles.primaryActionButton, !selected && styles.buttonDisabled, isSubmitting && styles.buttonDisabled]}
                        labelStyle={localstyles.primaryActionButtonText}
                        onPress={handleSelect}
                        disabled={!selected || isSubmitting}
                        loading={isSubmitting}
                        // Ensure icon color matches text for loading
                        icon={isSubmitting ? () => <ActivityIndicator color={localstyles.primaryActionButtonText.color} size="small" /> : null}
                    >
                        {!isSubmitting && "Next"}
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

// --- Local Styles for this screen (complementing ./Styles.js) ---
const localstyles = StyleSheet.create({
    scrollContentContainer: { // For ScrollView
        flexGrow: 1, // Allows content to take space but still scroll if needed
        justifyContent: 'center', // Center content vertically
        paddingHorizontal: 20, // Add horizontal padding if styles.container doesn't have it
        paddingBottom: 40, // Space at the bottom
    },
    screenTitle: {
        fontSize: 35, // Your preferred size
        fontFamily: 'Quicksand_700Bold', // Your preferred font
        color: styles.screenTitle?.color || 'black', // Use color from main styles or default
        textAlign: 'center',
        marginBottom: 30,
        // marginTop: 20, // Removed, handled by ScrollView padding
    },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40, // Increased space before button
        // marginBottom: 50, // Removed, handled by ScrollView padding
    },
    primaryActionButton: { // Ensure this aligns with your Button component's styling needs
        width: '90%',
        maxWidth: 350,
        height: 55,
        borderRadius: 25,
        backgroundColor: styles.primaryActionButton?.backgroundColor ||'#2E4A32', // Use from main or default
        justifyContent: 'center', // Center content (text/loader) in button
        // elevation & shadow from your main button style if applicable
    },
    primaryActionButtonText: {
        color: styles.primaryActionButtonText?.color ||'#FFFFFF', // Use from main or default
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18,
    },
    backButtonDefaultColor: { // Fallback for back button icon color
        color: '#000000'
    }
    // Ensure styles.container, styles.backButton, styles.topLeaf, styles.bottomLeaf,
    // styles.optionsContainer, styles.optionButton, styles.selected, styles.optionText,
    // styles.selectedOptionText, styles.buttonDisabled are defined in your ./Styles.js
});