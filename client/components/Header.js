import { Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function Header({
  subtitle, 
  style, 
  showBackButton = false,     // New prop for conditional back button
  onBackPress,                // New prop for custom back action
  rightIcon,                  // New prop for right icon (only for specific screens)
  onRightIconPress            // New prop for right icon action
}) {
  const navigation = useNavigation();
  
  // Use custom back press if provided, otherwise use navigation.goBack()
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
        
        {/* Always show notifications and settings */}
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('userSettings')}>
          <Ionicons name="settings-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      {/* Bottom Row - Back button, subtitle, and optional right icon */}
      <View style={styles.bottomRow}>
        {/* Show back button conditionally */}
        {showBackButton && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        )}
        
        {/* Subtitle - takes remaining space and centers */}
        <Text style={[styles.subText, { flex: 1, textAlign: 'center' }]}>{subtitle}</Text>
        
        {/* Right icon only for specific screens (like NutritionDisplay) */}
        {rightIcon && onRightIconPress ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconButton}>
            <Ionicons name={rightIcon} size={24} color="black" />
          </TouchableOpacity>
        ) : (
          // Empty view to maintain layout balance when no right icon
          showBackButton && <View style={styles.rightIconButton} />
        )}
      </View>
    </View>
  );
}
