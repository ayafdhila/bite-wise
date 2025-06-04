// screens/admin/AdminCoachDetailScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Alert, ActivityIndicator, Platform, Linking, Dimensions 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import AdminHeader from '../components/AdminHeader';    
import { Ionicons } from '@expo/vector-icons';

import format from 'date-fns/format'; 
import AdminTabNavigation from './AdminTabNavigation';

const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3', 
    white: '#FFFFFF',      
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    pendingOrange: '#FFA000',
    errorRed: '#D32F2F',
    successGreen: '#4CAF50', 
    rejectRed: '#E57373',  
    linkBlue: '#007AFF',   
    starYellow: '#FFC107', 
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 
const COACH_DETAIL_ENDPOINT = (id) => `${API_BASE_URL}/admin/nutritionists/${id}`; 
const VERIFY_COACH_ENDPOINT = (id) => `${API_BASE_URL}/admin/verify-coach/${id}`;

export default function AdminCoachDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken } = useContext(AuthContext);

    const initialCoachData = route.params?.coachData;
    const coachId = initialCoachData?.id;

    const [coachDetails, setCoachDetails] = useState(initialCoachData || null);

    const [isLoading, setIsLoading] = useState(!initialCoachData);
    const [error, setError] = useState(null); 

    const [isActionLoading, setIsActionLoading] = useState(false); 
    const [actionError, setActionError] = useState(null); 

    useEffect(() => {
        const fetchFullDetails = async () => {
            if (!coachId) {
                 if (!initialCoachData) setError("Coach ID missing.");
                 setIsLoading(false); return;
            }
            if (!initialCoachData) setIsLoading(true); 
            setError(null); 

            try {
                 const token = await getIdToken(); if (!token) throw new Error("Not authenticated");
                 console.log(`AdminCoachDetailScreen: Fetching full details for ${coachId}...`);
                 const response = await fetch(COACH_DETAIL_ENDPOINT(coachId), { headers: { 'Authorization': `Bearer ${token}` } });
                 const contentType = response.headers.get("content-type");
                 if (!contentType?.includes("application/json")) { const txt=await response.text(); throw new Error(`Non-JSON: ${txt.substring(0,100)}`); }
                 const data = await response.json();
                 if (!response.ok) throw new Error(data.error || "Failed fetch coach details");
                 console.log("AdminCoachDetailScreen: Received full details:", data.nutritionist);
                 setCoachDetails(data.nutritionist || null); 

            } catch (err) {
                console.error("AdminCoachDetailScreen: Error fetching details:", err);
                setError(err.message);
                if (!initialCoachData) setCoachDetails(null); 
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullDetails();
 
    }, [coachId, getIdToken]);


  const handleVerification = useCallback(async (coachId, verifyAction) => {
          setActionLoadingId(coachId);
          setError(null);
          const actionText = verifyAction ? "approve" : "reject";
  
          Alert.alert(
              `${verifyAction ? 'Approve' : 'Reject'} Coach?`,
              `Are you sure you want to ${actionText} this coach profile?`,
              [
                  { text: "Cancel", style: "cancel", onPress: () => setActionLoadingId(null) },
                  {
                      text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
                      style: verifyAction ? "default" : "destructive",
                      onPress: async () => {
                          try {
                              const token = await getIdToken(); if (!token) throw new Error("Auth token error.");
    
                              const urlToFetch = VERIFY_COACH_ENDPOINT(coachId);
                              console.log(`AdminVerifyCoach: Sending PATCH to ${urlToFetch} with verify status: ${verifyAction}`);
                              const response = await fetch(urlToFetch, { 
                        
                                  method: 'PATCH',
                                  headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json'
                                  },
            
                                  body: JSON.stringify({ verify: verifyAction })
                          
                              });
                              const contentType = response.headers.get("content-type");
                              if (!contentType?.includes("application/json")) { const txt = await response.text(); throw new Error(`Non-JSON Response [${response.status}]: ${txt.substring(0,100)}`); }
                              const data = await response.json();
                              if (!response.ok) throw new Error(data.error || `Failed to ${actionText} coach`);
  
                              Alert.alert("Success", `Coach ${actionText}ed successfully.`);
                              setPendingCoaches(prev => prev.filter(coach => coach.id !== coachId));
  
                          } catch (err) {
                              console.error(`AdminVerifyCoach: Error ${actionText}ing coach ${coachId}:`, err);
                              Alert.alert("Error", err.message || `Could not ${actionText} coach.`);
                              setError(err.message);
                          } finally {
                              setActionLoadingId(null);
                          }
                      }
                  }
              ]
          );
      }, [getIdToken]);
  


    const handleViewCertificate = (url) => {
         if (url) { Linking.openURL(url).catch(err => { console.error("Failed URL:", err); Alert.alert("Error", "Cannot open link."); }); }
         else { Alert.alert("Info", "No certificate URL available."); }
     };

    
    if (isLoading) {
         return ( <View style={styles.screenContainer}><AdminHeader subtitle="Loading..." showBackButton={true} /><View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View></View> );

    }

    if (error && !initialCoachData) {
         return ( <View style={styles.screenContainer}><AdminHeader subtitle="Error" showBackButton={true} /><View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}><Text style={styles.retryButtonText}>Go Back</Text></TouchableOpacity></View></View> );
    }

    if (!coachDetails) {
         return ( <View style={styles.screenContainer}><AdminHeader subtitle="Not Found" showBackButton={true} /><View style={styles.loadingContainer}><Text>Coach details could not be loaded.</Text></View></View> );
    }



    const {
        firstName, lastName, email, profileImage, specialization,
        yearsOfExperience, workplace, shortBio, professionalCertificate,
        averageRating, ratingCount, isVerified
    } = coachDetails; 
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    const displayName = fullName || email || 'N/A';
    const defaultImage = require('../assets/Images/DefaultProfile.jpg');



    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Coach Details" showBackButton={true} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
     
                <View style={styles.profileHeader}>
                    <Image
                        source={profileImage ? { uri: profileImage } : defaultImage}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileEmail}>{email}</Text>
                    
                </View>

      
                <View style={styles.detailsCard}>
                    <Text style={styles.cardTitle}>Professional Information</Text>
                    <View style={styles.detailItem}>
                        <Ionicons name="briefcase-outline" size={18} color={PALETTE.darkGrey} style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Specialization:</Text>
                        <Text style={styles.detailValue}>{specialization || 'N/A'}</Text>
                    </View>
                     <View style={styles.detailItem}>
                         <Ionicons name="business-outline" size={18} color={PALETTE.darkGrey} style={styles.detailIcon} />
                         <Text style={styles.detailLabel}>Workplace:</Text>
                         <Text style={styles.detailValue}>{workplace || 'N/A'}</Text>
                     </View>
                     <View style={styles.detailItem}>
                         <Ionicons name="time-outline" size={18} color={PALETTE.darkGrey} style={styles.detailIcon} />
                         <Text style={styles.detailLabel}>Experience:</Text>
                         <Text style={styles.detailValue}>{yearsOfExperience ?? 'N/A'} years</Text>
                     </View>
                      <View style={styles.detailItem}>
                         <Ionicons name="document-text-outline" size={18} color={PALETTE.darkGrey} style={styles.detailIcon} />
                         <Text style={styles.detailLabel}>Certificate:</Text>
                         {professionalCertificate ? (
                              <TouchableOpacity onPress={() => handleViewCertificate(professionalCertificateUrl)}>
                                  <Text style={[styles.detailValue, styles.linkText]}>View Document</Text>
                              </TouchableOpacity>
                         ) : (
                              <Text style={styles.detailValue}>Not Provided</Text>
                         )}
                     </View>
     
                      <View style={styles.detailItem}>
                         <Ionicons name={isVerified ? "checkmark-circle" : "close-circle"} size={18} color={isVerified ? PALETTE.successGreen : PALETTE.errorRed} style={styles.detailIcon} />
                         <Text style={styles.detailLabel}>Status:</Text>
                         <Text style={[styles.detailValue, {color: isVerified ? PALETTE.successGreen : PALETTE.errorRed, fontWeight: 'bold'}]}>
                              {isVerified ? 'Verified' : 'Not Verified'}
                         </Text>
                     </View>
                </View>

     
                <View style={styles.detailsCard}>
                    <Text style={styles.cardTitle}>About</Text>
                    <Text style={styles.bioText}>{shortBio || 'No biography provided.'}</Text>
                </View>

     
                 {!isVerified && (
                     <View style={styles.actionButtonsContainer}>
                         <Text style={styles.actionPrompt}>Take Action:</Text>
                         <View style={styles.actionButtonsRow}>
                             <TouchableOpacity
                                 style={[styles.actionButtonBase, styles.rejectButton, isActionLoading && styles.buttonDisabled]}
                                 onPress={() => handleVerification(false)} 
                                 disabled={isActionLoading}>
                
                                 {isActionLoading ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Text style={styles.actionButtonText}>Reject</Text>}
                             </TouchableOpacity>
                             <TouchableOpacity
                                 style={[styles.actionButtonBase, styles.approveButton, isActionLoading && styles.buttonDisabled]}
                                 onPress={() => handleVerification(true)} 
                                 disabled={isActionLoading}>
                            
                                  {isActionLoading ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Text style={styles.actionButtonText}>Approve</Text>}
                             </TouchableOpacity>
                         </View>
               
                         {actionError && <Text style={styles.errorTextSmall}>{actionError}</Text>}
                     </View>
                 )}
  
                 {error && initialCoachData && <Text style={styles.errorText}>{error}</Text>}

            </ScrollView>
            <AdminTabNavigation/>
        </View>
    );
}


