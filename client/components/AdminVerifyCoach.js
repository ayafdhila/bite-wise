import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, Alert, ActivityIndicator, RefreshControl, Platform, Linking 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import AdminHeader from '../components/AdminHeader';     
import { Ionicons } from '@expo/vector-icons';
import AdminTabNavigation from './AdminTabNavigation'; 
import formatDistanceToNow from 'date-fns/formatDistanceToNow'; 

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
};


const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 
const PENDING_COACHES_ENDPOINT = `${API_BASE_URL}/admin/pending-coaches`;

const VERIFY_COACH_ENDPOINT = (id) => `${API_BASE_URL}/admin/verify-coach/${id}`;

export default function AdminVerifyCoach() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext);

    const [pendingCoaches, setPendingCoaches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null); 

    const fetchPendingCoaches = useCallback(async (isRefresh = false) => {
        if (!user?.admin) { setError("Unauthorized"); setIsLoading(false); setRefreshing(false); return; }
        if (!isRefresh) setIsLoading(true);
        setError(null); setActionLoadingId(null);
        console.log("AdminVerifyCoach: Fetching pending coaches...");
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing");
            const response = await fetch(PENDING_COACHES_ENDPOINT, { headers: { 'Authorization': `Bearer ${token}` }});
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { const txt=await response.text(); throw new Error(`Non-JSON Response [${response.status}]: ${txt.substring(0,150)}`);}
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch pending coaches");
            console.log(`AdminVerifyCoach: Received ${data.pendingCoaches?.length || 0} pending coaches.`);
   
            const coachesWithData = (data.pendingCoaches || []).map(coach => ({
                ...coach, 
                firstName: coach.firstName || '',
                lastName: coach.lastName || '',
                email: coach.email || '',
                profileImageUrl: coach.profileImage || coach.profileImageUrl || null,
                professionalCertificateUrl: coach.professionalCertificateUrl || coach.professionalCertificate || null,
              
                specialization: coach.specialization,
                yearsOfExperience: coach.yearsOfExperience,
                workplace: coach.workplace,
                shortBio: coach.shortBio,
               
            }));
            setPendingCoaches(coachesWithData);
        } catch (err) {
            console.error("AdminVerifyCoach: Fetch error:", err);
            setError(err.message || "Could not load pending coaches.");
            setPendingCoaches([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user, getIdToken]);


    useEffect(() => {
        console.log("AdminVerifyCoach: Focus/User effect run. isFocused=", isFocused, "isAdmin=", user?.admin);
        if (isFocused && user?.admin) { fetchPendingCoaches(); }
        else if (isFocused && !user?.admin) { setIsLoading(false); setError("Access Denied."); setPendingCoaches([]); }
    }, [isFocused, user, fetchPendingCoaches]); 

    const onRefresh = useCallback(() => {
        console.log("AdminVerifyCoach: Refresh triggered.");
        setRefreshing(true);
        fetchPendingCoaches(true);
    }, [fetchPendingCoaches]);

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
         if (url) { Linking.openURL(url).catch(err => { console.error("Failed Certificate URL:", err); Alert.alert("Error", "Could not open link."); }); }
         else { Alert.alert("Info", "No certificate URL available."); }
     };

     const goToCoachDetails = (coach) => {
         if (!coach || !coach.id) { console.error("Cannot navigate, invalid coach data passed:", coach); return; }
         console.log("AdminVerifyCoach: Navigating to AdminCoachDetailScreen with coach ID:", coach.id);
 
         navigation.navigate('AdminCoachDetailScreen', { coachData: coach });
     };



    const renderCoachItem = ({ item }) => {
        const coach = item;
        const isActionLoading = actionLoadingId === coach.id;
        const fullName = `${coach.firstName || ''} ${coach.lastName || ''}`.trim();
        const displayName = fullName || coach.email || 'Unknown Coach';
        const defaultImage = require('../assets/Images/DefaultProfile.jpg'); // Ensure this path is correct

        return (
            <View style={styles.coachItemCard}>
             
                <TouchableOpacity
                    style={styles.coachInfoSection}
                    onPress={() => goToCoachDetails(coach)} 
                    disabled={isActionLoading}
                >
                    <Image
                        source={coach.profileImageUrl ? { uri: coach.profileImageUrl } : defaultImage}
                        style={styles.coachImage}
                    />
                    <View style={styles.coachTextDetails}>
                        <Text style={styles.coachName}>{displayName}</Text>
                        <Text style={styles.coachEmail} numberOfLines={1}>{coach.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={22} color={PALETTE.grey} />
                </TouchableOpacity>


                <TouchableOpacity
                    style={styles.certificateButton}
                    onPress={() => handleViewCertificate(coach.professionalCertificateUrl)}
                    disabled={isActionLoading}>
                    <Ionicons name="document-text-outline" size={16} color={PALETTE.darkGreen} style={{marginRight: 5}}/>
                    <Text style={styles.certificateLink}>View Certificate</Text>
                </TouchableOpacity>

    
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                        style={[styles.actionButtonBase, styles.rejectButton, isActionLoading && styles.buttonDisabled]}
                        onPress={() => handleVerification(coach.id, false)} // false for reject
                        disabled={isActionLoading}>
                        {(isActionLoading && actionLoadingId === coach.id) ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Text style={styles.actionButtonText}>Reject</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButtonBase, styles.approveButton, isActionLoading && styles.buttonDisabled]}
                        onPress={() => handleVerification(coach.id, true)} // true for approve
                        disabled={isActionLoading}>
                         {(isActionLoading && actionLoadingId === coach.id) ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Text style={styles.actionButtonText}>Approve</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Verify Coaches" />
            {isLoading && !refreshing ? ( 
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>
            ) : error ? ( 
                 <View style={styles.errorContainer}>
                     <Ionicons name="cloud-offline-outline" size={50} color={PALETTE.errorRed} />
                     <Text style={styles.errorText}>{error}</Text>
                     <TouchableOpacity onPress={onRefresh} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity>
                 </View>
            ) : (
                <FlatList
                    data={pendingCoaches}
                    renderItem={renderCoachItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No coaches awaiting verification.</Text></View>}
                    refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.darkGreen]} /> }
                />
            )}
            <AdminTabNavigation/>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center', marginBottom: 15 },
    retryButton: { backgroundColor: PALETTE.darkGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    retryButtonText: { color: PALETTE.white, fontSize: 16, fontWeight: 'bold' },
    listContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 90 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
    emptyText: { fontSize: 16, color: PALETTE.darkGrey, fontStyle: 'italic', textAlign: 'center' },
    coachItemCard: {
        backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: 15, marginBottom: 15,
        elevation: 3, shadowColor: PALETTE.black, shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2,
    },
    coachInfoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingRight: 5, },
    coachImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: PALETTE.grey },
    coachTextDetails: { flex: 1 },
    coachName: { fontSize: 17, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, marginBottom: 4 },
    coachEmail: { fontSize: 14, color: PALETTE.grey, fontFamily: 'Quicksand_500Medium', flexShrink: 1 },
    certificateButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 5, borderRadius: 8, marginBottom: 10, },
    certificateLink: { color: PALETTE.darkGreen, textDecorationLine: 'underline', fontSize: 14, fontFamily: 'Quicksand_600SemiBold', },
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: PALETTE.lightCream, },
    actionButtonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 20, borderRadius: 20, marginLeft: 10, minHeight: 38, elevation: 2, },
    actionButtonText: { color: PALETTE.white, fontSize: 14, fontWeight: 'bold', fontFamily: 'Quicksand_700Bold' },
    approveButton: { backgroundColor: PALETTE.successGreen },
    rejectButton: { backgroundColor: PALETTE.rejectRed },
    buttonDisabled: { opacity: 0.6, backgroundColor: PALETTE.grey }
});