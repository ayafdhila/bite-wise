import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AuthContext } from './AuthContext';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext();

// Export both useSimpleNotifications and useNotifications for compatibility
export const useSimpleNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useSimpleNotifications must be used within NotificationProvider');
  }
  return context;
};

// KEEP THIS FOR COMPATIBILITY WITH HEADER.JS
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const SimpleNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  
  const { user, getIdToken } = useContext(AuthContext);
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

  // Register for push notifications
  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted');
        return null;
      }

      // Get the correct Expo project ID from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.error('No Expo project ID found in app config');
        return null;
      }

      console.log('Using Expo project ID:', projectId);

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId // ✅ Use the correct Expo project ID
      })).data;
      
      console.log('Got Expo push token:', token);
      
      setExpoPushToken(token);
      
      // Save token to backend
      if (user && token) {
        await saveTokenToBackend(token);
      }
      
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Save push token to backend
  const saveTokenToBackend = async (token) => {
    try {
      const authToken = await getIdToken();
      if (!authToken) return;

      const userType = user?.userType === 'Professional' ? 'coach' : 'user';
      
      const response = await fetch(`${API_BASE_URL}/api/notifications/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          token, 
          userType 
        }),
      });

      if (response.ok) {
        console.log('✅ Push token saved to backend');
      } else {
        console.error('❌ Failed to save push token to backend');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  // Load notifications from local storage
  const loadLocalNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('simple_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        const unread = parsed.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading local notifications:', error);
    }
  };

  // Save notifications to local storage
  const saveLocalNotifications = async (notifications) => {
    try {
      await AsyncStorage.setItem('simple_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving local notifications:', error);
    }
  };

  // Add new notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      title: notification.title || 'Notification',
      body: notification.body || '',
      type: notification.type || 'general',
      read: false,
      timestamp: new Date(),
      data: notification.data || {},
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep only 50 most recent
      saveLocalNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => prev + 1);
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveLocalNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveLocalNotifications(updated);
      return updated;
    });
    
    setUnreadCount(0);
  };

  // Delete notification
  const deleteNotification = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveLocalNotifications(updated);
      return updated;
    });

    // Update unread count
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    await AsyncStorage.removeItem('simple_notifications');
  };

  // Send test notification to backend
  const sendTestNotification = async () => {
    try {
      const authToken = await getIdToken();
      if (!authToken) {
        console.log('No auth token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        console.log('✅ Test notification sent');
        // Add local test notification
        addNotification({
          title: '🧪 Test Notification',
          body: 'This is a test notification from the app!',
          type: 'test'
        });
      } else {
        console.error('❌ Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  // Initialize on user login
  useEffect(() => {
    if (user) {
      loadLocalNotifications();
      registerForPushNotifications();
    } else {
      // Clear notifications on logout
      setNotifications([]);
      setUnreadCount(0);
      setExpoPushToken(null);
    }
  }, [user]);

  // Listen for incoming notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      
      addNotification({
        title: notification.request.content.title,
        body: notification.request.content.body,
        type: notification.request.content.data?.type || 'push',
        data: notification.request.content.data || {}
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response:', response);
      // Handle notification tap here if needed
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    expoPushToken,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    sendTestNotification,
    registerForPushNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Export both provider names for compatibility
export const NotificationProvider = SimpleNotificationProvider;
export default NotificationContext;