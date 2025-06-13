import { Text, View, Image, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useContext } from "react";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './AuthContext';

export default function ProHeader({subtitle, style}) {
    const navigation = useNavigation();
    const { user: coach, getIdToken } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread notification count
    const fetchUnreadCount = async () => {
        if (!coach?.uid) return;

        try {
            const token = await getIdToken();
            if (!token) return;

            const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.16:3000';
            const response = await fetch(`${API_BASE_URL}/api/coach/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        // Refresh count every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [coach?.uid]);

    return (
        <View style={[styles.header, style]}>
            <View style={styles.topRow}>
                <Image
                    source={require("../assets/Images/logo.png")} 
                    style={styles.headerLogo}
                />
                <Text style={styles.appName}>Bite wise</Text>
                
                <TouchableOpacity 
                    onPress={() => navigation.navigate('CoachNotificationsScreen')}
                    style={styles.notificationButton}
                >
                    <Ionicons name="notifications-outline" size={24} color="black" />
                    {unreadCount > 0 && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => navigation.navigate('CoachSettings')}>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.subText}>{subtitle}</Text>
        </View>
    );
}
