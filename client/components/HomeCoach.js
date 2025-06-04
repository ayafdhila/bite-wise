import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, RefreshControl, Image // Added Image
} from 'react-native';
import ProHeader from './ProHeader';            // Adjust path if needed
import ProTabNavigation from '../components/ProTabNavigation'; // Adjust path if needed
import stylesImport from './Styles';                      // Import your main styles
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';   // Adjust path if needed
import axios from 'axios';                              // Using axios
import { Ionicons } from '@expo/vector-icons';          // For icons

// --- Define Palette (Or import from central location) ---
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
    // Add specific colors if needed
};

// --- API Base URL ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const DASHBOARD_ENDPOINT = '/coaching/coach/dashboard-summary'; // Ensure backend uses this

// --- Main Component ---
export default function HomeCoach() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext); // Get coach user info

    // --- State for Dashboard Data ---
    const [dashboardData, setDashboardData] = useState({ // Initialize with defaults
        activeClientCount: 0,
        pendingInvitationCount: 0,
        messagesNeedingReplyCount: 0,
        newestInvitation: null,
        oldestUnrepliedChat: null,
        // planRequestCount: 0, // Add other summaries if needed
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const coachId = user?.uid;
    // Attempt to get a display name, fallback to "Coach"
    const coachDisplayName = user?.firstName || user?.displayName?.split(' ')[0] || 'Coach';

    // --- Fetch Dashboard Data Function ---
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (!coachId) {
            if (!isRefresh) setIsLoading(false);
            setRefreshing(false); setError("Login required."); return;
        }
        if (!isRefresh) setIsLoading(true); setError(null);

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            console.log("HomeCoach: Fetching dashboard summary...");
            const url = `${API_BASE_URL}${DASHBOARD_ENDPOINT}`;
            const response = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });

             if (typeof response.data !== 'object' || response.data === null) {
                 console.error("HomeCoach: Invalid data format received", response.data);
                 throw new Error("Received invalid data from server.");
             }

            console.log("HomeCoach: Dashboard data received:", response.data);
            // Set state with fetched data, providing defaults
            setDashboardData({
                activeClientCount: response.data.activeClientCount ?? 0,
                pendingInvitationCount: response.data.pendingInvitationCount ?? 0,
                messagesNeedingReplyCount: response.data.messagesNeedingReplyCount ?? 0,
                newestInvitation: response.data.newestInvitation || null,
                oldestUnrepliedChat: response.data.oldestUnrepliedChat || null,
                // planRequestCount: response.data.planRequestCount ?? 0, // If added later
            });

        } catch (err) {
            console.error("HomeCoach: Error fetching dashboard data:", err.response?.data || err.message || err);
            setError(err.response?.data?.error || err.message || "Could not load dashboard.");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [coachId, getIdToken]); // Dependencies

    // --- Initial Fetch & Refetch on Focus ---
    useEffect(() => {
        if (isFocused && coachId) { fetchDashboardData(); }
        if (!coachId) { // Handle logout case
             setIsLoading(false); setError(null);
             setDashboardData({ activeClientCount: 0, pendingInvitationCount: 0, messagesNeedingReplyCount: 0, newestInvitation: null, oldestUnrepliedChat: null });
        }
    }, [isFocused, coachId, fetchDashboardData]); // Rerun if focus or user changes

    // --- Pull-to-Refresh Handler ---
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData(true); // Pass true to indicate it's a refresh
    }, [fetchDashboardData]);

    // --- Navigation Handlers ---
    const goToClients = () => navigation.navigate('Clients'); // Adjust screen name if different
    const goToInvitations = () => navigation.navigate('Invitations'); // Adjust screen name
    const goToMessagesList = () => navigation.navigate('CoachMessagesListScreen'); // Adjust screen name
    const goToChat = (chatInfo) => { // Navigate directly to chat
         if (chatInfo?.id && chatInfo.userDetails?.userId && chatInfo.userDetails?.userName) {
              navigation.navigate('CoachClientChat', { // Adjust screen name
                   chatId: chatInfo.id,
                   clientId: chatInfo.userDetails.userId,
                   clientName: chatInfo.userDetails.userName
              });
         } else {
             console.warn("Cannot navigate to specific chat, missing data:", chatInfo);
             goToMessagesList(); // Fallback to list
         }
    };
    // Add handler for Plan Requests navigation if needed

    // --- Render Helper for Dashboard Cards (Enhanced Version) ---
    const renderDashboardCard = ({ iconName, title, count, subtitle, action, priorityDetails = null }) => (
        <TouchableOpacity
            style={styles.dashboardCard}
            onPress={action}
            disabled={!action || isLoading || refreshing}
            activeOpacity={action ? 0.7 : 1}
         >
            {/* Icon on the left */}
            {iconName && (
                <View style={styles.cardIconContainer}>
                    <Ionicons name={iconName} size={28} color={PALETTE.darkGreen} />
                </View>
            )}
            {/* Text content */}
            <View style={styles.cardTextContainer}>
                <Text style={styles.dashboardTitle}>{title} ({count})</Text> {/* Count in Title */}
                {/* Show dynamic subtitle */}
                {subtitle && <Text style={styles.dashboardSubtitle} numberOfLines={2}>{subtitle}</Text>}
            </View>
            {/* Chevron Icon on the right */}
            {action && <Ionicons name="chevron-forward-outline" size={24} color={PALETTE.darkGrey} style={styles.cardChevron}/> }
        </TouchableOpacity>
    );


    // --- Main Render ---
    return (
        <View style={styles.mainContainer}>
            {/* Header with dynamic name */}
            <ProHeader subtitle={`Welcome back, ${coachDisplayName}!`} showMenuButton={true} navigation={navigation} />

            <ScrollView
                 contentContainerStyle={styles.scrollContainer}
                 refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.darkGreen]}/>}
                 showsVerticalScrollIndicator={false}
            >
                {/* Section Title */}
                <Text style={styles.sectionTitle}>Dashboard</Text>

                {/* Loading / Error State */}
                {isLoading && !refreshing && <ActivityIndicator size="large" color={PALETTE.darkGreen} style={{ marginTop: 50 }}/>}
                {error && !isLoading && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                         <TouchableOpacity onPress={() => fetchDashboardData()} style={styles.retryButton}>
                             <Text style={styles.retryButtonText}>Retry</Text>
                         </TouchableOpacity>
                    </View>
                )}

                {/* Dashboard Cards - Render only when not loading and no error */}
                {!isLoading && !error && (
                    <>
                        {/* Messages Card */}
                        {renderDashboardCard({
                            iconName: "chatbubbles-outline", // Example icon
                            title: "Messages",
                            count: dashboardData.messagesNeedingReplyCount,
                            subtitle: dashboardData.oldestUnrepliedChat
                                ? `Reply needed: ${dashboardData.oldestUnrepliedChat.userDetails?.userName || 'Unknown'}`
                                : (dashboardData.unreadMessageCount > 0 ? `${dashboardData.unreadMessageCount} total unread` : "All caught up!"),
                            action: () => dashboardData.oldestUnrepliedChat ? goToChat(dashboardData.oldestUnrepliedChat) : goToMessagesList(),
                        })}

                        {/* Invitation Requests Card */}
                         {renderDashboardCard({
                            iconName: "person-add-outline", // Example icon
                            title: "Invitation Requests",
                            count: dashboardData.invitationRequestCount,
                            subtitle: dashboardData.newestInvitation
                                ? `Newest: ${dashboardData.newestInvitation.userDetails?.userName || 'Unknown'} (Goal: ${dashboardData.newestInvitation.userDetails?.goal || 'N/A'})`
                                : "No pending requests",
                            action: goToInvitations,
                         })}

                         {/* Active Clients Card */}
                         {renderDashboardCard({
                            iconName: "people-outline", // Example icon
                            title: "Active Clients",
                            count: dashboardData.activeClientCount,
                            subtitle: `View all ${dashboardData.activeClientCount} clients`,
                            action: goToClients
                         })}

                        {/* Placeholder for Plan Requests */}
                        {/* {renderDashboardCard({ iconName: "document-text-outline", title: "Plan Requests", ... })} */}
                    </>
                )}

            </ScrollView>

            {/* Fixed Bottom Tab Navigation */}
            <ProTabNavigation />
        </View>
    );
}

