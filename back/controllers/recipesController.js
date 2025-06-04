const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const db = firebaseInstances.db;
const admin = firebaseInstances.admin; // Needed for FieldValue and Timestamp
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp; // For creating Firestore Timestamps

const axios = require('axios');
require('dotenv').config(); // Ensures environment variables are loaded

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const RECIPE_CACHE_DURATION_DAYS = 7; // Cache recipe details for 7 days
const SEEN_RECIPE_EXPIRY_DAYS = 30;   // Consider a recipe "new" if not seen by user in last 30 days

if (!SPOONACULAR_API_KEY) {
    console.error("FATAL ERROR: SPOONACULAR_API_KEY is not defined in .env file.");
    // In a real production app, you might want to prevent the server from starting
    // or make the related endpoints return an error immediately.
    // process.exit(1);
}

// Helper to check Firebase initialization
function checkFirebaseReady(res, action = "recipe action") {
    if (!db || !admin) { // Check both db and admin (which includes FieldValue, Timestamp)
        const missing = [!db && "DB", !admin && "Admin SDK"].filter(Boolean).join(', ');
        console.error(`FATAL: Firebase service(s) not initialized for ${action}: ${missing}`);
        if (!res.headersSent) { // Prevent sending multiple responses if error already sent
            res.status(500).json({ error: `Server configuration error (${action}). Please try again later.` });
        }
        return false;
    }
    return true;
}

// --- Helper Function to Cache a Batch of Recipes in Firestore ---
async function cacheRecipesInFirestore(recipesFromApi) {
    if (!db || !recipesFromApi || recipesFromApi.length === 0) {
        console.log("cacheRecipesInFirestore: Skipping, no DB or no recipes to cache.");
        return;
    }
    console.log(`Attempting to cache/update ${recipesFromApi.length} recipes in Firestore...`);
    const batch = db.batch();
    let cachedCount = 0;

    recipesFromApi.forEach(recipe => {
        if (recipe.id) { // Ensure the recipe has an ID
            const recipeRef = db.collection('recipes').doc(String(recipe.id)); // Use a top-level 'recipes' collection for cache
            // Prepare data to cache - include all relevant fields from Spoonacular
            const dataToCache = {
                ...recipe, // Spread all properties from the API response
                nutrition: recipe.nutrition || { nutrients: [] }, // Ensure nutrition structure exists
                cachedAt: FieldValue.serverTimestamp(), // Mark when it was cached
                sourceApi: "spoonacular_complexSearch" // Indicate the source
            };
            // Use set with merge:true to create or update the document
            batch.set(recipeRef, dataToCache, { merge: true });
            cachedCount++;
        }
    });

    if (cachedCount > 0) {
        try {
            await batch.commit();
            console.log(`Successfully cached/updated ${cachedCount} recipes in Firestore.`);
        } catch (error) {
            console.error("Error batch caching recipes to Firestore:", error);
            // Continue even if caching fails, main goal is to serve recipes
        }
    } else {
        console.log("cacheRecipesInFirestore: No valid recipes with IDs to cache.");
    }
}

// --- Helper Function to Mark Recipes as Seen by a User ---
async function markRecipesAsSeen(userId, recipeIds) {
    if (!db || !userId || !recipeIds || recipeIds.length === 0) {
        console.log("markRecipesAsSeen: Skipping, missing parameters or no recipes to mark.");
        return;
    }
    const batch = db.batch();
    // Store seen recipes in a subcollection under the user
    const userSeenRecipesRef = db.collection('users').doc(userId).collection('seenRecipes');

    recipeIds.forEach(recipeId => {
        if (recipeId) { // Ensure recipeId is valid
            batch.set(userSeenRecipesRef.doc(String(recipeId)), { // Doc ID is the recipe ID
                seenAt: FieldValue.serverTimestamp()
            });
        }
    });

    // Check if any operations were added to the batch
    if (batch._ops.length > 0) {
        try {
            await batch.commit();
            console.log(`Marked ${recipeIds.filter(id => !!id).length} recipes as seen for user ${userId}`);
        } catch (error) {
            console.error(`Error marking recipes as seen for user ${userId}:`, error);
        }
    } else {
        console.log("markRecipesAsSeen: No valid recipe IDs to mark as seen.");
    }
}

