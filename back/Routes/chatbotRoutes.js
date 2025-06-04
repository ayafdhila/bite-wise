// File: routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController'); // Adjust path if needed
const { requireAuth } = require('../middleware/authMiddleware'); // Adjust path if needed

// --- Route Definition: POST /api/chatbot/message ---
// This route now requires authentication via the requireAuth middleware.
router.post(
    '/message', // Path relative to the mount point in server.js (e.g., /api/chatbot)

    // 1. Route Logging Middleware (Optional but helpful)
    // Logs that the route was hit, before authentication is checked.
    (req, res, next) => {
        console.log(`[Chatbot Route] ===> POST /message hit. Attempting authentication...`);
        console.log('[Chatbot Route] Request Body Received (Pre-Auth):', JSON.stringify(req.body, null, 2));
        next(); // Pass control to the next handler (requireAuth)
    },

    // 2. Authentication Middleware
    // If the token is invalid or missing, this middleware will send a 401 response
    // and stop the request from proceeding further.
    requireAuth,

    // 3. Controller Function
    // This function will only be executed if requireAuth calls next(),
    // meaning the user is authenticated. req.user will be available here.
    chatbotController.handleChatMessage
);

module.exports = router;