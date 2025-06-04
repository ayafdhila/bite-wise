import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, ActivityIndicator, RefreshControl,
    TouchableOpacity, StyleSheet, ScrollView, Alert, Image
} from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';
import Header from '../components/Header'; 
import TabNavigation from '../components/TabNavigation'; 
import { Ionicons } from '@expo/vector-icons';


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
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FindSpecialist() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const route = useRoute();
    const { user, getIdToken, refreshCoachingStatus } = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [acceptedRequests, setAcceptedRequests] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const [isSelectingCoachId, setIsSelectingCoachId] = useState(null);

    const fetchRequests = useCallback(async (isRefresh = false) => {
        if (!user) { if (!isRefresh) setIsLoading(false); setRefreshing(false); return; }
        if (!isRefresh) setIsLoading(true); setFetchError(null);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Not authenticated");
            const response = await fetch(`${API_BASE_URL}/coaching/status`, { headers: { 'Authorization': `Bearer ${token}` }});
         
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                 const text = await response.text();
                 throw new Error(`Unexpected server response. Status: ${response.status}. Body: ${text.substring(0,100)}...`);
            }
            const data = await response.json(); if (!response.ok) throw new Error(data.message || "Failed to fetch requests");

            if (!data.activeCoachId) {
                setPendingRequests(data.pendingRequests || []); setAcceptedRequests(data.acceptedRequests || []);
                console.log(`FindSpecialist: Fetched ${data.pendingRequests?.length || 0}p, ${data.acceptedRequests?.length || 0}a reqs.`);
            } else { console.warn("FindSpecialist: Active coach found, clearing local requests."); setPendingRequests([]); setAcceptedRequests([]); }
        } catch (err) { console.error("FindSpecialist: Error fetching reqs:", err); setFetchError(err.message); }
        finally { setIsLoading(false); setRefreshing(false); }
    }, [user, getIdToken]);


  
    useEffect(() => {
        if (isFocused && route.params?.newPendingRequest) {
            const newRequest = route.params.newPendingRequest;
            console.log("FindSpecialist: Processing newPendingRequest param:", newRequest.id);
            setPendingRequests(prev => {
                const exists = prev.some(r => r.id === newRequest.id || r.nutritionistId === newRequest.nutritionistId);
                 console.log("FindSpecialist: Param request exists in current state?", exists);
                if (!exists) {
                    console.log("FindSpecialist: Optimistically adding new request.");
                    return [newRequest, ...prev];
                }
                return prev;
            });
            navigation.setParams({ newPendingRequest: null });
        }
    }, [route.params?.newPendingRequest, isFocused, navigation]);


    useEffect(() => {
        if (isFocused && user) { fetchRequests(); }
         if (!user) { setPendingRequests([]); setAcceptedRequests([]); setIsLoading(true); setFetchError(null); }
    }, [isFocused, user, fetchRequests]);


    const onRefresh = useCallback(() => { setRefreshing(true); fetchRequests(true); }, [fetchRequests]);

    const handleSelectCoach = useCallback(async (requestId, selectedNutritionistId, nutritionistName) => {
        setIsSelectingCoachId(requestId);
        Alert.alert("Confirm Selection", `Select Dr. ${nutritionistName} as your coach?`,
            [ { text: "Cancel", style: "cancel", onPress: () => setIsSelectingCoachId(null) },
              { text: "Select", style: "default", onPress: async () => {
                try {
                    const token = await getIdToken(); if (!token) throw new Error("Auth session expired.");
                    const response = await fetch(`${API_BASE_URL}/coaching/select`, {
                        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId, nutritionistId: selectedNutritionistId })
                    });
                    const data = await response.json(); if (!response.ok) throw new Error(data.message || "Failed to select coach");
                    navigation.navigate('ActiveCoachDashboard', {coachId: selectedNutritionistId, nutritionistName});
                  
                    await refreshCoachingStatus(); 
                } catch (err) { console.error("Error selecting coach:", err); Alert.alert("Error", err.message || "Could not select coach."); }
                finally { setIsSelectingCoachId(null); }
            } } ]
        );
    }, [getIdToken, refreshCoachingStatus]);


  
    const renderRequestItem = (request, type) => {
        if (!request || !request.details) {
            console.log(`renderRequestItem: Skipping render for ${type} request ${request?.id} due to missing details.`);
            return <Text key={`err-${request?.id || Math.random()}`} style={styles.errorText}>Coach details loading or unavailable.</Text>;
        }


        const { profileImageUrl, firstName, lastName } = request.details;
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();

        return (
            
            <View key={`${type}-${request.id}`} style={styles.requestItemContainer}>
                <View style={styles.coachInfoRow}>
                    <Image
                       source={profileImageUrl ? { uri: profileImageUrl } : require('../assets/Images/DefaultProfile.jpg')}
                        style={styles.coachImage}
                    />
                    <Text style={styles.coachName}>{fullName}</Text>
                </View>

                
                {type === 'accepted' && (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            styles.selectButton,
                            isSelectingCoachId === request.id && styles.actionButtonDisabled // Add disabled style
                        ]}
                        onPress={() => handleSelectCoach(request.id, request.nutritionistId, fullName)}
                        disabled={isSelectingCoachId === request.id}
                    >
                        {isSelectingCoachId === request.id ? (
                            <ActivityIndicator color={PALETTE.white} size="small"/>
                        ) : (
                            <Text style={styles.actionButtonText}>Select as Coach</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };


    if (isLoading && !refreshing) {
        return ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View> );
    }

    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Find & Manage Coaches"} />

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.darkGreen]}/>}
            >

                <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => navigation.navigate('NutritionSection')}
                >
                    <Text style={styles.browseButtonText}>Browse coaches</Text>
                </TouchableOpacity>

                {fetchError && !refreshing && <Text style={styles.errorText}>Error loading requests: {fetchError}</Text>}

                {acceptedRequests && acceptedRequests.length > 0 && (
                     <View style={styles.sectionCard}>
                         <Text style={styles.sectionTitle}>Accepted</Text>
                         {acceptedRequests.map(request => renderRequestItem(request, 'accepted'))}
                     </View>
                )}

                 {pendingRequests && pendingRequests.length > 0 && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Pending requests</Text>
                         {pendingRequests.map(request => renderRequestItem(request, 'pending'))}
                     </View>
                 )}

                 {!isLoading && (!acceptedRequests || acceptedRequests.length === 0) && (!pendingRequests || pendingRequests.length === 0) && !fetchError && (
                    <Text style={styles.noRequestsText}>No pending or accepted requests found.</Text>
                 )}
            </ScrollView>

             <TabNavigation />
        </View>
    );
}


