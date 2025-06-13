import React, { useState } from 'react';
import {
  View, // ✅ Use View instead of SafeAreaView
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
// ✅ Remove SafeAreaView import
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import Header from './Header';
import TabNavigation from './TabNavigation';
import { useSimpleNotifications } from './NotificationContext';

const PALETTE = {
  lightCream: '#F5E4C3',
  lightOrange: '#FCCF94',
  darkGreen: '#2E4A32',
  mediumGreen: '#88A76C',
  grey: '#A0A0A0',
  darkGrey: '#333333',
  mediumGrey: '#666666',
  lightGrey: '#999999',
  white: '#FFFFFF',
  errorRed: '#FF6B6B',
  unreadBg: '#E8F5E8',
  unreadBorder: '#2E4A32',
  shadowColor: '#000000',
  cardBorder: '#E5E5E5'
};

const SimpleNotificationsScreen = () => {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useSimpleNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMarkAsRead = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleDeleteNotification = (notification) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(notification)
        }
      ]
    );
  };

  const performDelete = (notification) => {
    setDeletingIds(prev => new Set([...prev, notification.id]));
    
    try {
      deleteNotification(notification.id);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      Alert.alert(
        "Mark All as Read",
        `Mark all ${unreadCount} notifications as read?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark All", onPress: markAllAsRead }
        ]
      );
    }
  };

  const handleClearAll = () => {
    if (notifications.length > 0) {
      Alert.alert(
        "Clear All Notifications",
        "This will delete all notifications. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Clear All", 
            style: "destructive",
            onPress: clearAllNotifications 
          }
        ]
      );
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
        case 'new_message': return 'chatbubble-ellipses';
        case 'motivation':
        case 'daily_motivation': return 'star';
        case 'plan_created':
        case 'plan_updated': return 'restaurant';
        case 'invitation_received': return 'person-add';
        case 'invitation_accepted': return 'checkmark-circle';
        case 'invitation_declined': return 'close-circle';
        case 'coach_selected': return 'trophy';
        default: return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
        case 'new_message': return '#2ECC71';
        case 'invitation_received': return '#3498DB';
        case 'invitation_accepted': return '#27AE60';
        case 'invitation_declined': return '#E67E22';
        case 'coach_selected': return '#F39C12';
        case 'plan_updated': return '#9B59B6';
        case 'daily_motivation': return '#E74C3C';
        default: return PALETTE.mediumGreen;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
        case 'new_message': return '#E8F5E8';
        case 'invitation_received': return '#EBF3FD';
        case 'invitation_accepted': return '#E8F5E8';
        case 'invitation_declined': return '#FDF0E8';
        case 'coach_selected': return '#FEF3E8';
        case 'plan_updated': return '#F3E8FE';
        case 'daily_motivation': return '#FDEBEB';
        default: return PALETTE.lightCream;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item.read;
    const isDeleting = deletingIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.unreadItem
        ]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationBg(item.type) }
        ]}>
          <Icon 
            name={getNotificationIcon(item.type)} 
            size={24} 
            color={getNotificationColor(item.type)}
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[
              styles.notificationTitle,
              isUnread && styles.unreadText
            ]}>
              {item.title}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          
          <View style={styles.actionRow}>
            {isUnread && (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={() => handleMarkAsRead(item)}
                disabled={isDeleting}
              >
                <Icon name="checkmark" size={16} color={PALETTE.darkGreen} />
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={PALETTE.errorRed} />
              ) : (
                <>
                  <Icon name="trash-outline" size={16} color={PALETTE.errorRed} />
                  <Text style={styles.deleteText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="notifications-off" size={60} color={PALETTE.lightGrey} />
      </View>
      <Text style={styles.emptyTitle}>No Notifications Yet</Text>
      <Text style={styles.emptyText}>
        You'll receive notifications here for messages, plan updates, and daily motivation.
      </Text>
    </View>
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.container}>  {/* ✅ Changed from SafeAreaView */}
        <Header subtitle="Notifications" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.darkGreen} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
        <TabNavigation />
      </View>
    );
  }

  return (
    <View style={styles.container}>  {/* ✅ Changed from SafeAreaView */}
      <Header subtitle="Notifications" />
      
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
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Icon 
              name="checkmark-done" 
              size={18} 
              color={unreadCount > 0 ? PALETTE.darkGreen : PALETTE.lightGrey} 
            />
            <Text style={[styles.actionButtonText, unreadCount === 0 && styles.disabledText]}>
              Mark All Read
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, notifications.length === 0 && styles.disabledButton]}
            onPress={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Icon 
              name="trash" 
              size={18} 
              color={notifications.length > 0 ? PALETTE.errorRed : PALETTE.lightGrey} 
            />
            <Text style={[styles.clearButtonText, notifications.length === 0 && styles.disabledText]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PALETTE.darkGreen]}
            tintColor={PALETTE.darkGreen}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      <TabNavigation />
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
    fontSize: 16,
    color: PALETTE.darkGrey,
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: PALETTE.lightCream,
    marginLeft: 8,
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
  clearButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: PALETTE.errorRed,
    fontWeight: '600',
  },
  disabledText: {
    color: PALETTE.lightGrey,
  },
  list: {
    flex: 1,
  },
  listContainer: {
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
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.darkGrey,
    marginRight: 8,
  },
  unreadText: {
    color: PALETTE.darkGreen,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: PALETTE.lightGrey,
    fontWeight: '500',
  },
  notificationBody: {
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
  },
});

export default SimpleNotificationsScreen;