// --- Helper Function to Get IDs of Recently Seen Recipes for a User ---
async function getRecentlySeenRecipeIds(userId) {
    if (!db || !userId) {
        console.log("getRecentlySeenRecipeIds: Skipping, no DB or userId.");
        return [];
    }
    const seenRecipeIds = [];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - SEEN_RECIPE_EXPIRY_DAYS);
    // Convert JS Date to Firestore Timestamp for querying
    const expiryTimestamp = Timestamp.fromDate(expiryDate);

    try {
        const snapshot = await db.collection('users').doc(userId).collection('seenRecipes')
            .where('seenAt', '>=', expiryTimestamp) // Query for recipes seen within the expiry window
            .get(); // <<< INDEX NEEDED: users/{userId}/seenRecipes (seenAt ASC or DESC)

        snapshot.forEach(doc => seenRecipeIds.push(doc.id));
        console.log(`User ${userId} has seen ${seenRecipeIds.length} recipes in the last ${SEEN_RECIPE_EXPIRY_DAYS} days.`);
        return seenRecipeIds;
    } catch (error) {
        console.error(`Error fetching recently seen recipes for user ${userId}:`, error);
        if (error.message?.includes("requires an index")) {
             console.error("!!! FIRESTORE INDEX LIKELY MISSING for getRecentlySeenRecipeIds query (users/{userId}/seenRecipes on 'seenAt') !!!");
        }
        return []; // Return empty on error
    }
}

