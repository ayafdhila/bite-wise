// --- START OF FILE TabNavigation.js ---

import { View, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useContext, useRef } from 'react'; // Removed useEffect
import stylesFromSheet from './Styles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Keep useIsFocused if needed elsewhere, otherwise remove

import { AuthContext } from './AuthContext';
// import Octicons from '@expo/vector-icons/Octicons'; // Remove if not used

const localStyles = StyleSheet.create({
    loadingStyle: {
        height: 28, // Match icon size
        width: 28,  // Match icon size
    }
});

// Merge or use styles from import
const styles = StyleSheet.create({
    ...stylesFromSheet,
    tabNavigation: stylesFromSheet.tabNavigation || {
         flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
         height: 60, backgroundColor: '#88A76C', borderTopWidth: 1, borderTopColor: '#ccc'
     },
     // Removed 'bot' style assuming it's not used for Ionicons
});


export default function TabNavigation() {
    const navigation = useNavigation();
    // const isFocused = useIsFocused(); // Keep only if needed for other logic in this component
    const { activeCoachId, isCoachStatusLoading, user } = useContext(AuthContext);

    // --- Ref and useEffect for automatic navigation are REMOVED ---
    // const previousCoachIdRef = useRef(activeCoachId);
    // useEffect(() => { ... removed ... }, [...]);

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