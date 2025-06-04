import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl } from 'react-native'; // Added RefreshControl
import { AuthContext } from './AuthContext';
import Card from './Card'; 
import axios from 'axios';
import styles from './Styles'; 
import LottieView from 'lottie-react-native';
import Header from './Header'; 
import TabNavigation from './TabNavigation'; 
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Recipes({ navigation }) {
    const { user } = useContext(AuthContext);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false); 
  

    
    const { uid, dietaryPreferences, nutritionPlan, otherDietaryText } = useMemo(() => ({
        uid: user?.uid,
        dietaryPreferences: user?.dietaryPreferences || [],
        nutritionPlan: user?.nutritionPlan || {},
        otherDietaryText: user?.otherDietaryText || '', 
    }), [user]);

    
    const processedDietaryPreferences = useMemo(() => {
        let prefs = Array.isArray(dietaryPreferences) ? [...dietaryPreferences] : [];
       
        const noRestrictionsIndex = prefs.findIndex(p => p.includes("No Restrictions"));
        if (noRestrictionsIndex > -1) {
            if (prefs.length > 1) {
                prefs.splice(noRestrictionsIndex, 1); 
            } else {
                 prefs = []; 
            }
        }
       
         if (otherDietaryText && !prefs.some(p => p.toLowerCase().includes('other'))) {
             prefs.push('Other'); 
         }
        return prefs;
    }, [dietaryPreferences, otherDietaryText]);


   
    const fetchRecipes = useCallback(async (query = "", refreshing = false) => {
        if (!uid) {
            console.log("No UID, cannot fetch recipes.");
            setLoading(false);
            setIsRefreshing(false);
            return;
        }
        if (!refreshing) setLoading(true); 

        try {
            // Extract goals, providing defaults
            const dailyCalories = nutritionPlan?.calories || 0;
            const proteinGoal = nutritionPlan?.protein || 0;
            const carbsGoal = nutritionPlan?.carbs || 0;
            const fatGoal = nutritionPlan?.fat || 0;
            const fiberGoal = nutritionPlan?.fiber?.max || 0; // Use max fiber

            console.log("Fetching recipes with criteria:", {
                 uid, dailyCalories, proteinGoal, carbsGoal, fatGoal, fiberGoal, processedDietaryPreferences, otherDietaryText, query
            });


            const response = await axios.post(`${API_BASE_URL}/recipes/fetch-recipes`, {
                uid,
                dietaryPreferences: processedDietaryPreferences, // Send processed list
                otherDietaryText: processedDietaryPreferences.includes('Other') ? otherDietaryText : '', // Send text only if 'Other' is selected
                dailyCalories,
                proteinGoal,
                carbsGoal,
                fatGoal,
                fiberGoal,
                searchQuery: query,
            });

            console.log(`Fetched ${response.data?.length || 0} recipes.`);
            setRecipes(response.data || []); // Handle empty response

        } catch (error) {
            console.error("Error fetching recipes:", error.response ? JSON.stringify(error.response.data) : error.message);
            alert("Error fetching recipes: " + (error.response?.data?.message || error.message));
            setRecipes([]); // Clear recipes on error
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [uid, nutritionPlan, processedDietaryPreferences, otherDietaryText]); // Dependencies for useCallback

    // Initial fetch on component mount or when UID changes
    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]); // Depend on the memoized fetchRecipes function

    // Handler for search button press
    const handleSearch = () => {
        fetchRecipes(search); // Pass the current search term
    };

    // Handler for pull-to-refresh
    const onRefresh = () => {
        setIsRefreshing(true);
        fetchRecipes(search, true); // Fetch with current search, indicate refreshing
    };

    // --- Render Logic ---
    if (loading && !isRefreshing) { // Show Lottie only on initial load
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={require('../assets/Animations/recipes.json')} // Adjust path if needed
                    autoPlay
                    loop
                    style={{ width: 300, height: 300 }}
                />
                <Text>Loading recipes...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Dive Into Yummy Recipes"} />
            <TabNavigation />

            <View style={styles.searchContainer}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search recipes (e.g., chicken pasta)"
                    style={styles.searchInput}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch} // Allow searching via keyboard
                />
                <TouchableOpacity onPress={handleSearch} disabled={loading}>
                    <Ionicons name="search" size={24} color={loading ? '#ccc' : '#2E4A32'} />
                </TouchableOpacity>
            </View>

            {recipes.length === 0 && !loading ? (
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.centeredMessageText}>No recipes found matching your criteria.</Text>
                    <Text style={styles.centeredMessageSubText}>Try adjusting your search or preferences.</Text>
                     <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                     </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    style={{ marginBottom: 10 }} // Adjust as needed for TabNavigation overlap
                    data={recipes}
                    renderItem={({ item }) => {
                         // Extract simple nutrition for the card display if available
                         const calories = item.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount;
                         return (
                            <Card
                                title={item.title}
                                description={`Ready in: ${item.readyInMinutes || 'N/A'} min`}
                                calories={calories ? `${Math.round(calories)} kcal` : 'N/A'}
                                imageUrl={item.image || 'https://via.placeholder.com/150?text=No+Image'} // Placeholder
                                onPress={() => navigation.navigate('RecipeDetail', {
                                    recipeId: item.id,
                                    // Pass basic info needed by detail screen initially
                                    imageUrl: item.image,
                                    title: item.title,
                                })}
                            />
                         );
                    }}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={ // Add pull-to-refresh
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={["#2E4A32"]} // Spinner color
                        />
                    }
                    ListEmptyComponent={!loading ? ( // Show only if not loading and list is empty after fetch
                        <View style={styles.centeredMessageContainer}>
                           <Text style={styles.centeredMessageText}>Pull down to refresh or try a different search.</Text>
                        </View>
                     ) : null}
                />
            )}
        </View>
    );
}