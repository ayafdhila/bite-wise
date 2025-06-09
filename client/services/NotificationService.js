import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Configure notification handling
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'BiteWise Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2E4A32',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('Push notification permission not granted');
            return 'local-only-mode';
        }
        
        try {
            const projectId = 
                Constants?.expoConfig?.extra?.eas?.projectId ?? 
                Constants?.easConfig?.projectId ?? 
                Constants?.manifest?.extra?.eas?.projectId ??
                Constants?.manifest2?.extra?.eas?.projectId;
            
            if (!projectId) {
                console.log('No projectId found - using local notifications only');
                return 'local-only-mode';
            }
            
            console.log('Using projectId:', projectId);
            
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            
            console.log('Push token obtained:', token);
        } catch (error) {
            console.error('Error getting push token:', error);
            console.log('Falling back to local notifications only');
            return 'local-only-mode';
        }
    } else {
        console.log('Must use physical device for Push Notifications - using local notifications');
        return 'local-only-mode';
    }

    return token;
};

export const updatePushToken = async (token, authToken) => {
    try {
        if (token === 'local-only-mode') {
            console.log('Skipping push token update - local notifications only');
            return { success: true, mode: 'local-only' };
        }

        const response = await fetch(`${API_BASE_URL}/users/update-push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ pushToken: token }),
        });

        if (!response.ok) {
            throw new Error('Failed to update push token');
        }

        const result = await response.json();
        console.log('Push token updated successfully:', result);
        return result;
    } catch (error) {
        console.error('Error updating push token:', error);
        return { success: false, error: error.message };
    }
};

// LOCAL NOTIFICATION FUNCTIONS
export const scheduleLocalNotification = async (title, body, triggerSeconds = 5) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                seconds: triggerSeconds,
            },
        });
        console.log('Local notification scheduled:', title);
    } catch (error) {
        console.error('Error scheduling local notification:', error);
    }
};

// PROPERLY SCHEDULED MOTIVATIONAL NOTIFICATIONS
export const scheduleMotivationalNotifications = async () => {
    try {
        // Cancel existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🗑️ Cancelled existing notifications');

        const motivationalMessages = [
            {
                id: 'morning_motivation',
                title: "🌅 Good Morning!",
                body: "Start your day right! Remember to log your breakfast and stay hydrated.",
                hour: 8,
                minute: 0
            },
            {
                id: 'lunch_reminder',
                title: "🥗 Lunch Time Reminder",
                body: "Don't forget to log your lunch! Make healthy choices count.",
                hour: 12,
                minute: 30
            },
            {
                id: 'afternoon_boost',
                title: "💪 Afternoon Boost",
                body: "You're doing great! Remember to log any snacks you have.",
                hour: 15,
                minute: 30
            },
            {
                id: 'dinner_reminder',
                title: "🍽️ Dinner Time",
                body: "Time for dinner! Don't forget to log your evening meal.",
                hour: 19,
                minute: 0
            },
            {
                id: 'evening_reflection',
                title: "🌙 Daily Reflection",
                body: "How did your nutrition goals go today? Complete your daily log!",
                hour: 21,
                minute: 0
            }
        ];

        const now = new Date();
        console.log(`⏰ Current time: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);

        for (const message of motivationalMessages) {
            // Calculate next occurrence of this time
            let nextTrigger = new Date();
            nextTrigger.setHours(message.hour, message.minute, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (nextTrigger <= now) {
                nextTrigger.setDate(nextTrigger.getDate() + 1);
                console.log(`⏭️ Time ${message.hour}:${message.minute.toString().padStart(2, '0')} has passed, scheduling for tomorrow`);
            }

            // Schedule the notification
            const notificationId = await Notifications.scheduleNotificationAsync({
                identifier: message.id,
                content: {
                    title: message.title,
                    body: message.body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { 
                        type: 'motivational', 
                        messageId: message.id,
                        scheduledFor: nextTrigger.toISOString()
                    }
                },
                trigger: {
                    date: nextTrigger,
                    repeats: false
                }
            });

            // Also schedule daily repeating version
            await Notifications.scheduleNotificationAsync({
                identifier: `${message.id}_recurring`,
                content: {
                    title: message.title,
                    body: message.body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { 
                        type: 'motivational', 
                        messageId: message.id,
                        recurring: true
                    }
                },
                trigger: {
                    hour: message.hour,
                    minute: message.minute,
                    repeats: true
                }
            });

            console.log(`📅 Scheduled "${message.title}" for ${nextTrigger.toLocaleString()}`);
        }

        // Verify scheduled notifications
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`✅ Total notifications scheduled: ${scheduled.length}`);
        
        // Log next few notifications
        const upcoming = scheduled
            .filter(n => n.trigger.type === 'date')
            .map(n => ({
                title: n.content.title,
                time: new Date(n.trigger.value).toLocaleString()
            }))
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .slice(0, 3);

        console.log('📋 Next 3 notifications:', upcoming);

    } catch (error) {
        console.error('❌ Error scheduling motivational notifications:', error);
    }
};