const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream, 
    },
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: PALETTE.lightCream,
    },
    scrollContainer: {
        paddingHorizontal: 15, 
        paddingVertical: 20, 
        paddingBottom: 90, 
    },
    browseButton: {
        backgroundColor: PALETTE.darkGreen, 
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 20, 
        marginBottom: 25, 
        alignItems: 'center',
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
    },
    browseButtonText: {
        color: PALETTE.white, 
        fontSize: 20,
        fontFamily: 'Quicksand_700Bold', 
    },
    errorText: {
        color: PALETTE.errorRed,
        textAlign: 'center', marginVertical: 15, fontSize: 14
    },
    sectionCard: {
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 15, 
        padding: 15, 
        marginBottom: 20,
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    sectionTitle: {
        fontSize:20, 
        fontFamily: 'Quicksand_700Bold',
        marginBottom: 15, 
        color: PALETTE.darkGrey, 
        paddingLeft: 5, 
    },
    requestItemContainer: { 
        marginBottom: 15, 
       
    },
    coachInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.lightCream, 
        padding: 12, 
        borderRadius: 20,
         elevation: 1,
         shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
    },
    coachImage: {
        width: 45, height: 45, 
        borderRadius: 22.5, 
        marginRight: 12,
    backgroundColor: PALETTE.grey, 
    },
    coachName: {
        fontSize: 18, 
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.black,
        flex: 1, 
    },
    actionButton: { 
        paddingVertical: 10,
        borderRadius: 10, 
        alignItems: 'center',
        marginTop: 10, 
        minHeight: 40, 
        justifyContent: 'center',
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
    },
    selectButton: {
        backgroundColor: PALETTE.darkGreen, 
    },
    actionButtonText: {
        color: PALETTE.white, 
        fontFamily: 'Quicksand_700Bold',
        fontSize: 14,
    },
    actionButtonDisabled: { 
        backgroundColor: PALETTE.grey, 
        opacity: 0.7,
    },
    noRequestsText: {
        textAlign: 'center', 
        color: PALETTE.darkGrey, 
        marginTop: 40, 
        fontSize: 16, 
        fontStyle: 'italic'
    },
});