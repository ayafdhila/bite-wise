// screens/EstimationScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, Image,
    ScrollView, TouchableOpacity, Alert, Platform // Keep Platform if needed elsewhere
} from 'react-native';
import styles from './Styles';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../components/AuthContext'; // Context import
// Import axios if you are using it for the plan calculation
// import axios from 'axios';

// --- API Base URL (ensure this is correct) ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Fallback

// Palette if not globally available or from stylesFromSheet
const PALETTE = {
    darkGreen: '#2E4A32',
    darkGrey:  '#555555',
    errorRed:  '#D32F2F',
    // ... add other palette colors if directly referenced and not in stylesFromSheet
};


export default function EstimationScreen() {
    const { user, getIdToken, refreshUserProfile } = useContext(AuthContext); // Use refreshUserProfile
    const navigation = useNavigation();
    const route = useRoute();
    const uid = user?.uid; // Get UID from context user
    // --- Get ALL onboarding data from route.params ---
    const collectedOnboardingData = route.params || {};
    const {
      
        firstName, // From NameScreen
        goal,      // From GoalScreen
        activityLevel, // From ActivityLevelScreen
        // Other fields needed for plan calculation (age, gender, weight, height) should also be in collectedOnboardingData
        age, gender, weight, height
    } = collectedOnboardingData;
    // --- End Get Data ---

    // --- State ---
    const [displayUserData, setDisplayUserData] = useState(null);
    const [nutritionPlan, setNutritionPlan] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(true); // Start true to fetch plan
    const [isCompleting, setIsCompleting] = useState(false); // For "Get Started" button

    // --- Effect to set display data and fetch/calculate plan ---
    useEffect(() => {
        console.log("EstimationScreen: Mounted. Received Data:", JSON.stringify(collectedOnboardingData, null, 2));

        // Set display data immediately from passed params
        setDisplayUserData({
             // Fallback to context user's email or generic 'User' if names not in params
             firstName: firstName || user?.email?.split('@')[0] || 'User',
             goal: goal || 'N/A',
             activityLevel: activityLevel || 'N/A'
        });

        const fetchAndCalculatePlan = async () => {
            if (!uid) {
                console.error("EstimationScreen: UID missing, cannot fetch/calculate plan.");
                Alert.alert("Error", "User information is missing.");
                setLoadingPlan(false); return;
            }
            // Check if all necessary data for calculation is present
            if (weight === undefined || height === undefined || age === undefined || !gender || !activityLevel || !goal) {
                console.error("EstimationScreen: Incomplete data for plan calculation:", {weight, height, age, gender, activityLevel, goal});
                Alert.alert("Error", "Incomplete profile data to calculate your nutrition plan. Please go back and complete all steps.");
                setLoadingPlan(false);
                setNutritionPlan(null); // Ensure plan is null if data is missing
                return;
            }

            setLoadingPlan(true); // Set loading before API call
            try {
                console.log("EstimationScreen: Fetching/Calculating Plan for UID:", uid);
                // The backend /nutritionPlan/:uid endpoint should use userData from Firestore based on UID
                // The body (collectedOnboardingData) here is to ensure backend *has* the latest
                // to calculate, especially if Firestore updates from previous onboarding steps were slow.
                const token = await getIdToken(); // Get token for the request
                if (!token) throw new Error("Authentication error for plan calculation.");

                const response = await fetch(`${API_BASE_URL}/nutritionPlan/${uid}`, { // Use fetch
                    method: 'PUT', // Assuming PUT calculates and saves
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(collectedOnboardingData) // Send all collected data
                });

                const contentType = response.headers.get("content-type");
                let data;
                if (contentType?.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    throw new Error(`Server error (plan calc): ${text.substring(0,100)}`);
                }

                if (!response.ok || !data.success || !data.nutritionPlan) {
                    throw new Error(data.message || "Failed to calculate or save nutrition plan");
                }
                console.log("EstimationScreen: Plan received:", data.nutritionPlan);
                setNutritionPlan(data.nutritionPlan);
            } catch (error) {
                console.error("Error fetching/calculating plan:", error);
                Alert.alert("Error", `Failed to load your nutrition plan: ${error.message}`);
                setNutritionPlan(null); // Clear plan on error
            } finally {
                setLoadingPlan(false);
            }
        };

        fetchAndCalculatePlan();
    // Stringifying collectedOnboardingData for dependency array is tricky if it contains functions.
    // Depend on specific fields that trigger recalculation.
    }, [uid, firstName, goal, activityLevel, age, gender, weight, height, getIdToken]);


    // --- Function for the final "Get Started" button ---
    const handleCompleteOnboardingAndNavigate = useCallback(async () => {
        if (!uid) { Alert.alert("Error", "User session error."); return; }
        if (isCompleting) return;
        setIsCompleting(true);

        const finalEndpoint = `${API_BASE_URL}/user/${uid}/complete-onboarding`;
        console.log("EstimationScreen: Finalizing - Calling PATCH", finalEndpoint);

        // Backend /complete-onboarding just needs to know to set the flag.
        // No need to resend all onboarding data unless backend specifically requires it.
        const dataToSend = { uid }; // Minimal data needed
        // If backend DOES need other data for this step:
        // const dataToSend = { ...collectedOnboardingData, uid, userType: user?.userType };

        console.log("EstimationScreen: Sending final complete onboarding:", JSON.stringify(dataToSend));

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication error.");

            const response = await fetch(finalEndpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(dataToSend), // Send minimal data
            });

            const contentType = response.headers.get("content-type");
            let data;
            if (contentType?.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Server error (complete onboarding): ${text.substring(0,100)}`);
            }

            if (!response.ok) throw new Error(data.error || "Failed to complete onboarding.");

            console.log("EstimationScreen: Backend complete onboarding successful:", data.message);
            console.log("EstimationScreen: Refreshing user profile in AuthContext...");
            // Await the refresh to ensure context updates before navigation relies on it
            await refreshUserProfile(); // Call the correct context function name
            console.log("EstimationScreen: Onboarding complete. RootNavigator will switch.");
            // Navigation will be handled by RootNavigator based on context user.onboardingComplete changing to true

        } catch (error) {
            console.error("Final Onboarding Step Error:", error);
            Alert.alert("Error", `Failed to complete setup: ${error.message}`);
            setIsCompleting(false); // Allow retry only on error
        }
        // No need to set isCompleting false on success, as app should navigate away
    }, [uid, user, getIdToken, refreshUserProfile, isCompleting]); // Removed collectedOnboardingData if only sending UID


    // --- Render Logic ---
    if (loadingPlan) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                <Text style={{ marginTop: 15, color: PALETTE.darkGrey, fontFamily: 'Quicksand_600SemiBold' }}>
                    Calculating Your Personal Plan...
                </Text>
            </View>
        );
    }

    return (
        // Using styles from your import (Styles.js)
        <ScrollView
          contentContainerStyle={styles.containerEstim} // Use style name from your example
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
            <Ionicons name="arrow-back" size={38} color={styles.backButton?.color || PALETTE.darkGreen}/>
          </TouchableOpacity>
          <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf}/>
          <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf}/>

          <View>
            <Text style={styles.cardTitleEstim}>Your Daily Goal</Text>
          </View>

          <View style={styles.userCardEstim}>
            <Text style={styles.userNameEstim}>{displayUserData?.firstName || 'Your'}'s Plan</Text>
            <View style={styles.userStats}>
              <Text style={styles.statText}>Activity: {displayUserData?.activityLevel || 'N/A'}</Text>
              <Text style={styles.statText}>Goal: {displayUserData?.goal || 'N/A'}</Text>
            </View>
          </View>

          {nutritionPlan ? (
            <View style={styles.targetsCard}>
              <Text style={styles.cardHeaderEstim}>Daily Targets</Text>
              {/* Calories Row */}
              <View style={styles.targetRow}>
                 <View style={styles.metricLabel}><Ionicons name="flame" size={20} color="#FF6B6B" style={styles.metricIcon} /><Text style={styles.labelText}>Calories</Text></View>
                 <Text style={styles.targetValue}>{Math.round(nutritionPlan?.calories) || 0} kcal</Text>
              </View>
              {/* Protein Row */}
               <View style={styles.targetRow}>
                  <View style={styles.metricLabel}><Ionicons name="barbell" size={18} color="#4A90E2" style={styles.metricIcon} /><Text style={styles.labelText}>Protein</Text></View>
                  <Text style={styles.targetValue}>{Math.round(nutritionPlan?.protein) || 0}g</Text>
              </View>
              {/* Carbs Row */}
              <View style={styles.targetRow}>
                  <View style={styles.metricLabel}><Ionicons name="nutrition" size={18} color="#F5A623" style={styles.metricIcon} /><Text style={styles.labelText}>Carbs</Text></View>
                  <Text style={styles.targetValue}>{Math.round(nutritionPlan?.carbs) || 0}g</Text>
               </View>
               {/* Fat Row */}
               <View style={styles.targetRow}>
                   <View style={styles.metricLabel}><Ionicons name="water" size={18} color="#7ED321" style={styles.metricIcon} /><Text style={styles.labelText}>Fat</Text></View>
                   <Text style={styles.targetValue}>{Math.round(nutritionPlan?.fat) || 0}g</Text>
               </View>
               {/* Fiber Row */}
               <View style={[styles.targetRow, styles.fiberRow]}>
                    <View style={styles.metricLabel}><Ionicons name="leaf" size={18} color="#50E3C2" style={styles.metricIcon} /><Text style={styles.labelText}>Fiber</Text></View>
                    <View style={styles.fiberGoalEs}>
                        <Text style={styles.targetValue}>{Math.round(nutritionPlan?.fiber?.recommended) || 0}g</Text>
                        <Text style={styles.goalRange}>(goal: {nutritionPlan?.fiber?.min || 0}-{nutritionPlan?.fiber?.max || 0}g)</Text>
                    </View>
                </View>
            </View>
          ) : (
             <View style={[styles.targetsCard, {padding: 20, alignItems: 'center'}]}>
                  <Text style={styles.errorText || {color: PALETTE.errorRed, textAlign: 'center'}}>Could not load nutrition plan. Please check your details and try again.</Text>
             </View>
          )}

          <View style={{ marginTop: 30, alignItems: 'center' }}> {/* Added margin for button */}
            <TouchableOpacity
              style={[styles.button, isCompleting && styles.buttonDisabled]}
              onPress={handleCompleteOnboardingAndNavigate}
              disabled={isCompleting || !nutritionPlan}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color={styles.textButton?.color || "#FFFFFF"} />
              ) : (
                 <Text style={styles.textButton}>Get Started</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
    );
};

// Assume styles from your main './Styles.js' define:
// containerEstim, backButton, topLeaf, bottomLeaf, cardTitleEstim,
// userCardEstim, userNameEstim, userStats, statText, targetsCard, cardHeaderEstim,
// targetRow, metricLabel, metricIcon, labelText, targetValue, fiberRow, fiberGoalEs, goalRange,
// button, textButton, buttonDisabled (optional), errorText (optional)