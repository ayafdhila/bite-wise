// screens/Profile.js
import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, Image, TouchableOpacity, Dimensions, ScrollView,
    FlatList, ActivityIndicator, Alert, StyleSheet, Platform,
    Modal // Corrected Modal import
} from 'react-native';
import Header from '../components/Header'; // Adjust path if needed
import TabNavigation from '../components/TabNavigation'; // Adjust path if needed
// Assuming stylesImport from './Styles' is where your MAIN styles live
// If not, the StyleSheet.create at the bottom should contain ALL styles used.
// For this full example, I will use the styles you provided at the end.
// import stylesImport from './Styles';
import { BarChart } from 'react-native-chart-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';
import axios from 'axios'; // Using axios as per your code
import Ionicons from 'react-native-vector-icons/Ionicons';
import { GamificationContext } from '../components/GamificationContext';
// --- BMI Calculation Logic ---
function calculateBmi(weightKg, heightM) {
    if (!weightKg || !heightM || heightM <= 0 || weightKg <= 0) { return { value: 'N/A', category: 'Enter Weight/Height' }; }
    const bmi = weightKg / (heightM * heightM);
    const bmiRounded = bmi.toFixed(1);
    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    return { value: bmiRounded, category: category };a
}
// ----------------------------

// --- Configuration ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const USER_API_PATH = '/user'; // Consistent base path
const screenWidth = Dimensions.get('window').width;

// --- Define Palette (from your FindSpecialist example) ---
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    textDark: '#333333',
    textLight: '#FFFFFF',
    periodTextInactive: '#A0A0A0',
    periodTextActive: '#2E4A32',
    periodUnderline: '#2E4A32',
    errorRed: '#D32F2F',
};

