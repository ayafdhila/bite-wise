import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class TokenManager {
    static async generateUniqueToken(userId, userType) {
        try {
            // Get device info for uniqueness
            const deviceInfo = {
                modelName: Device.modelName || 'unknown',
                osName: Device.osName || 'unknown',
                osVersion: Device.osVersion || '1.0',
                brand: Device.brand || 'unknown'
            };

            // Create a unique identifier for this user on this device
            const uniqueIdentifier = `${userId}_${userType}_${deviceInfo.modelName}_${Date.now()}`;
            
            console.log(`🔧 Generating unique token for: ${uniqueIdentifier}`);

            // Request permissions
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Notification permissions denied');
            }

            // Get base token
            const tokenResponse = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id'
            });

            // Create unique token by appending user-specific data
            const baseToken = tokenResponse.data;
            const uniqueToken = `${baseToken}_${Buffer.from(uniqueIdentifier).toString('base64').substring(0, 20)}`;

            // Store locally for debugging
            await AsyncStorage.setItem(`pushToken_${userId}`, uniqueToken);
            
            console.log(`✅ Generated unique token: ${uniqueToken.substring(0, 40)}...`);
            
            return uniqueToken;
        } catch (error) {
            console.error('❌ Failed to generate unique token:', error);
            throw error;
        }
    }

    static async getStoredToken(userId) {
        try {
            return await AsyncStorage.getItem(`pushToken_${userId}`);
        } catch (error) {
            console.error('Failed to get stored token:', error);
            return null;
        }
    }

    static async clearStoredToken(userId) {
        try {
            await AsyncStorage.removeItem(`pushToken_${userId}`);
        } catch (error) {
            console.error('Failed to clear stored token:', error);
        }
    }
}