// --- Main Function to Fetch Recipes ---
const fetchRecipes = async (req, res) => {
    if (!SPOONACULAR_API_KEY) {
        return res.status(500).json({ message: "Server configuration error: Missing Spoonacular API Key." });
    }
    if (!checkFirebaseReady(res, "fetch recipes")) return; // Check for DB/Admin for caching/seen logic

    try {
        const {
            uid, // User ID for tracking seen recipes
            dietaryPreferences, dailyCalories, proteinGoal, carbsGoal,
            fatGoal, fiberGoal, searchQuery, otherDietaryText,
            isRefresh // boolean, if true, try to fetch more varied results
        } = req.body;

        // --- Building Filter Parameters (Your Existing Logic) ---
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
                  case 'vegan': apiDietParams.push('vegan'); break;
                  case 'vegetarian': apiDietParams.push('vegetarian'); break;
                  case 'pescetarian': apiDietParams.push('pescetarian'); break;
                  case 'gluten free': apiDietParams.push('gluten free'); apiIntoleranceParams.push('gluten'); break;
                  case 'lactose intolerance': apiIntoleranceParams.push('dairy'); break;
                  case 'seafood or shellfish allergy': apiIntoleranceParams.push('seafood', 'shellfish'); break;
                  case 'low-sodium diet': nutrientFilters.maxSodium = 1500; break;
                  case 'diabetic-friendly diet': nutrientFilters.maxSugar = 25; break;
                  case 'religious dietary restrictions halalkosher etc': apiExcludeIngredients.push('pork'); break;
                  case 'other':
                      const otherTextLower = (otherDietaryText || '').toLowerCase();
                      if (otherTextLower.includes('peanut')) apiIntoleranceParams.push('peanut');
                      if (otherTextLower.includes('tree nut')) apiIntoleranceParams.push('tree nut');
                      if (otherTextLower.includes('egg')) apiIntoleranceParams.push('egg');
                      if (otherTextLower.includes('soy')) apiIntoleranceParams.push('soy');
                      if (otherTextLower.includes('fish') && !otherTextLower.includes('shellfish')) apiIntoleranceParams.push('fish');
                      break;
                  case 'no restrictions': default: break;
              }
        });
        apiDietParams = [...new Set(apiDietParams)];
        apiIntoleranceParams = [...new Set(apiIntoleranceParams)];
        apiExcludeIngredients = [...new Set(apiExcludeIngredients)];
        // --- End Building Filter Parameters ---

        // Fetch more from API to have a pool to choose from, especially if filtering seen recipes
        let numberToFetchFromSpoonacular = isRefresh === true ? 60 : 40; // Increased numbers
        let apiUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=${numberToFetchFromSpoonacular}&addRecipeNutrition=true&instructionsRequired=true&fillIngredients=false`;

        // Append constructed filters to API URL
        if (dailyCalories && !isNaN(dailyCalories) && dailyCalories > 0) apiUrl += `&maxCalories=${dailyCalories}`;
        if (proteinGoal && !isNaN(proteinGoal) && proteinGoal > 0) apiUrl += `&maxProtein=${proteinGoal}`;
        if (carbsGoal && !isNaN(carbsGoal) && carbsGoal > 0) apiUrl += `&maxCarbs=${carbsGoal}`;
        if (fatGoal && !isNaN(fatGoal) && fatGoal > 0) apiUrl += `&maxFat=${fatGoal}`;
        if (fiberGoal && !isNaN(fiberGoal) && fiberGoal > 0) apiUrl += `&maxFiber=${fiberGoal}`;
        if (nutrientFilters.maxSodium) apiUrl += `&maxSodium=${nutrientFilters.maxSodium}`;
        if (nutrientFilters.maxSugar) apiUrl += `&maxSugar=${nutrientFilters.maxSugar}`;
        if (apiDietParams.length > 0) apiUrl += `&diet=${apiDietParams.join(',')}`;
        if (apiIntoleranceParams.length > 0) apiUrl += `&intolerances=${apiIntoleranceParams.join(',')}`;
        if (apiExcludeIngredients.length > 0) apiUrl += `&excludeIngredients=${apiExcludeIngredients.join(',')}`;
        if (searchQuery) apiUrl += `&query=${encodeURIComponent(searchQuery)}`;

        // --- Offset for "Newness" ---
        const maxApiOffset = 500; // Max results Spoonacular typically allows for deep paging
        const randomOffset = numberToFetchFromSpoonacular > 0 ? Math.floor(Math.random() * (maxApiOffset / numberToFetchFromSpoonacular)) * numberToFetchFromSpoonacular : 0;
        apiUrl += `&offset=${randomOffset}`;
        console.log("Applying Spoonacular offset:", randomOffset);
        // --- End Offset ---

        console.log("Calling Spoonacular URL for fetchRecipes:", apiUrl);
        const spoonacularResponse = await axios.get(apiUrl);
        const recipesFromApi = spoonacularResponse.data.results || [];
        console.log(`Fetched ${recipesFromApi.length} raw recipes from Spoonacular.`);

        // Cache all fetched recipes in Firestore
        if (recipesFromApi.length > 0) {
            await cacheRecipesInFirestore(recipesFromApi);
        }

        // --- Filter out recently seen recipes for the specific user ---
        let recipesToConsider = [...recipesFromApi]; // Start with all fetched
        if (uid && recipesFromApi.length > 0) {
            const seenRecipeIds = await getRecentlySeenRecipeIds(uid);
            if (seenRecipeIds.length > 0) {
                recipesToConsider = recipesFromApi.filter(recipe => recipe.id && !seenRecipeIds.includes(String(recipe.id)));
                console.log(`${recipesToConsider.length} recipes remain after filtering ${seenRecipeIds.length} seen ones.`);
            }
        }

        // If filtering leaves too few, take from the original API results to ensure we have some
        if (recipesToConsider.length < 12 && recipesFromApi.length > 0) {
            console.log(`Not enough 'unseen' recipes (${recipesToConsider.length}), will use original API results to fill up to 12.`);
            // Add back some from original API list (that might have been seen) if needed
            const needed = 12 - recipesToConsider.length;
            const alreadyConsideredIds = new Set(recipesToConsider.map(r => r.id));
            const fallbacks = recipesFromApi.filter(r => r.id && !alreadyConsideredIds.has(r.id)).slice(0, needed);
            recipesToConsider.push(...fallbacks);
        }

        // --- Select final batch (e.g., 12) ---
        // Shuffle for more perceived randomness if desired
        // recipesToConsider.sort(() => 0.5 - Math.random()); // Basic shuffle
        let finalRecipes = recipesToConsider.slice(0, 12);

        // Mark the recipes that will be sent to the client as "seen" by this user
        if (uid && finalRecipes.length > 0) {
            await markRecipesAsSeen(uid, finalRecipes.map(r => r.id).filter(id => !!id));
        }

        // Filter for nutrition info (your existing logic)
        const recipesWithNutrition = finalRecipes.filter(r => r.nutrition?.nutrients?.length > 0);
        const resultToSend = recipesWithNutrition.length > 0 ? recipesWithNutrition : finalRecipes;

        console.log(`Returning ${resultToSend.length} recipes to client.`);
        res.status(200).json(resultToSend);

    } catch (error) {
        console.error("Error in fetchRecipes:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        if (error.response && error.response.status === 402) {
            return res.status(402).json({ message: "Spoonacular API quota likely exceeded." });
        }
        res.status(500).json({ message: "Error fetching recipes", details: error.message });
    }
};


const getRecipeDetails = async (req, res) => {
    if (!checkFirebaseReady(res, "get recipe details")) return;
    const { recipeId } = req.params;
    if (!recipeId || isNaN(parseInt(recipeId))) { // Ensure recipeId is treated as number for Spoonacular
        return res.status(400).json({ message: "Valid Recipe ID required." });
    }
    const recipeIdStr = String(recipeId);
    const recipeIdNum = parseInt(recipeId, 10); // Use number for API call if needed

    try {
        const recipeRef = db.collection('recipes').doc(recipeIdStr); // Cache uses string ID
        const doc = await recipeRef.get();

        let shouldFetchFromApi = true; // Assume we need to fetch by default

        if (doc.exists) {
            const data = doc.data();
            const cachedAt = data.cachedAt?.toDate();
            const now = new Date();
            if (cachedAt) {
                 const cacheAgeDays = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
                 // --- V V V --- CRUCIAL CHECK --- V V V ---
                 // Check if cached data *has* the detailed fields. If not, refetch.
                 if (cacheAgeDays < RECIPE_CACHE_DURATION_DAYS && data.extendedIngredients && data.instructions) {
                     console.log(`Returning CACHED and DETAILED recipe details for ID ${recipeIdStr}`);
                     // Ensure the 'id' field is correctly typed if frontend expects number
                     return res.status(200).json({ ...data, id: recipeIdNum });
                 }
                 // --- ^ ^ ^ --- END CRUCIAL CHECK --- ^ ^ ^ ---
                 console.log(`Cache for recipe ${recipeIdStr} is old or lacks details. Re-fetching.`);
            } else { console.log(`Cache for recipe ${recipeIdStr} has no cachedAt. Re-fetching.`); }
        } else { console.log(`Recipe ${recipeIdStr} not found in cache. Fetching from API.`); }

        // If shouldFetchFromApi is true (or reached here)
        if (shouldFetchFromApi) {
            if (!SPOONACULAR_API_KEY) return res.status(500).json({ message: "Server config error." });
            // --- V V V --- USE THE CORRECT SPOONACULAR ENDPOINT FOR DETAILS --- V V V ---
            const apiUrl = `https://api.spoonacular.com/recipes/${recipeIdNum}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`;
            // --- ^ ^ ^ --- END CORRECT ENDPOINT --- ^ ^ ^ ---
            console.log("Fetching DETAILED recipe info from Spoonacular:", apiUrl);
            const response = await axios.get(apiUrl);
            const recipeDetailsFromApi = response.data;

            if (!recipeDetailsFromApi || !recipeDetailsFromApi.id) {
                return res.status(404).json({ message: `Recipe not found (Spoonacular) for ID ${recipeIdStr}.` });
            }

            console.log("Backend: Spoonacular raw response - has extendedIngredients:", !!recipeDetailsFromApi.extendedIngredients, "has instructions:", !!recipeDetailsFromApi.instructions);

            // Prepare data for caching - ensure all necessary fields are included
            const dataToCache = {
                ...recipeDetailsFromApi, // This has extendedIngredients, instructions at root
                id: String(recipeDetailsFromApi.id), // Store ID as string in cache key
                cachedAt: FieldValue.serverTimestamp(),
                sourceApi: "spoonacular_recipe_information" // Mark as detailed fetch
            };
            // The key 'id' from Spoonacular detailed info is usually a number, ensure it matches if used in data
            // Our Firestore doc ID is string recipeIdStr
            await recipeRef.set(dataToCache, { merge: true });
            console.log(`Cached/Updated DETAILED recipe for ID ${recipeIdStr}.`);

            // Return the detailed data fetched from API
            return res.status(200).json(recipeDetailsFromApi); // recipeDetailsFromApi has the right structure
        }

    } catch (error) {
        console.error(`Error in getRecipeDetails for ID ${recipeIdStr}:`, error);
        // ... (your existing error handling) ...
        res.status(500).json({ message: "Error fetching recipe details", error: error.message });
    }
};
const isRecipeSaved = async (req, res) => {
    if (!checkFirebaseReady(res, "check if recipe saved")) return; // Uses the renamed helper
    const userId = req.user?.uid;
    const { recipeId } = req.params;
    if (!userId || !recipeId) return res.status(400).json({ error: "User ID and Recipe ID are required." });
    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        const docSnap = await savedRecipeRef.get();
        res.status(200).json({ isSaved: docSnap.exists });
    } catch (error) { console.error("Error checking saved status:", error); res.status(500).json({ error: "Failed to check saved status." }); }
};

