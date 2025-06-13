import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl, Alert, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';
import ProHeader from './ProHeader';
import ProTabNavigation from './ProTabNavigation';

const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    darkGrey: '#333333',
    mediumGrey: '#666666',
    lightGrey: '#999999',
    errorRed: '#FF6B6B',
    unreadBg: '#E8F5E8',
    unreadBorder: '#2E4A32',
    shadowColor: '#000000',
    cardBorder: '#E5E5E5'
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.16:3000';

const CoachNotificationsScreen = () => {
    const navigation = useNavigation();
    const { user: coach, getIdToken, loading: authLoading } = useContext(AuthContext);
    
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [deletingIds, setDeletingIds] = useState(new Set());

    // Fetch coach notifications
    const fetchCoachNotifications = useCallback(async (isRefresh = false) => {
        if (!coach?.uid) {
            setError("Please log in as a coach");
            setLoading(false);
            return;
        }

        if (!isRefresh) setLoading(true);
        setError(null);

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication required");

            const response = await fetch(`${API_BASE_URL}/api/coach/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch notifications');
            }

            const result = await response.json();
            const fetchedNotifications = result.notifications || result || [];
            setNotifications(Array.isArray(fetchedNotifications) ? fetchedNotifications : []);

        } catch (err) {
            console.error("Error fetching coach notifications:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [coach?.uid, getIdToken]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
        try {
            const token = await getIdToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/coach/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, isRead: true }
                            : notif
                    )
                );
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }, [getIdToken]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingIds(prev => new Set([...prev, notificationId]));
                        
                        try {
                            const token = await getIdToken();
                            if (!token) return;

                            const response = await fetch(`${API_BASE_URL}/api/coach/notifications/${notificationId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (response.ok) {
                                setNotifications(prev => 
                                    prev.filter(notif => notif.id !== notificationId)
                                );
                            } else {
                                throw new Error('Failed to delete notification');
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete notification");
                        } finally {
                            setDeletingIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(notificationId);
                                return newSet;
                            });
                        }
                    }
                }
            ]
        );
    }, [getIdToken]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        if (unreadCount === 0) return;

        Alert.alert(
            "Mark All as Read",
            `Mark all ${unreadCount} notifications as read?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark All",
                    onPress: async () => {
                        try {
                            const token = await getIdToken();
                            if (!token) return;

                            const response = await fetch(`${API_BASE_URL}/api/coach/notifications/mark-all-read`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (response.ok) {
                                setNotifications(prev => 
                                    prev.map(notif => ({ ...notif, isRead: true }))
                                );
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to mark all notifications as read");
                        }
                    }
                }
            ]
        );
    }, [notifications, getIdToken]);

    // Handle notification press
    const handleNotificationPress = useCallback(async (notification) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        if (notification.data?.screen) {
            try {
                navigation.navigate(notification.data.screen, notification.data.params || {});
            } catch (navError) {
                console.warn("Navigation error:", navError);
            }
        }
    }, [markAsRead, navigation]);

    // Get notification icon
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'invitation_received': return 'person-add';
            case 'coach_selected': return 'trophy';
            case 'new_message': return 'chatbubble-ellipses';
            case 'client_request': return 'mail';
            case 'plan_reminder': return 'clipboard';
            case 'system_alert': return 'warning';
            default: return 'notifications';
        }
    };

    // Get notification color
    const getNotificationColor = (type) => {
        switch (type) {
            case 'invitation_received': return '#3498DB';
            case 'coach_selected': return '#F39C12';
            case 'new_message': return '#2ECC71';
            case 'client_request': return '#9B59B6';
            case 'plan_reminder': return '#E67E22';
            case 'system_alert': return '#E74C3C';
            default: return PALETTE.mediumGreen;
        }
    };

    // Get notification background
    const getNotificationBg = (type) => {
        switch (type) {
            case 'invitation_received': return '#EBF3FD';
            case 'coach_selected': return '#FEF3E8';
            case 'new_message': return '#E8F5E8';
            case 'client_request': return '#F3E8FE';
            case 'plan_reminder': return '#FDF0E8';
            case 'system_alert': return '#FDEBEB';
            default: return PALETTE.lightCream;
        }
    };

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown date';
        
        let date;
        if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else if (timestamp?.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return 'Invalid date';
        }

        if (isNaN(date.getTime())) return 'Invalid date';

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    // Render notification item
    const renderNotificationItem = ({ item }) => {
        const isDeleting = deletingIds.has(item.id);
        
        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    !item.isRead && styles.unreadItem
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: getNotificationBg(item.type) }
                ]}>
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={24}
                        color={getNotificationColor(item.type)}
                    />
                    {!item.isRead && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[
                            styles.title,
                            !item.isRead && styles.unreadTitle
                        ]}>
                            {item.title}
                        </Text>
                        <Text style={styles.timestamp}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                    
                    <Text style={styles.body} numberOfLines={2}>
                        {item.body}
                    </Text>

                    <View style={styles.actionRow}>
                        {!item.isRead && (
                            <TouchableOpacity
                                style={styles.markReadButton}
                                onPress={() => markAsRead(item.id)}
                            >
                                <Ionicons name="checkmark" size={16} color={PALETTE.darkGreen} />
                                <Text style={styles.markReadText}>Mark as read</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteNotification(item.id)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color={PALETTE.errorRed} />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={16} color={PALETTE.errorRed} />
                                    <Text style={styles.deleteText}>Delete</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Effects
    useFocusEffect(
        useCallback(() => {
            if (!authLoading && coach?.uid) {
                fetchCoachNotifications();
            }
        }, [authLoading, coach?.uid, fetchCoachNotifications])
    );

    // Render methods
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-off" size={60} color={PALETTE.lightGrey} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptyText}>
                You'll receive notifications here when clients send requests, messages, or when there are system updates.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => fetchCoachNotifications()}>
                <Ionicons name="refresh" size={18} color={PALETTE.white} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
        </View>
    );

    const renderError = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="cloud-offline" size={60} color={PALETTE.errorRed} />
            </View>
            <Text style={styles.emptyTitle}>Connection Error</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => fetchCoachNotifications()}>
                <Ionicons name="refresh" size={18} color={PALETTE.white} />
                <Text style={styles.refreshButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );

    if (authLoading) {
        return (
            <View style={styles.container}>
                <ProHeader subtitle="Notifications" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
                <ProTabNavigation />
            </View>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <View style={styles.container}>
            <ProHeader subtitle="Notifications" />
            
            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{notifications.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, unreadCount > 0 && styles.unreadCount]}>
                        {unreadCount}
                    </Text>
                    <Text style={styles.statLabel}>Unread</Text>
                </View>
                <View style={styles.statActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, unreadCount === 0 && styles.disabledButton]}
                        onPress={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <Ionicons 
                            name="checkmark-done" 
                            size={18} 
                            color={unreadCount > 0 ? PALETTE.darkGreen : PALETTE.lightGrey} 
                        />
                        <Text style={[styles.actionButtonText, unreadCount === 0 && styles.disabledText]}>
                            Mark All Read
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Notifications List */}
            <View style={styles.listContainer}>
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                        <Text style={styles.loadingText}>Loading notifications...</Text>
                    </View>
                ) : error ? (
                    renderError()
                ) : (
                    <FlatList
                        data={notifications}
                        renderItem={renderNotificationItem}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    fetchCoachNotifications(true);
                                }}
                                colors={[PALETTE.darkGreen]}
                                tintColor={PALETTE.darkGreen}
                            />
                        }
                        ListEmptyComponent={renderEmptyState}
                        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <ProTabNavigation />
        </View>
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
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 15,
        color: PALETTE.darkGrey,
        fontSize: 16,
        fontWeight: '500',
    },
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: PALETTE.white,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.cardBorder,
        elevation: 1,
        shadowColor: PALETTE.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: PALETTE.darkGrey,
    },
    unreadCount: {
        color: PALETTE.darkGreen,
    },
    statLabel: {
        fontSize: 12,
        color: PALETTE.mediumGrey,
        marginTop: 2,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: PALETTE.cardBorder,
        marginRight: 20,
    },
    statActions: {
        flex: 1,
        alignItems: 'flex-end',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: PALETTE.lightCream,
    },
    disabledButton: {
        opacity: 0.5,
    },
    actionButtonText: {
        marginLeft: 6,
        fontSize: 12,
        color: PALETTE.darkGreen,
        fontWeight: '600',
    },
    disabledText: {
        color: PALETTE.lightGrey,
    },
    listContainer: {
        flex: 1,
    },
    list: {
        paddingVertical: 8,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
    },
    notificationItem: {
        flexDirection: 'row',
        backgroundColor: PALETTE.white,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: PALETTE.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: PALETTE.cardBorder,
    },
    unreadItem: {
        backgroundColor: PALETTE.unreadBg,
        borderLeftWidth: 4,
        borderLeftColor: PALETTE.unreadBorder,
        elevation: 3,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: PALETTE.darkGreen,
        borderWidth: 2,
        borderColor: PALETTE.white,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: PALETTE.darkGrey,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '700',
        color: PALETTE.darkGreen,
    },
    timestamp: {
        fontSize: 11,
        color: PALETTE.lightGrey,
        fontWeight: '500',
    },
    body: {
        fontSize: 14,
        color: PALETTE.mediumGrey,
        lineHeight: 20,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    markReadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#E8F5E8',
        marginRight: 8,
    },
    markReadText: {
        marginLeft: 4,
        fontSize: 11,
        color: PALETTE.darkGreen,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#FFEBEB',
    },
    deleteText: {
        marginLeft: 4,
        fontSize: 11,
        color: PALETTE.errorRed,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: PALETTE.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 2,
        shadowColor: PALETTE.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: PALETTE.darkGrey,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: PALETTE.mediumGrey,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.darkGreen,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 2,
        shadowColor: PALETTE.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    refreshButtonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 6,
    },
});

export default CoachNotificationsScreen;