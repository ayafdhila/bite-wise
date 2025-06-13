import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSimpleNotifications } from './NotificationContext';

const PALETTE = {
  unreadRed: '#FF3B30',
  white: '#FFFFFF',
};

const NotificationBadge = ({ style }) => {
  const { unreadCount } = useSimpleNotifications();

  if (unreadCount === 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: PALETTE.unreadRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: PALETTE.white,
  },
  badgeText: {
    color: PALETTE.white,
    fontSize: 12,
    fontFamily: 'Quicksand_700Bold',
    textAlign: 'center',
  },
});

export default NotificationBadge;