const saveRecipe = async (req, res) => {
    if (!checkFirebaseReady(res, "save recipe")) return; // Uses the renamed helper
    const userId = req.user?.uid;
    const { recipeId, title, imageUrl } = req.body;
    if (!userId || !recipeId || !title || !imageUrl) return res.status(400).json({ error: "Required fields missing." });
    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        await savedRecipeRef.set({ recipeId: String(recipeId), title, imageUrl, savedAt: FieldValue.serverTimestamp() });
        res.status(201).json({ message: "Recipe saved successfully." });
    } catch (error) { console.error("Error saving recipe:", error); res.status(500).json({ error: "Failed to save recipe." }); }
};

const unsaveRecipe = async (req, res) => {
    if (!checkFirebaseReady(res, "unsave recipe")) return; // Uses the renamed helper
    const userId = req.user?.uid;
    const { recipeId } = req.params;
    if (!userId || !recipeId) return res.status(400).json({ error: "Required fields missing." });
    try {
        const savedRecipeRef = db.collection('users').doc(userId).collection('savedRecipes').doc(String(recipeId));
        await savedRecipeRef.delete();
        res.status(200).json({ message: "Recipe unsaved successfully." });
    } catch (error) { console.error("Error unsaving recipe:", error); res.status(500).json({ error: "Failed to unsave recipe." }); }
};

const getSavedRecipes = async (req, res) => {
    if (!checkFirebaseReady(res, "get saved recipes")) return; // Uses the renamed helper
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "User auth missing." });
    try {
        const savedRecipesQuery = db.collection('users').doc(userId).collection('savedRecipes').orderBy('savedAt', 'desc');
        const snapshot = await savedRecipesQuery.get(); // <<< CHECK INDEX (savedAt DESC)
        if (snapshot.empty) return res.status(200).json({ savedRecipes: [] });
        const savedRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ savedRecipes });
    } catch (error) {
        console.error("Error fetching saved recipes:", error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) { console.error("!!! Firestore index missing for savedRecipes (savedAt DESC) !!!"); return res.status(500).json({ message: "DB index error.", error: "Missing index." }); }
        res.status(500).json({ error: "Failed to fetch saved recipes." });
    }
};
// --- End Functions for Saved Recipes ---

module.exports = {
    fetchRecipes,
    getRecipeDetails,
    isRecipeSaved,
    saveRecipe,
    unsaveRecipe,
    getSavedRecipes
};