// --- Chart Configuration Object (from your Profile example) ---
const chartConfig = {
    backgroundColor: PALETTE.lightOrange, // Match card background
    backgroundGradientFrom: PALETTE.lightOrange,
    backgroundGradientTo: PALETTE.lightOrange,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 74, 50, ${opacity})`, // Dark green lines
    labelColor: (opacity = 1) => `rgba(46, 74, 50, ${opacity})`, // Dark green labels
    style: { borderRadius: 16, },
    propsForDots: { r: "0", strokeWidth: "0", fill: PALETTE.darkGreen }, // Hide dots or style them
    propsForBackgroundLines: { strokeDasharray: "", stroke: "rgba(46, 74, 50, 0.2)", strokeWidth: 0.5 },
    barPercentage: 0.7,
    propsForLabels: { fontSize: 11, fontFamily: "Quicksand_500Medium" },
    formatYLabel: (y) => `${Math.round(parseFloat(y))}`,
    formatTopBarValue: (value) => `${Math.round(parseFloat(value))}`,
    barRadius: 4,
};
// -------------------------------

// --- Profile Component ---
export default function Profile() {
    const { user, getIdToken } = useContext(AuthContext);
    const uid = user?.uid;
    const navigation = useNavigation();
     const { unlockAchievement, achievements } = useContext(GamificationContext);
    // --- State Variables ---
    const [showPlanPopup, setShowPlanPopup] = useState(false);
    const [popupPlanData, setPopupPlanData] = useState(null);
    const [currentWeight, setCurrentWeight] = useState(0);
    const [startWeight, setStartWeight] = useState(parseFloat(user?.startWeight) || 0);
    const [goalWeight, setGoalWeight] = useState(parseFloat(user?.targetWeight) || 0);
    const [height, setHeight] = useState(0); // Store height as meters
    const [rulerSelectedValue, setRulerSelectedValue] = useState('70.0');
    const [bmiValue, setBmiValue] = useState('N/A');
    const [bmiCategory, setBmiCategory] = useState('');
    const [selectedChartPeriod, setSelectedChartPeriod] = useState('Week');
    const [chartDisplayData, setChartDisplayData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [chartError, setChartError] = useState(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [isLoggingWeight, setIsLoggingWeight] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const rulerListRef = useRef(null);
    const [isRecalculatingPlan, setIsRecalculatingPlan] = useState(false);
     const [userGoalType, setUserGoalType] = useState(user?.goal || '');
    
    const USER_PROFILE_ENDPOINT = uid ? `${API_BASE_URL}/user/profile/${uid}` : null; // Keep if this works
    // --- V V V --- CORRECTED CALORIE HISTORY ENDPOINT --- V V V ---
    const CALORIE_HISTORY_ENDPOINT = `${API_BASE_URL}/profile/calorie-history`; // NO UID in path
    // --- ^ ^ ^ --- END CORRECTION --- ^ ^ ^ ---
    const LOG_WEIGHT_ENDPOINT = `${API_BASE_URL}/profile/log-weight`;
      const RECALCULATE_PLAN_ENDPOINT = uid ? `${API_BASE_URL}/nutritionPlan/${uid}` : null;
    // --- Ruler Configuration ---CALORIE_HISTORY_ENDPOINT
    const itemWidth = 10; const minWeight = 35; const maxWeight = 230; const weightStep = 0.5;
    const numbersRuler = useMemo(() =>
        Array.from({ length: Math.round((maxWeight - minWeight) / weightStep) + 1 }, (_, i) => (minWeight + i * weightStep).toFixed(1)),
        [minWeight, maxWeight, weightStep]
    );

    // --- Data Fetching Functions ---
    const fetchUserProfile = useCallback(async (showLoadingIndicator = true) => {
        if (!uid || !USER_PROFILE_ENDPOINT) { // Check if endpoint can be constructed
            setIsProfileLoading(false); setProfileError("Login required to fetch profile."); return;
        }
        if (showLoadingIndicator) setIsProfileLoading(true);
        setProfileError(null);
        console.log(`Profile Fetch: GET ${USER_PROFILE_ENDPOINT}`);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing.");
            const response = await axios.get(USER_PROFILE_ENDPOINT, { headers: { 'Authorization': `Bearer ${token}` } });
            const fetched = response.data.profile || response.data.user || response.data || {};
            console.log("Profile Data Received:", JSON.stringify(fetched, null, 2));

            const currentWt = parseFloat(fetched.weight) || 0;
            const heightCm = parseFloat(fetched.height) || 0;
            const heightM = heightCm > 0 ? heightCm / 100 : 0;

            setCurrentWeight(currentWt);
            setStartWeight(parseFloat(fetched.startWeight) || parseFloat(fetched.weight) || 0);
            setGoalWeight(parseFloat(fetched.targetWeight) || 0);
            setUserGoalType(fetched.goal || '');
            setHeight(heightM);
            setRulerSelectedValue(currentWt > 0 ? currentWt.toFixed(1) : '70.0');

        } catch (err) {
            console.error("Profile Fetch Error:", err.response?.data || err.message || err);
            setProfileError(err.response?.data?.error || "Failed to load profile details.");
            setCurrentWeight(0); setStartWeight(0); setGoalWeight(0); setHeight(0); setRulerSelectedValue('70.0');
        } finally {
            if (showLoadingIndicator) setIsProfileLoading(false);
        }
    }, [uid, getIdToken, USER_PROFILE_ENDPOINT]); // USER_PROFILE_ENDPOINT dependency reacts to UID change

    const fetchCalorieHistory = useCallback(async (period) => {
        if (!uid || !CALORIE_HISTORY_ENDPOINT) {
            setChartError("Login required for chart."); setChartDisplayData({ labels: [], datasets: [{ data: [] }] }); return;
        }
        setIsChartLoading(true); setChartError(null);
        const url = `${CALORIE_HISTORY_ENDPOINT}?period=${period}`;
        console.log(`Chart Fetch: GET ${url}`);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing.");
            const response = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const historyData = response.data;
            if (historyData && Array.isArray(historyData.labels) && Array.isArray(historyData.datasets?.[0]?.data)) {
                const validatedData = historyData.datasets[0].data.map(d => (typeof d === 'number' && isFinite(d)) ? d : 0);
                setChartDisplayData({ labels: historyData.labels, datasets: [{ ...historyData.datasets[0], data: validatedData }] });
            } else {
                 console.warn("Invalid chart data format received:", historyData);
                 setChartDisplayData({ labels: [], datasets: [{ data: [] }] }); setChartError("Invalid chart data.");
            }
        } catch (err) {
            console.error(`Chart Fetch Error (${period}):`, err.response?.data || err.message || err);
            setChartError(err.response?.data?.error || `Failed to load ${period} chart data.`);
            setChartDisplayData({ labels: ['Error'], datasets: [{ data: [0] }] });
        } finally {
            setIsChartLoading(false);
        }
    }, [uid, getIdToken, CALORIE_HISTORY_ENDPOINT]); // CALORIE_HISTORY_ENDPOINT dependency

    // --- Effects ---
    useFocusEffect(
        useCallback(() => {
            console.log("Profile screen focused. UID:", uid);
            if (uid) {
                fetchUserProfile(true); // Fetch profile on initial focus
                fetchCalorieHistory(selectedChartPeriod); // Also fetch initial chart
            } else {
                 // Reset states if no user
                 setIsProfileLoading(false); setProfileError("Please log in.");
                 setCurrentWeight(0); setStartWeight(0); setGoalWeight(0); setHeight(0);
                 setBmiValue('N/A'); setBmiCategory('');
                 setChartDisplayData({ labels: [], datasets: [{ data: [] }] }); setChartError(null);
                 setShowPlanPopup(false); setPopupPlanData(null);
             }
        }, [uid, fetchUserProfile, fetchCalorieHistory, selectedChartPeriod])
    );

    useEffect(() => { // BMI Calculation
        if (currentWeight > 0 && height > 0) {
            const bmiResult = calculateBmi(currentWeight, height);
            setBmiValue(bmiResult.value); setBmiCategory(bmiResult.category);
        } else { setBmiValue('N/A'); setBmiCategory(''); }
    }, [currentWeight, height]);

    useEffect(() => { // Refetch chart data when period changes
        if (uid && !isProfileLoading) { // Ensure profile isn't loading (avoid race condition)
            fetchCalorieHistory(selectedChartPeriod);
        }
    }, [selectedChartPeriod, uid, isProfileLoading, fetchCalorieHistory]); // Added fetchCalorieHistory

    // --- Action Handlers ---
   const handleLogNewWeight = useCallback(async () => {
        const newWeight = parseFloat(rulerSelectedValue);

        if (!uid) { Alert.alert("Error", "Please log in to record weight."); return; }
        if (isNaN(newWeight) || newWeight <= 0 || newWeight > 500) { Alert.alert("Invalid Weight", "Please select a valid weight from the ruler."); return; }
        if (Math.abs(newWeight - currentWeight) < weightStep / 2 && currentWeight !== 0) { Alert.alert("No Change", "The new weight is the same as the current weight."); return; }

        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        setIsLoggingWeight(true);
        setIsRecalculatingPlan(false); // Reset this state if you use it

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication required. Please log in again.");

            // 1. Log the new weight (backend should update user's weight field)
            console.log(`Profile: Logging weight ${newWeight}kg for user ${uid} on ${dateString} via POST ${LOG_WEIGHT_ENDPOINT}`);
            const logWeightResponse = await axios.post(LOG_WEIGHT_ENDPOINT,
                { weight: newWeight, date: dateString }, // Backend gets UID from token
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (logWeightResponse.status !== 200 && logWeightResponse.status !== 201) {
                throw new Error(logWeightResponse.data?.message || "Failed to log weight.");
            }
            console.log("Profile: Weight logged successfully. Backend response:", logWeightResponse.data);
            // Optimistically update local current weight state for immediate UI feedback
            // The subsequent fetchUserProfile will confirm it from the backend.
            setCurrentWeight(newWeight);

            // 2. Trigger nutrition plan recalculation on the backend
            console.log(`Profile: Requesting plan recalculation: PUT ${RECALCULATE_PLAN_ENDPOINT}`);
            setIsRecalculatingPlan(true); // Indicate plan recalculation is in progress
            const planResponse = await axios.put(RECALCULATE_PLAN_ENDPOINT,
                 {}, // Empty body if backend gets UID from URL and recalculates based on latest user data
                 { headers: { 'Authorization': `Bearer ${token}` }}
            );
            const planResponseData = planResponse.data;
            if (planResponse.status !== 200) {
                throw new Error(planResponseData.error || planResponseData.message || "Failed to recalculate nutrition plan.");
            }
            console.log("Profile: Plan recalculation successful.");

            // Display the new plan from the recalculation response in the modal
            if (planResponseData.nutritionPlan) {
                console.log("Profile: New nutrition plan received:", planResponseData.nutritionPlan);
                setPopupPlanData(planResponseData.nutritionPlan);
                setShowPlanPopup(true);
            } else {
                console.warn("Profile: Recalculated plan not found in response from PUT endpoint.");
            }
            // Alert moved to after achievement check for cleaner flow or combined

            // --- "GOAL WEIGHT REACHED" ACHIEVEMENT CHECK ---
            const currentTargetWeightState = parseFloat(goalWeight); // Uses goalWeight from component's state
            const currentUserGoalTypeStateLower = (userGoalType || '').toLowerCase(); // Use state & convert

            console.log("Profile Goal Check: New Weight:", newWeight, "Target Weight:", currentTargetWeightState, "Goal Type (from state):", userGoalType, "Goal Type (lower):", currentUserGoalTypeStateLower);
            console.log("Profile Goal Check: Current 'achievements' from context:", JSON.stringify(achievements));

            let goalMet = false;
            const tolerance = 0.5; // Example tolerance in kg

            if (currentUserGoalTypeStateLower === 'losing weight' && !isNaN(currentTargetWeightState) && currentTargetWeightState > 0) {
                if (newWeight <= currentTargetWeightState + tolerance) {
                    console.log("Profile: 'Losing Weight' goal met condition is TRUE");
                    goalMet = true;
                } else {
                    console.log("Profile: 'Losing Weight' goal met condition is FALSE. newWeight:", newWeight, "vs target+tolerance:", currentTargetWeightState + tolerance);
                }
            } else if (currentUserGoalTypeStateLower === 'gaining weight' && !isNaN(currentTargetWeightState) && currentTargetWeightState > 0) {
                if (newWeight >= currentTargetWeightState - tolerance) {
                    console.log("Profile: 'Gaining Weight' goal met condition is TRUE");
                    goalMet = true;
                } else {
                     console.log("Profile: 'Gaining Weight' goal met condition is FALSE. newWeight:", newWeight, "vs target-tolerance:", currentTargetWeightState - tolerance);
                }
            } else if (currentUserGoalTypeStateLower === 'maintaining weight' && !isNaN(currentTargetWeightState) && currentTargetWeightState > 0) {
                 const maintenanceTolerance = 1.0; // Example: within 1kg for maintenance
                 if (Math.abs(newWeight - currentTargetWeightState) <= maintenanceTolerance) {
                     console.log("Profile: 'Maintaining Weight' goal met condition is TRUE");
                     goalMet = true;
                 } else {
                      console.log("Profile: 'Maintaining Weight' goal met condition is FALSE. newWeight:", newWeight, "vs target:", currentTargetWeightState);
                 }
            } else {
                 console.log("Profile: No matching/valid goal type for achievement check. Goal Type was:", currentUserGoalTypeStateLower, "Target Weight:", currentTargetWeightState);
            }

            if (goalMet) {
                console.log("Profile: Overall Goal weight condition MET!");
                if (!achievements?.goalWeightReached) { // Check context's achievements object
                    console.log("Profile: Unlocking 'goalWeightReached' achievement via context...");
                    await unlockAchievement('goalWeightReached');
                    console.log("Profile: 'goalWeightReached' context call completed.");
                    // Alert moved or combined
                } else {
                     console.log("Profile: 'goalWeightReached' already true in GamificationContext achievements.");
                }
            } else {
                console.log("Profile: Overall Goal weight condition NOT MET.");
            }
            // --- END ACHIEVEMENT CHECK ---

            // Refresh full user profile data from backend AFTER all actions
            // This ensures startWeight, currentWeight, goalType etc. are the latest from the DB
            await fetchUserProfile(false); // Fetch without full screen loader

        } catch (err) {
            console.error(`Profile: Log Weight/Recalc Plan Error:`, err.response?.data || err.message || err);
            Alert.alert("Error", err.response?.data?.error || err.message || "An operation failed.");
            // Optionally setProfileError(err.message);
        } finally {
            setIsLoggingWeight(false);
            setIsRecalculatingPlan(false); // Ensure this is also reset
        }
    }, [ // <<<--- MAKE SURE ALL DEPENDENCIES ARE CORRECT ---<<<
        uid,
        rulerSelectedValue,
        currentWeight, // Current weight *before* logging new one
        // weightStep, // If it's a constant defined outside, not needed here
        // LOG_WEIGHT_ENDPOINT, // Constant string, not needed
        // RECALCULATE_PLAN_ENDPOINT, // Constant string, not needed
        getIdToken,
        setCurrentWeight, // From useState
        setPopupPlanData, // From useState
        setShowPlanPopup, // From useState
        goalWeight,       // From useState (updated by fetchUserProfile)
        userGoalType,     // <<<--- CRUCIAL: From useState (updated by fetchUserProfile)
        unlockAchievement, // From GamificationContext
        achievements,      // From GamificationContext
        fetchUserProfile   // useCallback function
    ]);


    const handleRulerScroll = useCallback((event) => {
         const centerOffset = event.nativeEvent.contentOffset.x;
         let index = Math.round(centerOffset / itemWidth);
         index = Math.max(0, Math.min(index, numbersRuler.length - 1));
         if (numbersRuler[index]) setRulerSelectedValue(numbersRuler[index]);
    }, [itemWidth, numbersRuler]);

    const calculateInitialIndex = useCallback(() => {
         const targetValue = parseFloat(rulerSelectedValue || '0');
         if (isNaN(targetValue)) { return Math.round(numbersRuler.length / 2); }
         const index = numbersRuler.findIndex(num => Math.abs(parseFloat(num) - targetValue) < weightStep / 2);
         return index >= 0 ? index : Math.round(numbersRuler.length / 2);
    }, [rulerSelectedValue, numbersRuler, weightStep]);

    const renderRulerTick = ({ item }) => {
        const numValue = parseFloat(item);
        const isMajorTick = Math.abs(numValue % 5) < (weightStep / 2) || Math.abs(numValue % 5 - 5) < (weightStep / 2);
        return (
            <View style={[styles.rulerTickContainer, { width: itemWidth }]}>
                <View style={[styles.rulerTickLine, isMajorTick ? styles.rulerMajorTickLine : styles.rulerMinorTickLine ]} />
            </View>
        );
    };

    // --- Render Logic ---
    if (isProfileLoading && !profileError) {
        return (
            <View style={styles.mainContainer}>
                <Header subtitle={'Your Progress at a Glance!'} />
                <TabNavigation />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                </View>
            </View>
        );
    }
    if (profileError) {
        return (
            <View style={styles.mainContainer}>
                <Header subtitle={'Your Progress at a Glance!'}/>
                <TabNavigation/>
                 <View style={styles.errorDisplayContainer}>
                    <Ionicons name="alert-circle-outline" size={40} color={PALETTE.errorRed} />
                    <Text style={styles.errorText}>{profileError}</Text>
                    <TouchableOpacity onPress={() => fetchUserProfile(true)} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}> Retry </Text>
                    </TouchableOpacity>
                 </View>
            </View>
       );
    }

    // Main Render
    return (
        <View style={styles.mainContainer}>
            <Header subtitle={'Your Progress at a Glance!'} />
            <View style={styles.weightBarContainer}>
                 <View style={[styles.weightBarItem, styles.weightBarItemLight]}>
                    <Text style={styles.goalText}>Start weight</Text>
                    <Text style={styles.remainingValue}>{startWeight > 0 ? `${startWeight.toFixed(1)} kg` : 'N/A'}</Text>
                </View>
                 <View style={[styles.weightBarItem, styles.weightBarItemDark]}>
                    <Text style={[styles.goalText, styles.textLight]}>Current weight</Text>
                    <Text style={[styles.remainingValue, styles.textLight]}>{currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : 'N/A'}</Text>
                </View>
                <View style={[styles.weightBarItem, styles.weightBarItemLight]}>
                    <Text style={styles.goalText}>Goal weight</Text>
                    <Text style={styles.remainingValue}>{goalWeight > 0 ? `${goalWeight.toFixed(1)} kg` : 'N/A'}</Text>
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitleProfile}>Calorie Consumption</Text>
                <View style={styles.periodToggleContainer}>
                    {['Week', 'Month', 'Year'].map((type) => {
                         const isActive = selectedChartPeriod === type;
                         return (
                            <TouchableOpacity key={type} style={styles.periodToggleButton} onPress={() => setSelectedChartPeriod(type)} disabled={isChartLoading || isLoggingWeight}>
                                <Text style={[styles.periodToggleText, isActive ? styles.periodToggleTextActive : styles.periodToggleTextInactive]}>{type}</Text>
                                {isActive && <View style={styles.periodToggleUnderline} />}
                            </TouchableOpacity>
                         );
                    })}
                </View>
                <View style={styles.chartContainer}>
                    {isChartLoading && ( <View style={styles.chartOverlayProfile}> <ActivityIndicator size="large" color={PALETTE.darkGreen} /> </View> )}
                    {chartError && !isChartLoading && ( <View style={styles.chartOverlayMessageProfile}> <Ionicons name="warning-outline" size={24} color="#8B4513" /> <Text style={styles.chartMessageTextProfile}>{chartError}</Text> </View> )}
                    {!isChartLoading && !chartError && (!chartDisplayData.datasets?.[0]?.data || chartDisplayData.datasets[0].data.length === 0 || chartDisplayData.datasets[0].data.every(d => d === 0)) && ( <View style={styles.chartOverlayMessageProfile}> <Ionicons name="information-circle-outline" size={24} color="#4682B4" /> <Text style={styles.chartMessageTextProfile}>Log meals to see data.</Text> </View> )}
                    {!isChartLoading && !chartError && chartDisplayData.labels?.length > 0 && chartDisplayData.datasets?.[0]?.data?.length > 0 && !chartDisplayData.datasets[0].data.every(d => d === 0) && (
                        <BarChart
                            data={chartDisplayData} width={screenWidth * 0.85} height={300} yAxisLabel="" yAxisSuffix=" kcal"
                            chartConfig={chartConfig} style={styles.chartStyle} fromZero={true} // fromZero true is typical for consumption
                            showValuesOnTopOfBars={true} verticalLabelRotation={chartDisplayData.labels.length > 7 ? 30 : 0}
                            withInnerLines={true} barPercentage={0.7} showBarTops={true}
                        />
                    )}
                </View>
                <Text style={styles.sectionTitleProfile}>Log Today's Weight</Text>
                <View style={styles.rulerSectionContainer}>
                    <Text style={styles.selectedValue}>{rulerSelectedValue} kg</Text>
                    <View style={styles.rulerVisualContainer}>
                        <FlatList
                            ref={rulerListRef} data={numbersRuler} horizontal bounces={false}
                            snapToAlignment="center" snapToInterval={itemWidth} decelerationRate="fast"
                            showsHorizontalScrollIndicator={false} keyExtractor={(item) => `ruler-tick-${item}`}
                            initialScrollIndex={calculateInitialIndex()}
                            getItemLayout={(data, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
                            contentContainerStyle={{ paddingHorizontal: (screenWidth / 2) - (itemWidth / 2) }}
                            renderItem={renderRulerTick}
                            onMomentumScrollEnd={handleRulerScroll}
                            style={styles.rulerFlatList} />
                        <View style={styles.centerIndicatorLine}/>
                         <Text style={styles.centerIndicatorLabel}>{Math.round(parseFloat(rulerSelectedValue))}</Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.button, (isLoggingWeight || isChartLoading) && styles.buttonDisabled ]} onPress={handleLogNewWeight} disabled={isLoggingWeight || isChartLoading} >
                         {isLoggingWeight ? <ActivityIndicator size="small" color={PALETTE.white} /> : <Text style={styles.textButton}>Validate New Weight</Text>}
                    </TouchableOpacity>
                </View>
                <View style={styles.bmiSectionContainer}>
                    <Text style={styles.bmiTitle}>Body Mass Index (BMI)</Text>
                    <Text style={styles.bmiDescription}>An indicator based on height and weight.</Text>
                </View>
                 <View style={styles.bmiDisplayContainer}>
                     <View style={styles.bmiDisplayBox}><Text style={styles.bmiLabel}> BMI Value</Text><Text style={styles.bmiValueDisplay}>{bmiValue}</Text></View>
                     <View style={styles.bmiDisplayBox}><Text style={styles.bmiLabel}> Category</Text><Text style={styles.bmiCategoryDisplay}>{bmiCategory}</Text></View>
                </View>
            </ScrollView>
            <TabNavigation/>
            {/* Nutrition Plan Popup Modal */}
                      {/* Nutrition Plan Popup Modal */}
           <Modal
                animationType="slide"
                transparent={true}
                visible={showPlanPopup}
                onRequestClose={() => setShowPlanPopup(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowPlanPopup(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Your Plan is Updated!</Text>
                        {popupPlanData && (
                            <View style={styles.planDetailsContainer}>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Calories:</Text><Text style={styles.planDetailValue}>{popupPlanData.calories?.toFixed(0)} kcal</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Protein:</Text><Text style={styles.planDetailValue}>{popupPlanData.protein?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Carbs:</Text><Text style={styles.planDetailValue}>{popupPlanData.carbs?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fat:</Text><Text style={styles.planDetailValue}>{popupPlanData.fat?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fiber:</Text><Text style={styles.planDetailValue}>{popupPlanData.fiberGoal}</Text></View>
                            </View>
                        )}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowPlanPopup(false)}>
                            <Text style={styles.closeButtonText}>Got it!</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// --- Styles (Your complete StyleSheet.create object as provided before) ---
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream }, // Added for consistency
    errorDisplayContainer: { flex:1, justifyContent: 'center', alignItems: 'center', padding: 20 }, // Style for error view
    retryButton: { marginTop: 20, backgroundColor:PALETTE.darkGreen, paddingVertical:10, paddingHorizontal:20, borderRadius:20 },
    retryButtonText: { color:PALETTE.white, fontFamily: "Quicksand_700Bold", fontSize: 16 },
    weightBarContainer: {flexDirection: 'row', elevation: 2, backgroundColor: PALETTE.white /* Added default */},
    weightBarItem: { flex: 1, alignItems: 'center', height: 70, justifyContent : 'center', paddingVertical: 10}, // Increased height
    weightBarItemLight: { backgroundColor: PALETTE.lightOrange },
    weightBarItemDark: { backgroundColor: PALETTE.darkGreen },
    goalText: { fontSize: 14, fontFamily: "Quicksand_600SemiBold", color: PALETTE.darkGrey, marginBottom: 3 },
    remainingValue: { fontSize: 18, fontFamily: "Quicksand_700Bold", color: PALETTE.darkGreen },
    textLight: { color: PALETTE.white },
    scrollContentContainer: { alignItems: 'center', paddingHorizontal: 15, paddingBottom: 100 }, // Consistent padding
    sectionTitleProfile: { marginVertical: 25, fontSize: 20, fontFamily: "Quicksand_700Bold", color: PALETTE.darkGreen, textAlign:'center' }, // Themed section title
    periodToggleContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, width: '90%', alignSelf: 'center', backgroundColor: PALETTE.lightOrange, borderRadius: 25, paddingVertical: 5, elevation: 1 },
    periodToggleButton: { paddingVertical: 8, paddingHorizontal: 15, alignItems: 'center', flex: 1},
    periodToggleText: { fontSize: 14, fontFamily: "Quicksand_600SemiBold" }, // Unified font family
    periodToggleTextActive: { color: PALETTE.darkGreen, fontFamily: "Quicksand_700Bold" }, // Bolder active
    periodToggleTextInactive: { color: PALETTE.grey },
    periodToggleUnderline: { height: 2.5, backgroundColor: PALETTE.darkGreen, width: '60%', marginTop: 4, alignSelf: 'center', borderRadius: 1 },
    chartContainer: { padding: 15, backgroundColor: PALETTE.lightOrange, borderRadius:15, alignItems: 'center', width:'95%', position: 'relative', minHeight: 320, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignSelf: 'center' },
    chartOverlayProfile: { position: 'absolute', top:0, bottom:0, left:0, right:0, backgroundColor:'rgba(252, 207, 148, 0.8)', justifyContent:'center', alignItems:'center', zIndex:10, borderRadius: 10 },
    chartOverlayMessageProfile: { position: 'absolute', top:0, bottom:0, left:0, right:0, justifyContent:'center', alignItems:'center', zIndex:5, padding: 10, borderRadius: 10 },
    chartMessageTextProfile: { marginTop:10, textAlign:'center', fontSize: 14, color: PALETTE.darkGrey, fontFamily: 'Quicksand_600SemiBold' },
    chartStyle: { borderRadius: 10, marginVertical: 8 }, // Chart itself style
    rulerSectionContainer: { width: '100%', alignItems: 'center', marginVertical: 20, marginTop: 10 },
    selectedValue: { fontSize: 38, fontFamily: "Quicksand_700Bold", color: PALETTE.black, marginBottom: 8 },
    rulerVisualContainer: { height: 60, width: '95%', alignSelf: 'center', position: 'relative', justifyContent: 'center', alignItems: 'center'},
    rulerFlatList: { height: '100%' },
    rulerTickContainer: { height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 5 },
    rulerTickLine: { width: 1.5, backgroundColor: PALETTE.grey },
    rulerMajorTickLine: { height: 25, backgroundColor: PALETTE.darkGrey },
    rulerMinorTickLine: { height: 15, backgroundColor: PALETTE.grey },
    centerIndicatorLine: { position: 'absolute', height: '100%', width: 3, backgroundColor: PALETTE.darkGreen, zIndex: 10, borderRadius: 1.5 },
    centerIndicatorLabel: { position: 'absolute', bottom: -22, fontSize: 16, color: PALETTE.darkGreen, fontFamily: "Quicksand_700Bold" },
    buttonContainer: { width: '90%', alignItems: 'center', marginTop: 25, marginBottom: 20 },
    button: { borderRadius: 25, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, backgroundColor: PALETTE.darkGreen, width: '100%', height: 55, elevation: 3, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
    textButton: { color: PALETTE.white, fontSize: 18, fontFamily: "Quicksand_700Bold" },
    buttonDisabled: { backgroundColor: PALETTE.grey, opacity: 0.7 }, // For general button disable
    bmiSectionContainer: { marginTop: 20, width: '90%', alignItems:'center' },
    bmiTitle: { fontSize: 20, fontFamily: "Quicksand_700Bold", color: PALETTE.darkGreen, marginBottom: 8 },
    bmiDescription: { fontSize: 14, color: PALETTE.darkGrey, textAlign: 'center', marginBottom: 15, fontFamily: 'Quicksand_500Medium' },
    bmiDisplayContainer: { width: '90%', marginTop: 0 },
    bmiDisplayBox: { width: '100%', backgroundColor: PALETTE.lightOrange, height: 55, borderRadius: 12, justifyContent: 'space-between', flexDirection: 'row', paddingHorizontal: 20, alignItems:'center', elevation: 1, marginBottom: 10, borderColor: PALETTE.lightOrange, borderWidth: 1.5 },
    bmiLabel: { fontSize: 16, color: PALETTE.darkGrey, fontFamily: "Quicksand_600SemiBold" },
    bmiValueDisplay: { fontSize: 16, color: PALETTE.darkGreen, fontFamily: "Quicksand_700Bold" },
    bmiCategoryDisplay: { fontSize: 16, color: PALETTE.darkGreen, fontFamily: "Quicksand_700Bold" },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 15, fontSize: 16, fontFamily: 'Quicksand_600SemiBold' },
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)' },
    modalContent: { backgroundColor: PALETTE.lightCream, paddingVertical: 25, paddingHorizontal: 20, borderRadius: 15, width: '88%', alignItems: 'stretch', elevation: 10, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
    modalTitle: { fontSize: 22, fontFamily: "Quicksand_700Bold", marginBottom: 20, color: PALETTE.darkGreen, textAlign: 'center' },
    planDetailsContainer: { marginBottom: 20, width: '100%' }, // Container for plan details
    planDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
    planDetailLabel: { fontSize: 16, fontFamily: "Quicksand_600SemiBold", color: PALETTE.darkGrey },
    planDetailValue: { fontSize: 16, fontFamily: "Quicksand_700Bold", color: PALETTE.darkGreen },
    detailText: { fontSize: 16, fontFamily: "Quicksand_500Medium", color: PALETTE.darkGrey, marginBottom: 8, textAlign: 'left', width: '100%' }, // Fallback/Original if needed
    closeButton: { marginTop: 15, backgroundColor: PALETTE.darkGreen, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, alignSelf: 'center' },
    closeButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: "Quicksand_700Bold" },
});
// Default export
// export default Profile; // Ensure this is at the end if removed during edits