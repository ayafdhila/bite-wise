import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
    View, Image, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert, SafeAreaView, Platform // Added Modal, Alert
} from 'react-native';
import axios from 'axios';
import styles from './Styles'; // Your shared styles
import { AuthContext } from './AuthContext';
import { GamificationContext } from '../components/GamificationContext'; 
import { Ionicons } from '@expo/vector-icons'; // Or your preferred icon library
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C', // Fond de la carte jour
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF', // Couleur du texte et icône non cochée
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    buttonTextDark: '#333333',
    activeDayBackground: '#E0B870',
    completedGreenIcon: '#4CAF50', // Vert vif pour l'icône cochée
    completedBackground: 'rgba(60, 90, 60, 0.75)', // Fond plus foncé/vert pour bouton coché (Ajustez opacité si besoin)
    checkboxBackground: 'rgba(0,0,0,0.2)', // Fond gris transparent pour bouton non coché
};
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// --- Define Modal Styles (can be in Styles.js or here) ---
const modalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    },
    modalContent: {
        backgroundColor: '#88A76C',
        padding: 25,
        borderRadius: 20,
        width: '85%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: "Quicksand_700Bold", // Semibold
        marginBottom: 20,
        color: '#2E4A32',
    },
    mealButton: {
        backgroundColor: '#F5E4C3', 
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20, 
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9' 
    },
    mealButtonText: {
        fontSize: 17,
        color: '#2E4A32', 
        fontFamily: "Quicksand_600SemiBold", 
    },
    closeButton: {
        marginTop: 15,
        padding: 10,
    },
    closeButtonText: {
        color: '#880808', // Soft red for cancel
        fontSize:20,
        fontFamily: "Quicksand_700Bold", 
    }
});
// --- End Modal Styles ---

