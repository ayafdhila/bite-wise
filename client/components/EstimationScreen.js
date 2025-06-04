// screens/EstimationScreen.js

import React, { useState, useEffect, useContext, useCallback } from 'react'; // Added useCallback
import {
    View, Text, StyleSheet, ActivityIndicator, Image,
    ScrollView, TouchableOpacity, Alert, Platform // Keep Platform if needed elsewhere
} from 'react-native';
import styles from './Styles'; // Your styles
// Removed Firestore imports as backend handles updates now
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../components/AuthContext'; // Context import
// *** Removed Reanimated Imports ***
import axios from 'axios'; // Keep axios if using
// import LottieView from 'lottie-react-native'; // Keep if using

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Fallback

if (!API_BASE_URL) {
    console.warn("WARN: API_BASE_URL not defined in EstimationScreen.js.");
}

// --- Helper to Format Timestamps (Example - Keep if used) ---
const formatTimestamp = (timestamp) => {
    // ... (implementation from previous example or your own) ...
    if (!timestamp || !timestamp.seconds) return 'Date unknown';
    try {
        const date = new Date(timestamp.seconds * 1000);
        const options = { day: 'numeric', month: 'long' };
        return `Received ${date.toLocaleDateString(undefined, options)}`;
    } catch (e) { return "Invalid date"; }
};

