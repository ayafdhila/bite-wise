const { firebaseInstances } = require('../config/firebase');
const db = firebaseInstances.db;
const admin = firebaseInstances.admin;
const FieldValue = admin.firestore.FieldValue;

const axios = require('axios');
require('dotenv').config();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

if (!SPOONACULAR_API_KEY) {
    console.error("FATAL ERROR: SPOONACULAR_API_KEY is not defined in .env file.");
}

// Helper to check Firebase initialization
function checkFirebaseReady(res, action = "recipe action") {
    if (!db || !admin) {
        const missing = [!db && "DB", !admin && "Admin SDK"].filter(Boolean).join(', ');
        console.error(`FATAL: Firebase service(s) not initialized for ${action}: ${missing}`);
        if (!res.headersSent) {
            res.status(500).json({ error: `Server configuration error (${action}). Please try again later.` });
        }
        return false;
    }
    return true;
}

// ✅ SIMPLIFIED: Just fetch recipes from API without complex database checking
const fetchRecipes = async (req, res) => {
    if (!SPOONACULAR_API_KEY) {
        return res.status(500).json({ message: "Server configuration error: Missing Spoonacular API Key." });
    }

    try {
        const {
            uid,
            dietaryPreferences, 
            dailyCalories, 
            proteinGoal, 
            carbsGoal,
            fatGoal, 
            fiberGoal, 
            searchQuery, 
            otherDietaryText
        } = req.body;

        console.log(`🍽️ Fetching recipes for user ${uid}`);

        // --- Building Filter Parameters ---
        let apiDietParams = [];
        let apiIntoleranceParams = [];
        let apiExcludeIngredients = [];
        let nutrientFilters = {};

        const userPreferences = Array.isArray(dietaryPreferences) ? dietaryPreferences :
            (typeof dietaryPreferences === 'string' && dietaryPreferences.length > 0 ? dietaryPreferences.split(',') : []);

        userPreferences.forEach(pref => {
            if (!pref || typeof pref !== 'string') return;
            const cleanPref = pref.replace(/[^\w\s'-]/g, '').trim().toLowerCase();
            
            switch (cleanPref) {
                case 'vegan': 
                    apiDietParams.push('vegan'); 
                    break;
                case 'vegetarian': 
                    apiDietParams.push('vegetarian'); 
                    break;
                case 'pescetarian': 
                    apiDietParams.push('pescetarian'); 
                    break;
                case 'gluten free': 
                    apiDietParams.push('gluten free'); 
                    apiIntoleranceParams.push('gluten'); 
                    break;
                case 'lactose intolerance': 
                    apiIntoleranceParams.push('dairy'); 
                    break;
                case 'seafood or shellfish allergy': 
                    apiIntoleranceParams.push('seafood', 'shellfish'); 
                    break;
                case 'low-sodium diet': 
                    nutrientFilters.maxSodium = 1500; 
                    break;
                case 'diabetic-friendly diet': 
                    nutrientFilters.maxSugar = 25; 
                    break;
                case 'religious dietary restrictions halalkosher etc': 
                    apiExcludeIngredients.push('pork'); 
                    break;
                case 'other':
                    const otherTextLower = (otherDietaryText || '').toLowerCase();
                    if (otherTextLower.includes('peanut')) apiIntoleranceParams.push('peanut');
                    if (otherTextLower.includes('tree nut')) apiIntoleranceParams.push('tree nut');
                    if (otherTextLower.includes('egg')) apiIntoleranceParams.push('egg');
                    if (otherTextLower.includes('soy')) apiIntoleranceParams.push('soy');
                    if (otherTextLower.includes('fish') && !otherTextLower.includes('shellfish')) apiIntoleranceParams.push('fish');
                    break;
                case 'no restrictions': 
                default: 
                    break;
            }
        });

        // Remove duplicates
        apiDietParams = [...new Set(apiDietParams)];
        apiIntoleranceParams = [...new Set(apiIntoleranceParams)];
        apiExcludeIngredients = [...new Set(apiExcludeIngredients)];

        // ✅ Simple API call - get 20 recipes
        let numberToFetch = 20;
        let apiUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=${numberToFetch}&addRecipeNutrition=true&instructionsRequired=true&fillIngredients=false`;

        // Add filters to API URL
        if (dailyCalories && !isNaN(dailyCalories) && dailyCalories > 0) {
            apiUrl += `&maxCalories=${dailyCalories}`;
        }
        if (proteinGoal && !isNaN(proteinGoal) && proteinGoal > 0) {
            apiUrl += `&maxProtein=${proteinGoal}`;
        }
        if (carbsGoal && !isNaN(carbsGoal) && carbsGoal > 0) {
            apiUrl += `&maxCarbs=${carbsGoal}`;
        }
        if (fatGoal && !isNaN(fatGoal) && fatGoal > 0) {
            apiUrl += `&maxFat=${fatGoal}`;
        }
        if (fiberGoal && !isNaN(fiberGoal) && fiberGoal > 0) {
            apiUrl += `&maxFiber=${fiberGoal}`;
        }
        if (nutrientFilters.maxSodium) {
            apiUrl += `&maxSodium=${nutrientFilters.maxSodium}`;
        }
        if (nutrientFilters.maxSugar) {
            apiUrl += `&maxSugar=${nutrientFilters.maxSugar}`;
        }
        if (apiDietParams.length > 0) {
            apiUrl += `&diet=${apiDietParams.join(',')}`;
        }
        if (apiIntoleranceParams.length > 0) {
            apiUrl += `&intolerances=${apiIntoleranceParams.join(',')}`;
        }
        if (apiExcludeIngredients.length > 0) {
            apiUrl += `&excludeIngredients=${apiExcludeIngredients.join(',')}`;
        }
        if (searchQuery) {
            apiUrl += `&query=${encodeURIComponent(searchQuery)}`;
        }

        // Add some randomness for variety
        const randomOffset = Math.floor(Math.random() * 100);
        apiUrl += `&offset=${randomOffset}`;

        console.log("🔗 Calling Spoonacular API:", apiUrl);
        
        const spoonacularResponse = await axios.get(apiUrl);
        const recipesFromApi = spoonacularResponse.data.results || [];
        
        console.log(`✅ Fetched ${recipesFromApi.length} recipes from Spoonacular`);

        // ✅ Simple filter - just return recipes with nutrition
        const recipesWithNutrition = recipesFromApi.filter(r => r.nutrition?.nutrients?.length > 0);
        const resultToSend = recipesWithNutrition.length > 0 ? recipesWithNutrition : recipesFromApi;

        console.log(`📤 Returning ${resultToSend.length} recipes to client`);
        res.status(200).json(resultToSend);

    } catch (error) {
        console.error("❌ Error in fetchRecipes:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        
        if (error.response && error.response.status === 402) {
            return res.status(402).json({ message: "Spoonacular API quota likely exceeded." });
        }
        
        res.status(500).json({ 
            message: "Error fetching recipes", 
            details: error.message 
        });
    }
};

// ✅ Simplified recipe details - check cache first, then API
const getRecipeDetails = async (req, res) => {
    if (!checkFirebaseReady(res, "get recipe details")) return;
    
    const { recipeId } = req.params;
    if (!recipeId || isNaN(parseInt(recipeId))) {
        return res.status(400).json({ message: "Valid Recipe ID required." });
    }

    const recipeIdStr = String(recipeId);
    const recipeIdNum = parseInt(recipeId, 10);

    try {
        // ✅ Quick cache check
        const recipeRef = db.collection('recipes').doc(recipeIdStr);
        const doc = await recipeRef.get();

        if (doc.exists) {
            const data = doc.data();
            // Check if we have detailed data and it's recent (within 7 days)
            const cachedAt = data.cachedAt?.toDate();
            if (cachedAt && data.extendedIngredients && data.instructions) {
                const cacheAgeDays = (new Date().getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (cacheAgeDays < 7) {
                    console.log(`📋 Returning cached recipe details for ID ${recipeIdStr}`);
                    return res.status(200).json({ ...data, id: recipeIdNum });
                }
            }
        }

        // ✅ Fetch from API
        if (!SPOONACULAR_API_KEY) {
            return res.status(500).json({ message: "Server config error." });
        }

        const apiUrl = `https://api.spoonacular.com/recipes/${recipeIdNum}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`;
        console.log("🔗 Fetching detailed recipe from Spoonacular:", apiUrl);
        
        const response = await axios.get(apiUrl);
        const recipeDetailsFromApi = response.data;

        if (!recipeDetailsFromApi || !recipeDetailsFromApi.id) {
            return res.status(404).json({ message: `Recipe not found for ID ${recipeIdStr}.` });
        }

        // ✅ Simple cache update
        const dataToCache = {
            ...recipeDetailsFromApi,
            id: String(recipeDetailsFromApi.id),
            cachedAt: FieldValue.serverTimestamp(),
            sourceApi: "spoonacular_recipe_information"
        };

        await recipeRef.set(dataToCache, { merge: true });
        console.log(`💾 Cached detailed recipe for ID ${recipeIdStr}`);

        return res.status(200).json(recipeDetailsFromApi);

    } catch (error) {
        console.error(`❌ Error in getRecipeDetails for ID ${recipeIdStr}:`, error);
        res.status(500).json({ 
            message: "Error fetching recipe details", 
            error: error.message 
        });
    }
};

// ✅ Keep existing saved recipes functions (they're already simple)
const isRecipeSaved = async (req, res) => {
    if (!checkFirebaseReady(res, "check if recipe saved")) return;
    
    const userId = req.user?.uid;
    const { recipeId } = req.params;
    
    if (!userId || !recipeId) {
        return res.status(400).json({ error: "User ID and Recipe ID are required." });
    }

    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        const docSnap = await savedRecipeRef.get();
        res.status(200).json({ isSaved: docSnap.exists });
    } catch (error) {
        console.error("Error checking saved status:", error);
        res.status(500).json({ error: "Failed to check saved status." });
    }
};

const saveRecipe = async (req, res) => {
    if (!checkFirebaseReady(res, "save recipe")) return;
    
    const userId = req.user?.uid;
    const { recipeId, title, imageUrl } = req.body;
    
    if (!userId || !recipeId || !title || !imageUrl) {
        return res.status(400).json({ error: "Required fields missing." });
    }

    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        await savedRecipeRef.set({
            recipeId: String(recipeId),
            title,
            imageUrl,
            savedAt: FieldValue.serverTimestamp()
        });
        res.status(201).json({ message: "Recipe saved successfully." });
    } catch (error) {
        console.error("Error saving recipe:", error);
        res.status(500).json({ error: "Failed to save recipe." });
    }
};

