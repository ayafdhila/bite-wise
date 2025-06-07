import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import styles from './Styles';
import {Button} from 'react-native-paper'; 
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
export default function MotivationalScreen() {
  const route = useRoute();
  const receivedParams = route.params || {};
  const navigation = useNavigation();
  const { uid } = route.params || {}; 

  return (
    <View style= {styles.container}>
     
        <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
           <Ionicons name="arrow-back" size={30}/>
        </TouchableOpacity>
      
      <Text style = {localstyles.screenTitle}> Your goal is within reach! You've got this!</Text>
      <Image source={require('../assets/Images/leaf.png')} style= {styles.topLeaf}/>
      <Image source={require('../assets/Images/leaf.png')} style= {styles.bottomLeaf}/>
      <Image source={require('../assets/Images/cuteApple.png')} style= {styles.cuteApple}/>
      <Text style = {[styles.secondaryText, styles.greenText]}>" Every choice you make brings you closer to your goal. Keep pushing!"</Text>
      <View style={localstyles.actionButtonContainer}>
                    <TouchableOpacity
                         style={localstyles.primaryActionButton}
                         onPress={() => navigation.navigate('TransformationScreen', { ...route.params })}> 
                         <Text style={localstyles.primaryActionButtonText}>Next</Text>
                    </TouchableOpacity>
                    </View>
        </View>

    
  );
}
const localstyles = StyleSheet.create({
    screenSubtitle: {
        fontSize: 20,
        fontFamily: 'Quicksand_600SemiBold',
        color: '#555555',
        textAlign: 'center',
        marginVertical: 20,
    },
    screenTitle: { // Consistent Title Style
      fontSize: 40, // Adjust size as needed
      fontFamily: 'Quicksand_700Bold',
      color: 'black', // Dark Green
      textAlign: 'center',
      marginBottom: 20, // Space below title
      marginTop: 50, // Removed top margin, rely on container padding
  },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 75,
    },
    primaryActionButton: {
        width: '90%',
        maxWidth: 350,
        height: 55,
        borderRadius: 25,
        backgroundColor: '#2E4A32',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    primaryActionButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18,
    },
   
});