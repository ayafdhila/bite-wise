import React, { useEffect, useState, useContext, useCallback } from 'react'; 
import {
    View, Text, Image, ScrollView, 
    TouchableOpacity, Alert, StyleSheet, 
    ActivityIndicator, 
    Keyboard 
} from 'react-native';
import styles from './Styles'; 
import { Button } from 'react-native-paper'; 
import { useNavigation, useRoute } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons'; 
import { AuthContext } from '../components/AuthContext'; 
import axios from 'axios'; 

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 

if (!API_BASE_URL) {
    console.warn("WARN: API_BASE_URL not defined in ActivityLevel.js.");
}

export default function ActivityLevel() {
    const navigation = useNavigation();
    const route = useRoute(); 
    const { previousParams = {}, goal } = route.params || {};


    const { user, getIdToken } = useContext(AuthContext);
    const uid = user?.uid; 

    const [selected, setSelected] = useState(previousParams.activityLevel || null); 
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const activityOptions = [
        "Mostly Sitting 🪑",
        "Lightly Active 🚶",
        "Active Lifestyle 🚴",
        "Highly Active 💪"
    ];

     useEffect(() => {
         console.log("--- ActivityLevel Mounted ---");
         console.log("ActivityLevel Received Params:", previousParams);
         console.log("ActivityLevel Using UID:", uid);
         if (!uid) { Alert.alert("Error", "User ID not found."); }
         if (previousParams.activityLevel && !selected) {
             setSelected(previousParams.activityLevel);
         }
     }, [previousParams, uid, selected]);


    const handleOptions = (option) => {
        setSelected(option);
    };

    const handleSelect = async () => {

        if (!uid) { Alert.alert("Error", "User session error."); return; }
        if (!selected) { Alert.alert("Selection Needed", "Please select activity level."); return; }
        if (!API_BASE_URL) { Alert.alert("Config Error", "Cannot connect."); return; }
        if (isSubmitting) return; 

        Keyboard.dismiss(); 
        setIsSubmitting(true); 

        const API_ENDPOINT = `${API_BASE_URL}/user/activity-level`; 
        const requestBody = {
            uid, 
            activityLevel: selected, 
        };
        console.log("Sending activity level update:", requestBody);
        console.log(`ActivityLevel: Calling ${API_ENDPOINT} with method PATCH`); 

        try {
     
            const idToken = await getIdToken(true); 
            if (!idToken) {
                throw new Error("Authentication session expired or invalid.");
            }

            const response = await axios.patch(API_ENDPOINT, requestBody, { 
                headers: { 
                    Authorization: `Bearer ${idToken}`
                }
             });

            console.log("Activity Level Updated Response:", response.data); 

            const nextScreenParams = {
  uid, age: user.age, weight: user.weight, height: user.height, gender: user.gender,
  activityLevel: selected,
  goal
};


          
            console.log("ActivityLevel: Navigating to EstimationScreen, passing:", nextScreenParams);
            navigation.navigate("EstimationScreen", nextScreenParams); 

        } catch (error) {
     
            if (error.response) {
        
                console.error("Update Activity Level Error:", error.response.status, error.response.data);
                Alert.alert("Update Error", error.response.data?.error || `Server Error ${error.response.status}`);
            } else if (error.request) {
            
                console.error("Network Error:", error.request);
                Alert.alert("Update Error", "Cannot reach server. Check connection.");
            } else {

                console.error("Request Setup/Other Error:", error.message);
                Alert.alert("Update Error", error.message);
            }
        } finally {
            setIsSubmitting(false); 
        }
    }; 


    return (
        <View
            style={styles.container} 
           
        >
  
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                     <Ionicons name="arrow-back" size={30} />
                 </TouchableOpacity>
                 <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
                 <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />

                <Text style={localstyles.screenTitle}>How active are you in your daily life?</Text>

                <View style={styles.optionsContainer}>
                    {activityOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[ styles.optionButton, selected === option && styles.selected ]}
                            onPress={() => handleOptions(option)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.optionText, selected === option && styles.selectedOptionText]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
        

            <View style={[localstyles.actionButtonContainer, { marginTop: 30 }]}>
                <Button
                    mode='contained'
                    style={[localstyles.primaryActionButton, !selected && styles.buttonDisabled, isSubmitting && styles.buttonDisabled]}
                    labelStyle={localstyles.primaryActionButtonText}
                    onPress={handleSelect}
                    disabled={!selected || isSubmitting}
                    loading={isSubmitting}
                >
                    {!isSubmitting && "Next"}
                </Button>
            </View>
        </View>
    );
}
const localstyles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F5E4C3',
    },
    scrollContentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    screenSubtitle: {
        fontSize: 20,
        fontFamily: 'Quicksand_600SemiBold',
        color: '#555555',
        textAlign: 'center',
        marginVertical: 20,
    },
    screenTitle: {
        fontSize: 35,
        fontFamily: 'Quicksand_700Bold',
        color: 'black',
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 50,
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
    backButton: {
        position: 'absolute',
        left: 10,
        top: 50,
        backgroundColor: 'transparent',
        padding: 10,
    },
});