const unsaveRecipe = async (req, res) => {
    if (!checkFirebaseReady(res, "unsave recipe")) return;
    
    const userId = req.user?.uid;
    const { recipeId } = req.params;
    
    if (!userId || !recipeId) {
        return res.status(400).json({ error: "Required fields missing." });
    }

    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        await savedRecipeRef.delete();
        res.status(200).json({ message: "Recipe unsaved successfully." });
    } catch (error) {
        console.error("Error unsaving recipe:", error);
        res.status(500).json({ error: "Failed to unsave recipe." });
    }
};

const getSavedRecipes = async (req, res) => {
    if (!checkFirebaseReady(res, "get saved recipes")) return;
    
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ error: "User auth missing." });
    }

    try {
        const savedRecipesQuery = db.collection('users').doc(userId).collection('savedRecipes').orderBy('savedAt', 'desc');
        const snapshot = await savedRecipesQuery.get();
        
        if (snapshot.empty) {
            return res.status(200).json({ savedRecipes: [] });
        }

        const savedRecipes = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        res.status(200).json({ savedRecipes });
    } catch (error) {
        console.error("Error fetching saved recipes:", error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) {
            console.error("!!! Firestore index missing for savedRecipes (savedAt DESC) !!!");
            return res.status(500).json({ 
                message: "DB index error.", 
                error: "Missing index." 
            });
        }
        res.status(500).json({ error: "Failed to fetch saved recipes." });
    }
};

module.exports = {
    fetchRecipes,
    getRecipeDetails,
    isRecipeSaved,
    saveRecipe,
    unsaveRecipe,
    getSavedRecipes
};