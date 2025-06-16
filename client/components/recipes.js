import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    ActivityIndicator, 
    TouchableOpacity, 
    TextInput, 
    RefreshControl 
} from 'react-native';
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

    // ✅ Simplified user data extraction
    const { uid, dietaryPreferences, nutritionPlan, otherDietaryText } = useMemo(() => ({
        uid: user?.uid,
        dietaryPreferences: user?.dietaryPreferences || [],
        nutritionPlan: user?.nutritionPlan || {},
        otherDietaryText: user?.otherDietaryText || '', 
    }), [user]);

    // ✅ Simple dietary preferences processing
    const processedDietaryPreferences = useMemo(() => {
        let prefs = Array.isArray(dietaryPreferences) ? [...dietaryPreferences] : [];
       
        // Remove "No Restrictions" if other preferences exist
        const noRestrictionsIndex = prefs.findIndex(p => p.includes("No Restrictions"));
        if (noRestrictionsIndex > -1) {
            if (prefs.length > 1) {
                prefs.splice(noRestrictionsIndex, 1); 
            } else {
                prefs = []; 
            }
        }
       
        // Add "Other" if otherDietaryText exists
        if (otherDietaryText && !prefs.some(p => p.toLowerCase().includes('other'))) {
            prefs.push('Other'); 
        }
        
        return prefs;
    }, [dietaryPreferences, otherDietaryText]);

    // ✅ Simplified fetch function - just call API and get results
    const fetchRecipes = useCallback(async (query = "", refreshing = false) => {
        if (!uid) {
            console.log("No UID, cannot fetch recipes.");
            setLoading(false);
            setIsRefreshing(false);
            return;
        }

        if (!refreshing) setLoading(true);

        try {
            // Extract nutrition goals with defaults
            const dailyCalories = nutritionPlan?.calories || 0;
            const proteinGoal = nutritionPlan?.protein || 0;
            const carbsGoal = nutritionPlan?.carbs || 0;
            const fatGoal = nutritionPlan?.fat || 0;
            const fiberGoal = nutritionPlan?.fiber?.max || 0;

            console.log("🍽️ Fetching recipes with criteria:", {
                uid, 
                dailyCalories, 
                proteinGoal, 
                carbsGoal, 
                fatGoal, 
                fiberGoal, 
                processedDietaryPreferences, 
                otherDietaryText, 
                query
            });

            // ✅ Simple API call
            const response = await axios.post(`${API_BASE_URL}/recipes/fetch-recipes`, {
                uid,
                dietaryPreferences: processedDietaryPreferences,
                otherDietaryText: processedDietaryPreferences.includes('Other') ? otherDietaryText : '',
                dailyCalories,
                proteinGoal,
                carbsGoal,
                fatGoal,
                fiberGoal,
                searchQuery: query,
            });

            console.log(`✅ Fetched ${response.data?.length || 0} recipes.`);
            setRecipes(response.data || []);

        } catch (error) {
            console.error("❌ Error fetching recipes:", error.response ? JSON.stringify(error.response.data) : error.message);
            
            const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred";
            alert("Error fetching recipes: " + errorMessage);
            setRecipes([]);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [uid, nutritionPlan, processedDietaryPreferences, otherDietaryText]);

    // Initial fetch on component mount
    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    // Search handler
    const handleSearch = () => {
        fetchRecipes(search);
    };

    // Pull-to-refresh handler
    const onRefresh = () => {
        setIsRefreshing(true);
        fetchRecipes(search, true);
    };

    // ✅ Loading state with animation
    if (loading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={require('../assets/Animations/recipes.json')}
                    autoPlay
                    loop
                    style={{ width: 300, height: 300 }}
                />
                <Text style={styles.loadingText}>Loading delicious recipes...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Dive Into Yummy Recipes"} />
            <TabNavigation />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search recipes (e.g., chicken pasta)"
                    style={styles.searchInput}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                />
                <TouchableOpacity onPress={handleSearch} disabled={loading}>
                    <Ionicons 
                        name="search" 
                        size={24} 
                        color={loading ? '#ccc' : '#2E4A32'} 
                    />
                </TouchableOpacity>
            </View>

            {/* Results */}
            {recipes.length === 0 && !loading ? (
                <View style={styles.centeredMessageContainer}>
                    <Ionicons name="restaurant-outline" size={64} color="#ccc" />
                    <Text style={styles.centeredMessageText}>
                        No recipes found matching your criteria.
                    </Text>
                    <Text style={styles.centeredMessageSubText}>
                        Try adjusting your search or preferences.
                    </Text>
                    <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    style={{ marginBottom: 10 }}
                    data={recipes}
                    renderItem={({ item }) => {
                        // Extract nutrition for card display
                        const calories = item.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount;
                        
                        return (
                            <Card
                                title={item.title}
                                description={`Ready in: ${item.readyInMinutes || 'N/A'} min`}
                                calories={calories ? `${Math.round(calories)} kcal` : 'N/A'}
                                imageUrl={item.image || 'https://via.placeholder.com/150?text=No+Image'}
                                onPress={() => navigation.navigate('RecipeDetail', {
                                    recipeId: item.id,
                                    imageUrl: item.image,
                                    title: item.title,
                                })}
                            />
                        );
                    }}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={["#2E4A32"]}
                            tintColor="#2E4A32"
                        />
                    }
                    ListEmptyComponent={!loading ? (
                        <View style={styles.centeredMessageContainer}>
                            <Text style={styles.centeredMessageText}>
                                Pull down to refresh or try a different search.
                            </Text>
                        </View>
                    ) : null}
                />
            )}
        </View>
    );
}