export default function EstimationScreen() {
    const { user, getIdToken, refreshUserProfile } = useContext(AuthContext); 
  
    const navigation = useNavigation();
const route = useRoute();
const {
  uid,
  age,
  gender,
  weight,
  height,
  activityLevel,
  goal,
  dietaryPreferences
} = route.params || {};
   
    // --- State ---
    const [displayUserData, setDisplayUserData] = useState(null); 
    const [nutritionPlan, setNutritionPlan] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false); 

    // --- Effect to fetch/calculate plan ---
    useEffect(() => {
        // Set display data immediately from passed params
        setDisplayUserData({
             firstName: collectedOnboardingData?.firstName || user?.email || 'User',
             goal: collectedOnboardingData?.goal || 'N/A',
             activityLevel: collectedOnboardingData?.activityLevel || 'N/A'
        });

        const fetchAndCalculatePlan = async () => {
            if (!uid) { setLoadingPlan(false); return; }
            setLoadingPlan(true);
            try {
                console.log("EstimationScreen: Fetching/Calculating Plan...");
                // Assuming PUT request to /nutritionPlan/:uid calculates/saves plan
                const planResponse = await axios.put(`${API_BASE_URL}/nutritionPlan/${uid}`, collectedOnboardingData);
                if (!planResponse.data?.success || !planResponse.data?.nutritionPlan) {
                    throw new Error(planResponse.data?.message || "Failed to calculate nutrition plan");
                }
                setNutritionPlan(planResponse.data.nutritionPlan);
            } catch (error) {
                console.error("Error fetching/calculating plan:", error);
                Alert.alert("Error", "Failed to load your nutrition plan.");
                setNutritionPlan(null);
            } finally {
                setLoadingPlan(false);
            }
        };
        fetchAndCalculatePlan();
    }, [uid, route.params]); // Dependencies

    // --- Function for the final "Get Started" button ---
    const handleCompleteOnboardingAndNavigate = useCallback(async () => {
        if (!uid) { Alert.alert("Error", "User session error."); return; }
        if (isCompleting) return;
        setIsCompleting(true);

        const finalEndpoint = `${API_BASE_URL}/user/${uid}/complete-onboarding`;
        console.log("EstimationScreen: Finalizing - Calling PATCH", finalEndpoint);
        // Ensure all data needed by backend is included
        const dataToSend = { ...collectedOnboardingData, uid, userType: user?.userType };
        console.log("EstimationScreen: Sending Data:", JSON.stringify(dataToSend));

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication error.");

            const response = await fetch(finalEndpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(dataToSend),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to complete onboarding.");

            console.log("EstimationScreen: Backend update successful:", data.message);
            console.log("EstimationScreen: Refreshing user profile in AuthContext...");
            await refreshUserProfile(uid); // Trigger context refresh
            console.log("EstimationScreen: Onboarding complete. RootNavigator will switch.");

        } catch (error) {
            console.error("Final Onboarding Step Error:", error);
            Alert.alert("Error", `Failed to complete setup: ${error.message}`);
            setIsCompleting(false); // Allow retry only on error
        }
        // No need to set isCompleting false on success
    }, [uid, user, collectedOnboardingData, getIdToken, refreshUserProfile, isCompleting]);


    // --- Render Logic ---
    if (loadingPlan) { // Show loading only while plan is calculating
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={styles.darkGreen || '#2E4A32'} />
                <Text style={{ marginTop: 15, color: styles.darkGrey || '#555' }}>Calculating Your Plan...</Text>
            </View>
        );
    }

    return (
        // Use your main container style
        <ScrollView
          contentContainerStyle={styles.containerEstim} // Use specific style for this screen's content
          showsVerticalScrollIndicator={false}
        >
          {/* Keep Back button and decorative images */}
          <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
            <Ionicons name="arrow-back" size={38}/>
          </TouchableOpacity>
          <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf}/>
          <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf}/>

          {/* Replace Animated.View with regular View */}
          <View>
            <Text style={styles.cardTitleEstim}>Your Daily Goal</Text>
          </View>

          <View style={styles.userCardEstim}>
            <Text style={styles.userNameEstim}>{displayUserData?.firstName || 'Your'}'s Plan</Text>
            <View style={styles.userStats}>
              <Text style={styles.statText}>Activity: {displayUserData?.activityLevel || 'N/A'}</Text>
            </View>
          </View>

   
          {nutritionPlan ? (
            <View style={styles.targetsCard}>
              <Text style={styles.cardHeaderEstim}>Daily Targets</Text>
              {/* Calories Row */}
              <View style={styles.targetRow}>
                 <View style={styles.metricLabel}><Ionicons name="flame" size={20} color="#FF6B6B" style={styles.metricIcon} /><Text style={styles.labelText}>Calories</Text></View>
                 <Text style={styles.targetValue}>{nutritionPlan?.calories || 0} kcal</Text>
              </View>
              {/* Protein Row */}
               <View style={styles.targetRow}>
                  <View style={styles.metricLabel}><Ionicons name="barbell" size={18} color="#4A90E2" style={styles.metricIcon} /><Text style={styles.labelText}>Protein</Text></View>
                  <Text style={styles.targetValue}>{nutritionPlan?.protein || 0}g</Text>
              </View>
              {/* Carbs Row */}
              <View style={styles.targetRow}>
                  <View style={styles.metricLabel}><Ionicons name="nutrition" size={18} color="#F5A623" style={styles.metricIcon} /><Text style={styles.labelText}>Carbs</Text></View>
                  <Text style={styles.targetValue}>{nutritionPlan?.carbs || 0}g</Text>
               </View>
               {/* Fat Row */}
               <View style={styles.targetRow}>
                   <View style={styles.metricLabel}><Ionicons name="water" size={18} color="#7ED321" style={styles.metricIcon} /><Text style={styles.labelText}>Fat</Text></View>
                   <Text style={styles.targetValue}>{nutritionPlan?.fat || 0}g</Text>
               </View>
               {/* Fiber Row */}
               <View style={[styles.targetRow, styles.fiberRow]}>
                    <View style={styles.metricLabel}><Ionicons name="leaf" size={18} color="#50E3C2" style={styles.metricIcon} /><Text style={styles.labelText}>Fiber</Text></View>
                    <View style={styles.fiberGoalEs}>
                        <Text style={styles.targetValue}>{nutritionPlan?.fiber?.recommended || 0}g</Text>
                        <Text style={styles.goalRange}>(goal: {nutritionPlan?.fiber?.min || 0}-{nutritionPlan?.fiber?.max || 0}g)</Text>
                    </View>
                </View>
            </View>
          ) : (
             <View style={[styles.targetsCard, {padding: 20, alignItems: 'center'}]}>
                  <Text style={styles.errorText || {color: PALETTE.errorRed, textAlign: 'center'}}>Could not load nutrition plan details. Please go back and try again.</Text>
             </View>
          )}

          {/* Final Button */}
          <View>
            <TouchableOpacity
              style={[styles.button, isCompleting && styles.buttonDisabled]} // Use your button styles
              onPress={handleCompleteOnboardingAndNavigate}
              disabled={isCompleting || !nutritionPlan} // Disable if completing or plan failed
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color={styles.textButton?.color || "#FFFFFF"} />
              ) : (
                 <Text style={styles.textButton}>Get Started</Text> // Use your button text style
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
    );
};

// export default EstimationScreen; // Already default exported above

// --- Styles ---
// Ensure styles.js defines all styles used: containerEstim, backButton, topLeaf, bottomLeaf,
// cardTitleEstim, userCardEstim, userNameEstim, userStats, statText, targetsCard, cardHeaderEstim,
// targetRow, metricLabel, metricIcon, labelText, targetValue, fiberRow, fiberGoalEs, goalRange,
// button, textButton, buttonDisabled (optional)
// Add style for errorText if needed