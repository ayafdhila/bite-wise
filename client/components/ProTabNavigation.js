// components/TabNavigation.js
import { View, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useContext, useEffect, useRef } from 'react';
import stylesFromSheet from './Styles'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { AuthContext } from './AuthContext'; 
import Octicons from '@expo/vector-icons/Octicons';

const localStyles = StyleSheet.create({
    loadingStyle: { // Style for the ActivityIndicator to match icon size
        height: 28, // Match icon size
        width: 28,  // Match icon size
    }
});

// Merge or use styles from import
const styles = StyleSheet.create({
    ...stylesFromSheet, // Your base styles from './Styles.js'
    // Ensure styles.tabNavigation, styles.bot exist from stylesFromSheet
    // If not, provide default examples here
    tabNavigation: stylesFromSheet.tabNavigation || {
         flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
         height: 60, backgroundColor: '#88A76C', borderTopWidth: 1, borderTopColor: '#ccc'
     },
     bot: stylesFromSheet.bot || {
         width: 40, height: 40, resizeMode: 'contain'
     }
});


export default function TabNavigation() {
    const navigation = useNavigation();
    const isFocused = useIsFocused(); 
  

    
    return(

        <View style={styles.tabNavigation}>

           <TouchableOpacity onPress={() => navigation.navigate('HomeCoach')} >
               <Ionicons name="home-outline" size={28} color="black" />
           </TouchableOpacity>

             <TouchableOpacity onPress={() => navigation.navigate('Clients')}  >
             <Ionicons name="list-circle-outline" size={32} color="black" />
            </TouchableOpacity>

             <TouchableOpacity onPress={() => navigation.navigate('Invitations')}  >
             <Ionicons name="person-add-outline" size={28} color="black" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('CoachMessagesListScreen')}  >
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="black" />
            </TouchableOpacity>

        </View>
    );
}