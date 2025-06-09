import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    registerForPushNotificationsAsync, 
    updatePushToken, 
    scheduleMotivationalNotifications,
    scheduleMealReminders,
    scheduleHydrationReminders,
    scheduleLocalNotification,
    sendCoachNotification,
    sendAchievementNotification,
    checkScheduledNotifications,
    cancelAllNotifications,
    getUserNotifications
} from '../services/NotificationService';
import { AuthContext } from '../components/AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user, getIdToken } = useContext(AuthContext);
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationMode, setNotificationMode] = useState('unknown');
    const [isLoading, setIsLoading] = useState(false);

    // Load notifications from local storage
    const loadLocalNotifications = async () => {
        try {
            if (!user?.uid) return;
            
            const stored = await AsyncStorage.getItem(`notifications_${user.uid}`);
            if (stored) {
                const parsedNotifications = JSON.parse(stored);
                if (Array.isArray(parsedNotifications)) {
                    setNotifications(parsedNotifications);
                    const unread = parsedNotifications.filter(notif => !notif.read).length;
                    setUnreadCount(unread);
                }
            }
        } catch (error) {
            console.error('Error loading local notifications:', error);
        }
    };

    // Save notifications to local storage
    const saveLocalNotifications = async (notificationsList) => {
        try {
            if (!user?.uid) return;
            
            await AsyncStorage.setItem(
                `notifications_${user.uid}`, 
                JSON.stringify(notificationsList)
            );
        } catch (error) {
            console.error('Error saving local notifications:', error);
        }
    };

    // Fetch notifications from backend
    const fetchBackendNotifications = async () => {
        try {
            if (!user?.uid) return;
            
            setIsLoading(true);
            const authToken = await getIdToken();
            
            if (authToken) {
                const result = await getUserNotifications(authToken);
                console.log('Received from backend:', result); // Debug log
                
                // Handle the response - your backend returns { notifications: [...] }
                let backendNotifications = [];
                if (result && Array.isArray(result.notifications)) {
                    backendNotifications = result.notifications;
                } else if (Array.isArray(result)) {
                    backendNotifications = result;
                } else {
                    console.log('No backend notifications found or invalid format');
                    return; // Early return instead of continuing with undefined
                }

                // Convert backend notifications to local format
                const formattedNotifications = backendNotifications.map(notif => ({
                    id: notif.id || Date.now().toString(),
                    title: notif.title || 'Notification',
                    body: notif.body || notif.message || '',
                    data: notif.data || {},
                    timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
                    read: notif.read || false,
                    source: 'backend'
                }));

                // Ensure notifications is always an array before filtering
                const currentNotifications = Array.isArray(notifications) ? notifications : [];
                
                // Merge with existing local notifications (remove old backend ones first)
                const existingLocal = currentNotifications.filter(notif => notif.source !== 'backend');
                const allNotifications = [...formattedNotifications, ...existingLocal]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                setNotifications(allNotifications);
                const unread = allNotifications.filter(notif => !notif.read).length;
                setUnreadCount(unread);
                
                // Save to local storage
                await saveLocalNotifications(allNotifications);
                
                console.log(`✅ Loaded ${formattedNotifications.length} backend notifications`);
            }
        } catch (error) {
            console.error('❌ Error fetching backend notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        const setupNotifications = async () => {
            try {
                console.log('🔔 Setting up notifications...');
                
                // Load local notifications first
                await loadLocalNotifications();
                
                const token = await registerForPushNotificationsAsync();
                
                if (token && token !== 'local-only-mode') {
                    setExpoPushToken(token);
                    setNotificationMode('push');
                    console.log('📱 Push notifications enabled');
                    
                    const authToken = await getIdToken();
                    if (authToken) {
                        await updatePushToken(token, authToken);
                    }
                } else {
                    setNotificationMode('local-only');
                    console.log('📲 Using local notifications only');
                }

                // Schedule all notification types
                await scheduleMotivationalNotifications();
                await scheduleMealReminders();
                await scheduleHydrationReminders();
                
                // Try to fetch backend notifications
                await fetchBackendNotifications();
                
                // Check what was scheduled
                await checkScheduledNotifications();
                
                console.log('✅ All notifications set up successfully');

            } catch (error) {
                console.error('❌ Error setting up notifications:', error);
                setNotificationMode('local-only');
            }
        };

        setupNotifications();

        // Listen for incoming notifications
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('📥 Notification received:', notification);
            
            const newNotification = {
                id: notification.request.identifier,
                title: notification.request.content.title,
                body: notification.request.content.body,
                data: notification.request.content.data,
                timestamp: new Date(),
                read: false,
                source: 'local'
            };
            
            const updatedNotifications = [newNotification, ...notifications];
            setNotifications(updatedNotifications);
            setUnreadCount(prev => prev + 1);
            
            // Save to local storage
            saveLocalNotifications(updatedNotifications);
        });

        // Listen for notification taps
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response);
            // Handle navigation based on notification type
        });

        return () => {
            notificationListener && Notifications.removeNotificationSubscription(notificationListener);
            responseListener && Notifications.removeNotificationSubscription(responseListener);
        };
    }, [user]);

    const addNotification = async (notification) => {
        const newNotification = {
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false,
            source: 'local',
            ...notification
        };

        const updatedNotifications = [newNotification, ...notifications];
        setNotifications(updatedNotifications);
        setUnreadCount(prev => prev + 1);
        
        // Save to local storage
        await saveLocalNotifications(updatedNotifications);
    };

    const markAsRead = async (notificationId) => {
        const updatedNotifications = notifications.map(notif =>
            notif.id === notificationId 
                ? { ...notif, read: true }
                : notif
        );
        
        setNotifications(updatedNotifications);
        const newUnreadCount = updatedNotifications.filter(notif => !notif.read).length;
        setUnreadCount(newUnreadCount);
        
        // Save to local storage
        await saveLocalNotifications(updatedNotifications);
    };

    const markAllAsRead = async () => {
        const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
        setNotifications(updatedNotifications);
        setUnreadCount(0);
        
        // Save to local storage
        await saveLocalNotifications(updatedNotifications);
    };

    const clearAllNotifications = async () => {
        setNotifications([]);
        setUnreadCount(0);
        
        // Clear from local storage
        if (user?.uid) {
            await AsyncStorage.removeItem(`notifications_${user.uid}`);
        }
        
        // Cancel scheduled notifications
        await cancelAllNotifications();
    };

    const refreshNotifications = async () => {
        await fetchBackendNotifications();
    };

    const value = {
        expoPushToken,
        notifications,
        unreadCount,
        notificationMode,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        addNotification,
        refreshNotifications,
        setNotifications,
        setUnreadCount,
        sendLocalNotification: scheduleLocalNotification,
        sendCoachMessage: sendCoachNotification,
        sendAchievement: sendAchievementNotification,
        checkScheduled: checkScheduledNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};