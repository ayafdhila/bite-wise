import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, RefreshControl,
    Dimensions, Platform
} from 'react-native';
import ProHeader from './ProHeader';
import ProTabNavigation from '../components/ProTabNavigation';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// ✅ Your Exact Color Palette
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightGreen: '#A8C888',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    lightGrey: '#E8E8E8',
    errorRed: '#FF6B6B',
    // ✅ Better star color using your palette
    starGold: '#FCCF94', // Using your lightOrange instead of yellow
    cardShadow: 'rgba(46, 74, 50, 0.15)',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const DASHBOARD_ENDPOINT = '/coaching/coach/dashboard-summary';

export default function HomeCoach() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext);

    const [dashboardData, setDashboardData] = useState({
        activeClientCount: 0,
        pendingInvitationCount: 0,
        messagesNeedingReplyCount: 0,
        newestInvitation: null,
        oldestUnrepliedChat: null,
    });
    const [coachRating, setCoachRating] = useState({
        averageRating: 0,
        ratingCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const coachId = user?.uid;
    const coachDisplayName = user?.firstName || user?.displayName?.split(' ')[0] || 'Coach';

    // Fetch Coach Rating
    const fetchCoachRating = useCallback(async () => {
        if (!coachId) return;

        try {
            const token = await getIdToken();
            if (!token) return;

            const response = await axios.get(`${API_BASE_URL}/coaching/coach/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data) {
                setCoachRating({
                    averageRating: response.data.averageRating || 0,
                    ratingCount: response.data.ratingCount || 0
                });
            }
        } catch (error) {
            console.log('Error fetching coach rating:', error);
        }
    }, [coachId, getIdToken]);

    // Fetch Dashboard Data
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (!coachId) {
            if (!isRefresh) setIsLoading(false);
            setRefreshing(false);
            setError("Login required.");
            return;
        }
        if (!isRefresh) setIsLoading(true);
        setError(null);

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");

            console.log("HomeCoach: Fetching dashboard summary...");
            const url = `${API_BASE_URL}${DASHBOARD_ENDPOINT}`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (typeof response.data !== 'object' || response.data === null) {
                console.error("HomeCoach: Invalid data format received", response.data);
                throw new Error("Received invalid data from server.");
            }

            console.log("HomeCoach: Dashboard data received:", response.data);
            setDashboardData({
                activeClientCount: response.data.activeClientCount ?? 0,
                pendingInvitationCount: response.data.pendingInvitationCount ?? 0,
                messagesNeedingReplyCount: response.data.messagesNeedingReplyCount ?? 0,
                newestInvitation: response.data.newestInvitation || null,
                oldestUnrepliedChat: response.data.oldestUnrepliedChat || null,
            });

        } catch (err) {
            console.error("HomeCoach: Error fetching dashboard data:", err.response?.data || err.message || err);
            setError(err.response?.data?.error || err.message || "Could not load dashboard.");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [coachId, getIdToken]);

    // Combined fetch function
    const fetchAllData = useCallback(async (isRefresh = false) => {
        await Promise.all([
            fetchDashboardData(isRefresh),
            fetchCoachRating()
        ]);
    }, [fetchDashboardData, fetchCoachRating]);

    // Effects
    useEffect(() => {
        if (isFocused && coachId) {
            fetchAllData();
        }
        if (!coachId) {
            setIsLoading(false);
            setError(null);
            setDashboardData({
                activeClientCount: 0,
                pendingInvitationCount: 0,
                messagesNeedingReplyCount: 0,
                newestInvitation: null,
                oldestUnrepliedChat: null
            });
        }
    }, [isFocused, coachId, fetchAllData]);

    // Refresh handler
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAllData(true);
    }, [fetchAllData]);

    // Render Stars Component
    const renderStars = (rating, size = 18) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = (rating % 1) >= 0.5;
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <Ionicons key={i} name="star" size={size} color={PALETTE.starGold} />
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <Ionicons key={i} name="star-half" size={size} color={PALETTE.starGold} />
                );
            } else {
                stars.push(
                    <Ionicons key={i} name="star-outline" size={size} color={PALETTE.lightGrey} />
                );
            }
        }
        return stars;
    };

    // Render Welcome Header (No Photo, No Gradient)
    const renderWelcomeHeader = () => (
        <View style={styles.welcomeHeader}>
            <View style={styles.welcomeContent}>
                <View style={styles.textSection}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.coachName}>{coachDisplayName}!</Text>
                    
                    {/* Rating Display */}
                    <View style={styles.ratingContainer}>
                        <View style={styles.starsContainer}>
                            {renderStars(coachRating.averageRating)}
                        </View>
                        <Text style={styles.ratingText}>
                            {coachRating.averageRating > 0 
                                ? `${coachRating.averageRating.toFixed(1)} (${coachRating.ratingCount} ${coachRating.ratingCount === 1 ? 'review' : 'reviews'})`
                                : 'No ratings yet'
                            }
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity 
                    style={styles.viewProfileButton}
                    onPress={() => navigation.navigate('EditCoachProfile')}
                >
                    <Ionicons name="person-outline" size={18} color={PALETTE.white} />
                    <Text style={styles.viewProfileText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render Stats Grid
    const renderStatsGrid = () => (
        <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
                <TouchableOpacity 
                    style={[styles.statCard, styles.clientsCard]}
                    onPress={() => navigation.navigate('Clients')}
                >
                    <View style={styles.statIconContainer}>
                        <Ionicons name="people" size={32} color={PALETTE.white} />
                    </View>
                    <Text style={styles.statNumber}>{dashboardData.activeClientCount}</Text>
                    <Text style={styles.statLabel}>Active Clients</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.statCard, styles.invitationsCard]}
                    onPress={() => navigation.navigate('Invitations')}
                >
                    <View style={styles.statIconContainer}>
                        <Ionicons name="mail" size={32} color={PALETTE.white} />
                        {dashboardData.pendingInvitationCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>
                                    {dashboardData.pendingInvitationCount > 99 ? '99+' : dashboardData.pendingInvitationCount}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.statNumber}>{dashboardData.pendingInvitationCount}</Text>
                    <Text style={styles.statLabel}>Pending Invitations</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <TouchableOpacity 
                    style={[styles.statCard, styles.messagesCard]}
                    onPress={() => navigation.navigate('CoachMessagesListScreen')}
                >
                    <View style={styles.statIconContainer}>
                        <Ionicons name="chatbubbles" size={32} color={PALETTE.white} />
                        {dashboardData.messagesNeedingReplyCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>
                                    {dashboardData.messagesNeedingReplyCount > 99 ? '99+' : dashboardData.messagesNeedingReplyCount}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.statNumber}>{dashboardData.messagesNeedingReplyCount}</Text>
                    <Text style={styles.statLabel}>Pending Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.statCard, styles.ratingCard]}
                    onPress={() => navigation.navigate('EditCoachProfile')}
                >
                    <View style={styles.statIconContainer}>
                        <Ionicons name="star" size={32} color={PALETTE.white} />
                    </View>
                    <Text style={styles.statNumber}>
                        {coachRating.averageRating > 0 ? coachRating.averageRating.toFixed(1) : '0.0'}
                    </Text>
                    <Text style={styles.statLabel}>Your Rating</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Loading State
    if (isLoading) {
        return (
            <View style={styles.container}>
                <ProHeader subtitle="Dashboard" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
                <ProTabNavigation />
            </View>
        );
    }

    // Error State
    if (error) {
        return (
            <View style={styles.container}>
                <ProHeader subtitle="Dashboard" />
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline" size={64} color={PALETTE.errorRed} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchAllData()}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
                <ProTabNavigation />
            </View>
        );
    }

    // Main Render
    return (
        <View style={styles.container}>
            <ProHeader subtitle="Dashboard" />
            
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[PALETTE.darkGreen]}
                        tintColor={PALETTE.darkGreen}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {renderWelcomeHeader()}
                {renderStatsGrid()}
            </ScrollView>

            <ProTabNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: PALETTE.darkGrey,
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 16,
        color: PALETTE.errorRed,
        textAlign: 'center',
        marginVertical: 16,
        fontWeight: '500',
    },
    retryButton: {
        backgroundColor: PALETTE.darkGreen,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 2,
    },
    retryButtonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    // ✅ Horizontal Welcome Header
    welcomeHeader: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        backgroundColor: PALETTE.darkGreen,
        elevation: 4,
        shadowColor: PALETTE.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    welcomeContent: {
        padding: 20,
        flexDirection: 'row', // ✅ Horizontal layout
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textSection: {
        flex: 1, // ✅ Takes available space
    },
    welcomeText: {
        fontSize: 16,
        color: PALETTE.white,
        fontWeight: '500',
        opacity: 0.9,
    },
    coachName: {
        fontSize: 24,
        color: PALETTE.white,
        fontWeight: '700',
        marginBottom: 12,
    },
    ratingContainer: {
        alignItems: 'flex-start', // ✅ Left aligned in horizontal layout
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 12,
        color: PALETTE.white,
        fontWeight: '500',
        opacity: 0.9,
    },
    viewProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.mediumGreen,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 2,
    },
    viewProfileText: {
        marginLeft: 4,
        fontSize: 14,
        color: PALETTE.white,
        fontWeight: '600',
    },
    statsGrid: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        aspectRatio: 1.1,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 6,
        elevation: 3,
        shadowColor: PALETTE.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientsCard: {
        backgroundColor: PALETTE.mediumGreen,
    },
    invitationsCard: {
        backgroundColor: PALETTE.darkGreen, // ✅ Clearer color for pending
    },
    messagesCard: {
        backgroundColor: PALETTE.lightOrange,
    },
    ratingCard: {
        backgroundColor: PALETTE.lightGreen, // ✅ Using your palette instead of yellow
    },
    statIconContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    notificationBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: PALETTE.errorRed,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: PALETTE.white,
    },
    badgeText: {
        color: PALETTE.white,
        fontSize: 10,
        fontWeight: '700',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: PALETTE.white,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: PALETTE.white,
        textAlign: 'center',
        opacity: 0.95,
    },
});