const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/authMiddleware'); // FIXED: Use requireAuth
const notificationController = require('../controllers/NotificationController');

const db = admin.firestore();

// Get user notifications
router.get('/user-notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        console.log(`📥 Fetching notifications for user ${userId}`);

        const notificationsRef = db.collection('users')
            .doc(userId)
            .collection('notifications')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .offset(offset);

        const snapshot = await notificationsRef.get();
        
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));

        console.log(`📤 Returning ${notifications.length} notifications`);

        res.json({ 
            notifications,
            total: notifications.length 
        });
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read - FIXED PATH
router.put('/api/notifications/mark-read/:id', requireAuth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.uid;

        console.log(`📖 Marking notification ${notificationId} as read for user ${userId}`);

        const notificationRef = db.collection('users')
            .doc(userId)
            .collection('notifications')
            .doc(notificationId);

        const doc = await notificationRef.get();
        if (!doc.exists) {
            console.log(`❌ Notification ${notificationId} not found`);
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.update({
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Notification ${notificationId} marked as read`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Delete notification - FIXED PATH
router.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.uid;

        console.log(`🗑️ Deleting notification ${notificationId} for user ${userId}`);

        const notificationRef = db.collection('users')
            .doc(userId)
            .collection('notifications')
            .doc(notificationId);

        const doc = await notificationRef.get();
        if (!doc.exists) {
            console.log(`❌ Notification ${notificationId} not found`);
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.delete();
        console.log(`✅ Notification ${notificationId} deleted`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Update push token
router.post('/users/update-push-token', requireAuth, async (req, res) => {
    try {
        const { pushToken } = req.body;
        const userId = req.user.uid;
        
        await db.collection('users').doc(userId).update({
            pushToken: pushToken,
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Push token updated successfully' });
    } catch (error) {
        console.error('Error updating push token:', error);
        res.status(500).json({ error: 'Failed to update push token' });
    }
});

module.exports = router;