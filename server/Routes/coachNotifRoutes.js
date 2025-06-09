const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Route to update coach's push token
router.post('/update-push-token', notificationController.updateCoachPushToken);

// Route to get coach's notifications
router.get('/coach-notifications', notificationController.getCoachNotifications);

// Route to mark a coach notification as read
router.put('/mark-read/:notificationId', notificationController.markCoachNotificationAsRead);

module.exports = router;