const { firebaseInstances } = require('../config/firebase');
const {
    sendNewMessageNotification,
    sendInvitationSentNotification,
    sendInvitationReceivedNotification,
    sendInvitationAcceptedNotification,
    sendNutritionPlanCreatedNotification,
    sendNutritionPlanUpdatedNotification,
    sendDailyMotivationalNotifications,
    sendCoachMotivationalNotifications
} = require('../services/notificationService');

let db;

function initializeController() {
    if (!firebaseInstances.db) {
        console.error("[NotificationController] Database not initialized");
        return false;
    }
    db = firebaseInstances.db;
    console.log("[NotificationController] Initialized successfully");
    return true;
}

// Récupérer les notifications d'un utilisateur
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 20;
        const userType = req.query.userType || 'user'; // 'user' ou 'coach'

        console.log(`[NotificationController] Fetching notifications for ${userType} ${userId}`);

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const notificationsRef = db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .where('isVisible', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        const snapshot = await notificationsRef.get();
        
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));

        console.log(`[NotificationController] Returning ${notifications.length} notifications`);

        res.status(200).json({ 
            notifications,
            total: notifications.length 
        });
    } catch (error) {
        console.error('[NotificationController] Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Marquer une notification comme lue
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.uid;
        const userType = req.query.userType || 'user';

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const notificationRef = db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .doc(notificationId);

        const doc = await notificationRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.update({
            isRead: true,
            readAt: firebaseInstances.admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[NotificationController] Notification ${notificationId} marked as read`);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[NotificationController] Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Marquer toutes les notifications comme lues
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.uid;
        const userType = req.query.userType || 'user';

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const notificationsRef = db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .where('isRead', '==', false);

        const snapshot = await notificationsRef.get();
        
        if (snapshot.empty) {
            return res.status(200).json({ message: 'No unread notifications found' });
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                readAt: firebaseInstances.admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        
        console.log(`[NotificationController] Marked ${snapshot.size} notifications as read`);
        res.status(200).json({ 
            message: `${snapshot.size} notifications marked as read`,
            count: snapshot.size 
        });
    } catch (error) {
        console.error('[NotificationController] Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

// Supprimer une notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.uid;
        const userType = req.query.userType || 'user';

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const notificationRef = db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .doc(notificationId);

        const doc = await notificationRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.delete();
        console.log(`[NotificationController] Notification ${notificationId} deleted`);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[NotificationController] Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// Compter les notifications non lues
const getUnreadNotificationsCount = async (req, res) => {
    try {
        const userId = req.user.uid;
        const userType = req.query.userType || 'user';

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const unreadQuery = db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .where('isRead', '==', false)
            .where('isVisible', '==', true);

        const snapshot = await unreadQuery.count().get();
        const count = snapshot.data().count;

        console.log(`[NotificationController] Unread count for ${userType} ${userId}: ${count}`);
        res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error('[NotificationController] Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread notifications count' });
    }
};

// Envoyer notification de nouveau message
const sendMessageNotification = async (req, res) => {
    try {
        const { receiverId, senderName, receiverType = 'user', messagePreview = '' } = req.body;
        
        if (!receiverId || !senderName) {
            return res.status(400).json({ error: 'receiverId and senderName are required' });
        }

        const result = await sendNewMessageNotification(receiverId, senderName, receiverType, messagePreview);
        
        if (result.success) {
            res.status(200).json({ 
                message: 'Message notification sent successfully',
                ticketId: result.ticketId 
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[NotificationController] Error sending message notification:', error);
        res.status(500).json({ error: 'Failed to send message notification' });
    }
};

// Envoyer notification d'invitation
const sendInvitationNotification = async (req, res) => {
    try {
        const { type, coachId, clientId, coachName, clientName } = req.body;
        
        let result;
        switch (type) {
            case 'sent':
                if (!coachId || !clientName) {
                    return res.status(400).json({ error: 'coachId and clientName are required for sent invitation' });
                }
                result = await sendInvitationSentNotification(coachId, clientName);
                break;
                
            case 'received':
                if (!clientId || !coachName) {
                    return res.status(400).json({ error: 'clientId and coachName are required for received invitation' });
                }
                result = await sendInvitationReceivedNotification(clientId, coachName);
                break;
                
            case 'accepted':
                if (!coachId || !clientName) {
                    return res.status(400).json({ error: 'coachId and clientName are required for accepted invitation' });
                }
                result = await sendInvitationAcceptedNotification(coachId, clientName);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid invitation type. Use: sent, received, or accepted' });
        }
        
        if (result.success) {
            res.status(200).json({ 
                message: `Invitation ${type} notification sent successfully`,
                ticketId: result.ticketId 
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[NotificationController] Error sending invitation notification:', error);
        res.status(500).json({ error: 'Failed to send invitation notification' });
    }
};

// Envoyer notification de plan nutritionnel
const sendNutritionPlanNotification = async (req, res) => {
    try {
        const { type, clientId, coachName } = req.body;
        
        if (!clientId || !coachName) {
            return res.status(400).json({ error: 'clientId and coachName are required' });
        }
        
        let result;
        switch (type) {
            case 'created':
                result = await sendNutritionPlanCreatedNotification(clientId, coachName);
                break;
                
            case 'updated':
                result = await sendNutritionPlanUpdatedNotification(clientId, coachName);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid plan type. Use: created or updated' });
        }
        
        if (result.success) {
            res.status(200).json({ 
                message: `Nutrition plan ${type} notification sent successfully`,
                ticketId: result.ticketId 
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[NotificationController] Error sending nutrition plan notification:', error);
        res.status(500).json({ error: 'Failed to send nutrition plan notification' });
    }
};

// Envoyer notifications de test
const sendTestNotifications = async (req, res) => {
    try {
        console.log('[NotificationController] Sending test notifications...');
        
        await Promise.all([
            sendDailyMotivationalNotifications(),
            sendCoachMotivationalNotifications()
        ]);
        
        res.status(200).json({ 
            message: 'Test notifications sent successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[NotificationController] Error sending test notifications:', error);
        res.status(500).json({ error: 'Failed to send test notifications' });
    }
};

// Save Expo Push Token (matching frontend expectations)
const saveExpoPushToken = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { token, userType = 'user' } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        console.log(`📱 Saving push token for ${userType} ${userId}`);

        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        
        await db.collection(collection).doc(userId).update({
            expoPushToken: token,
            tokenUpdatedAt: firebaseInstances.admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Push token saved for ${userType} ${userId}`);
        res.status(200).json({ message: 'Push token saved successfully' });
        
    } catch (error) {
        console.error('Error saving push token:', error);
        res.status(500).json({ error: 'Failed to save push token' });
    }
};

// Initialiser le contrôleur
initializeController();

module.exports = {
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
};