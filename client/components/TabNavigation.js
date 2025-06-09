// --- START OF FILE TabNavigation.js ---

import React, { useContext } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './AuthContext';
import { useNotifications } from './NotificationContext'; // Add this import
import styles from './Styles';

const localStyles = StyleSheet.create({
    badge: {
        position: 'absolute',
        right: -8,
        top: -8,
        backgroundColor: '#FF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default function TabNavigation() {
  const navigation = useNavigation();
  const { activeCoachId, isCoachStatusLoading, user } = useContext(AuthContext);
  const { unreadCount } = useNotifications(); // Add this hook

  const tabs = [
    { name: 'Home', icon: 'home-outline', label: 'Home' },
    { name: 'Recipes', icon: 'restaurant-outline', label: 'Recipes' },
    { name: 'AddMeal', icon: 'add-circle-outline', label: 'Add Meal' },
    { name: 'Profile', icon: 'person-outline', label: 'Profile' },
    // Removed notifications from here since it's in the header
  ];

  // --- Handler for Pressing the Tab Button (Your Original Correct Logic) ---
  const handleExpertsPress = () => {
      // Log current state when pressed for debugging
      console.log(`TabNavigation Press: User=${!!user}, Loading=${isCoachStatusLoading}, ActiveCoachId=${activeCoachId}`);
      if (isCoachStatusLoading) {
          console.log("TabNavigation Press: Status loading...");
          return; // Don't navigate while loading status
      }
      // Navigate based on the CURRENT state when the button is pressed
      if (activeCoachId) {
          console.log("TabNavigation Press: Navigating to ActiveCoachDashboard");
          navigation.navigate('ActiveCoachDashboard', { coachId: activeCoachId });
      } else {
          console.log("TabNavigation Press: Navigating to FindSpecialist");
          navigation.navigate('FindSpecialist');
      }
  };

  // --- RETURN JSX (Your Original Structure) ---
  return(
      // Use your existing container style -> styles.tabNavigation
      <View style={styles.tabNavigation}>

         {/* Home Button */}
         <TouchableOpacity onPress={() => navigation.navigate('Home')} >
             <Ionicons name="home-outline" size={28} color="black" />
         </TouchableOpacity>

           {/* Recipes Button */}
           <TouchableOpacity onPress={() => navigation.navigate('Recipes')} >
                <Ionicons name="restaurant-outline" size={28} color="black" />
          </TouchableOpacity>

           {/* Profile Button */}
           <TouchableOpacity onPress={() => navigation.navigate('Profile')} >
                <Ionicons name="person-outline" size={28} color="black" />
          </TouchableOpacity>

          {/* Notifications Button with Badge */}
    

          {/* Experts/Coaching Button */}
          {/* Disable the button visually if needed while loading? Optional */}
          <TouchableOpacity onPress={handleExpertsPress} disabled={isCoachStatusLoading} >
                {isCoachStatusLoading ? (
                    // Show loading indicator INSTEAD of the icon
                    <ActivityIndicator size="small" color="black" style={localStyles.loadingStyle}/>
                ) : (
                    // Show icon when not loading
                    <Ionicons name="people-outline" size={28} color="black" />
                )}
          </TouchableOpacity>

          {/* Chatbot Button */}
          <TouchableOpacity onPress={() => navigation.navigate('Chatbot')} >
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="black" />
          </TouchableOpacity>

      </View>
  );
}
// --- END OF FILE TabNavigation.js ---