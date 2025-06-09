const { firebaseInstances } = require('../config/firebase');
const cron = require('node-cron');

const admin = firebaseInstances.admin;
const db = firebaseInstances.db;
const FieldValue = admin.firestore.FieldValue;

// Check Firebase initialization
function checkFirebaseReady(res, action = "perform action") {
    if (!admin || !db) {
        const missing = [!admin && "Admin SDK", !db && "DB"].filter(Boolean).join(', ');
        console.error(`Firebase Check Failed during "${action}": Missing Services: ${missing}`);
        if (res && !res.headersSent) {
            res.status(500).json({ error: `Server configuration error (${action}). Please contact support.` });
        }
        return false;
    }
    return true;
}

// Send push notification helper
const sendPushNotification = async (userToken, title, body, data = {}) => {
    try {
        if (!userToken) return null;
        
        const message = {
            token: userToken,
            notification: {
                title: title,
                body: body,
            },
            data: {
                ...data,
                timestamp: Date.now().toString()
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('Push notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return null;
    }
};

// Store notification in database
const storeNotification = async (userId, title, body, type, data = {}) => {
    try {
        const notificationRef = db.collection('users').doc(userId).collection('notifications');
        await notificationRef.add({
            title,
            body,
            type,
            data,
            read: false,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error storing notification:', error);
    }
};

// Store notification in coach database
const storeCoachNotification = async (coachId, title, body, type, data = {}) => {
    try {
        const notificationRef = db.collection('nutritionists').doc(coachId).collection('notifications');
        await notificationRef.add({
            title,
            body,
            type,
            data,
            read: false,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error storing coach notification:', error);
    }
};

// Send coaching request accepted notification
exports.sendCoachRequestAcceptedNotification = async (userId, coachName) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData?.pushToken) {
            await sendPushNotification(
                userData.pushToken,
                'Coach Request Accepted! 🎉',
                `${coachName} has accepted your coaching request. Start your journey now!`,
                { type: 'coach_accepted', userId, coachName }
            );
        }
        
        await storeNotification(
            userId,
            'Coach Request Accepted! 🎉',
            `${coachName} has accepted your coaching request. Start your journey now!`,
            'coach_accepted',
            { coachName }
        );
    } catch (error) {
        console.error('Error sending coach accepted notification:', error);
    }
};

// Send new message notification
exports.sendNewMessageNotification = async (receiverId, senderName, messageText) => {
    try {
        const userDoc = await db.collection('users').doc(receiverId).get();
        const userData = userDoc.data();
        
        if (userData?.pushToken) {
            await sendPushNotification(
                userData.pushToken,
                `New message from ${senderName}`,
                messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
                { type: 'new_message', senderId: senderName }
            );
        }
        
        await storeNotification(
            receiverId,
            `New message from ${senderName}`,
            messageText,
            'new_message',
            { senderId: senderName }
        );
    } catch (error) {
        console.error('Error sending message notification:', error);
    }
};

// Send new message notification to coach
exports.sendNewMessageNotificationToCoach = async (coachId, senderName, messageText) => {
    try {
        const coachDoc = await db.collection('nutritionists').doc(coachId).get();
        const coachData = coachDoc.data();
        
        if (coachData?.pushToken) {
            await sendPushNotification(
                coachData.pushToken,
                `New message from ${senderName}`,
                messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
                { type: 'new_message', senderId: senderName, userType: 'coach' }
            );
        }
        
        // Store in coach's notifications collection
        await storeCoachNotification(
            coachId,
            `New message from ${senderName}`,
            messageText,
            'new_message',
            { senderId: senderName }
        );
    } catch (error) {
        console.error('Error sending message notification to coach:', error);
    }
};

// Motivational messages
const motivationalMessages = [
    "You're doing great! Keep up the healthy habits! 💪",
    "Remember to stay hydrated and eat well today! 🥗",
    "Your health journey is unique - celebrate small wins! ⭐",
    "Taking care of yourself is not selfish, it's essential! ❤️",
    "Progress, not perfection. You've got this! 🌟",
    "Every healthy choice you make matters! 🍎",
    "Your future self will thank you for today's efforts! 🙏"
];

// Send motivational notification
exports.sendMotivationalNotification = async (userId) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        if (userData?.pushToken) {
            await sendPushNotification(
                userData.pushToken,
                'BiteWise Motivation 🌟',
                randomMessage,
                { type: 'motivational' }
            );
        }
        
        await storeNotification(
            userId,
            'BiteWise Motivation 🌟',
            randomMessage,
            'motivational'
        );
    } catch (error) {
        console.error('Error sending motivational notification:', error);
    }
};

// Check inactive users and send comeback notifications
exports.checkInactiveUsers = async () => {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const usersSnapshot = await db.collection('users')
            .where('lastActive', '<', FieldValue.serverTimestamp.fromDate(threeDaysAgo))
            .get();
        
        const comebackMessages = [
            "We miss you! Come back and continue your health journey! 🌈",
            "Your wellness goals are waiting for you! Let's get back on track! 💪",
            "Take a moment today to check in with your health goals! 🎯",
            "Your coach might have new tips for you! Check your messages! 💬"
        ];
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const randomMessage = comebackMessages[Math.floor(Math.random() * comebackMessages.length)];
            
            if (userData?.pushToken) {
                await sendPushNotification(
                    userData.pushToken,
                    'Come back to BiteWise! 👋',
                    randomMessage,
                    { type: 'comeback' }
                );
            }
            
            await storeNotification(
                userDoc.id,
                'Come back to BiteWise! 👋',
                randomMessage,
                'comeback'
            );
        }
    } catch (error) {
        console.error('Error checking inactive users:', error);
    }
};