const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center', marginBottom: 15 },
    retryButton: { backgroundColor: PALETTE.darkGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    retryButtonText: { color: PALETTE.white, fontSize: 16, fontWeight: 'bold' },
    scrollContainer: { padding: 20, paddingBottom: 80, },
    profileHeader: { alignItems: 'center', marginBottom: 25, paddingBottom: 20, },
    profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, backgroundColor: PALETTE.grey, borderWidth: 3, borderColor: PALETTE.white, },
    profileName: { fontSize: 24, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginBottom: 3, textAlign: 'center' },
    profileEmail: { fontSize: 14, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', marginBottom: 10, textAlign: 'center' },
    detailsCard: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: 18, marginBottom: 20, elevation: 2, shadowColor: PALETTE.black, shadowOffset: {width:0, height:1}, shadowOpacity: 0.08, shadowRadius: 3, },
    cardTitle: { fontSize: 18, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: PALETTE.lightCream, paddingBottom: 8 },
    detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    detailIcon: { marginRight: 12, width: 20, textAlign: 'center', color: PALETTE.darkGrey },
    detailLabel: { fontSize: 14, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGrey, width: 100 },
    detailValue: { fontSize: 14, fontFamily: 'Quicksand_500Medium', color: PALETTE.black, flex: 1 },
    linkText: { color: PALETTE.darkGreen, textDecorationLine: 'underline' },
    bioText: { fontSize: 14, color: PALETTE.darkGrey, lineHeight: 21, fontFamily: 'Quicksand_500Medium' },
    actionButtonsContainer: { marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: PALETTE.grey, alignItems: 'center' },
    actionPrompt: { textAlign: 'center', marginBottom: 15, fontSize: 16, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGrey },
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
    actionButtonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 25, minHeight: 42, elevation: 2, flex: 0.45, shadowColor: PALETTE.black, shadowOffset: {width:0, height:1}, shadowOpacity: 0.15, shadowRadius: 2, },
    actionButtonText: { color: PALETTE.white, fontSize: 15, fontWeight: 'bold', fontFamily: 'Quicksand_700Bold' },
    approveButton: { backgroundColor: PALETTE.successGreen },
    rejectButton: { backgroundColor: PALETTE.rejectRed },
    buttonDisabled: { opacity: 0.6, backgroundColor: PALETTE.grey },
    errorTextSmall: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 10, fontSize: 12},
});