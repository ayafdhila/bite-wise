const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

// ✅ Use your existing notification controller
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadNotificationsCount
} = require('../controllers/notificationController');

// Apply auth middleware
router.use(requireAuth);

// GET /api/coach/notifications - Get all coach notifications
router.get('/notifications', (req, res) => {
    req.query.userType = 'coach'; // Set userType to coach
    getUserNotifications(req, res);
});

// PATCH /api/coach/notifications/:notificationId/read - Mark single notification as read
router.patch('/notifications/:notificationId/read', (req, res) => {
    req.query.userType = 'coach';
    markNotificationAsRead(req, res);
});

// PATCH /api/coach/notifications/mark-all-read - Mark all notifications as read
router.patch('/notifications/mark-all-read', (req, res) => {
    req.query.userType = 'coach';
    markAllNotificationsAsRead(req, res);
});

// DELETE /api/coach/notifications/:notificationId - Delete notification
router.delete('/notifications/:notificationId', (req, res) => {
    req.query.userType = 'coach';
    deleteNotification(req, res);
});

// GET /api/coach/notifications/unread-count - Get unread count for badge
router.get('/notifications/unread-count', (req, res) => {
    req.query.userType = 'coach';
    getUnreadNotificationsCount(req, res);
});

module.exports = router;