function RecipeDetail({ route, navigation }) { // Added navigation prop
    const { user, getIdToken } = useContext(AuthContext);
     const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // Get initial data passed from navigation
    const { recipeId, imageUrl: initialImageUrl, title: initialTitle } = route.params;
    const { unlockAchievement } = useContext(GamificationContext);
    const [recipeDetails, setRecipeDetails] = useState(null); // Store full details from backend
    const [loading, setLoading] = useState(true); // Loading state for fetching details
    const [isLogging, setIsLogging] = useState(false); // Loading state for logging action
    const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility
    useEffect(() => {
        const checkIfSaved = async () => {
            if (!user || !recipeId || loading || !recipeDetails) { // Ensure all necessary data is available
                // console.log("checkIfSaved: Skipping, conditions not met yet.");
                return;
            }
            // Use recipeDetails.id for consistency if recipeId from params is just the number
            const currentRecipeId = String(recipeDetails.id);
            console.log(`RecipeDetail: Checking saved status for recipe ${currentRecipeId}...`);
            setIsSaving(true); // Indicate a check is in progress
            try {
                const token = await getIdToken();
                if (!token) {
                    console.warn("RecipeDetail: No token for saved status check.");

                    setIsSaving(false); // Stop loading indicator
                    return;
                }
                const response = await fetch(`${API_BASE_URL}/recipes/${currentRecipeId}/is-saved`, { // Use your correct endpoint
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    throw new Error(`Non-JSON response from is-saved: ${text.substring(0,100)}`);
                }
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to check saved status");
                }
                setIsSaved(data.isSaved);
                console.log(`RecipeDetail: Recipe ${currentRecipeId} isSaved: ${data.isSaved}`);
                 console.log("RecipeDetail: Full data received from backend:", JSON.stringify(response.data, null, 2));
            } catch (err) {
                console.error("RecipeDetail: Error checking if recipe is saved:", err);
                // Optionally set an error state or just log, don't block UI for this
            } finally {
                setIsSaving(false); // Stop loading indicator
            }
        };

        // Call only after main recipeDetails are loaded and user exists
        if (user && recipeDetails && !loading) {
            checkIfSaved();
        }
    }, [user, recipeDetails, getIdToken, loading, recipeId]);
        // --- Add this function to Handle Save/Unsave Recipe ---
    const handleToggleSaveRecipe = useCallback(async () => {
        if (!user || !recipeDetails || isSaving) {
            console.log("ToggleSave: Blocked - no user, no details, or already saving.");
            return;
        }
        setIsSaving(true);
        const currentIsSaved = isSaved;
        const recipeToProcessId = String(recipeDetails.id); // Ensure ID is a string
        const endpoint = currentIsSaved
            ? `${API_BASE_URL}/recipes/${recipeToProcessId}/unsave`
            : `${API_BASE_URL}/recipes/save`;
        const method = currentIsSaved ? 'DELETE' : 'POST';
        console.log(`RecipeDetail: Attempting to ${method} ${endpoint}`);

        try {
            const token = await getIdToken(); if (!token) throw new Error("Authentication required.");
            const options = { method, headers: { 'Authorization': `Bearer ${token}` } };
            if (!currentIsSaved) { // Body needed only for saving
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify({
                    recipeId: recipeToProcessId,
                    title: recipeDetails.title || initialTitle || "Unnamed Recipe",
                    imageUrl: recipeDetails.image || initialImageUrl || ""
                });
            }
            const response = await fetch(endpoint, options);
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Non-JSON response from save/unsave: ${text.substring(0,100)}`);
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Failed to ${currentIsSaved ? 'unsave' : 'save'}`);
            }
            setIsSaved(!currentIsSaved); // Toggle UI state
            Alert.alert("Success", data.message || `Recipe ${currentIsSaved ? 'unsaved' : 'saved'}!`);
        } catch (err) {
            console.error("RecipeDetail: Error saving/unsaving:", err);
            Alert.alert("Error", err.message || "Could not update saved status.");
        } finally {
            setIsSaving(false);
        }
    }, [user, recipeDetails, isSaved, getIdToken, initialTitle, initialImageUrl]);
    // Fetch FULL recipe details from *your* backend (which handles caching)
    useEffect(() => {
        const fetchRecipeDetails = async () => {
            if (!recipeId) {
                console.error("No Recipe ID provided.");
                Alert.alert("Error", "Could not load recipe details (No ID).");
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                console.log(`Fetching details for recipe ${recipeId} from backend...`);
                const response = await axios.get(`${API_BASE_URL}/recipes/details/${recipeId}`);
                console.log("Received details from backend.");
                setRecipeDetails(response.data); // Set the full details
            } catch (error) {
                console.error("Error fetching recipe details from backend:", error.response ? JSON.stringify(error.response.data) : error.message);
                setRecipeDetails(null); // Clear details on error
                 Alert.alert(
                    "Error Loading Recipe",
                    error.response?.data?.message || "Could not fetch recipe details. Please try again later.",
                    [{ text: "OK" }]
                 );
                 // Optional: Navigate back if details fail critically
                 // navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchRecipeDetails();
    }, [recipeId]); // Re-fetch only if recipeId changes

     // --- Extract Nutrient Info using useMemo for performance ---
     const nutritionInfo = useMemo(() => {
        const nutrients = recipeDetails?.nutrition?.nutrients;
        if (!nutrients) return {}; // Return empty object if no nutrients

        const findNutrient = (name) => nutrients.find(n => n.name === name)?.amount;

        return {
            calories: findNutrient('Calories'),
            protein: findNutrient('Protein'),
            carbs: findNutrient('Carbohydrates'),
            fat: findNutrient('Fat'),
            fiber: findNutrient('Fiber'),
        };
    }, [recipeDetails]); // Recalculate only when recipeDetails changes

const handleLogFood = useCallback(async (mealTypeArgument) => { // Renamed arg for clarity
    // Use mealTypeArgument passed into this specific call
    if (!recipeDetails || !user || !user.uid) {
        Alert.alert("Error", "Cannot log food. User or recipe data missing.");
        return;
    }
    if (!mealTypeArgument) { // Check the argument
        Alert.alert("Error", "Meal type is missing for logging.");
        return;
    }

    setIsModalVisible(false);
    setIsLogging(true);

    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Date of the meal log

    const loggedFood = {
        uid: user.uid,
        mealType: mealTypeArgument.toLowerCase(), // <<<--- USE THE ARGUMENT
        date: dateString,
        source: 'recipe',
        recipeId: String(recipeDetails.id),
        title: recipeDetails.title || initialTitle || "Recipe",
        calories: nutritionInfo.calories ?? 0,
        protein: nutritionInfo.protein ?? 0,
        carbs: nutritionInfo.carbs ?? 0,
        fat: nutritionInfo.fat ?? 0,
        fiber: nutritionInfo.fiber ?? 0,
        imageUrl: recipeDetails.image || initialImageUrl || null,
    };

    console.log("RecipeDetail: Logging food data to backend:", JSON.stringify(loggedFood, null, 2));

    try {
        const token = await getIdToken();
        if (!token && user) {
            throw new Error("Authentication token issue. Please try logging in again.");
        }

        const logMealOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(loggedFood)
        };

        const logMealResponse = await fetch(`${API_BASE_URL}/logMeal/log-meal`, logMealOptions);
        // It's good practice to check if response is actually JSON before parsing
        const contentType = logMealResponse.headers.get("content-type");
        let logMealData;
        if (contentType && contentType.includes("application/json")) {
            logMealData = await logMealResponse.json();
        } else {
            // Handle non-JSON response or get text for error
            const textResponse = await logMealResponse.text();
            if (!logMealResponse.ok) throw new Error(`Server error (${logMealResponse.status}): ${textResponse.substring(0,100)}`);
            logMealData = { message: "Logged (non-JSON response)", raw: textResponse }; // Or handle differently
        }

        console.log("RecipeDetail: Backend logMeal response status:", logMealResponse.status);
        console.log("RecipeDetail: Backend logMeal response data:", JSON.stringify(logMealData, null, 2));

        if (!logMealResponse.ok) {
            throw new Error(logMealData.error || logMealData.message || `Logging meal failed (${logMealResponse.status})`);
        }

  

        // Check for "First Meal Logged" Achievement
        if (logMealData && logMealData.isFirstMeal === true) {
            console.log("RecipeDetail: This was user's first meal! Unlocking achievement.");
            try {
                await unlockAchievement('firstMealLogged');
                console.log("RecipeDetail: 'firstMealLogged' achievement unlocked.");
            } catch (gamificationError) {
                console.error("RecipeDetail: Error unlocking 'firstMealLogged':", gamificationError);
            }
        }

        // Call the separate endpoint to update streak
        if (user && token) { // Check token again for this separate call
            console.log("RecipeDetail: Meal logged. Now calling backend to update/check streak...");
            try {
                const streakResponse = await fetch(`${API_BASE_URL}/logMeal/update-streak`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ uid: user.uid, dateOfMealLog: dateString })
                });
                // Similar JSON check for streakResponse
                const streakContentType = streakResponse.headers.get("content-type");
                let streakData;
                if (streakContentType && streakContentType.includes("application/json")) {
                    streakData = await streakResponse.json();
                } else {
                    const textResp = await streakResponse.text();
                    if (!streakResponse.ok) throw new Error(`Streak update server error (${streakResponse.status}): ${textResp.substring(0,100)}`);
                    streakData = { message: "Streak updated (non-JSON response)", raw: textResp };
                }

                console.log("RecipeDetail: Streak update response data:", JSON.stringify(streakData, null, 2));
                if (!streakResponse.ok) {
                    console.error("RecipeDetail: Error from /update-streak:", streakData.error || streakData.message);
                } else {
                    if (streakData && streakData.achieved7DayStreak === true) {
                        console.log("RecipeDetail: 7-Day Streak achieved! Unlocking.");
                        await unlockAchievement('streak7Days');
                    }
                }
            } catch (streakCallError) {
                console.error("RecipeDetail: Failed to call /update-streak endpoint:", streakCallError);
            }
        } else { console.warn("RecipeDetail: Skipped streak update, no user or token."); }

        // navigation.navigate('Home'); // Optional: Navigate after all actions

    } catch (error) {
        const errorMessage = error.message || "Could not log meal. An unknown error occurred.";
        console.error("Error in handleLogFood process:", error);
        Alert.alert("Logging Error", errorMessage);
    } finally {
        setIsLogging(false);
    }
