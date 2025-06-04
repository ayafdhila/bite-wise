import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView 
} from 'react-native';

import ProTabNavigation from '../components/ProTabNavigation'; 
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import { Ionicons } from '@expo/vector-icons'; 
import axios from 'axios'; 
import ProHeader from './ProHeader';

const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    errorRed: '#D32F2F',
    buttonTextDark: '#333333', 
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export default function CoachClientDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken } = useContext(AuthContext); 

    const { clientId, clientName } = route.params || {};

    // --- State ---
    const [clientData, setClientData] = useState(null); 
    const [privateNotes, setPrivateNotes] = useState(''); 
    const [initialNotes, setInitialNotes] = useState('');
    const [isClientLoading, setIsClientLoading] = useState(true);
    const [isNotesLoading, setIsNotesLoading] = useState(true);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [clientError, setClientError] = useState(null);
    const [notesError, setNotesError] = useState(null);
    const [notesModified, setNotesModified] = useState(false); 
    const [isFindingChat, setIsFindingChat] = useState(false);

    const coachId = user?.uid; 

  
    const fetchClientDetails = useCallback(async () => {
        if (!clientId || !coachId) {
             setClientError("Client or Coach ID missing.");
             setIsClientLoading(false);
             return;
         }
        console.log(`CoachClientDetails: Fetching details for client ${clientId}`);
        setIsClientLoading(true);
        setClientError(null);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            const url = `${API_BASE_URL}/coaching/coach/client/${clientId}/details`;
            const response = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (response.status === 200 && response.data?.client) {
                console.log("CoachClientDetails: Client data received:", response.data.client);
                setClientData(response.data.client);
            } else {
                throw new Error(response.data?.error || "Failed to fetch client details.");
            }
        } catch (err) {
            console.error("CoachClientDetails: Error fetching client details:", err.response?.data || err.message || err);
            setClientError(err.response?.data?.error || err.message || "Could not load client details.");
        } finally {
            setIsClientLoading(false);
        }
    }, [clientId, coachId, getIdToken]); 

    const fetchClientNotes = useCallback(async () => {
         if (!clientId || !coachId) {
             setNotesError("Client or Coach ID missing.");
             setIsNotesLoading(false);
             return;
         }
        console.log(`CoachClientDetails: Fetching notes for client ${clientId}`);
        setIsNotesLoading(true);
        setNotesError(null);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            const url = `${API_BASE_URL}/coaching/coach/client/${clientId}/notes`;
            const response = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (response.status === 200 && response.data) {
                console.log("CoachClientDetails: Notes received.");
                setPrivateNotes(response.data.notes || '');
                setInitialNotes(response.data.notes || '');
                setNotesModified(false); 
            } else {
                throw new Error(response.data?.error || "Failed to fetch client notes.");
            }
        } catch (err) {
            console.error("CoachClientDetails: Error fetching client notes:", err.response?.data || err.message || err);
            setNotesError(err.response?.data?.error || err.message || "Could not load notes.");
            setPrivateNotes(''); 
            setInitialNotes('');
        } finally {
            setIsNotesLoading(false);
        }
    }, [clientId, coachId, getIdToken]);

    const handleSaveNotes = useCallback(async () => {
         if (!clientId || !coachId || !notesModified) {
            console.log("Save Notes: Conditions not met (no change or IDs missing).");
            return; 
        }
        console.log(`CoachClientDetails: Saving notes for client ${clientId}`);
        setIsSavingNotes(true);
        setNotesError(null);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            const url = `${API_BASE_URL}/coaching/coach/client/${clientId}/notes`;
            const response = await axios.post(url,
                { notes: privateNotes }, 
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 200 && response.data) {
                console.log("CoachClientDetails: Notes saved successfully.");
                setInitialNotes(privateNotes); 
                setNotesModified(false); 
                Alert.alert("Success", "Private notes saved.");
            } else {
                throw new Error(response.data?.message || "Failed to save notes.");
            }
        } catch (err) {
            console.error("CoachClientDetails: Error saving notes:", err.response?.data || err.message || err);
            setNotesError(err.response?.data?.error || err.message || "Could not save notes.");
            Alert.alert("Error", err.response?.data?.error || err.message || "Could not save notes.");
        } finally {
            setIsSavingNotes(false);
        }
    }, [clientId, coachId, getIdToken, privateNotes, notesModified]);

    useEffect(() => {
        if (clientId && coachId) {
            fetchClientDetails();
            fetchClientNotes();
        } else {
     
            setClientError("Client identifier is missing.");
            setIsClientLoading(false);
            setIsNotesLoading(false);
        }
    }, [clientId, coachId, fetchClientDetails, fetchClientNotes]); 

   
    const renderInfoRow = (label, value) => {
    
        const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? 'N/A');
        return (
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{displayValue}</Text>
            </View>
        );
    }
   
    const renderNutrientRow = (label, value, unit) => {
         const displayValue = (value !== undefined && value !== null) ? `${value} ${unit}` : 'N/A';
         return (
            <View style={styles.nutrientRow}>
                <Text style={styles.nutrientLabel}>{label}</Text>
                <Text style={styles.nutrientValue}>{displayValue}</Text>
            </View>
         );
    }
    const handleSendMessagePress = useCallback(async () => {
      if (!coachId || !clientId) {
          Alert.alert("Error", "Cannot initiate chat. Missing user or coach information.");
          return;
      }
      if (isFindingChat) return; 

      console.log(`Finding/creating chat between coach ${coachId} and client ${clientId}`);
      setIsFindingChat(true);
      

      try {
          const token = await getIdToken();
          if (!token) throw new Error("Authentication failed.");

          const url = `${API_BASE_URL}/messages/find-or-create-chat`;
          console.log(`Calling POST ${url}`);

          const response = await axios.post(url,
              { participantIds: [coachId, clientId].sort() }, 
              { headers: { 'Authorization': `Bearer ${token}` } }
          );


          if ((response.status === 200 || response.status === 201) && response.data?.chatId) {
              const chatId = response.data.chatId;
              console.log(`Navigating to chat screen with chatId: ${chatId}`);
              navigation.navigate('CoachClientChatScreen', { 
                  chatId: chatId,
                  clientId: clientId,
                  clientName: clientName
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
  }, [coachId, clientId, clientName, getIdToken, navigation]);
  

    if (isClientLoading || isNotesLoading) {
        return (
            <View style={styles.screenContainer}>
                <ProHeader subtitle={clientName || "Client Details"}  />
                 
                <ProTabNavigation />
            </View>
        );
    }

   
    if (clientError) {
        return (
             <View style={styles.screenContainer}>
                 <Header subtitle={{clientName} || "client Informations"}/>
                 <View style={styles.centeredMessage}>
                    <Ionicons name="alert-circle-outline" size={40} color={PALETTE.errorRed} />
                     <Text style={styles.errorText}>{clientError}</Text>
                     <TouchableOpacity onPress={fetchClientDetails} style={styles.retryButton}>
                         <Text style={styles.retryButtonText}>Retry</Text>
                     </TouchableOpacity>
                 </View>
                 <ProTabNavigation />
             </View>
        );
    }

 
     if (!clientData) {
         return (
              <View style={styles.screenContainer}>
                 <Header subtitle={clientName || "Error"} showBackButton={true} navigation={navigation}/>
                 <View style={styles.centeredMessage}>
                    <Text style={styles.errorText}>Could not load client data.</Text>
                 </View>
                 <ProTabNavigation />
             </View>
         );
     }


    return (
        <KeyboardAvoidingView
           
            style={styles.screenContainer}
           
        >
            <ProHeader subtitle={clientName || "Client Details"}  />
            <ScrollView contentContainerStyle={styles.scrollContainer}>

             
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Client Informations</Text>
                    {renderInfoRow("Goal", clientData.goal)}
                    {renderInfoRow("Age", clientData.age)}
                    {renderInfoRow("Weight & Height", `${clientData.weight || 'N/A'} kg, ${clientData.height ? (clientData.height).toFixed(0) : 'N/A'} cm`)}
                    {renderInfoRow("Activity Level", clientData.activityLevel)}
                    {renderInfoRow("Preferences", clientData.dietaryPreferences)}
                </View>

       
                <View style={[styles.card, styles.nutrientCard]}>
                    <Text style={styles.cardTitle}>Nutrient Estimation</Text>
          
                    {renderNutrientRow("Calories", clientData.nutritionPlan?.calories, 'kcal')}
                    {renderNutrientRow("Carbs", clientData.nutritionPlan?.carbs, 'g')}
                    {renderNutrientRow("Fat", clientData.nutritionPlan?.fat, 'g')}
                    {renderNutrientRow("Protein", clientData.nutritionPlan?.protein, 'g')}
                    {renderNutrientRow("Fiber", clientData.nutritionPlan?.fiber?.recommended, 'g')}
                </View>

         
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Private Notes</Text>
                    {notesError && <Text style={styles.inlineErrorText}>Error loading/saving notes: {notesError}</Text>}
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Add private notes about this client..."
                        placeholderTextColor={PALETTE.grey}
                        multiline={true}
                        value={privateNotes}
                        onChangeText={(text) => {
                            setPrivateNotes(text);
                         
                            if (text !== initialNotes) {
                                setNotesModified(true);
                            } else {
                                setNotesModified(false);
                            }
                        }}
                        textAlignVertical="top" 
                    />
            
                    <TouchableOpacity
                        style={[styles.saveNotesButton, (!notesModified || isSavingNotes) && styles.saveNotesButtonDisabled]}
                        onPress={handleSaveNotes}
                        disabled={!notesModified || isSavingNotes}
                    >
                        {isSavingNotes ? (
                            <ActivityIndicator size="small" color={PALETTE.white} />
                        ) : (
                            <Text style={styles.saveNotesButtonText}>Save Notes</Text>
                        )}
                    </TouchableOpacity>
                </View>

           
               <View style={styles.actionButtonContainer}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            styles.messageButton,
                            isFindingChat && { opacity: 0.7 }
                        ]}
                  
                        onPress={handleSendMessagePress}
                    
                         disabled={isFindingChat || isSavingNotes}
                     >
                         {isFindingChat ? (
                            <ActivityIndicator size="small" color={PALETTE.buttonTextDark} />
                         ) : (
                            <Text style={styles.actionButtonTextAlt}>Send Message</Text>
                         )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.planButton]}
                         onPress={() => navigation.navigate('PlanEditor', { clientId: clientId, clientName: clientName })} // Pass necessary params
                         disabled={isFindingChat || isSavingNotes} 
                    >
                        <Text style={styles.actionButtonText}>Create / Assign Plan</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
            <ProTabNavigation />
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
        
    },
    centeredMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scrollContainer: {
        paddingHorizontal: 15,
        paddingBottom: 90,
        marginTop: 20
    },
    card: {
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    nutrientCard: {
        backgroundColor: PALETTE.mediumGreen, 
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Quicksand_700Bold', 
        color: PALETTE.darkGreen,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.grey,
        paddingBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap', 
    },
    infoLabel: {
        fontSize: 15,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_600SemiBold', 
    },
    infoValue: {
        fontSize: 15,
        color: PALETTE.black,
        textAlign: 'right',
        flexShrink: 1, 
    },
     nutrientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingVertical: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: PALETTE.lightCream, 
    },
    nutrientLabel: {
        fontSize: 15,
        color: PALETTE.white, 
        fontFamily: 'Quicksand_500Medium',
    },
    nutrientValue: {
        fontSize: 15,
        color: PALETTE.white,
        fontFamily: 'Quicksand_700Bold',
    },
    notesInput: {
        backgroundColor: PALETTE.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: PALETTE.grey,
        padding: 10,
        minHeight: 100, 
        fontSize: 14,
        color: PALETTE.darkGrey,
        textAlignVertical: 'top', 
        marginBottom: 10,
    },
    saveNotesButton: {
        backgroundColor: PALETTE.darkGreen,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 5,
        height: 40,
        justifyContent: 'center'
    },
    saveNotesButtonDisabled: {
        backgroundColor: PALETTE.grey,
    },
    saveNotesButtonText: {
        color: PALETTE.white,
        fontFamily: 'Quicksand_700Bold',
        fontSize: 14,
    },
    actionButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10, 
        marginBottom: 20, 
        paddingHorizontal: 5, 
    },
    actionButton: {
        flex: 1, 
        borderRadius: 25,
        paddingVertical: 14,
        alignItems: 'center',
        marginHorizontal: 5, 
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
    },
    messageButton: {
        backgroundColor: PALETTE.lightOrange, 
        borderWidth: 1,
        borderColor: PALETTE.darkGrey,
    },
    planButton: {
        backgroundColor: PALETTE.darkGreen, 
    },
    actionButtonText: {
        color: PALETTE.white, 
        fontFamily: 'Quicksand_700Bold',
        fontSize: 14,
    },
    actionButtonTextAlt: {
         color: PALETTE.buttonTextDark, 
         fontFamily: 'Quicksand_700Bold',
         fontSize: 14,
    },
    errorText: {
        color: PALETTE.errorRed,
        textAlign: 'center',
        fontSize: 16,
    },
     inlineErrorText: { 
        color: PALETTE.errorRed,
        fontSize: 12,
        marginBottom: 5,
        textAlign: 'center'
    },
    retryButton: {
        marginTop: 15,
        backgroundColor: PALETTE.darkGreen,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    retryButtonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontFamily: 'Quicksand_700Bold',
    },

});