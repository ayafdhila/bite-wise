import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Platform, Alert, Dimensions 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import AdminHeader from '../components/AdminHeader';    
import AdminTabNavigation from './AdminTabNavigation';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit'; 
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

    chartLine1: (opacity = 1) => `rgba(46, 74, 50, ${opacity})`,    
    chartLine2: (opacity = 1) => `rgba(136, 167, 108, ${opacity})`, 
    chartDefault: (opacity = 1) => `rgba(46, 74, 50, ${opacity})`,  
    chartLabel: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,    
    chartGrid: (opacity = 0.2) => `rgba(46, 74, 50, ${opacity})`,   
    dotStroke: '#88A76C', 
};


const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 
const ADMIN_DASHBOARD_ENDPOINT = `${API_BASE_URL}/admin/dashboard-summary`; 

const EMPTY_CHART_DATA = {
    labels: [" ", " ", " ", " ", " ", " "], 
    datasets: [
        { data: [0, 0, 0, 0, 0, 0], color: PALETTE.chartLine1, strokeWidth: 2 },
        { data: [0, 0, 0, 0, 0, 0], color: PALETTE.chartLine2, strokeWidth: 2 }  
    ]
};

const screenWidth = Dimensions.get("window").width;

export default function AdminDashboard() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext); 

    // --- State ---
    const [summaryData, setSummaryData] = useState({
        totalSubscribers: 0, totalCoaches: 0, pendingCoaches: 0,
        mealsToday: 0, plansCreated: 0,
        userGrowthData: EMPTY_CHART_DATA, 
        recentActivity: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAdminSummary = useCallback(async (isRefresh = false) => {
        if (!user || !user.admin) {
             console.warn("AdminDashboard: Fetch skipped, user is not admin or not logged in.");
             setError("Unauthorized access."); setIsLoading(false); setRefreshing(false);
             setSummaryData({ totalSubscribers: 0, totalCoaches: 0, pendingCoaches: 0, mealsToday: 0, plansCreated: 0, userGrowthData: EMPTY_CHART_DATA, recentActivity: [] });
             return;
        }

        if (!isRefresh) setIsLoading(true);
        setError(null);
        console.log("AdminDashboard: Fetching summary data...");
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing");
            const response = await fetch(ADMIN_DASHBOARD_ENDPOINT, { headers: { 'Authorization': `Bearer ${token}` } });
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { const txt = await response.text(); throw new Error(`Non-JSON Response [${response.status}]: ${txt.substring(0,150)}`); }
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.message || `Failed load (${response.status})`);
            console.log("AdminDashboard: Received summary data");

            let processedChartData = EMPTY_CHART_DATA; 
            if (data.userGrowthData && Array.isArray(data.userGrowthData.labels) && Array.isArray(data.userGrowthData.datasets)) {
                console.log("AdminDashboard: Processing received chart data...");
                 const labels = data.userGrowthData.labels.length > 0 ? data.userGrowthData.labels : EMPTY_CHART_DATA.labels; // Use fetched or default labels
                 processedChartData = {
                     labels: labels,
                     datasets: (data.userGrowthData.datasets || []).map((ds, index) => {
                         let sanitizedData = (Array.isArray(ds?.data) ? ds.data : []).map(p => (typeof p === 'number' && Number.isFinite(p)) ? p : 0); // Sanitize

                         const requiredLength = labels.length;
                         while(sanitizedData.length < requiredLength) sanitizedData.push(0);
                         sanitizedData = sanitizedData.slice(0, requiredLength);

                         return { data: sanitizedData, color: index === 0 ? PALETTE.chartLine1 : PALETTE.chartLine2, strokeWidth: ds.strokeWidth || 2 };
                     }),
                     legend: data.userGrowthData.legend 
                 };

                  if (processedChartData.datasets.length === 0) {
                      processedChartData.datasets.push({ data: Array(processedChartData.labels.length).fill(0), color: PALETTE.chartLine1, strokeWidth: 2 });
                  }

                  if (processedChartData.legend?.length === 2 && processedChartData.datasets.length === 1) {
                       processedChartData.datasets.push({ data: Array(processedChartData.labels.length).fill(0), color: PALETTE.chartLine2, strokeWidth: 2 });
                  }
            } else { console.warn("AdminDashboard: Invalid/missing userGrowthData in response."); }

            setSummaryData({
                totalSubscribers: data.totalSubscribers ?? 0, totalCoaches: data.totalCoaches ?? 0,
                pendingCoaches: data.pendingCoaches ?? 0, mealsToday: data.mealsToday ?? 0,
                plansCreated: data.plansCreated ?? 0, userGrowthData: processedChartData, 
                recentActivity: data.recentActivity || [],
            });
            console.log("AdminDashboard: State updated successfully.");

        } catch (err) {
            console.error("AdminDashboard: Fetch error:", err);
            setError(err.message || "Could not load dashboard data.");
            setSummaryData(prev => ({ ...prev, totalSubscribers: 0, totalCoaches: 0, pendingCoaches: 0, mealsToday: 0, plansCreated: 0, recentActivity: [], userGrowthData: EMPTY_CHART_DATA })); // Reset on error
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user, getIdToken]); 


    useEffect(() => { if (isFocused && user?.admin) { fetchAdminSummary(); } }, [isFocused, user, fetchAdminSummary]);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchAdminSummary(true); }, [fetchAdminSummary]);


     if (isLoading && !refreshing) {
         return (
             <View style={styles.screenContainer}>
                  <AdminHeader subtitle="Overview" />
                  <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>
                  <AdminTabNavigation />
             </View>
         );
     }

    if (error && !refreshing) {
         return (
             <View style={styles.screenContainer}>
                  <AdminHeader subtitle="Overview" />
                  <ScrollView contentContainerStyle={styles.errorContainer}>
                     <Ionicons name="cloud-offline-outline" size={60} color={PALETTE.errorRed} />
                     <Text style={styles.errorText}>{error}</Text>
                     <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                         <Text style={styles.retryButtonText}>Retry</Text>
                     </TouchableOpacity>
                 </ScrollView>
                 <AdminTabNavigation/>
             </View>
         );
     }

      const chartDataForRender = (
          summaryData.userGrowthData &&
          Array.isArray(summaryData.userGrowthData.labels) &&
          Array.isArray(summaryData.userGrowthData.datasets) &&
          summaryData.userGrowthData.datasets.length > 0 &&
          Array.isArray(summaryData.userGrowthData.datasets[0]?.data)
      ) ? summaryData.userGrowthData : EMPTY_CHART_DATA; 


    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Overview" />

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.darkGreen]} />}
            >
                <Text style={styles.sectionHeader}>Platform Statistics</Text>
               
                <View style={styles.statsCard}>
                  
                    <View style={styles.statRow}>
                        <View style={styles.statBox}>
                             <Ionicons name="people-circle-outline" size={30} color={PALETTE.darkGreen} />
                            <Text style={styles.statNumber}>{summaryData.totalSubscribers?.toLocaleString() || '0'}</Text>
                            <Text style={styles.statLabel}>Total Subscribers</Text>
                        </View>
                        <View style={styles.statBox}>
                             <Ionicons name="school-outline" size={30} color={PALETTE.darkGreen} />
                            <Text style={styles.statNumber}>{summaryData.totalCoaches?.toLocaleString() || '0'}</Text>
                            <Text style={styles.statLabel}>Verified Coaches</Text>
                        </View>
                    </View>
       
                     <View style={styles.statRow}>
                        <View style={styles.statBox}>
                             <Ionicons name="restaurant-outline" size={30} color={PALETTE.mediumGreen} />
                             <Text style={styles.statNumber}>{summaryData.mealsToday?.toLocaleString() || '0'}</Text>
                             <Text style={styles.statLabel}>Meals Logged Today</Text>
                         </View>
                         <View style={styles.statBox}>
                             <Ionicons name="document-text-outline" size={30} color={PALETTE.mediumGreen} />
                             <Text style={styles.statNumber}>{summaryData.plansCreated?.toLocaleString() || '0'}</Text>
                             <Text style={styles.statLabel}>Plans Created Total</Text>
                         </View>
                     </View>
           
                      <TouchableOpacity style={styles.pendingButton} onPress={() => navigation.navigate('AdminVerifyCoach')}>
                           <View style={styles.pendingButtonContent}>
                               <Text style={styles.pendingNumber}>{summaryData.pendingCoaches?.toLocaleString() || '0'}</Text>
                               <Text style={styles.pendingLabel}>Coaches Pending Verification</Text>
                           </View>
                          <Ionicons name="chevron-forward-outline" size={24} color={PALETTE.darkGreen}/>
                      </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Recent Activity</Text>
             
                <View style={styles.activityCard}>
                    {summaryData.recentActivity && summaryData.recentActivity.length > 0 ? (
                        summaryData.recentActivity.slice(0, 7).map((item, index, arr) => {
                            let activityTime = '';
                            if(item.timestamp?._seconds) { try {activityTime = formatDistanceToNow(new Date(item.timestamp._seconds * 1000), { addSuffix: true }); } catch(e){} }
                            return (
                           
                                <View key={item.id || `activity-${index}`} style={[styles.activityItem, index === arr.length - 1 && styles.activityItemLast]}>
                                    <Ionicons
                                        name={item.type === 'alert' ? "warning-outline" : item.type === 'pending' ? "hourglass-outline" : "information-circle-outline"}
                                        size={18}
                                        color={item.type === 'alert' ? PALETTE.errorRed : item.type === 'pending' ? PALETTE.pendingOrange : PALETTE.mediumGreen}
                                        style={styles.activityIcon}
                                    />
                                    <View style={styles.activityTextContainer}>
                                        <Text style={styles.activityText} numberOfLines={2}>{item.text}</Text>
                                        {activityTime && <Text style={styles.activityTime}>{activityTime}</Text>}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.noActivityText}>No recent activity.</Text>
                    )}
                </View>

            </ScrollView>
             <AdminTabNavigation/>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream },
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: PALETTE.lightCream },
    errorText: { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center', marginBottom: 15 },
    retryButton: { backgroundColor: PALETTE.darkGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    retryButtonText: { color: PALETTE.white, fontSize: 16, fontWeight: 'bold' },
    scrollContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 90 }, // Main padding
    sectionHeader: { fontSize: 20, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, marginBottom: 12, marginTop: 20, marginLeft: 5 }, // Section titles
    // Stats Section Card
    statsCard: { backgroundColor: PALETTE.lightOrange, borderRadius: 16, padding: 15, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 3, },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, },
    statBox: { backgroundColor: PALETTE.lightCream, paddingVertical: 15, paddingHorizontal: 5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '48%', minHeight: 115, elevation: 1, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 1, },
    statNumber: { fontSize: 26, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginVertical: 4, },
    statLabel: { fontSize: 13, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey, textAlign: 'center', marginTop: 5 },
    pendingButton: { backgroundColor: PALETTE.lightCream, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 5, flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2,},
    pendingButtonContent: { alignItems: 'center' },
    pendingNumber: { fontSize: 26, fontFamily: 'Quicksand_700Bold', color: PALETTE.pendingOrange, },
    pendingLabel: { fontSize: 14, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGrey, textAlign: 'center', marginTop: 5 },
    // Chart Section Card
    chartCard: { backgroundColor: PALETTE.lightOrange, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 10, marginBottom: 30, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 3, },
    chartStyle: { marginVertical: 8, borderRadius: 16 },
    chartPlaceholder: { alignItems: 'center', justifyContent: 'center', minHeight: 150, padding: 20 },
    chartPlaceholderText: { marginTop: 10, fontSize: 16, color: PALETTE.grey, fontWeight: '600' },
    errorTextSmall: { marginTop: 5, fontSize: 12, color: PALETTE.errorRed, textAlign: 'center'},
    // Activity Section Card
    activityCard: { backgroundColor: PALETTE.lightOrange, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 15, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 3, },
    activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: PALETTE.lightCream, backgroundColor: PALETTE.lightCream, borderRadius: 10, paddingHorizontal: 10, marginBottom: 8, },
    activityItemLast: { borderBottomWidth: 0, marginBottom: 0 }, // No border/margin on last item
    activityIcon: { marginRight: 15, width: 18 },
    activityTextContainer: { flex: 1},
    activityText: { fontSize: 14, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey, marginBottom: 3 },
    activityTime: { fontSize: 11, fontFamily: 'Quicksand_500Medium', color: PALETTE.grey },
    noActivityText: { fontStyle: 'italic', color: PALETTE.grey, textAlign: 'center', padding: 20 },
});