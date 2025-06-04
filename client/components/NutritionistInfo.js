import React, { useContext, useState, useEffect, useCallback } from "react";
import {
    View, Text, TouchableOpacity, Image, Dimensions,
    Alert, ActivityIndicator, StyleSheet 
} from "react-native";
import styles from "./Styles"; 
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Divider } from "react-native-paper";
import { AuthContext } from './AuthContext'; 

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const componentStyles = StyleSheet.create({
    buttonDisabled: { opacity: 0.5 },
    buttonPending: { backgroundColor: '#FFA726' }, 
    buttonAccepted: { backgroundColor: '#66BB6A' }, 
    buttonHasCoach: { backgroundColor: '#78909C' }, 
   
     profileImageStyle: { 
        width: 190, height: 190, borderRadius: 95, alignSelf: 'center',
        zIndex: 100, position: 'absolute', top: 110,
        borderWidth: 3, borderColor: '#F5E4C3'
     },
     detailsContainerStyle: {
        backgroundColor: '#F5E4C3', width: Dimensions.get('window').width, height: '60%',
        borderTopLeftRadius: 50, borderTopRightRadius: 50,
        paddingTop: 20, 
        paddingHorizontal: 20, position: 'absolute', bottom: 0
     },
    
});



export default function NutritionistInfo() {
    const navigation = useNavigation();
    const { user, getIdToken, activeCoachId } = useContext(AuthContext);
    const route = useRoute();

    const {
        nutritionistId,
        firstName, lastName, workplace, yearsOfExperience,
        shortBio, specialization, profileImage 
    } = route.params || {};

 
    const [requestState, setRequestState] = useState('loading_status');


    useEffect(() => {
        const checkStatus = async () => {
            setRequestState('loading_status');
            if (!user || !nutritionistId) { setRequestState('error'); return; }
            if (activeCoachId) { setRequestState('has_coach'); return; } 

            try { 
                const token = await getIdToken(); if (!token) throw new Error("Auth token missing.");
                const response = await fetch(`${API_BASE_URL}/coaching/request-status/${nutritionistId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json(); if (!response.ok) throw new Error(data.message || `Error ${response.status}`);


                if (data.status === 'pending') setRequestState('pending');
                else if (data.status === 'accepted') setRequestState('accepted');
                else if (data.status === 'selected') setRequestState('has_coach');
                else setRequestState('idle'); 

            } catch (error) { console.error("NutritionistInfo: Error checking status:", error); setRequestState('error'); }
        };
        checkStatus();
    }, [user, nutritionistId, activeCoachId, getIdToken]); 


    const handleSendRequest = useCallback(async () => {
        if (requestState !== 'idle' && requestState !== 'error') { console.log(`Send req blocked: ${requestState}`); return; }

        setRequestState('loading'); 
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth session expired.");

            const response = await fetch(`${API_BASE_URL}/coaching/request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nutritionistId: nutritionistId })
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) { setRequestState('pending'); throw new Error(data.error || "Request exists or coach active."); } // Set state on conflict
                if (response.status === 404) throw new Error(data.error || "Nutritionist not found.");
                throw new Error(data.error || `Request failed (${response.status})`);
            }

            Alert.alert("Request Sent!", "Your request has been sent successfully.");

            console.log("Navigating to FindSpecialist with newPendingRequest");
           
            navigation.navigate('FindSpecialist', {
                newPendingRequest: {
                    id: data.requestId || `temp_${Date.now()}`,
                    nutritionistId: nutritionistId,
                    status: 'pending',
                    details: { 
                        firstName, lastName, specialization,
                        profileImageUrl: profileImage, 
                        yearsOfExperience
                 
                    }
                }
            });
          

        } catch (error) {
            console.error("Error sending coach request:", error);
            Alert.alert("Error Sending Request", error.message || "An unexpected error occurred.");
             if (requestState !== 'pending') {
                 setRequestState('error');
            }
        }
    }, [
        requestState, user, nutritionistId, getIdToken, navigation,
        firstName, lastName, specialization, profileImage, yearsOfExperience 
    ]);


    let buttonText = "Send request";
    let isButtonDisabled = false;
    let showLoader = requestState === 'loading_status' || requestState === 'loading';
    let specificButtonStyle = null;

    switch (requestState) {
        case 'loading_status': case 'loading': buttonText = ""; isButtonDisabled = true; break;
        case 'pending': buttonText = "Request Pending"; isButtonDisabled = true; specificButtonStyle = componentStyles.buttonPending; break;
        case 'accepted': buttonText = "Request Accepted"; isButtonDisabled = true; specificButtonStyle = componentStyles.buttonAccepted; break;
        case 'has_coach': buttonText = "Coach Active"; isButtonDisabled = true; specificButtonStyle = componentStyles.buttonHasCoach; break;
        case 'error': buttonText = "Retry Request"; isButtonDisabled = false; break;
        case 'idle': default: buttonText = "Send request"; isButtonDisabled = false; break;
    }
    if (!user || !nutritionistId) { isButtonDisabled = true; } 



    return (

        <View style={[styles.mainContainer, { backgroundColor: '#88A76C' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <Image source={require("../assets/Images/logo.png")} style={styles.headerLogo} />
                    <Text style={styles.appName}>Bite wise</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')}><Ionicons name="notifications-outline" size={24} color="black" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}><Ionicons name="settings-outline" size={24} color="black" /></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="black" /></TouchableOpacity>
            </View>

            {/* Profile Image - Use style from import or local definition */}
            <Image source={{ uri: profileImage }} style={styles.profileImageStyle || componentStyles.profileImageStyle} />

            {/* Details Container - Use style from import or local definition */}
            <View style={styles.detailsContainerStyle || componentStyles.detailsContainerStyle}>
                {/* Details Text - Ensure these styles exist */}
                <Text style={styles.nutritionistName}>{firstName} {lastName}</Text>
                <Text style={styles.nutritionistSpecialization}>{specialization}</Text>
                <Text style={styles.nutritionistWorkplace}>📍{workplace} | {yearsOfExperience} years of experience</Text>
                <Divider style={[styles.Divider, { width: Dimensions.get('window').width * 0.9 }]} />
                <Text style={styles.nutritionistName}>About</Text>
                <Text style={styles.nutritionistSpecialization}>{shortBio}</Text>
             

                {/* Button Container - Ensure this style exists */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        // Apply base style, specific state style, and disabled style
                        style={[
                            styles.button, // Your base button style
                            specificButtonStyle, // Style for pending/accepted/has_coach (from componentStyles)
                            isButtonDisabled && (styles.buttonDisabled || componentStyles.buttonDisabled) // Generic disabled style
                        ]}
                        onPress={handleSendRequest}
                        disabled={isButtonDisabled}
                    >
                        {showLoader ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            // Ensure styles.textButton exists
                            <Text style={styles.textButton}>{buttonText}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}