// Add this helper function for testing (schedules notifications in next few minutes)
export const scheduleTestNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        const testMessages = [
            { title: "🧪 Test 1", body: "First test notification", seconds: 30 },
            { title: "🧪 Test 2", body: "Second test notification", seconds: 90 },
            { title: "🧪 Test 3", body: "Third test notification", seconds: 150 }
        ];

        for (const message of testMessages) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    sound: true,
                },
                trigger: {
                    seconds: message.seconds,
                },
            });
            
            console.log(`🧪 Test notification "${message.title}" scheduled in ${message.seconds} seconds`);
        }
        
    } catch (error) {
        console.error('Error scheduling test notifications:', error);
    }
};

// MEAL-SPECIFIC NOTIFICATIONS
export const scheduleMealReminders = async () => {
    try {
        const mealReminders = [
            {
                id: 'breakfast_reminder',
                title: "🍳 Breakfast Time!",
                body: "Don't skip the most important meal of the day!",
                hour: 7,
                minute: 30
            },
            {
                id: 'lunch_prep',
                title: "🥙 Lunch Prep",
                body: "It's almost lunch time. Have you planned your meal?",
                hour: 11,
                minute: 45
            },
            {
                id: 'dinner_prep',
                title: "🍽️ Dinner Planning",
                body: "Start thinking about dinner. What healthy option will you choose?",
                hour: 17,
                minute: 30
            }
        ];

        for (const meal of mealReminders) {
            await Notifications.scheduleNotificationAsync({
                identifier: meal.id,
                content: {
                    title: meal.title,
                    body: meal.body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { type: 'meal_reminder', mealType: meal.id }
                },
                trigger: {
                    hour: meal.hour,
                    minute: meal.minute,
                    repeats: true,
                }
            });
        }

        console.log('🍽️ Meal reminder notifications scheduled');
    } catch (error) {
        console.error('❌ Error scheduling meal reminders:', error);
    }
};

// HYDRATION REMINDERS
export const scheduleHydrationReminders = async () => {
    try {
        const hydrationTimes = [
            { hour: 9, minute: 0 },
            { hour: 11, minute: 0 },
            { hour: 14, minute: 0 },
            { hour: 16, minute: 0 },
            { hour: 18, minute: 0 }
        ];

        for (let i = 0; i < hydrationTimes.length; i++) {
            const time = hydrationTimes[i];
            await Notifications.scheduleNotificationAsync({
                identifier: `hydration_${i}`,
                content: {
                    title: "💧 Hydration Check",
                    body: "Time to drink some water! Stay hydrated throughout the day.",
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.DEFAULT,
                    data: { type: 'hydration' }
                },
                trigger: {
                    hour: time.hour,
                    minute: time.minute,
                    repeats: true,
                }
            });
        }

        console.log('💧 Hydration reminder notifications scheduled');
    } catch (error) {
        console.error('❌ Error scheduling hydration reminders:', error);
    }
};

// COACH NOTIFICATIONS
export const sendCoachNotification = async (type, coachName, message = null) => {
    const notifications = {
        'request_sent': {
            title: "🏃‍♂️ Coach Request Sent!",
            body: `Your request to ${coachName} has been sent. You'll be notified when they respond!`
        },
        'request_accepted': {
            title: "🎉 Coach Request Accepted!",
            body: `${coachName} accepted your request! You can now chat and get personalized guidance.`
        },
        'request_declined': {
            title: "📝 Coach Request Update",
            body: `${coachName} is currently unavailable. Don't worry, keep working on your goals!`
        },
        'new_message': {
            title: `💬 New Message from ${coachName}`,
            body: message || "You have a new message from your coach!"
        },
        'plan_updated': {
            title: `📋 Plan Update from ${coachName}`,
            body: "Your nutrition plan has been updated. Check out your new recommendations!"
        },
        'weekly_check': {
            title: `📊 Weekly Check-in with ${coachName}`,
            body: "Your coach wants to review your weekly progress. Tap to see your stats!"
        },
        'goal_achieved': {
            title: `🎯 Goal Achieved!`,
            body: `Congratulations! ${coachName} noticed you've reached your goal!`
        }
    };

    const notification = notifications[type];
    if (notification) {
        await scheduleLocalNotification(notification.title, notification.body, 2);
    }
};

