import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    SafeAreaView,
    Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from './AuthContext';
import { getUserNotifications, markNotificationAsRead, deleteNotification } from '../services/NotificationService';
import { useNotifications } from './NotificationContext';
import Header from './Header';
import TabNavigation from './TabNavigation';

const PALETTE = {
    darkGreen: '#2E4A32',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    darkGrey: '#555555',
    grey: '#A0A0A0',
    black: '#000000',
    deleteRed: '#FF6B6B'
};

const NotificationsScreen = () => {
    const navigation = useNavigation();
    const { getIdToken } = useContext(AuthContext);
    const { 
        notifications, 
        setNotifications, 
        markAsRead, 
        unreadCount, 
        setUnreadCount,
        refreshNotifications
    } = useNotifications();
    
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [deletingIds, setDeletingIds] = useState(new Set());

    const fetchNotifications = async (isRefresh = false) => {
        try {
            if (!isRefresh) setIsLoading(true);
            setError(null);

            const token = await getIdToken();
            if (!token) {
                setError('Authentication required');
                return;
            }

            const result = await getUserNotifications(token);
            console.log('NotificationsScreen - Received result:', result);
            
            let fetchedNotifications = [];
            if (result && Array.isArray(result.notifications)) {
                fetchedNotifications = result.notifications;
            } else if (Array.isArray(result)) {
                fetchedNotifications = result;
            } else {
                console.log('No notifications found or invalid format');
                fetchedNotifications = [];
            }
            
            setNotifications(fetchedNotifications);
            const unreadCount = fetchedNotifications.filter(n => !n.read).length;
            setUnreadCount(unreadCount);
            
            console.log(`✅ Loaded ${fetchedNotifications.length} notifications, ${unreadCount} unread`);
            
        } catch (err) {
            setError('Failed to load notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (notifications.length === 0) {
            fetchNotifications();
        }
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        
        if (refreshNotifications) {
            try {
                await refreshNotifications();
            } catch (error) {
                console.error('Error refreshing from context:', error);
            }
        } else {
            await fetchNotifications(true);
        }
        
        setRefreshing(false);
    };

    const handleNotificationPress = async (notification) => {
        try {
            // Navigate based on notification type
            switch (notification.type) {
                case 'new_message':
                    navigation.navigate('UserChatScreen');
                    break;
                case 'coach_accepted':
                    navigation.navigate('ActiveCoachDashboard');
                    break;
                case 'morning_motivation':
                case 'lunch_reminder':
                case 'afternoon_boost':
                case 'hydration_check':
                    // Stay on notifications screen for these
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error handling notification press:', error);
        }
    };

    const handleMarkAsRead = async (notification) => {
        if (notification.read) return;

        try {
            // Mark as read locally first (optimistic update)
            markAsRead(notification.id);
            
            // Try to mark as read on server
            const token = await getIdToken();
            await markNotificationAsRead(notification.id, token);
            console.log('✅ Successfully marked notification as read on server');
            
        } catch (serverError) {
            console.error('❌ Failed to mark as read on server:', serverError);
            
            // Check if it's a 404 error (notification not found on server)
            if (serverError.message?.includes('404') || serverError.message?.includes('not found')) {
                console.log('📝 Notification not found on server, removing from local state');
                // Remove from local state since it doesn't exist on server
                const updatedNotifications = notifications.filter(n => n.id !== notification.id);
                setNotifications(updatedNotifications);
                const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
                setUnreadCount(newUnreadCount);
            }
            // Don't show error to user - the optimistic update already happened
        }
    };

    const handleDeleteNotification = async (notification) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => performDelete(notification)
                }
            ]
        );
    };

    const performDelete = async (notification) => {
        const notificationId = notification.id;
        
        // Add to deleting set for loading state
        setDeletingIds(prev => new Set([...prev, notificationId]));
        
        try {
            // Remove from local state immediately (optimistic update)
            const updatedNotifications = notifications.filter(n => n.id !== notificationId);
            setNotifications(updatedNotifications);
            const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
            setUnreadCount(newUnreadCount);
            
            // Try to delete on server
            const token = await getIdToken();
            
            // Check if deleteNotification service exists, if not just skip server call
            if (typeof deleteNotification === 'function') {
                await deleteNotification(notificationId, token);
                console.log('✅ Successfully deleted notification on server');
            } else {
                console.log('📝 Delete service not available, only removed locally');
            }
            
        } catch (serverError) {
            console.error('❌ Failed to delete on server:', serverError);
            
            // If server delete fails but notification was removed locally, that's fine
            // Most notifications are local/cache based anyway
            if (serverError.message?.includes('404') || serverError.message?.includes('not found')) {
                console.log('📝 Notification already deleted or not found on server');
            }
            // Don't revert local deletion - user experience is more important
            
        } finally {
            // Remove from deleting set
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(notificationId);
                return newSet;
            });
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_message':
                return 'chatbubble-outline';
            case 'coach_accepted':
                return 'checkmark-circle-outline';
            case 'motivational':
            case 'morning_motivation':
                return 'star-outline';
            case 'comeback':
                return 'heart-outline';
            case 'meal_reminder':
            case 'lunch_reminder':
                return 'restaurant-outline';
            case 'hydration':
            case 'hydration_check':
                return 'water-outline';
            case 'afternoon_boost':
                return 'sunny-outline';
            default:
                return 'notifications-outline';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'new_message':
                return '#4A90E2';
            case 'coach_accepted':
                return '#50C878';
            case 'motivational':
            case 'morning_motivation':
                return '#FFD700';
            case 'comeback':
                return '#FF6B6B';
            case 'meal_reminder':
            case 'lunch_reminder':
                return '#FF8C00';
            case 'hydration':
            case 'hydration_check':
                return '#00CED1';
            case 'afternoon_boost':
                return '#FFA500';
            default:
                return PALETTE.darkGreen;
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    const renderNotificationItem = ({ item }) => {
        const isUnread = !item.read;
        const notificationType = item.type || item.data?.type || 'default';
        const iconColor = getNotificationColor(notificationType);
        const isDeleting = deletingIds.has(item.id);
        
        return (
            <View style={[styles.notificationCard, isUnread && styles.unreadCard]}>
                {/* Main notification content */}
                <TouchableOpacity
                    style={styles.notificationContent}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                >
                    <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                        <Icon
                            name={getNotificationIcon(notificationType)}
                            size={24}
                            color={iconColor}
                        />
                    </View>
                    
                    <View style={styles.contentContainer}>
                        <Text style={[styles.title, isUnread && styles.unreadTitle]}>
                            {item.title || 'Notification'}
                        </Text>
                        <Text style={styles.body} numberOfLines={2}>
                            {item.body || item.message || 'No message'}
                        </Text>
                        <Text style={styles.timestamp}>
                            {formatTimestamp(item.timestamp)}
                        </Text>
                    </View>
                    
                    {isUnread && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
                </TouchableOpacity>

                {/* Action buttons */}
                <View style={styles.actionButtons}>
                    {isUnread && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleMarkAsRead(item)}
                            disabled={isDeleting}
                        >
                            <Icon name="checkmark-outline" size={20} color={PALETTE.darkGreen} />
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteNotification(item)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color={PALETTE.deleteRed} />
                        ) : (
                            <Icon name="trash-outline" size={20} color={PALETTE.deleteRed} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isLoading && notifications.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <Header subtitle="Notifications" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
                <TabNavigation />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header subtitle="Notifications" />
            
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="warning-outline" size={20} color="#D32F2F" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchNotifications()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}
            
            <FlatList
                data={notifications || []}
                renderItem={renderNotificationItem}
                keyExtractor={(item, index) => item.id || index.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={[PALETTE.darkGreen]}
                        tintColor={PALETTE.darkGreen}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="notifications-outline" size={80} color={PALETTE.grey} />
                        <Text style={styles.emptyTitle}>No notifications yet</Text>
                        <Text style={styles.emptySubtitle}>
                            You'll see motivational messages, coach updates, and other important notifications here.
                        </Text>
                        {error && (
                            <TouchableOpacity 
                                style={styles.retryButtonEmpty} 
                                onPress={() => fetchNotifications()}
                            >
                                <Text style={styles.retryButtonTextEmpty}>Try Loading Again</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
            
            <TabNavigation />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_500Medium',
    },
    errorContainer: {
        backgroundColor: '#FFE6E6',
        padding: 15,
        margin: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        flex: 1,
    },
    retryButton: {
        backgroundColor: '#D32F2F',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    retryButtonEmpty: {
        backgroundColor: PALETTE.darkGreen,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    retryButtonTextEmpty: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 15,
        paddingBottom: 100,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: PALETTE.white,
        borderRadius: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    unreadCard: {
        backgroundColor: PALETTE.lightOrange,
        borderLeftWidth: 4,
        borderLeftColor: PALETTE.darkGreen,
    },
    notificationContent: {
        flex: 1,
        flexDirection: 'row',
        padding: 15,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.black,
        marginBottom: 4,
    },
    unreadTitle: {
        color: PALETTE.darkGreen,
    },
    body: {
        fontSize: 14,
        color: PALETTE.darkGrey,
        marginBottom: 8,
        lineHeight: 20,
        fontFamily: 'Quicksand_400Regular',
    },
    timestamp: {
        fontSize: 12,
        color: PALETTE.grey,
        fontFamily: 'Quicksand_500Medium',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    actionButtons: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 15,
        backgroundColor: PALETTE.white,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
        backgroundColor: PALETTE.lightCream,
    },
    deleteButton: {
        backgroundColor: '#FFE6E6',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        fontSize: 20,
        color: PALETTE.darkGrey,
        marginTop: 20,
        marginBottom: 10,
        fontFamily: 'Quicksand_700Bold',
    },
    emptySubtitle: {
        fontSize: 14,
        color: PALETTE.grey,
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: 'Quicksand_400Regular',
    },
});

export default NotificationsScreen;