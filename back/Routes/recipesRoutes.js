// Routes/recipesRoutes.js
const express = require('express');
const {
    fetchRecipes,
    getRecipeDetails,
    // --- V V V --- Import the new controller functions --- V V V ---
    isRecipeSaved,
    saveRecipe,
    unsaveRecipe,
    getSavedRecipes
    // --- ^ ^ ^ --- End Import --- ^ ^ ^ ---
} = require('../controllers/recipesController'); // Assuming all these functions are now in recipesController.js
const { requireAuth } = require('../middleware/authMiddleware'); // Make sure this path is correct
const router = express.Router();

// Route to fetch a list of recipes based on criteria
// If auth is needed to personalize fetched recipes, add requireAuth here
router.post('/fetch-recipes',   fetchRecipes);

// Route to get details for a single recipe
// If auth is needed (e.g., to also check if user saved it), add requireAuth
router.get('/details/:recipeId',  getRecipeDetails);


// --- V V V --- NEW ROUTES FOR SAVED RECIPES --- V V V ---

// GET if a specific recipe is saved by the logged-in user
// Path: /recipes/:recipeId/is-saved
router.get('/:recipeId/is-saved', requireAuth, isRecipeSaved);

// POST to save a recipe for the logged-in user
// Path: /recipes/save
router.post('/save', requireAuth, saveRecipe);

// DELETE to unsave a recipe for the logged-in user
// Path: /recipes/:recipeId/unsave
router.delete('/:recipeId/unsave', requireAuth, unsaveRecipe);

// GET all recipes saved by the logged-in user
// Path: /recipes/saved (using a more specific path to avoid conflict)
router.get('/saved', requireAuth, getSavedRecipes);

// --- ^ ^ ^ --- END NEW ROUTES --- ^ ^ ^ ---


module.exports = router;