// --- Styles (Ensure these match your design or are in Styles.js) ---
// Using stylesImport assumes you have these defined in './Styles.js'
// Providing examples here in case they are missing or need adjustment
const styles = StyleSheet.create({
    ...(stylesImport || {}), // Spread imported styles first

    // --- Define FALLBACKS or specific styles for this screen ---
    mainContainer: (stylesImport?.mainContainer || { flex: 1, backgroundColor: PALETTE.lightCream }),
    scrollContainer: (stylesImport?.scrollContainer || { padding: 20, paddingBottom: 80 }),
    sectionTitle: (stylesImport?.sectionTitle || { fontSize: 22, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginBottom: 20, marginLeft: 5}), // Made larger
    dashboardCard: (stylesImport?.dashboardCard || {
        backgroundColor: PALETTE.lightOrange,
        borderRadius: 20,
        paddingVertical: 18, // Increased padding
        paddingHorizontal: 15,
        marginBottom: 18, // Increased spacing
        elevation: 3,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 85,
    }),
    cardIconContainer: (stylesImport?.cardIconContainer || {
        marginRight: 15, // Space between icon and text
        padding: 8,
        backgroundColor: PALETTE.lightCream, // Slightly different background for icon?
        borderRadius: 25, // Circular background
    }),
    cardTextContainer: (stylesImport?.cardTextContainer || {
        flex: 1, // Allow text to take available space
        fontFamily: 'Quicksand_700Bold',
    }),
    dashboardCount: (stylesImport?.dashboardCount || { // Removed count display from here, moved to title
        // fontSize: 28, fontWeight: 'bold', color: PALETTE.darkGreen, marginBottom: 2,
    }),
    dashboardTitle: (stylesImport?.dashboardTitle || {
        fontSize: 18, // Title size
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.black,
        marginBottom: 5,
    }),
    dashboardSubtitle: (stylesImport?.dashboardSubtitle || {
        fontSize: 14, // Subtitle size
        color: PALETTE.darkGreen,
        flexShrink: 1, // Allow subtitle to wrap/shrink
        fontFamily: 'Quicksand_700Bold',
    }),
    // Removed priority preview styles - simplified card structure
    cardChevron: (stylesImport?.cardChevron || {
         marginLeft: 10, // Space before chevron
    }),
    errorContainer: (stylesImport?.errorContainer || { alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20 }),
    errorText: (stylesImport?.errorText || { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center', marginBottom: 15 }),
    retryButton: (stylesImport?.retryButton || { backgroundColor: PALETTE.darkGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 }),
    retryButtonText: (stylesImport?.retryButtonText || { color: PALETTE.white, fontSize: 16, fontFamily: 'Quicksand_700Bold', }),
    emptyText: (stylesImport?.emptyText || { fontSize: 16, color: PALETTE.darkGrey, textAlign: 'center', marginTop: 50 }),
});