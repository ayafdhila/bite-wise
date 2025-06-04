// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController'); // Import the new controller
const { requireAuth } = require('../middleware/authMiddleware'); // Your auth middleware

// --- GET /messages/conversations ---
// Fetches the list of conversations for the currently logged-in user (could be Personal or Professional).
// The controller will determine which chats to show based on the user's UID being in the 'participants' array.
router.get('/conversations', requireAuth, messageController.getConversations);

// --- GET /messages/chats/:chatId/messages ---
// Fetches the messages within a specific chat conversation.
// The controller MUST verify the logged-in user is a participant of this chatId.
router.get('/chats/:chatId/messages', requireAuth, messageController.getChatMessages);

// --- POST /messages/chats/:chatId/messages ---
// Sends a new message within a specific chat conversation.
// The controller MUST verify the logged-in user is a participant and set sender/receiver IDs correctly.
router.post('/chats/:chatId/messages', requireAuth, messageController.sendChatMessage);

// --- POST /messages/chats/:chatId/read --- (Optional but Recommended)
// Endpoint for a user/coach to mark messages in a chat as read.
// This would typically reset their specific unread counter on the chat document.
// router.post('/chats/:chatId/read', requireAuth, messageController.markChatAsRead);
router.post('/find-or-create-chat', requireAuth, messageController.findOrCreateChat);

module.exports = router;