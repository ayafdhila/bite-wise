import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'; 
import stylesFromSheet from "./Styles"; 
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Header from "../components/Header"; 
import TabNavigation from "../components/TabNavigation"; 
import { AuthContext } from '../components/AuthContext'; 
import styles from './Styles';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;




export default function MessagesGuidance (){
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken, activeCoachId, refreshCoachingStatus } = useContext(AuthContext);

    const currentCoachId = activeCoachId || route.params?.coachId;

    const [rating, setRating] = useState(0); 
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [actionError, setActionError] = useState(null); 


    useEffect(() => { setActionError(null); }, [currentCoachId]);

    const renderStars = () => {
        let stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    disabled={isSubmitting} 
                >
                    <Ionicons
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={30}
                        color={styles.starColor || '#2E4A32'} 
                        style={{ marginHorizontal: 3 }} 
                    />
                </TouchableOpacity>
            );
        }
        return <View style={localStyles.starsRowInternal}>{stars}</View>; 
    };

    const performAction = useCallback(async (endpoint, method = 'POST', body = null) => {
        if (!currentCoachId && endpoint !== '/coaching/end-relationship') {
            Alert.alert("Error", "No active coach identified for this action."); return null;
        }
        if (endpoint === '/coaching/end-relationship' && !activeCoachId) {
             console.warn("Attempted to end relationship when no active coach ID was found in context.");
        }

        setIsSubmitting(true); setActionError(null);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Authentication failed.");
            const options = { method, headers: { 'Authorization': `Bearer ${token}` } };
            if (body) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                 const text = await response.text(); throw new Error(`Server Error: ${text.substring(0,100)}`);
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.message || `Request failed`);
            return data; 
        } catch (error) {
            console.error(`Error performing action ${endpoint}:`, error);
            setActionError(error.message || "An unexpected error occurred.");
            Alert.alert("Error", error.message || "An unexpected error occurred.");
            return null; 
        } finally { setIsSubmitting(false); }
    }, [getIdToken, currentCoachId, activeCoachId]); 

    const handleValidateRating = useCallback(async () => {
        if (rating === 0) { Alert.alert("Select Rating", "Please select stars first."); return; }
        if (!currentCoachId) { Alert.alert("Error", "Cannot rate without an active coach ID."); return; }
        const result = await performAction('/coaching/rate', 'POST', { nutritionistId: currentCoachId, rating: rating });
        if (result) { Alert.alert("Success", "Rating submitted!"); setRating(0); }
    }, [rating, currentCoachId, performAction]);

    const handleEndRelationship = useCallback(async () => {
         if (!currentCoachId) {
             Alert.alert("Info", "No active relationship to end.");
             return;
         }
         Alert.alert(
            "End Coaching?",
            "Are you sure? You will need to send a new request to reconnect.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "End Relationship", style: "destructive", onPress: async () => {
                    const result = await performAction('/coaching/end-relationship', 'POST');
                    if (result) {
                        Alert.alert("Success", "Coaching relationship ended.");
                        await refreshCoachingStatus();
                        console.log("MessagesGuidance: Navigating to FindSpecialist after ending relationship.");
                        navigation.navigate('FindSpecialist');
                    }
                }}
            ]
        );
    }, [performAction, refreshCoachingStatus, navigation, currentCoachId]); 

    const handleBlockCoach = useCallback(async () => {
        if (!currentCoachId) { Alert.alert("Error", "Cannot block without an active coach ID."); return; }
         Alert.alert(
            "Block Coach?",
            "Are you sure? You won't see this coach or be able to interact.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Block Coach", style: "destructive", onPress: async () => {
                    const result = await performAction('/coaching/block', 'POST', { nutritionistId: currentCoachId });
                    if (result) {
                        Alert.alert("Success", "Coach blocked.");
                        await refreshCoachingStatus();
                        console.log("MessagesGuidance: Navigating to FindSpecialist after blocking coach.");
                        navigation.navigate('FindSpecialist');
                    }
                }}
            ]
        );
    }, [currentCoachId, performAction, refreshCoachingStatus, navigation]); 

     if (!currentCoachId) { 
        return (
            <View style={styles.mainContainer}>
                 <Header subtitle={"Messages & Guidance"}/>
                 <View style={localStyles.centeredMessage}>
                    <Text>No active coach found.</Text>
                     <TouchableOpacity onPress={() => navigation.navigate('FindSpecialist')}>
                         <Text style={localStyles.linkText}>Find a coach</Text>
                     </TouchableOpacity>
                 </View>
                 <TabNavigation/>
            </View>
        );
     }

    return(
      <View style={styles.mainContainer}>
         <Header subtitle={"Messages & Guidance"}/>
            <Image source={require('../assets/Images/potato.png')} style={[styles.smallPear, localStyles.centerImage]}/>

            <View style={styles.messageContainer}>

                <Text style={styles.RatingEntry}>Rating entry</Text>
                <View style={localStyles.starsRowContainer}>
                    {renderStars()}
                </View>
                <TouchableOpacity

                    style={[styles.buttons,  (rating === 0 || isSubmitting) && localStyles.buttonDisabled]}
                    onPress={handleValidateRating}
                    disabled={rating === 0 || isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color={styles.addText?.color || "#fff"} size="small"/> : <Text style={styles.addText}>Validate Rating</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.buttons,  isSubmitting && localStyles.buttonDisabled]}
                    onPress={handleEndRelationship}
                    disabled={isSubmitting}
                >
                   {isSubmitting ? <ActivityIndicator color={styles.addText?.color || "#fff"} size="small"/> : <Text style={styles.addText}>End Coaching Relationship</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.buttons,  isSubmitting && localStyles.buttonDisabled]}
                    onPress={handleBlockCoach}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color={styles.addText?.color || "#fff"} size="small"/> : <Text style={styles.addText}>Block coach</Text>}
                </TouchableOpacity>

                 {actionError && <Text style={localStyles.errorText}>{actionError}</Text>}

            </View>
   

         <TabNavigation/>
      </View>
    );
}

const localStyles = StyleSheet.create({
     scrollContainer: {
          paddingHorizontal: 20, 
          paddingVertical: 10,   
          paddingBottom: 80,   
          alignItems: 'center',
          flexGrow: 1,    
     },
     centerImage: {
          alignSelf: 'center',
          width: styles.smallPear?.width || 100, 
          height: styles.smallPear?.height || 100,
          marginBottom: 20,
     },
     starsRowContainer: { 
         flexDirection: 'row', 
         justifyContent: 'center',
         alignItems: 'center',
         width: '100%', 
         paddingVertical: 15, 
         
         marginBottom: 10, 
     },
     starsRowInternal: { 
         flexDirection: 'row',
     },
     
     errorText: {
         color: 'red',
         marginTop: 15,
         textAlign: 'center',
         fontSize: 14,
     },
  
     buttonDisabled: {
          opacity: 0.6,
          backgroundColor: '#cccccc',
     },
   
     centeredMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
     },
     linkText: {
         color: '#007AFF', 
         marginTop: 10,
         textDecorationLine: 'underline'
     }
});