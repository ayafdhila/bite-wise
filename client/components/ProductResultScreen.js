// Fichier: ProductResultScreen.js

import React, { useState, useEffect, useContext } from 'react'; // Import useContext
import {
    View, Text, StyleSheet, Image, ActivityIndicator,
    Alert, ScrollView, TouchableOpacity, Platform, Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// *** CHANGE THIS IMPORT: Import AuthContext itself, NOT the useAuth hook ***
import { AuthContext } from '../components/AuthContext';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';
import Header from './Header';
import { GamificationContext } from '../components/GamificationContext';
// --- API Config ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const LOG_MEAL_ENDPOINT = "/logMeal";

// --- Optional API URL Check ---
if (!API_BASE_URL) {
    console.error("FATAL ERROR: API_BASE_URL not defined in ProductResultScreen.js.");
    // Handle missing URL... Alert? Disable features?
}

// --- Helper Functions (Keep as is) ---
const getCurrentDate = () => new Date().toISOString().split('T')[0];
const NutrientProgressCircle = ({ label, value, maxValue, unit = 'g', size = 80, strokeWidth = 8 }) => {
    // ... (Keep your existing NutrientProgressCircle implementation) ...
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const validValue = (typeof value === 'number' && !isNaN(value));
    const validMaxValue = (typeof maxValue === 'number' && !isNaN(maxValue) && maxValue > 0);
    const progress = (validValue && validMaxValue) ? Math.min(value / maxValue, 1) : 0;
    const strokeDashoffset = circumference * (1 - progress);
    const precision = unit === 'kcal' ? 0 : (value < 10 ? 1 : 0);
    const displayValueText = validValue ? `${value.toFixed(precision)}${unit}` : 'N/A';
    const backgroundColor = '#F0EAD6';
    const progressColor = '#556B2F';
    const textColor = '#333333';
    const labelColor = '#556B2F';

    return (
        <View style={styles.circleContainer}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    <Circle cx={size / 2} cy={size / 2} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} fill="none" />
                    {validValue && progress > 0 && (
                         <Circle cx={size / 2} cy={size / 2} r={radius} stroke={progressColor} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                    )}
                </G>
                <SvgText x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="11" fontWeight="600" fill={textColor} > / 100g </SvgText>
            </Svg>
            <Text style={[styles.circleLabel, { color: labelColor }]}>{label}</Text>
            <Text style={styles.circleValueText}>{displayValueText}</Text>
        </View>
    );
}; 


const ProductResultScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useContext(AuthContext);
    const { unlockAchievement } = useContext(GamificationContext);
    const { productData: initialProductData, mealType } = route.params;

    const [isLogging, setIsLogging] = useState(false);
    const [productData, setProductData] = useState(initialProductData);
    const [error, setError] = useState(null); 

    useEffect(() => {
        if (!initialProductData || !mealType) {
            console.error("Error: Missing data received by ProductResultScreen", { initialProductData, mealType });
            Alert.alert("Data Error","Could not display product details. Required info missing.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
            setError("Product data or meal type missing.");
        }
  
        else if (initialProductData !== productData) {
            setProductData(initialProductData);
         }
    }, [initialProductData, mealType, navigation]); 

    // --- Log Food Handler ---
    const handleLogFood = async () => {
   
        if (!user?.uid) { Alert.alert("Error", "User not logged in."); return; }
        if (!productData) { Alert.alert("Error", "No product data to log."); return; }
        if (!mealType) { Alert.alert("Error", "Meal type missing."); return; }
        if (isLogging) return; 
         if (!API_BASE_URL) { Alert.alert("Error", "API URL configuration missing."); return; } // Check URL

        setIsLogging(true);
        setError(null);
        const date = getCurrentDate();

        const mealPayload = {
            uid: user.uid,
            mealType: mealType,
            date: date,
            title: productData.product_name || 'Scanned Product',

            calories: productData.calories_only_per_100g ?? 0,
            protein: productData.protein_per_100g ?? 0,
            carbs: productData.carbs_per_100g ?? 0,
            fat: productData.fat_per_100g ?? 0,
            fiber: productData.fiber_per_100g ?? 0,
            imageUrl: productData.image_url || productData.image_front_url || null, 
            source: productData.source || `barcode-${productData.barcode}`,
            barcode: productData.barcode || null,
            recipeId: null, 
             servingSize: 100,
             servingUnit: 'g'
        };

        console.log("Logging meal with payload:", JSON.stringify(mealPayload, null, 2));

        try {
         
            const response = await fetch(`${API_BASE_URL}/logMeal/log-meal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(mealPayload),
            });


            let responseBody;
            try { responseBody = await response.json(); }
            catch(e){
                 if(response.ok) responseBody = { message: "Meal logged (empty response)" };
                 else throw new Error(`Server error (${response.status}) - Non-JSON response`);
                 
            }

            if (!response.ok) {
                throw new Error(responseBody.message || responseBody.error || `Server error (${response.status})`);
            }

            console.log("Meal logged successfully! Response:", responseBody);
            Alert.alert("Success", `${mealPayload.title} added to your ${mealType}!`);
            if (responseBody && responseBody.isFirstMeal === true) {
                console.log("ProductResultScreen: This was user's first meal! Unlocking achievement...");
                try {
                    // Use the key defined in GamificationContext > ACHIEVEMENT_DETAILS
                    await unlockAchievement('firstMealLogged');
                    console.log("ProductResultScreen: 'firstMealLogged' achievement unlocked via context.");
                } catch (gamificationError) {
                    console.error("ProductResultScreen: Error unlocking 'firstMealLogged' achievement:", gamificationError);
                }
            
            } else {
                console.log("ProductResultScreen: Not the first meal or backend didn't indicate it.");
            }

        } catch (err) {
            console.error("Error logging meal:", err);
            setError(`Logging failed: ${err.message}`); 
            Alert.alert("Logging Failed", `Could not log meal: ${err.message}`);
        } finally {
            setIsLogging(false); 
        }
    };

  
    const handleIgnore = () => {
        console.log("Product ignored.");
        navigation.goBack(); 
    };

    const maxValues = { calories: 600, fat: 50, protein: 50, carbs: 100, fiber: 25 };

    // --- Loading/Error State Render ---
    // If initial data validation failed
    if (error && !isLogging) {
        return ( /* ... Keep your existing error display View ... */
             <View style={styles.screenContainer}>
                 <View style={styles.headerContainer}>
                     <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={28} color="#3F4A3A" /></TouchableOpacity>
                     <Text style={styles.headerTitle}>Product Error</Text>
                     <View style={{ width: 28 }} />
                 </View>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={60} color="#D32F2F" style={{ marginBottom: 15 }}/>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.simpleButton}><Text style={styles.simpleButtonText}>Go Back</Text></TouchableOpacity>
                </View>
            </View>
        );
    }
    // If productData is somehow null after initial checks (shouldn't happen often)
     if (!productData) {
         return <View style={styles.centered}><ActivityIndicator size="large" color="#556B2F" /></View>;
     }

    // --- Extract data for rendering (Keep as is) ---
    const productName = productData.product_name || "Unknown Product";
    const imageUrl = productData.image_url || productData.image_front_url;
    const ingredientsDescription = productData.ingredients_description_with_calories || "Description not available.";
    const brand = productData.brand || "Unknown Brand";

    // --- Main JSX Return ---
    return (
        <View style={styles.screenContainer}>
            
             <View style={styles.headerContainer}>
                 <Header subtitle={"Scanning Result"}/>
                
             </View>

            {/* --- Scrollable Content --- */}
            <ScrollView contentContainerStyle={styles.scrollContentContainer}>
                {/* Product Name and Brand */}
                <Text style={styles.productName}>{productName}</Text>
                <Text style={styles.brandText}>{brand}</Text>

                {/* Image or Placeholder */}
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="contain" />
                ) : (
                    <View style={styles.imagePlaceholder}>
                       <Image source={require('../assets/Images/DefaultProduct.png')} // Use a default product image asset
                              style={styles.placeholderImageStyle} resizeMode="contain" />
                       <Text style={styles.placeholderText}>No Image Available</Text>
                    </View>
                 )}

                 {/* Ingredients Description */}
                 <View style={styles.descriptionContainer}>
                     <Text style={styles.descriptionTitle}>Description & Calories (/100g)</Text>
                     <Text style={styles.descriptionText}>{ingredientsDescription}</Text>
                 </View>

                {/* Nutrients Title */}
                <Text style={styles.nutrientsTitle}>Nutrients per 100g</Text>

                {/* Nutrient Circles */}
                <View style={styles.circlesRow}>
                    <NutrientProgressCircle label="Calories" value={productData.calories_only_per_100g} maxValue={maxValues.calories} unit="kcal" />
                    <NutrientProgressCircle label="Fat" value={productData.fat_per_100g} maxValue={maxValues.fat} unit="g" />
                    <NutrientProgressCircle label="Protein" value={productData.protein_per_100g} maxValue={maxValues.protein} unit="g" />
                </View>
                <View style={[styles.circlesRow, styles.circlesRowBottom]}>
                    <NutrientProgressCircle label="Carbs" value={productData.carbs_per_100g} maxValue={maxValues.carbs} unit="g" />
                    <NutrientProgressCircle label="Fiber" value={productData.fiber_per_100g} maxValue={maxValues.fiber} unit="g" />
                </View>

                {/* Display logging error message if one occurred */}
                {error && isLogging && <Text style={[styles.errorText, { marginTop: 15 }]}>{error}</Text>}

            </ScrollView>

            {/* --- Action Buttons (Fixed Bottom) --- */}
            <View style={styles.buttonSection}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.addButton, isLogging && styles.actionButtonDisabled]}
                    onPress={handleLogFood}
                    disabled={isLogging}
                >
                    {isLogging ? (
                        <ActivityIndicator color="#F5E4C3" size="small"/>
                    ) : (
                        <Text style={[styles.actionButtonText, { color: '#F5E4C3' }]}> Add to "{mealType}" </Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.ignoreButton, isLogging && styles.actionButtonDisabled]}
                    onPress={handleIgnore}
                    disabled={isLogging}
                >
                    <Text style={[styles.actionButtonText, styles.ignoreButtonText]}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Styles --- (Keep your existing styles as they were correctly defined)
const styles = StyleSheet.create({
    // ... Paste your full styles object here ...
    screenContainer: { flex: 1, backgroundColor: '#F5E4C3' },

    backButton: { padding: 5 },
    
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#F8F8F8' },
    scrollContentContainer: { paddingHorizontal: 20, paddingBottom: 120,  alignItems: 'center' },
    productName: { fontSize: 24, fontFamily: "Quicksand_700Bold", color: '#2E4A32', textAlign: 'center', marginTop: 20, marginBottom: 5 },
    brandText: { fontSize: 20, color: '#666', textAlign: 'center', marginBottom: 25, fontFamily: "Quicksand_700Bold" },
    productImage: { width: '95%', aspectRatio: 1, marginBottom: 25, alignSelf: 'center', borderRadius: 20, backgroundColor: '#FCCF94', borderWidth: 1, borderColor: '#eee' },
    imagePlaceholder: { width: '95%', aspectRatio: 1, marginBottom: 25, alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', padding: 10 },
    placeholderImageStyle: { width: '55%', height: '55%', opacity: 0.6 },
    placeholderText: { marginTop: 8, fontSize: 12 },
    descriptionContainer: { backgroundColor: '#FCCF94', padding: 18, borderRadius: 20, marginBottom: 25, width: '95%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.5 },
    descriptionTitle: { fontSize: 17, fontFamily: "Quicksand_700Bold", color: '#2E4A32', marginBottom: 10 },
    descriptionText: { fontSize: 14, color: 'black', lineHeight: 21, fontFamily: "Quicksand_600SemiBold" },
    nutrientsTitle: { fontSize: 19, fontFamily: "Quicksand_700Bold", marginBottom: 20, color: '#2E4A32', alignSelf: 'left', paddingHorizontal: 25 },
    circlesRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', width: '100%', marginBottom: 10 },
    circlesRowBottom: { marginBottom: 25 },
    circleContainer: { alignItems: 'center', paddingHorizontal: 5, marginBottom: 10 },
    circleLabel: { marginTop: 6, fontSize: 14, fontFamily: "Quicksand_700Bold", color: '#556B2F', textAlign: 'center' },
    circleValueText: { fontSize: 15, fontFamily: "Quicksand_700Bold", color: '#333333', marginTop: 3, textAlign: 'center' },
    buttonSection: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 35 : 20, borderTopWidth: 1, borderTopColor: '#D3D3D3', backgroundColor: '#88A76C' },
    actionButton: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 50, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    addButton: { backgroundColor: '#2E4A32' /* Dark Olive Green */ },
    ignoreButton: { backgroundColor: '#FCCF94' /* Lighter Green/Grey */ },
    actionButtonText: { fontSize: 16, fontFamily: "Quicksand_700Bold" },
    ignoreButtonText: { color: 'black',fontFamily: "Quicksand_700Bold"  },
    actionButtonDisabled: { opacity: 0.6 }, // Style for disabled buttons
    errorText: { color: '#D32F2F', fontSize: 15, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
    simpleButton: { marginTop: 25, paddingVertical: 10, paddingHorizontal: 30, backgroundColor: '#888', borderRadius: 20 },
    simpleButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: "Quicksand_700Bold" },
});

export default ProductResultScreen;