// ACHIEVEMENT NOTIFICATIONS
export const sendAchievementNotification = async (achievementType, details = {}) => {
    const achievements = {
        'first_meal_logged': {
            title: "🎉 First Meal Logged!",
            body: "Great start! You've logged your first meal. Keep building this healthy habit!"
        },
        'streak_3': {
            title: "🔥 3-Day Streak!",
            body: "Awesome! You've been consistent for 3 days. You're building momentum!"
        },
        'streak_7': {
            title: "⭐ 7-Day Streak!",
            body: "Incredible! You've maintained your streak for a whole week!"
        },
        'streak_30': {
            title: "🏆 30-Day Champion!",
            body: "Outstanding! You're a true nutrition tracking champion!"
        },
        'calorie_goal_met': {
            title: "🎯 Calorie Goal Achieved!",
            body: "Perfect! You've hit your daily calorie target. Well done!"
        },
        'all_macros_met': {
            title: "💪 All Macros Hit!",
            body: "Excellent! You've balanced all your macronutrients perfectly today!"
        },
        'week_completed': {
            title: "📅 Week Completed!",
            body: "You've successfully tracked your nutrition for an entire week!"
        }
    };

    const achievement = achievements[achievementType];
    if (achievement) {
        await scheduleLocalNotification(achievement.title, achievement.body, 1);
    }
};

// UTILITY FUNCTIONS
export const checkScheduledNotifications = async () => {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log('📋 Scheduled Notifications:');
        scheduled.forEach((notif, index) => {
            const trigger = notif.trigger;
            let timeString = 'Unknown time';
            
            if (trigger.type === 'date') {
                timeString = new Date(trigger.value).toLocaleString();
            } else if (trigger.type === 'daily') {
                timeString = `Daily at ${trigger.hour}:${trigger.minute.toString().padStart(2, '0')}`;
            }
            
            console.log(`${index + 1}. ${notif.content.title} - ${timeString}`);
        });
        return scheduled;
    } catch (error) {
        console.error('❌ Error checking scheduled notifications:', error);
        return [];
    }
};

export const cancelAllNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🗑️ All notifications cancelled');
    } catch (error) {
        console.error('❌ Error cancelling notifications:', error);
    }
};

// BACKEND FUNCTIONS
export const getUserNotifications = async (authToken, limit = 20, offset = 0) => {
    try {
        // Changed from '/notifications' to '/user-notifications' to match your backend route
        const response = await fetch(
            `${API_BASE_URL}/user-notifications?limit=${limit}&offset=${offset}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                console.log('No notifications endpoint found - using local notifications only');
                return { notifications: [], total: 0 };
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Backend response:', result); // Debug log
        
        // Your backend returns { notifications: [...] }
        if (result && result.notifications && Array.isArray(result.notifications)) {
            return {
                notifications: result.notifications,
                total: result.notifications.length
            };
        } else if (Array.isArray(result)) {
            // Fallback if backend returns array directly
            return {
                notifications: result,
                total: result.length
            };
        } else {
            console.warn('Unexpected response format:', result);
            return { notifications: [], total: 0 };
        }

    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return { notifications: [], total: 0 };
    }
};

export const markNotificationAsRead = async (notificationId, authToken) => {
    try {
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
        
        console.log(`Marking notification ${notificationId} as read...`);
        
        const response = await fetch(
            `${API_BASE_URL}/api/notifications/mark-read/${notificationId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const responseText = await response.text();
        console.log('Mark as read response:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error; // Re-throw to handle in component
    }
};

export const deleteNotification = async (notificationId, authToken) => {
    try {
        console.log(`Deleting notification ${notificationId}...`);
        
        const response = await fetch(
            `${API_BASE_URL}/api/notifications/${notificationId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const responseText = await response.text();
        console.log('Delete notification response:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};