// Update user push token
exports.updatePushToken = async (req, res) => {
    if (!checkFirebaseReady(res, "update push token")) return;
    
    try {
        const { pushToken } = req.body;
        const userId = req.user.uid;
        
        await db.collection('users').doc(userId).update({
            pushToken: pushToken,
            lastTokenUpdate: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Push token updated successfully' });
    } catch (error) {
        console.error('Error updating push token:', error);
        res.status(500).json({ error: 'Failed to update push token' });
    }
};

// Update coach push token
exports.updateCoachPushToken = async (req, res) => {
    if (!checkFirebaseReady(res, "update coach push token")) return;
    
    try {
        const { pushToken } = req.body;
        const coachId = req.user.uid;
        
        await db.collection('nutritionists').doc(coachId).update({
            pushToken: pushToken,
            lastTokenUpdate: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Push token updated successfully' });
    } catch (error) {
        console.error('Error updating coach push token:', error);
        res.status(500).json({ error: 'Failed to update push token' });
    }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
    if (!checkFirebaseReady(res, "get user notifications")) return;
    
    try {
        const userId = req.user.uid;
        const { limit = 20, offset = 0 } = req.query;
        
        const notificationsRef = db.collection('users').doc(userId).collection('notifications');
        const snapshot = await notificationsRef
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();
        
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));
        
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Get coach notifications
exports.getCoachNotifications = async (req, res) => {
    if (!checkFirebaseReady(res, "get coach notifications")) return;
    
    try {
        const coachId = req.user.uid;
        const { limit = 20, offset = 0 } = req.query;
        
        const notificationsRef = db.collection('nutritionists').doc(coachId).collection('notifications');
        const snapshot = await notificationsRef
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();
        
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));
        
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error getting coach notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
    if (!checkFirebaseReady(res, "mark notification as read")) return;
    
    try {
        const userId = req.user.uid;
        const { notificationId } = req.params;
        
        console.log(`Marking notification ${notificationId} as read for user ${userId}`);
        
        // Check if notification exists first
        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc(notificationId);
        const notificationDoc = await notificationRef.get();
        
        if (!notificationDoc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        await notificationRef.update({
            read: true,
            readAt: FieldValue.serverTimestamp()
        });
        
        console.log(`Successfully marked notification ${notificationId} as read`);
        res.status(200).json({ message: 'Notification marked as read' });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
    }
};

// Mark coach notification as read
exports.markCoachNotificationAsRead = async (req, res) => {
    if (!checkFirebaseReady(res, "mark coach notification as read")) return;
    
    try {
        const coachId = req.user.uid;
        const { notificationId } = req.params;
        
        await db.collection('nutritionists').doc(coachId).collection('notifications').doc(notificationId).update({
            read: true,
            readAt: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking coach notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Remove the bulk motivational notification sending and replace with individual user scheduling

// Remove these bulk functions:
// - scheduleMotivationalNotifications 
// - scheduleInactiveUserCheck

// Replace with individual user-based notifications
exports.scheduleUserNotification = async (userId, type, delay = 0) => {
    try {
        setTimeout(async () => {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            if (!userData.notificationsEnabled) return;
            
            let title, body;
            
            switch (type) {
                case 'morning_motivation':
                    title = 'Good Morning! 🌅';
                    body = "Start your day right! Remember to log your breakfast and stay hydrated.";
                    break;
                case 'lunch_reminder':
                    title = 'Lunch Time Reminder 🍽️';
                    body = "Don't forget to log your lunch! Make healthy choices count.";
                    break;
                case 'afternoon_boost':
                    title = 'Afternoon Boost 💪';
                    body = "You're doing great! Remember to log any snacks and stay on track.";
                    break;
                case 'hydration_check':
                    title = 'Hydration Check 💧';
                    body = "Time to drink some water! Stay hydrated throughout the day.";
                    break;
                default:
                    return;
            }
            
            if (userData?.pushToken) {
                await sendPushNotification(
                    userData.pushToken,
                    title,
                    body,
                    { type, timestamp: Date.now() }
                );
            }
            
            await storeNotification(userId, title, body, type);
            
        }, delay);
    } catch (error) {
        console.error('Error scheduling user notification:', error);
    }
};

// Updated initialization - schedule individual notifications with realistic delays
exports.initializeNotificationSchedules = () => {
    console.log('Initializing realistic notification schedules...');
    
    // Schedule different types of notifications with random delays
    setInterval(async () => {
        try {
            const usersSnapshot = await db.collection('users')
                .where('notificationsEnabled', '==', true)
                .limit(10) // Limit to prevent spam
                .get();
            
            usersSnapshot.docs.forEach((userDoc, index) => {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                // Schedule notifications with realistic delays (hours apart)
                const baseDelay = index * 30000; // 30 seconds between users
                
                // Morning motivation (if it's morning)
                const now = new Date();
                if (now.getHours() >= 6 && now.getHours() <= 10) {
                    setTimeout(() => {
                        exports.scheduleUserNotification(userId, 'morning_motivation');
                    }, baseDelay);
                }
                
                // Lunch reminder (if it's lunch time)
                if (now.getHours() >= 11 && now.getHours() <= 14) {
                    setTimeout(() => {
                        exports.scheduleUserNotification(userId, 'lunch_reminder');
                    }, baseDelay + 60000); // 1 minute later
                }
                
                // Afternoon boost
                if (now.getHours() >= 14 && now.getHours() <= 17) {
                    setTimeout(() => {
                        exports.scheduleUserNotification(userId, 'afternoon_boost');
                    }, baseDelay + 120000); // 2 minutes later
                }
                
                // Hydration check (throughout the day)
                if (now.getHours() >= 8 && now.getHours() <= 20) {
                    setTimeout(() => {
                        exports.scheduleUserNotification(userId, 'hydration_check');
                    }, baseDelay + 180000); // 3 minutes later
                }
            });
            
        } catch (error) {
            console.error('Error in notification scheduling:', error);
        }
    }, 4 * 60 * 60 * 1000); // Run every 4 hours instead of constantly
};

const sendCoachMessageNotification = async (userId, coachName, message) => {
    try {
        console.log(`📧 Sending coach message notification to user ${userId}`);
        
        // Store notification in database
        const notificationRef = db.collection('users')
            .doc(userId)
            .collection('notifications')
            .doc();

        const notification = {
            id: notificationRef.id,
            title: `💬 Message from ${coachName}`,
            body: message.length > 50 ? message.substring(0, 50) + '...' : message,
            type: 'new_message',
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                coachId: message.senderId,
                chatId: message.chatId,
                messageId: message.id
            }
        };

        await notificationRef.set(notification);

        // Send push notification if user has push token
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().pushToken) {
            await sendPushNotification(
                userDoc.data().pushToken,
                notification.title,
                notification.body,
                {
                    type: 'new_message',
                    chatId: message.chatId
                }
            );
        }

        console.log(`✅ Coach message notification sent to user ${userId}`);
        return notification;
    } catch (error) {
        console.error(`❌ Error sending coach message notification:`, error);
        throw error;
    }
};

// Export the function
module.exports = {
    // ...existing exports...
    sendCoachMessageNotification
};