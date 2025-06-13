const { firebaseInstances } = require('../config/firebase');
const {
    PERSONAL_MOTIVATIONAL_MESSAGES,
    EVENT_NOTIFICATIONS,
    getRandomMessage
} = require('../config/notificationMessages');

let db;
let FieldValue;

function initializeNotificationService() {
    if (!firebaseInstances.db || !firebaseInstances.admin) {
        console.error("[NotificationService] Firebase not initialized");
        return false;
    }
    
    db = firebaseInstances.db;
    FieldValue = firebaseInstances.admin.firestore.FieldValue;
    console.log("[NotificationService] Initialized successfully");
    return true;
}

// Fonction pour envoyer une notification push via Expo
async function sendExpoPushNotification(expoPushToken, title, body, data = {}) {
    // Extract base token (remove unique suffix)
    const baseToken = expoPushToken.split('_')[0];
    
    if (!baseToken || !baseToken.startsWith('ExponentPushToken[')) {
        return { success: false, error: 'Invalid push token format' };
    }

    const message = {
        to: baseToken, // Use base token for actual sending
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default'
    };

    console.log(`🔍 DEBUG: Sending to base token: ${baseToken.substring(0, 30)}... (from unique: ${expoPushToken.substring(0, 40)}...)`);

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        const result = await response.json();
        
        if (result.data && result.data.status === 'ok') {
            return { success: true, ticketId: result.data.id };
        } else {
            return { success: false, error: result.errors || 'Unknown error' };
        }
    } catch (error) {
        console.error('[NotificationService] Expo push error:', error);
        return { success: false, error: error.message };
    }
}

// Sauvegarder notification dans l'historique
async function saveNotificationToHistory(userId, title, body, type, userType = 'user', additionalData = {}) {
    if (!db || !FieldValue) {
        console.error("[NotificationService] Database not ready");
        return null;
    }

    try {
        const collection = userType === 'coach' ? 'nutritionists' : 'users';
        const subCollection = userType === 'coach' ? 'coachNotifications' : 'userNotifications';

        const notificationData = {
            title,
            body,
            type,
            isRead: false,
            isVisible: true,
            createdAt: FieldValue.serverTimestamp(),
            data: additionalData
        };

        const docRef = await db
            .collection(collection)
            .doc(userId)
            .collection(subCollection)
            .add(notificationData);

        console.log(`[NotificationService] Saved notification: ${docRef.id} for ${userType} ${userId}`);
        return docRef.id;
    } catch (error) {
        console.error(`[NotificationService] Error saving notification:`, error);
        return null;
    }
}

// Envoyer notifications motivationnelles aux utilisateurs personnels
async function sendDailyMotivationalNotifications() {
    if (!db) {
        console.error("[NotificationService] Database not ready");
        return;
    }

    try {
        console.log("[NotificationService] Sending daily motivational notifications to users...");

        const usersSnapshot = await db.collection('users')
            .where('expoPushToken', '!=', null)
            .limit(100)
            .get();

        if (usersSnapshot.empty) {
            console.log("[NotificationService] No users found for motivational notifications");
            return;
        }

        console.log(`[NotificationService] Found ${usersSnapshot.size} users with push tokens`);

        let sentCount = 0;
        const promises = [];

        usersSnapshot.docs.forEach((userDoc, index) => {
            const userData = userDoc.data();
            const userId = userDoc.id;

            if (!userData.expoPushToken) {
                return;
            }

            const delay = index * 500;

            const notificationPromise = new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        const message = getRandomMessage(PERSONAL_MOTIVATIONAL_MESSAGES);
                        const title = "💪 Daily Motivation"; // ✅ English title

                        const pushResult = await sendExpoPushNotification(
                            userData.expoPushToken,
                            title,
                            message,
                            {
                                type: 'daily_motivation',
                                source: 'system',
                                timestamp: Date.now()
                            }
                        );

                        if (pushResult.success) {
                            await saveNotificationToHistory(
                                userId,
                                title,
                                message,
                                'daily_motivation',
                                'user',
                                { source: 'system' }
                            );
                            
                            sentCount++;
                            console.log(`[NotificationService] Sent motivational notification to user ${userId}`);
                        } else {
                            console.error(`[NotificationService] Failed to send to user ${userId}:`, pushResult.error);
                        }
                    } catch (error) {
                        console.error(`[NotificationService] Error sending to user ${userId}:`, error);
                    }
                    resolve();
                }, delay);
            });

            promises.push(notificationPromise);
        });

        await Promise.all(promises);
        console.log(`[NotificationService] Sent ${sentCount} motivational notifications to users`);

    } catch (error) {
        console.error("[NotificationService] Error in sendDailyMotivationalNotifications:", error);
    }
}

