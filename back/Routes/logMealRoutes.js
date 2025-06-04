// Routes/logMealRoutes.js (or your equivalent name)
const express = require('express');
// UPDATE THIS LINE to import both functions from YOUR controller file
const { logMeal, getCombinedDailyData, updateUserStreak } = require('../controllers/logMealController.js'); 
const { requireAuth } = require('../middleware/authMiddleware.js'); // Assuming you have this middleware for authentication
const router = express.Router();

// Your existing route for logging
router.post('/log-meal', logMeal); // Assuming this path is correct

// ADD THIS NEW ROUTE for fetching the combined data
router.get('/daily-data/:uid/:date', getCombinedDailyData);


// --- NEW ROUTE FOR STREAK ---
// Client calls this AFTER successfully logging a meal
router.post('/update-streak', requireAuth, updateUserStreak);
module.exports = router;