import { Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSimpleNotifications } from './NotificationContext';

export default function Header({
  subtitle, 
  style, 
  showBackButton = true,
  onBackPress,
  rightIcon,
  onRightIconPress
}) {
  const navigation = useNavigation();
  const { unreadCount } = useSimpleNotifications();
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, style]}>
      {/* Top Row - Always show logo, app name, notifications, and settings */}
      <View style={styles.topRow}>
        <Image
          source={require("../assets/Images/logo.png")} 
          style={styles.headerLogo}
        />
        <Text style={styles.appName}>Bite wise</Text>
        
        {/* Notifications with badge */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('NotificationsScreen')}
          style={styles.notificationContainer}
        >
          <Ionicons name="notifications-outline" size={24} color="#2E4A32" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('userSettings')}>
          <Ionicons name="settings-outline" size={24} color="#2E4A32" />
        </TouchableOpacity>
      </View>
      
      {/* Bottom Row - Back button, subtitle, and optional right icon */}
      <View style={styles.bottomRow}>
        {/* Show back button conditionally */}
        {showBackButton && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backHButton}>
            <Ionicons name="arrow-back" size={24} color="#2E4A32" />
          </TouchableOpacity>
        )}
        
        {/* Subtitle - takes remaining space and centers */}
        <Text style={[styles.subText, { flex: 1, textAlign: 'center' }]}>{subtitle}</Text>
        
        {/* Right icon only for specific screens (like NutritionDisplay) */}
        {rightIcon && onRightIconPress ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconButton}>
            <Ionicons name={rightIcon} size={24} color="#2E4A32" />
          </TouchableOpacity>
        ) : (
          // Empty view to maintain layout balance when no right icon
          showBackButton && <View style={styles.rightIconButton} />
        )}
      </View>
    </View>
  );
}