// Notification pour nouveau message
async function sendNewMessageNotification(receiverId, senderName, receiverType, messagePreview) {
    if (!db) {
        console.error("[NotificationService] Database not ready");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`[NotificationService] 📧 Sending message notification to ${receiverType} ${receiverId} from ${senderName}`);

        // Get receiver's push token
        const collection = receiverType === 'coach' ? 'nutritionists' : 'users';
        const receiverDoc = await db.collection(collection).doc(receiverId).get();
        
        if (!receiverDoc.exists) {
            console.error(`❌ Receiver document not found in ${collection}/${receiverId}`);
            return { success: false, error: 'Receiver not found' };
        }
        
        const receiverData = receiverDoc.data();
        const receiverToken = receiverData?.expoPushToken;
        
        console.log(`🔍 DEBUG: Receiver (${receiverType}) ${receiverId}`);
        console.log(`🔍 DEBUG: Receiver name: ${receiverData?.firstName} ${receiverData?.lastName}`);
        console.log(`🔍 DEBUG: Receiver token: ${receiverToken?.substring(0, 30)}...`);
        
        // Get sender's information for token comparison
        // Extract sender IDs from the message context
        let senderId = null;
        let senderToken = null;
        
        if (receiverType === 'coach') {
            // If sending to coach, sender is a user
            const usersSnapshot = await db.collection('users')
                .where('firstName', '==', senderName.split(' ')[0])
                .limit(1)
                .get();
            
            if (!usersSnapshot.empty) {
                const senderDoc = usersSnapshot.docs[0];
                senderId = senderDoc.id;
                senderToken = senderDoc.data()?.expoPushToken;
            }
        } else {
            // If sending to user, sender is a coach
            const coachesSnapshot = await db.collection('nutritionists')
                .where('firstName', '==', senderName.split(' ')[0])
                .limit(1)
                .get();
            
            if (!coachesSnapshot.empty) {
                const senderDoc = coachesSnapshot.docs[0];
                senderId = senderDoc.id;
                senderToken = senderDoc.data()?.expoPushToken;
            }
        }
        
        console.log(`🔍 DEBUG: Sender ID: ${senderId}`);
        console.log(`🔍 DEBUG: Sender token: ${senderToken?.substring(0, 30)}...`);
        console.log(`🔍 DEBUG: Tokens comparison:`);
        console.log(`🔍 DEBUG: Receiver token: ${receiverToken}`);
        console.log(`🔍 DEBUG: Sender token:   ${senderToken}`);
        console.log(`🔍 DEBUG: Are tokens identical? ${receiverToken === senderToken ? '❌ YES - SAME DEVICE!' : '✅ NO - DIFFERENT DEVICES'}`);
        
        if (receiverToken === senderToken) {
            console.log(`⚠️  PROBLEM IDENTIFIED: Both users have identical push tokens!`);
            console.log(`⚠️  This means both accounts are using the same device/emulator.`);
            console.log(`⚠️  Even with 2 emulators, if they share tokens, notifications go to one device.`);
        }

        if (!receiverToken) {
            console.log(`[NotificationService] No push token found for ${receiverType} ${receiverId}`);
            return { success: false, error: 'No push token found' };
        }

        const title = `💬 New Message from ${senderName}`;
        const body = messagePreview || 'You have a new message';

        console.log(`🔍 DEBUG: About to send push notification to token: ${receiverToken.substring(0, 30)}...`);

        const pushResult = await sendExpoPushNotification(
            receiverToken,
            title,
            body,
            {
                type: 'new_message',
                senderId: senderName,
                screen: 'Messages'
            }
        );

        if (pushResult.success) {
            await saveNotificationToHistory(
                receiverId,
                title,
                body,
                'new_message',
                receiverType,
                { 
                    senderId: senderName,
                    messagePreview: messagePreview,
                    screen: 'Messages'
                }
            );
            
            console.log(`[NotificationService] ✅ Message notification sent to ${receiverType} ${receiverId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send push notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending message notification:", error);
        return { success: false, error: error.message };
    }
}

// Notification pour plan nutritionnel mis à jour
async function sendNutritionPlanUpdatedNotification(clientId, coachName) {
    if (!db) {
        console.error("[NotificationService] Database not ready");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`[NotificationService] 📋 Sending plan notification to user ${clientId} from coach ${coachName}`);

        // Get client's push token
        const clientDoc = await db.collection('users').doc(clientId).get();
        
        if (!clientDoc.exists || !clientDoc.data().expoPushToken) {
            console.log(`[NotificationService] No push token found for user ${clientId}`);
            return { success: false, error: 'No push token found' };
        }

        const clientData = clientDoc.data();
        const title = `📋 Plan Updated by ${coachName}`;
        const body = `Your nutrition plan has been updated. Check it out!`;

        // Send push notification
        const pushResult = await sendExpoPushNotification(
            clientData.expoPushToken,
            title,
            body,
            {
                type: 'nutrition_plan_updated',
                coachName: coachName,
                screen: 'NutritionPlan'
            }
        );

        if (pushResult.success) {
            // Save notification to history
            await saveNotificationToHistory(
                clientId,
                title,
                body,
                'nutrition_plan_updated',
                'user',
                { 
                    coachName: coachName,
                    screen: 'NutritionPlan'
                }
            );
            
            console.log(`[NotificationService] ✅ Plan notification sent to user ${clientId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send plan notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending plan notification:", error);
        return { success: false, error: error.message };
    }
}

// Add these invitation notification functions:

// When user sends invitation to coach
async function sendInvitationSentNotification(coachId, userName) {
    if (!db) {
        console.error("[NotificationService] Database not ready for invitation sent notification");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`📧 Sending invitation received notification to coach ${coachId} from ${userName}`);

        const title = "🔔 New Client Request";
        const body = `${userName} wants you as their nutrition coach!`;

        // Get coach's push token
        const coachDoc = await db.collection('nutritionists').doc(coachId).get();
        
        if (!coachDoc.exists) {
            console.error(`❌ Coach ${coachId} not found for invitation notification`);
            return { success: false, error: 'Coach not found' };
        }

        const coachData = coachDoc.data();
        const pushToken = coachData.expoPushToken;

        if (!pushToken) {
            console.log(`[NotificationService] No push token found for coach ${coachId}`);
            return { success: false, error: 'No push token found' };
        }

        // Send push notification
        const pushResult = await sendExpoPushNotification(
            pushToken,
            title,
            body,
            {
                type: 'invitation_received',
                senderId: userName,
                screen: 'Invitations'
            }
        );

        if (pushResult.success) {
            // Save notification to coach's history
            await saveNotificationToHistory(
                coachId,
                title,
                body,
                'invitation_received',
                'coach',
                { 
                    senderId: userName,
                    screen: 'Invitations'
                }
            );
            
            console.log(`[NotificationService] ✅ Invitation notification sent to coach ${coachId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send invitation notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending invitation notification:", error);
        return { success: false, error: error.message };
    }
}

// When coach accepts invitation
async function sendInvitationAcceptedNotification(userId, coachName) {
    if (!db) {
        console.error("[NotificationService] Database not ready for invitation accepted notification");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`📧 Sending invitation accepted notification to user ${userId} from ${coachName}`);

        const title = "🎉 Request Accepted!";
        const body = `${coachName} accepted your coaching request! You can now select them as your coach.`;

        // Get user's push token
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            console.error(`❌ User ${userId} not found for invitation accepted notification`);
            return { success: false, error: 'User not found' };
        }

        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;

        if (!pushToken) {
            console.log(`[NotificationService] No push token found for user ${userId}`);
            return { success: false, error: 'No push token found' };
        }

        // Send push notification
        const pushResult = await sendExpoPushNotification(
            pushToken,
            title,
            body,
            {
                type: 'invitation_accepted',
                senderId: coachName,
                screen: 'FindSpecialist'
            }
        );

        if (pushResult.success) {
            // Save notification to user's history
            await saveNotificationToHistory(
                userId,
                title,
                body,
                'invitation_accepted',
                'user',
                { 
                    senderId: coachName,
                    screen: 'FindSpecialist'
                }
            );
            
            console.log(`[NotificationService] ✅ Invitation accepted notification sent to user ${userId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send invitation accepted notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending invitation accepted notification:", error);
        return { success: false, error: error.message };
    }
}

// When coach declines invitation
async function sendInvitationDeclinedNotification(userId, coachName) {
    if (!db) {
        console.error("[NotificationService] Database not ready for invitation declined notification");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`📧 Sending invitation declined notification to user ${userId} from ${coachName}`);

        const title = "📝 Request Update";
        const body = `${coachName} is currently unavailable. Don't worry, keep exploring other amazing coaches!`;

        // Get user's push token
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            console.error(`❌ User ${userId} not found for invitation declined notification`);
            return { success: false, error: 'User not found' };
        }

        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;

        if (!pushToken) {
            console.log(`[NotificationService] No push token found for user ${userId}`);
            return { success: false, error: 'No push token found' };
        }

        // Send push notification
        const pushResult = await sendExpoPushNotification(
            pushToken,
            title,
            body,
            {
                type: 'invitation_declined',
                senderId: coachName,
                screen: 'NutritionSection'
            }
        );

        if (pushResult.success) {
            // Save notification to user's history
            await saveNotificationToHistory(
                userId,
                title,
                body,
                'invitation_declined',
                'user',
                { 
                    senderId: coachName,
                    screen: 'NutritionSection'
                }
            );
            
            console.log(`[NotificationService] ✅ Invitation declined notification sent to user ${userId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send invitation declined notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending invitation declined notification:", error);
        return { success: false, error: error.message };
    }
}

// When user selects coach
async function sendCoachSelectedNotification(coachId, userName) {
    if (!db) {
        console.error("[NotificationService] Database not ready for coach selected notification");
        return { success: false, error: 'Database not ready' };
    }

    try {
        console.log(`📧 Sending coach selected notification to coach ${coachId} from ${userName}`);

        const title = "🎯 New Client Selected You!";
        const body = `${userName} selected you as their nutrition coach! Welcome your new client.`;

        // Get coach's push token
        const coachDoc = await db.collection('nutritionists').doc(coachId).get();
        
        if (!coachDoc.exists) {
            console.error(`❌ Coach ${coachId} not found for selection notification`);
            return { success: false, error: 'Coach not found' };
        }

        const coachData = coachDoc.data();
        const pushToken = coachData.expoPushToken;

        if (!pushToken) {
            console.log(`[NotificationService] No push token found for coach ${coachId}`);
            return { success: false, error: 'No push token found' };
        }

        // Send push notification
        const pushResult = await sendExpoPushNotification(
            pushToken,
            title,
            body,
            {
                type: 'coach_selected',
                senderId: userName,
                screen: 'Clients'
            }
        );

        if (pushResult.success) {
            // Save notification to coach's history
            await saveNotificationToHistory(
                coachId,
                title,
                body,
                'coach_selected',
                'coach',
                { 
                    senderId: userName,
                    screen: 'Clients'
                }
            );
            
            console.log(`[NotificationService] ✅ Coach selected notification sent to coach ${coachId}`);
            return { success: true };
        } else {
            console.error(`[NotificationService] ❌ Failed to send coach selected notification:`, pushResult.error);
            return { success: false, error: pushResult.error };
        }

    } catch (error) {
        console.error("[NotificationService] ❌ Error sending coach selected notification:", error);
        return { success: false, error: error.message };
    }
}

// Export all functions
module.exports = {
    initializeNotificationService,
    sendDailyMotivationalNotifications,
    sendNewMessageNotification,
    sendNutritionPlanUpdatedNotification,
    sendExpoPushNotification,
    saveNotificationToHistory,
    // ✅ ADD INVITATION NOTIFICATIONS
    sendInvitationSentNotification,
    sendInvitationAcceptedNotification,
    sendInvitationDeclinedNotification,
    sendCoachSelectedNotification
};