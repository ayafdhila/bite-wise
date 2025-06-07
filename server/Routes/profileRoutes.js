// Example: routes/userRoutes.js (or similar)
const express = require('express');
const router = express.Router();
// Assuming profileController handles these now, adjust if needed
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware'); // Your auth middleware

// --- User Profile & Data Routes ---

// GET /user/profile - Fetch the LOGGED-IN user's profile
router.get('/profile', requireAuth, profileController.getUserProfile);

// POST /user/log-weight - Log weight for the LOGGED-IN user
router.post('/log-weight', requireAuth, profileController.logWeight);

// GET /user/calorie-history - Get calorie history for the LOGGED-IN user
// Query parameter `period` is handled by req.query in the controller
router.get('/calorie-history', requireAuth, profileController.getCalorieHistory);

// *** REMOVE OR MODIFY routes like '/:uid' or '/calorie-history/:uid' ***
// If you have routes like these, they are likely causing the conflict
// router.get('/:uid', ... ); // <-- REMOVE or ensure it's for viewing OTHER users (with different permissions)
// router.get('/calorie-history/:uid', ...); // <-- REMOVE, use the one above without :uid

module.exports = router;