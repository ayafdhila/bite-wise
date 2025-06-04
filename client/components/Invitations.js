import React, { useContext, useCallback, useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList, // Use FlatList for lists
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput, // Import TextInput for search
    Platform
} from 'react-native';
import Header from './Header'; // Assuming path is correct
import ProTabNavigation from './ProTabNavigation'; // Assuming path is correct
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from './AuthContext'; // Assuming path is correct
import { Ionicons } from '@expo/vector-icons'; // For icons

// --- Define Palette (Good Practice) ---
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C', // Tab bar background
    lightOrange: '#FCCF94', // Search bar and card background
    lightCream: '#F5E4C3', // Main background
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',      // Placeholder text, inactive icons
    darkGrey: '#555555',
    acceptGreen: '#88A76C', // Or your specific green
    declineRed: '#E3735E',   // Or your specific red
    errorRed: '#D32F2F',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// --- Helper to Format Timestamps (Example) ---
const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    try {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        const options = { day: 'numeric', month: 'long' }; // e.g., "4 avril" (depends on locale)
        return `Received ${date.toLocaleDateString(undefined, options)}`;
    } catch (e) { return "Invalid date"; }
};

// --- Main Component ---
export default function Invitations() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext); // Get coach user and token function

    // --- State ---
    const [pendingRequests, setPendingRequests] = useState([]); // Original list from fetch
    const [filteredRequests, setFilteredRequests] = useState([]); // List displayed (after search)
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [processingRequestId, setProcessingRequestId] = useState(null); // Tracks which request is being acted upon

    // --- Data Fetching Function ---
    const fetchInvitations = useCallback(async (isRefresh = false) => {
        if (!user) { // Check if user object exists
            console.log("Invitations: No user logged in, cannot fetch.");
            setLoading(false);
            setRefreshing(false);
            setPendingRequests([]);
            setFilteredRequests([]);
            return;
        }
        // Optional: Add check for userType if needed, although backend should handle auth
        // if(user.userType !== 'Professional') { ... return ...}

        if (!isRefresh) setLoading(true);
        setError(null);

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log("Invitations: Fetching pending requests from backend...");
            // IMPORTANT: Use the dedicated coach endpoint
            const response = await fetch(`${API_BASE_URL}/coaching/coach/requests?status=pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = response.headers.get("content-type");
             if (!contentType || !contentType.includes("application/json")) {
                 const text = await response.text();
                 throw new Error(`Server error: ${response.status}. Response: ${text.substring(0, 100)}...`);
             }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to fetch invitations.");

            console.log(`Invitations: Received ${data.pendingRequests?.length || 0} requests.`);
            // Ensure data received is an array before setting
            const requests = Array.isArray(data.pendingRequests) ? data.pendingRequests : [];
            setPendingRequests(requests);
            setFilteredRequests(requests); // Initialize filtered list

        } catch (err) {
            console.error("Invitations: Error fetching invitations:", err);
            setError(err.message || "Could not load invitations.");
            setPendingRequests([]); // Clear data on error
            setFilteredRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, getIdToken]); // Dependencies for useCallback

    // --- Initial Fetch & Refetch on Focus ---
    useEffect(() => {
        if (isFocused && user) {
            console.log("Invitations: Screen focused, fetching invitations.");
            fetchInvitations();
        }
        if (!user) { // Clear data if user logs out
            setPendingRequests([]);
            setFilteredRequests([]);
            setError(null);
            setLoading(false); // Ensure loading stops if user logs out before fetch completes
        }
    }, [isFocused, user, fetchInvitations]);

    // --- Search Filtering Effect ---
    useEffect(() => {
        if (searchText === '') {
            setFilteredRequests(pendingRequests);
        } else {
            const lowerCaseSearch = searchText.toLowerCase();
            setFilteredRequests(
                pendingRequests.filter(req => {
                    const firstName = req.userDetails?.firstName?.toLowerCase() || '';
                    const lastName = req.userDetails?.lastName?.toLowerCase() || '';
                    const goal = req.userDetails?.goal?.toLowerCase() || ''; 
                    const fullName = `${firstName} ${lastName}`;
                    return fullName.includes(lowerCaseSearch) || goal.includes(lowerCaseSearch);
                })
            );
        }
    }, [searchText, pendingRequests]);

    // --- Pull-to-Refresh Handler ---
    const onRefresh = useCallback(() => {
        console.log("Invitations: Refresh triggered.");
        setRefreshing(true);
        fetchInvitations(true); // Pass true to indicate refresh
    }, [fetchInvitations]);

    // --- Accept/Decline Handlers ---
    const handleAction = useCallback(async (actionType, requestId, userId) => {
        if (processingRequestId) return; // Prevent multiple clicks while one is processing

        setProcessingRequestId(requestId); // Show loading on the specific button
        setError(null);
        const actionName = actionType === 'accept' ? 'accepting' : 'declining';
        const endpoint = actionType === 'accept' ? 'accept' : 'decline';

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication error.");

            console.log(`Invitations: Attempting to ${actionType} request ${requestId} from user ${userId}`);
            const response = await fetch(`${API_BASE_URL}/coaching/coach/requests/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, requestId })
            });

            // Check content type even for potential errors
             const contentTypeAction = response.headers.get("content-type");
             let data;
              if (contentTypeAction && contentTypeAction.includes("application/json")) {
                  data = await response.json();
             } else {
                 const text = await response.text();
                 // If response was OK but not JSON (unlikely), create success message
                 if(response.ok) data = { message: `Request ${actionType}ed successfully (non-JSON response)` };
                 // Otherwise throw error with text
                 else throw new Error(`Server error: ${response.status}. Response: ${text.substring(0, 100)}...`);
             }


            if (!response.ok) throw new Error(data.message || `Failed to ${actionType} request.`);

            console.log(`Invitations: Request ${requestId} ${actionType}ed successfully.`);
            // Update UI: Remove the processed request from both lists
            setPendingRequests(prev => prev.filter(req => req.requestId !== requestId));
            // No need to manually update filteredRequests, the useEffect dependency will handle it
            // setFilteredRequests(prev => prev.filter(req => req.requestId !== requestId));

            // Optional: Show success feedback
            // Alert.alert("Success", `Request ${actionType}ed.`);

        } catch (err) {
            console.error(`Invitations: Error ${actionName} request ${requestId}:`, err);
            Alert.alert("Error", err.message || `Could not ${actionType} the request.`);
            setError(err.message); // Set error state
        } finally {
            setProcessingRequestId(null); // Hide loading indicator for the button
        }
    }, [getIdToken, processingRequestId]); // Add processingRequestId to dependencies

    // --- Render Function for List Item ---
    const renderRequestItem = ({ item }) => {
        // Destructure with fallbacks
        const { requestId, userId, requestTimestamp } = item;
        const { profileImageUrl, firstName = 'Unknown', lastName = 'User', goal = 'N/A' } = item.userDetails || {};
        const fullName = `${firstName} ${lastName}`;
        const formattedDate = formatTimestamp(requestTimestamp);
        const isProcessing = processingRequestId === requestId; // Check if THIS item is loading

        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    {/* Avatar */}
                    <Image
                        source={profileImageUrl ? { uri: profileImageUrl } : require('../assets/Images/DefaultProfile.png')} // Use default avatar
                        style={styles.avatar}
                    />
                    {/* Text Info */}
                    <View style={styles.textInfo}>
                        <Text style={styles.nameText}>{fullName}</Text>
                        <Text style={styles.detailText}>Goal: {goal}</Text>
                        <Text style={styles.detailText}>{formattedDate}</Text>
                    </View>
                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.iconButton]}
                            onPress={() => handleAction('accept', requestId, userId)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color={PALETTE.white} style={styles.buttonActivityIndicator}/>
                            ) : (
                                <Ionicons name="checkmark-circle" size={40} color={PALETTE.acceptGreen} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton]}
                            onPress={() => handleAction('decline', requestId, userId)}
                            disabled={isProcessing}
                        >
                             {isProcessing ? (
                                <ActivityIndicator size="small" color={PALETTE.white} style={styles.buttonActivityIndicator}/>
                            ) : (
                                <Ionicons name="close-circle" size={40} color={PALETTE.declineRed} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // --- Main JSX Return ---
    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Connection Requests"} />

             {/* Search Bar */}
             <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={PALETTE.darkGrey} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or goal..."
                    placeholderTextColor={PALETTE.grey}
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    clearButtonMode="while-editing" // iOS clear button
                />
                 {/* Android clear button */}
                 {searchText.length > 0 && Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 5 }}>
                        <Ionicons name="close-circle" size={20} color={PALETTE.grey} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Conditional Rendering: Loading / Error / List / Empty State */}
            {isLoading ? (
                <View style={styles.centeredMessage}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                </View>
            ) : error ? (
                <View style={styles.centeredMessage}>
                    <Text style={styles.errorText}>{error}</Text>
                    {/* Provide a retry button */}
                    <TouchableOpacity onPress={() => fetchInvitations()} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredRequests} // Use the filtered list for display
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.requestId} // Use unique request ID
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={ // Display message when list is empty
                        <View style={styles.centeredMessage}>
                            <Text style={styles.emptyText}>
                                {searchText ? 'No requests match your search.' : 'No pending invitations.'}
                            </Text>
                        </View>
                    }
                    refreshControl={ // Enable pull-to-refresh
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[PALETTE.darkGreen]} // Android spinner color
                            tintColor={PALETTE.darkGreen} // iOS spinner color
                        />
                    }
                />
            )}

            {/* Your Professional Tab Navigation Component */}
            <ProTabNavigation />
        </View>
    );
}