// --- V V V --- CORRECTED DEPENDENCIES --- V V V ---
}, [
    user,               // From context
    recipeDetails,      // From state (derived from route.params then fetch)
    initialTitle,       // From route.params
    initialImageUrl,    // From route.params
    nutritionInfo,      // Derived from recipeDetails state (useMemo)
    getIdToken,         // From context
    unlockAchievement,  // From context
    navigation          // From useNavigation()
    // 'mealTypeArgument' is an argument to the function, NOT a dependency from the outer scope.
]);
   if (loading) {
        return (
            <View style={styles.loadingContainer}> {/* Ensure this style exists */}
                 <ActivityIndicator size="large" color="#2E4A32" />
                 <Text style={{marginTop: 10}}>Loading Recipe Details...</Text>
            </View>
        );
    }
    if (!recipeDetails) {
        return (
            <View style={styles.centeredMessageContainer}> {/* Ensure this style exists */}
                <Ionicons name="alert-circle-outline" size={50} color="#E57373" />
                <Text style={styles.centeredMessageText}>Failed to load recipe details.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }
  
    return (
        <View style={styles.mainContainer}>
              <TouchableOpacity style={localstyles.arrowBack} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back-outline" size={26} color={PALETTE.white} />
                    </TouchableOpacity>
                     <TouchableOpacity
                        style={localstyles.iconButton}
                        onPress={handleToggleSaveRecipe}
                        disabled={isSaving || !recipeDetails}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={PALETTE.white} /> // Use white for overlay
                        ) : (
                            <Ionicons
                                name={isSaved ? "bookmark" : "bookmark-outline"}
                                size={26} // Consistent icon size
                                color={isSaved ? PALETTE.white : PALETTE.white} // Keep white for visibility on image
                            />
                        )}
                    </TouchableOpacity>
            
            <Image source={{ uri: recipeDetails.image || initialImageUrl }} style={styles.cardReImage} />
        
      
            <ScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* Use title from detailed response or fallback to initial */}
                <Text style={styles.titlerRecipe}>{recipeDetails.title || initialTitle}</Text>
                
                {/* General Info Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                         <Ionicons name="time-outline" size={18} color="#555" style={styles.iconStyle}/>
                        <Text style={styles.nutrientTitle}>Ready in:</Text>
                        <Text style={styles.nutrientValue}>{recipeDetails.readyInMinutes ? `${recipeDetails.readyInMinutes} min` : 'N/A'}</Text>
                    </View>
                     <View style={styles.sectionHeader}>
                          <Ionicons name="restaurant-outline" size={18} color="#555" style={styles.iconStyle}/>
                        <Text style={styles.nutrientTitle}>Servings:</Text>
                        <Text style={styles.nutrientValue}>{recipeDetails.servings || 'N/A'}</Text>
                    </View>
                    <View style={styles.sectionHeader}>
                         <Ionicons name="leaf-outline" size={18} color="#555" style={styles.iconStyle}/>
                        <Text style={styles.nutrientTitle}>Meal Type:</Text>
                        <Text style={styles.nutrientValue}>{recipeDetails.dishTypes?.join(', ') || 'N/A'}</Text>
                    </View>
                    <View style={styles.sectionHeader}>
                         <Ionicons name="nutrition-outline" size={18} color="#555" style={styles.iconStyle}/>
                        <Text style={styles.nutrientTitle}>Diet Type:</Text>
                        <Text style={styles.nutrientValue}>{recipeDetails.diets?.join(', ') || 'N/A'}</Text>
                    </View>
                </View>

                {/* Nutrition Section */}
                 <View style={styles.section}>
                     <Text style={styles.nutrientTitle}>Nutrition (per serving)</Text>
                     <View style={styles.sectionHeader}>
                         <Ionicons name="flame-outline" size={18} color="#555" style={styles.iconStyle}/>
                         <Text style={styles.nutrientTitle}>Calories:</Text>
                         <Text style={styles.nutrientValue}>{nutritionInfo.calories !== undefined ? `${nutritionInfo.calories.toFixed(0)} kcal` : 'N/A'}</Text>
                     </View>
                     <View style={styles.sectionHeader}>
                          <Ionicons name="fish-outline" size={18} color="#555" style={styles.iconStyle}/>
                         <Text style={styles.nutrientTitle}>Protein:</Text>
                         <Text style={styles.nutrientValue}>{nutritionInfo.protein !== undefined ? `${nutritionInfo.protein.toFixed(1)} g` : 'N/A'}</Text>
                     </View>
                     <View style={styles.sectionHeader}>
                          <Ionicons name="cellular-outline" size={18} color="#555" style={styles.iconStyle}/> {/* Placeholder icon */}
                         <Text style={styles.nutrientTitle}>Carbs:</Text>
                         <Text style={styles.nutrientValue}>{nutritionInfo.carbs !== undefined ? `${nutritionInfo.carbs.toFixed(1)} g` : 'N/A'}</Text>
                     </View>
                     <View style={styles.sectionHeader}>
                         <Ionicons name="water-outline" size={18} color="#555" style={styles.iconStyle}/> {/* Placeholder icon */}
                         <Text style={styles.nutrientTitle}>Fat:</Text>
                         <Text style={styles.nutrientValue}>{nutritionInfo.fat !== undefined ? `${nutritionInfo.fat.toFixed(1)} g` : 'N/A'}</Text>
                     </View>
                      <View style={styles.sectionHeader}>
                         <Ionicons name="leaf-outline" size={18} color="#555" style={styles.iconStyle}/> {/* Reusing icon */}
                         <Text style={styles.nutrientTitle}>Fiber:</Text>
                         <Text style={styles.nutrientValue}>{nutritionInfo.fiber !== undefined ? `${nutritionInfo.fiber.toFixed(1)} g` : 'N/A'}</Text>
                     </View>
                 </View>


                 {recipeDetails.extendedIngredients && recipeDetails.extendedIngredients.length > 0 && (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.nutrientTitle}>Ingredients:</Text>
                        {recipeDetails.extendedIngredients.map((ingredient, index) => (
                            <Text key={ingredient.id || index} style={styles.nutrientValue}>
                                • {ingredient.original} {/* Display original string for clarity */}
                            </Text>
                        ))}
                    </View>
                    // --- ^ ^ ^ --- End Change --- ^ ^ ^ ---
                )}

                {/* Instructions Section */}
                {recipeDetails.instructions && (
                    <View style={[styles.sectionHeader, { marginBottom: 40 }]}>
                         <Text style={styles.nutrientTitle}>Instructions:</Text>
                         {/* Basic parsing to handle HTML tags if present */}
                         <Text style={styles.nutrientValue}>{recipeDetails.instructions.replace(/<[^>]*>?/gm, '') || 'N/A'}</Text>
                    </View>
                    // --- ^ ^ ^ --- End Change --- ^ ^ ^ ---
                )}
                {/* --- Log Food Button --- */}
                <TouchableOpacity
                    style={[styles.button, styles.logButton, { alignSelf: 'center' }]} // Add specific logButton style if needed
                    onPress={() => setIsModalVisible(true)}
                    disabled={isLogging || loading} // Disable if details loading or currently logging
                >
                    {isLogging ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                         <View style={{flexDirection: 'row', alignItems: 'center'}}>
                             <Ionicons name="add-circle-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                             <Text style={{color: 'white', fontFamily: "Quicksand_700Bold",fontSize:20 }}>Log This Meal</Text>
                         </View>
                    )}
                </TouchableOpacity>

            </ScrollView>

            {/* --- Meal Selection Modal --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)} // Allow closing via back button on Android
            >
                <TouchableOpacity
                    style={modalStyles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setIsModalVisible(false)} // Close on background press
                >
                    <TouchableOpacity activeOpacity={1} style={modalStyles.modalContent} onPress={() => {}}>
                        <Text style={modalStyles.modalTitle}>Log as:</Text>
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((meal) => (
                            <TouchableOpacity
                                key={meal}
                                style={modalStyles.mealButton}
                                onPress={() => handleLogFood(meal)}
                                disabled={isLogging} // Prevent double-clicks while logging starts
                            >
                                <Text style={modalStyles.mealButtonText}>{meal}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={modalStyles.closeButton}
                            onPress={() => setIsModalVisible(false)}
                        >
                            <Text style={modalStyles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

export default RecipeDetail;

const localstyles = StyleSheet.create({

   
    arrowBack: { // Style for the touchable area of the overlay icons
        padding: 10, // Make tap area larger
        backgroundColor: 'rgba(0, 0, 0, 0.35)', // Slight dark overlay for icon visibility
        borderRadius: 25, 
        top: 30,
        left: 15,
        position: 'absolute', 
        zIndex: 100, 
    },
    iconButton: { // Style for the touchable area of the overlay icons
        padding: 10, // Make tap area larger
        backgroundColor: 'rgba(0, 0, 0, 0.35)', // Slight dark overlay for icon visibility
        borderRadius: 25, 
         top: 30,
        right: 15,
        position: 'absolute', // Position it absolutely
        zIndex: 1, // Ensure it appears above the image
    },
  
ingredientItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5, paddingLeft: 5, },
    bulletPoint: { marginRight: 8, fontSize: styles.nutrientValue?.fontSize || 14, lineHeight: styles.nutrientValue?.lineHeight || 20, color: styles.nutrientValue?.color || PALETTE.darkGrey, },
    ingredientText: { flex: 1, fontSize: styles.nutrientValue?.fontSize || 14, color: styles.nutrientValue?.color || PALETTE.darkGrey, fontFamily: styles.nutrientValue?.fontFamily, lineHeight: styles.nutrientValue?.lineHeight || 20, },
    instructionText: { fontSize: styles.nutrientValue?.fontSize || 14, color: styles.nutrientValue?.color || PALETTE.darkGrey, fontFamily: styles.nutrientValue?.fontFamily, lineHeight: styles.nutrientValue?.lineHeight || 22, paddingLeft: 5, }
   
   
    
   })