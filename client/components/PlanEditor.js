// PlanEditor.js
import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import Header from '../components/Header'; // Adaptez le chemin
import ProTabNavigation from '../components/ProTabNavigation'; // Adaptez le chemin
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios'; // Importer axios
import { AuthContext } from '../components/AuthContext'; // Importer AuthContext

// --- Palette, Constants ---
const PALETTE = {
    darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94',
    lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0',
    darkGrey: '#555555', buttonTextDark: '#333333', activeDayBackground: '#E0B870',
};
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
// Assurez-vous que cette URL est correcte pour votre environnement
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// --- Initial State Helper (Frontend side) ---
const createInitialDayState = () => {
    const meals = {};
    MEAL_TIMES.forEach(meal => {
        meals[meal] = { food: '', quantity: '', unit: '', prepNotes: '', timing: '', alternatives: '' };
    });
    return { dailyWorkout: '', meals };
};
const createInitialFullPlanState = () => {
    const weeklyPlan = {};
    DAYS_OF_WEEK.forEach(day => { weeklyPlan[day] = createInitialDayState(); });
    return {
        generalNotes: '', waterIntake: '2.5', sleepRecommendation: '7-9 hours',
        weeklyPlan: weeklyPlan,
    };
};


export default function PlanEditor() {
    const navigation = useNavigation();
    const route = useRoute();
    const { clientId, clientName } = route.params || {};
    const { getIdToken } = useContext(AuthContext); // Obtenir la fonction pour le token

    // --- State ---
    const [generalNotes, setGeneralNotes] = useState('');
    const [waterIntake, setWaterIntake] = useState('2.5');
    const [sleepRecommendation, setSleepRecommendation] = useState('7-9 hours');
    const [weeklyPlan, setWeeklyPlan] = useState(createInitialFullPlanState().weeklyPlan); // Commence avec structure vide
    const [isLoading, setIsLoading] = useState(true); // État de chargement initial
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[0]);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false); // Flag pour chargement initial

    // --- Fetch Initial Full Plan Data ---
    useEffect(() => {
        const fetchPlan = async () => {
            if (!clientId || !getIdToken || initialDataLoaded) return; // Empêche re-fetch si déjà chargé
            console.log(`PlanEditor: Fetching initial full plan for client ${clientId}...`);
            setIsLoading(true);
            try {
                const token = await getIdToken();
                if (!token) throw new Error("Auth token missing.");

                // --- URL CORRIGÉE ---
                const apiUrl = `${API_BASE_URL}/nutrition-programs/${clientId}`; // <-- Ajout de /api
                console.log("PlanEditor: Calling API URL:", apiUrl); // Log de l'URL appelée

                const response = await axios.get(
                    apiUrl, // Utilise l'URL corrigée
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (response.status === 200 && response.data?.plan) {
                    const { plan } = response.data;
                    console.log("PlanEditor: Received full plan data:", plan);
                    setGeneralNotes(plan.generalNotes || '');
                    setWaterIntake(String(plan.waterIntake ?? '2.5')); // Assure string, gère null/undefined
                    setSleepRecommendation(plan.sleepRecommendation || '7-9 hours');

                    // Fusionne le plan chargé avec la structure initiale pour garantir tous les jours/repas
                    const initialStructure = createInitialFullPlanState().weeklyPlan;
                    const mergedWeeklyPlan = { ...initialStructure };
                    if(plan.weeklyPlan) {
                        Object.keys(plan.weeklyPlan).forEach(day => {
                            if (mergedWeeklyPlan[day]) {
                                mergedWeeklyPlan[day] = {
                                    ...initialStructure[day],
                                    ...(plan.weeklyPlan[day]),
                                    meals: {
                                        ...initialStructure[day].meals,
                                        ...(plan.weeklyPlan[day].meals || {}),
                                    }
                                };
                                MEAL_TIMES.forEach(meal => {
                                     mergedWeeklyPlan[day].meals[meal] = {
                                        ...initialStructure[day].meals[meal],
                                        ...(mergedWeeklyPlan[day].meals[meal] || {})
                                     }
                                });
                            }
                        });
                    }
                     setWeeklyPlan(mergedWeeklyPlan);

                } else {
                     console.warn("PlanEditor: No plan data found or unexpected response status for full plan.", response.status);
                     setWeeklyPlan(createInitialFullPlanState().weeklyPlan); // Garde état initial vide
                }
            } catch (error) {
                console.error("PlanEditor: Error fetching nutrition plan:", error.response?.data || error.message);
                 if (error.response?.status !== 404) {
                    Alert.alert("Error", "Could not load the nutrition plan. Please try again later.");
                 } else {
                     console.log("PlanEditor: No plan found (404), starting fresh.");
                 }
                 setWeeklyPlan(createInitialFullPlanState().weeklyPlan); // Garde état initial vide en cas d'erreur
            } finally {
                setIsLoading(false);
                setInitialDataLoaded(true); // Marque la tentative comme complète
            }
        };

        fetchPlan();
    }, [clientId, getIdToken, initialDataLoaded]); // Dépendances


    // --- Change Handlers (Identiques à la version précédente) ---
    const handleNotesChange = (text) => setGeneralNotes(text);
    const handleWaterChange = (text) => { if (/^\d*\.?\d*$/.test(text)) setWaterIntake(text); };
    const handleSleepChange = (text) => setSleepRecommendation(text);
    const handleWorkoutChange = (day, text) => {
        setWeeklyPlan(currentPlan => {
            const newPlan = JSON.parse(JSON.stringify(currentPlan));
            if (!newPlan[day]) { newPlan[day] = createInitialDayState(); }
            newPlan[day].dailyWorkout = text;
            return newPlan;
        });
    };
    const handleMealChange = (day, meal, field, text) => {
        setWeeklyPlan(currentPlan => {
            const newPlan = JSON.parse(JSON.stringify(currentPlan));
             if (!newPlan[day]) { newPlan[day] = createInitialDayState(); }
             if (!newPlan[day].meals) { newPlan[day].meals = createInitialDayState().meals; }
             if (!newPlan[day].meals[meal]) {
                 newPlan[day].meals[meal] = createInitialDayState().meals[meal] || { food: '', quantity: '', unit: '', prepNotes: '', timing: '', alternatives: '' };
             }
            newPlan[day].meals[meal][field] = text;
            return newPlan;
        });
    };

    // --- Save Plan Logic (Identique à la version précédente) ---
    const handleSavePlan = async () => {
        if (!clientId || !getIdToken) { Alert.alert("Error", "Client ID or authentication missing."); return; }
        if (!initialDataLoaded) { Alert.alert("Info", "Please wait for data to load."); return; }

        setIsSaving(true);
        console.log(`PlanEditor: Saving plan for ${clientId}, focused on ${selectedDay}`);

        const payload = {
            generalNotes, waterIntake, sleepRecommendation,
            weeklyPlan, selectedDay
        };

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Auth token missing.");

            // --- URL CORRIGÉE pour POST également ---
            const saveUrl = `${API_BASE_URL}/nutrition-programs/${clientId}`; // <-- Ajout de /api
            console.log("PlanEditor: Calling Save API URL:", saveUrl);

            const response = await axios.post(
                saveUrl, // Utilise l'URL corrigée
                payload,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 200) {
                console.log("PlanEditor: Save successful.", response.data?.message);
                Alert.alert("Success", response.data?.message || `Plan changes saved.`);
            } else {
                 throw new Error(response.data?.message || "Unknown error saving plan.");
            }

        } catch (error) {
            console.error("PlanEditor: Error saving plan:", error.response?.data || error.message);
            Alert.alert("Error", `Could not save the plan. ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Component to render ONE day card (Identique à la version précédente) ---
    const renderDayCard = (day) => {
        const dayData = weeklyPlan[day];
        const safeDayData = dayData || createInitialDayState(); // Structure vide par défaut

        return (
            <View key={day} style={styles.dayCard}>
                <Text style={styles.dayTitle}>{day}</Text>
                {MEAL_TIMES.map((meal) => {
                    const mealData = safeDayData.meals[meal] || { food: '', quantity: '', unit: '', prepNotes: '', timing: '', alternatives: '' };
                    return (
                        <View key={`${day}-${meal}`} style={styles.mealRow}>
                            <Text style={styles.mealLabel}>{meal}</Text>
                            <View style={styles.mealInputsContainer}>
                                {/* Utiliser des placeholders plus concis si possible */}
                                <TextInput style={[styles.inputBase, styles.timingInput]} placeholder="Timing" value={mealData.timing} onChangeText={(t) => handleMealChange(day, meal, 'timing', t)} />
                                <TextInput style={[styles.inputBase, styles.foodInput]} placeholder="Food item" value={mealData.food} onChangeText={(t) => handleMealChange(day, meal, 'food', t)} />
                                <View style={styles.quantityRow}>
                                    <TextInput style={[styles.inputBase, styles.quantityInput]} placeholder="Qty" value={String(mealData.quantity)} onChangeText={(t) => handleMealChange(day, meal, 'quantity', t)} keyboardType="numeric" />
                                    <TextInput style={[styles.inputBase, styles.unitInput]} placeholder="Unit" value={mealData.unit} onChangeText={(t) => handleMealChange(day, meal, 'unit', t)} />
                                </View>
                                <TextInput style={[styles.inputBase, styles.prepNotesInput]} placeholder="Prep Notes" value={mealData.prepNotes} onChangeText={(t) => handleMealChange(day, meal, 'prepNotes', t)} multiline={true} textAlignVertical="top" />
                                <TextInput style={[styles.inputBase, styles.alternativesInput]} placeholder="Alternatives" value={mealData.alternatives} onChangeText={(t) => handleMealChange(day, meal, 'alternatives', t)} multiline={true} textAlignVertical="top" />
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    }


    // --- Render ---
     if (isLoading && !initialDataLoaded) { // Indicateur pendant le chargement initial
         return (
            <View style={styles.screenContainer}>
                 <Header subtitle="Loading Plan..." showBackButton={true} navigation={navigation} />
                 <View style={styles.loadingContainer}>
                     <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                     <Text style={styles.loadingText}>Loading Nutrition Plan...</Text>
                 </View>
                 <ProTabNavigation />
             </View>
         );
     }

    return (
        <KeyboardAvoidingView  style={styles.screenContainer} >
            <Header subtitle={`Plan Editor ${clientName ? `- ${clientName}` : ''}`} showBackButton={true} navigation={navigation}/>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Sections Générales */}
                <View style={styles.section}><Text style={styles.sectionTitle}>General Plan Notes</Text><TextInput style={[styles.inputBase, styles.notesInput]} value={generalNotes} onChangeText={handleNotesChange} multiline placeholder="Write general notes, goals, focus for the week..." placeholderTextColor={PALETTE.grey} /></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>Recommended Daily water intake</Text><View style={styles.waterIntakeContainer}><TextInput style={[styles.inputBase, styles.waterInput]} value={waterIntake} onChangeText={handleWaterChange} keyboardType="numeric" /><View style={styles.waterUnitContainer}><Text style={styles.waterUnitText}>Litre</Text></View></View></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{selectedDay}'s Activity / Workout</Text><TextInput style={[styles.inputBase, styles.workoutInput]} value={weeklyPlan[selectedDay]?.dailyWorkout || ''} onChangeText={(t) => handleWorkoutChange(selectedDay, t)} placeholder="e.g., Rest day, Upper Body Strength..." placeholderTextColor={PALETTE.grey} /></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>Sleep Goal</Text><TextInput style={[styles.inputBase, styles.sleepInput]} value={sleepRecommendation} onChangeText={handleSleepChange} placeholder="e.g., 7-9 hours, aim for bed by 10:30 PM" placeholderTextColor={PALETTE.grey} /></View>

                {/* Sélecteur de Jour */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContainer}>
                        {DAYS_OF_WEEK.map((day) => ( <TouchableOpacity key={day} style={[styles.daySelectorButton, selectedDay === day && styles.daySelectorButtonActive]} onPress={() => setSelectedDay(day)}><Text style={[styles.daySelectorText, selectedDay === day && styles.daySelectorTextActive]}> {day.substring(0, 3)} </Text></TouchableOpacity> ))}
                    </ScrollView>
                </View>

                {/* Détails du Jour Sélectionné */}
                <Text style={styles.sectionTitle}>{selectedDay}'s Plan Details</Text>
                {renderDayCard(selectedDay)}

                {/* Bouton Sauvegarder */}
                <TouchableOpacity style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]} onPress={handleSavePlan} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator size="small" color={PALETTE.white} /> : <Text style={styles.saveButtonText}>Save Plan Changes</Text>}
                </TouchableOpacity>
            </ScrollView>
            <ProTabNavigation />
        </KeyboardAvoidingView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    scrollContainer: { paddingHorizontal: 15, paddingTop: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream }, // Ajout fond
    loadingText: { marginTop: 10, color: PALETTE.black, fontSize: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontFamily: "Quicksand_700Bold", color: PALETTE.black, marginBottom: 10 },
    inputBase: { backgroundColor: PALETTE.lightOrange, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, fontSize: 14, color: PALETTE.darkGrey, borderWidth: 1, borderColor: PALETTE.mediumGreen, minHeight: 44, marginBottom: 8, fontFamily: "Quicksand_500Medium" },
    notesInput: { minHeight: 80, paddingTop: 10, marginBottom: 0 },
    waterIntakeContainer: { flexDirection: 'row', alignItems: 'center' },
    waterInput: { flex: 1, marginRight: 10, textAlign: 'center', marginBottom: 0 },
    waterUnitContainer: { backgroundColor: PALETTE.lightOrange, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: PALETTE.mediumGreen, justifyContent: 'center', minHeight: 44 },
    waterUnitText: { fontSize: 14, color: PALETTE.black, fontFamily: "Quicksand_700Bold" },
    sleepInput: { marginBottom: 0 },
    workoutInput: { marginBottom: 0 },
    daySelectorContainer: { paddingVertical: 5 },
    daySelectorButton: { backgroundColor: PALETTE.lightOrange, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: PALETTE.mediumGreen },
    daySelectorButtonActive: { backgroundColor: PALETTE.mediumGreen, borderColor: PALETTE.darkGreen },
    daySelectorText: { color: PALETTE.black, fontFamily: "Quicksand_700Bold", fontSize: 14 },
    daySelectorTextActive: { color: PALETTE.darkGreen },
    dayCard: { backgroundColor: PALETTE.mediumGreen, borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    dayTitle: { fontSize: 18, fontFamily: "Quicksand_700Bold", color: PALETTE.white, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: PALETTE.lightCream, paddingBottom: 8 },
    mealRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15, borderBottomWidth: 0.5, borderBottomColor: PALETTE.lightCream, paddingBottom: 15 },
    mealLabel: { width: 85, fontSize: 14, color: PALETTE.white, fontFamily: "Quicksand_500Medium", marginRight: 10, paddingTop: 12 },
    mealInputsContainer: { flex: 1, flexDirection: 'column' },
    quantityRow: { flexDirection: 'row', alignItems: 'center' },
    quantityInput: { flex: 1, marginRight: 8, textAlign: 'center' },
    unitInput: { minWidth: 80, textAlign: 'center' },
    prepNotesInput: { minHeight: 60, paddingTop: 10 },
    alternativesInput: { minHeight: 60, paddingTop: 10, marginBottom: 0 },
    saveButton: { backgroundColor: PALETTE.darkGreen, paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 20, marginBottom: 75 },
    saveButtonDisabled: { backgroundColor: PALETTE.grey },
    saveButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: "Quicksand_700Bold" },
});