// --- Styles (Add or merge into your main stylesheet) ---
// Using the styles from the previous example, ensure they match your palette/design
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    centeredMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.lightOrange,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginHorizontal: 15,
        marginVertical: 15,
        paddingVertical: 5,
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: PALETTE.darkGrey,
    },
    listContainer: {
        paddingHorizontal: 15,
        paddingBottom: 80, // Adjust if tab bar overlaps
    },
    card: {
        backgroundColor: PALETTE.lightOrange, // Card background
        borderRadius: 20,
        marginBottom: 15,
        padding: 15,
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40, // Circular
        marginRight: 15,
        backgroundColor: PALETTE.lightCream, // Background while loading image or default
    },
    textInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameText: {
        fontSize: 18,
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.black,
        marginBottom: 4,
    },
    detailText: {
        fontSize: 15,
        color: PALETTE.darkGreen,
        fontFamily: 'Quicksand_700Bold',
        marginBottom: 2,
    },
    actionButtons: {
        flexDirection: 'column',
        justifyContent: 'space-around', 
        marginLeft: 10,
        alignItems: 'center', 
        minHeight: 80, 
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
       
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1,
    },
 
    emptyText: {
        fontSize: 16,
        color: PALETTE.darkGrey,
        textAlign: 'center',
        marginTop: 30, // Add some top margin
    },
    errorText: {
        fontSize: 16,
        color: PALETTE.errorRed,
        textAlign: 'center',
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
        fontWeight: 'Quicksand_700Bold',
    },
    buttonActivityIndicator: {
        // Style for the loading spinner inside the button, ensure it's visible
    },
});