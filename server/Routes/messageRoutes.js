// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

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
router.post('/chats/:chatId/messages', requireAuth, async (req, res) => {
    try {
        // First, send the message using existing controller
        const result = await messageController.sendChatMessage(req, res);
        
        // If message was sent successfully, send notification
        if (result && req.user.userType === 'coach') {
            const { chatId } = req.params;
            const { content } = req.body;
            
            // Get chat participants to find the user
            const chatDoc = await admin.firestore()
                .collection('chats')
                .doc(chatId)
                .get();
                
            if (chatDoc.exists) {
                const chatData = chatDoc.data();
                const participants = chatData.participants || [];
                
                // Find the user (non-coach participant)
                const userId = participants.find(p => p !== req.user.uid);
                
                if (userId) {
                    // Get coach name
                    const coachDoc = await admin.firestore()
                        .collection('users')
                        .doc(req.user.uid)
                        .get();
                        
                    const coachName = coachDoc.exists ? 
                        (coachDoc.data().displayName || coachDoc.data().name || 'Your Coach') : 
                        'Your Coach';
                    
                    // Send notification
                    await notificationController.sendCoachMessageNotification(
                        userId, 
                        coachName, 
                        {
                            content,
                            senderId: req.user.uid,
                            chatId,
                            id: result.messageId // Assuming your controller returns the message ID
                        }
                    );
                }
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error sending message with notification:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// --- POST /messages/chats/:chatId/read --- (Optional but Recommended)
// Endpoint for a user/coach to mark messages in a chat as read.
// This would typically reset their specific unread counter on the chat document.
// router.post('/chats/:chatId/read', requireAuth, messageController.markChatAsRead);
router.post('/find-or-create-chat', requireAuth, messageController.findOrCreateChat);

module.exports = router;