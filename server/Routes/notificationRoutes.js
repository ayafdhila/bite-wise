const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadNotificationsCount,
    sendMessageNotification,
    sendInvitationNotification,
    sendNutritionPlanNotification,
    sendTestNotifications,
    saveExpoPushToken
} = require('../controllers/notificationController');

// Routes pour les notifications
router.get('/notifications', requireAuth, getUserNotifications);
router.get('/notifications/unread-count', requireAuth, getUnreadNotificationsCount);
router.put('/notifications/:notificationId/read', requireAuth, markNotificationAsRead);
router.put('/notifications/mark-all-read', requireAuth, markAllNotificationsAsRead);
router.delete('/notifications/:notificationId', requireAuth, deleteNotification);

// ✅ FIXED: Match what frontend expects
router.post('/notifications/token', requireAuth, saveExpoPushToken);

// ✅ FIXED: Add the missing test route
router.post('/notifications/test', requireAuth, async (req, res) => {
    try {
        console.log('📱 Test notification requested by:', req.user.uid);
        res.status(200).json({ 
            message: 'Test notification endpoint working',
            note: 'Local notification will be created in frontend'
        });
    } catch (error) {
        console.error('Error in test notification endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Routes pour envoyer des notifications d'événements
router.post('/notifications/message', requireAuth, sendMessageNotification);
router.post('/notifications/invitation', requireAuth, sendInvitationNotification);
router.post('/notifications/nutrition-plan', requireAuth, sendNutritionPlanNotification);

// Route pour les notifications de test complet (admin/dev)
router.post('/notifications/test-full', requireAuth, sendTestNotifications);

module.exports = router;