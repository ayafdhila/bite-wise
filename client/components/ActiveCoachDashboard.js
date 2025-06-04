import React, { useContext, useEffect, useState, useCallback } from 'react'; 
import {
    View, Text, ActivityIndicator, StyleSheet, Image,
    Alert, Pressable, TouchableOpacity, Platform 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import Header from '../components/Header';       
import TabNavigation from '../components/TabNavigation'; 
import axios from 'axios'; 

import { Ionicons } from '@expo/vector-icons'; 


const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 

export default function ActiveCoachDashboard() {
    const route = useRoute();
    const navigation = useNavigation();
    const { user, getIdToken, activeCoachId: coachIdFromContext } = useContext(AuthContext); 

    const coachId = coachIdFromContext || route.params?.coachId;
    const userId = user?.uid; 

    const [coachDetails, setCoachDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [isFindingChat, setIsFindingChat] = useState(false); 

    useEffect(() => {
        const fetchDetails = async () => {
            if (!coachId) {
                setError("No active coach identified."); setIsLoading(false); return;
            }
             if (!userId) { 
                 setError("User not logged in."); setIsLoading(false); return;
             }
            setIsLoading(true); setError(null);
            try {
                const token = await getIdToken(); if (!token) throw new Error("Not authenticated");
                const response = await fetch(`${API_BASE_URL}/coaching/status`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json(); if (!response.ok) throw new Error(data.message || "Failed to fetch coach details");
                if (data.activeCoachId === coachId && data.activeCoachDetails) {
                    setCoachDetails(data.activeCoachDetails);
                } else { throw new Error("Could not load details for the active coach."); }
            } catch (err) { setError(err.message); }
            finally { setIsLoading(false); }
        };
        fetchDetails();
    }, [coachId, getIdToken, userId]); 


    const handleChatPress = useCallback(async () => {
        if (!userId || !coachId || !coachDetails) {
            Alert.alert("Error", "Cannot initiate chat. Missing user or coach information.");
            return;
        }
        if (isFindingChat) return; 

        console.log(`Finding/creating chat between user ${userId} and coach ${coachId}`);
        setIsFindingChat(true); 

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            const url = `${API_BASE_URL}/messages/find-or-create-chat`;
            console.log(`Calling POST ${url}`);

            const response = await axios.post(url,
                { participantIds: [userId, coachId].sort() }, 
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if ((response.status === 200 || response.status === 201) && response.data?.chatId) {
                const chatId = response.data.chatId;

                const coachFullName = `${coachDetails.firstName || ''} ${coachDetails.lastName || ''}`.trim();
                console.log(`Navigating to UserChatScreen with chatId: ${chatId}`);
        
                navigation.navigate('UserChatScreen', { 
                    chatId: chatId,
                    coachId: coachId,       
                    coachName: coachFullName 
                });
            } else {
                 throw new Error(response.data?.message || response.data?.error || "Backend did not return a valid chat ID.");
            }

        } catch (error) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Could not start chat.";
            console.error("Error finding/creating chat:", errorMsg);
            Alert.alert("Error", errorMsg);
        } finally {
            setIsFindingChat(false); 
        }
    }, [userId, coachId, coachDetails, getIdToken, navigation]); 

    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Your Active Coach"} />
            <View style={styles.contentArea}>

                {isLoading && <ActivityIndicator size="large" color="#2E4A32" />}

                {error && !isLoading && (
                     <View style={{ alignItems: 'center', padding: 20 }}>
                         <Ionicons name="alert-circle-outline" size={40} color={styles.errorText?.color || 'red'} />
                         <Text style={styles.errorText}>Error: {error}</Text>
                     </View>
                 )}

                {/* Coach Details Display */}
                {!isLoading && !error && coachDetails && (
                    <>
                        <Image
                            source={
                                coachDetails?.profileImageUrl
                                    ? { uri: coachDetails.profileImageUrl }
                                    : require('../assets/Images/DefaultProfile.jpg') 
                            }
                            style={styles.coachImage} 
                        />
                        <Text style={styles.coachName}> 
                            {coachDetails.firstName} {coachDetails.lastName}
                        </Text>
                        <Text style={styles.specialization}> 
                            Specialization: {coachDetails.specialization}
                        </Text>

                        <TouchableOpacity
                            style={[styles.actionButton, isFindingChat && { opacity: 0.7 }]} 
                            onPress={handleChatPress} 
                            disabled={isFindingChat} 
                         >
                             {isFindingChat ? (
                                <ActivityIndicator size="small" color={styles.buttonText?.color || '#000'}/>
                             ) : (
                                <Text style={styles.buttonText}>Chat</Text>
                             )}
                        </TouchableOpacity>


                        <Pressable onPress={() => navigation.navigate('MessagesGuidance')} disabled={isFindingChat}>
                            <Text style={styles.manageConnectionText}>Manage connection</Text>
                        </Pressable>
                    </>
                )}

                {!isLoading && !error && !coachDetails && (
                    <Text style={{textAlign: 'center', marginTop: 50, color: PALETTE.darkGrey || '#555'}}>Could not load coach information.</Text>
                )}
            </View>

            <TabNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F5E4C3',
    },
    contentArea: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginVertical: 15,
        fontSize: 14,
    },
    coachImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginVertical: 20,
    },
    coachName: {
        fontSize: 30,
        fontFamily: 'Quicksand_700Bold',
        marginVertical: 15
    },
    specialization: {
        fontSize: 20,
        marginVertical: 20,
        fontFamily: 'Quicksand_600SemiBold',
    },
    actionButton: {
        backgroundColor: '#FCCF94',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginVertical: 20,
        width: '95%'
    },
    buttonText: {
        fontSize: 20,
        fontFamily: 'Quicksand_700Bold',
        textAlign: 'center',
    },
    
    manageConnectionText: {
        color: '#2E4A32',
        fontSize: 20,
        fontFamily: 'Quicksand_700Bold',
        textAlign: 'center',
        textDecorationLine: 'underline',
        marginVertical: 20
    },
});
