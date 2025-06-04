import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Platform 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import AdminHeader from '../components/AdminHeader'; 
import { Ionicons } from '@expo/vector-icons';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
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
    readBlue: '#2196F3',
    archivedGrey: '#757575', 
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const FEEDBACK_ENDPOINT = `${API_BASE_URL}/admin/feedbacks`;
const UPDATE_STATUS_ENDPOINT = (id) => `${API_BASE_URL}/admin/feedbacks/${id}/status`;
const DELETE_FEEDBACK_ENDPOINT = (id) => `${API_BASE_URL}/admin/feedbacks/${id}`;

const FEEDBACK_STATUSES = ['New', 'Read', 'Archived'];

export default function AdminFeedback() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, getIdToken } = useContext(AuthContext);

    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [filterStatus, setFilterStatus] = useState('New'); 
    const [actionLoadingId, setActionLoadingId] = useState(null); 

   
    const fetchFeedbacks = useCallback(async (isRefresh = false, status = filterStatus) => {
        if (!user?.admin) { setError("Unauthorized"); setIsLoading(false); setRefreshing(false); return; }
        if (!isRefresh) setIsLoading(true);
        setError(null); setActionLoadingId(null); 
        console.log(`AdminFeedback: Fetching feedbacks with status: ${status}`);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth error");
            const url = status === 'All' ? FEEDBACK_ENDPOINT : `${FEEDBACK_ENDPOINT}?status=${status}`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { const txt = await response.text(); throw new Error(`Non-JSON: ${txt.substring(0,150)}`); }
            const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed fetch");
            console.log(`AdminFeedback: Received ${data.feedbacks?.length || 0} feedbacks.`);
            setFeedbacks(data.feedbacks || []);
        } catch (err) { console.error("AdminFeedback: Fetch error:", err); setError(err.message); setFeedbacks([]); }
        finally { setIsLoading(false); setRefreshing(false); }
    }, [user, getIdToken, filterStatus]);


    useEffect(() => { if (isFocused && user?.admin) { fetchFeedbacks(); } }, [isFocused, user, fetchFeedbacks]); // fetchFeedbacks includes filterStatus


    const onRefresh = useCallback(() => { setRefreshing(true); fetchFeedbacks(true); }, [fetchFeedbacks]);


    const handleChangeStatus = useCallback(async (feedbackId, newStatus) => {
        setActionLoadingId(feedbackId); setError(null);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth error.");
            const response = await fetch(UPDATE_STATUS_ENDPOINT(feedbackId), {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || "Failed update");
            Alert.alert("Success", `Feedback marked as ${newStatus}.`);

            setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? {...fb, status: newStatus, lastUpdatedAt: new Date().toISOString()} : fb)); // Example local update
    

        } catch(err) { console.error("Error changing status:", err); Alert.alert("Error", err.message || "Failed update"); setError(err.message); }
        finally { setActionLoadingId(null); }
    }, [getIdToken]); 



    const handleDelete = useCallback((feedbackId, senderInfo) => {
        Alert.alert("Delete Feedback?", `Permanently delete feedback from ${senderInfo}? This cannot be undone.`, [
             { text: "Cancel", style: "cancel"},
             { text: "Delete", style: "destructive", onPress: async () => {
                 setActionLoadingId(feedbackId); setError(null);
                 try {
                      const token = await getIdToken(); if (!token) throw new Error("Auth error.");
                      const response = await fetch(DELETE_FEEDBACK_ENDPOINT(feedbackId), {
                           method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                      });
                      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Delete failed");
                      Alert.alert("Success", "Feedback deleted.");
                      setFeedbacks(prev => prev.filter(fb => fb.id !== feedbackId)); // Remove from list locally
                 } catch(err) { console.error("Error deleting:", err); Alert.alert("Error", err.message || "Delete failed"); setError(err.message); }
                 finally { setActionLoadingId(null); }
             }}
        ]);
    }, [getIdToken]);



    const renderFeedbackItem = ({ item }) => {
        const feedback = item;
        const isItemLoading = actionLoadingId === feedback.id;
        const senderName = `${feedback.senderFirstName || ''} ${feedback.senderLastName || ''}`.trim();
        const senderDisplay = senderName || feedback.senderEmail || 'Unknown User';
        const senderInfo = `${senderDisplay} (${feedback.userType || 'User'})`;

        let relativeTime = 'Date unknown';
 
        const timestampSource = feedback.createdAt || feedback.submittedAt;
        if (timestampSource?._seconds) {
             try { relativeTime = formatDistanceToNow(new Date(timestampSource._seconds * 1000), { addSuffix: true }); }
             catch (e) { console.warn("Date format error for feedback:", feedback.id); }
        }


        let nextStatusAction = null;
        switch (feedback.status) {
             case 'New': nextStatusAction = { label: 'Mark Read', status: 'Read', style: styles.markReadButton }; break;
             case 'Read': nextStatusAction = { label: 'Archive', status: 'Archived', style: styles.archiveButton }; break;

        }

        return (
       
            <View style={styles.feedbackItemCard}>
    
                <View style={styles.feedbackHeader}>
                     <Text style={styles.senderInfo} numberOfLines={1}>{senderInfo}</Text>
                     <Text style={styles.feedbackDate}>{relativeTime}</Text>
                </View>

                <Text style={styles.feedbackMessage} numberOfLines={4}>
                    {feedback.message || '(No message content)'}
                </Text>

                <View style={styles.feedbackFooter}>
                     <View style={styles.statusDisplay}>
                        <Text style={styles.statusLabel}>Status:</Text>
                        <Text style={[styles.statusText, styles[`status${feedback.status}`]]}>{feedback.status || 'N/A'}</Text>
                    </View>
     
                    <View style={styles.actionButtonsGroup}>
            
                        <TouchableOpacity
                            style={[styles.actionButtonBase, styles.detailsButton]}
                            onPress={() => Alert.alert(senderDisplay, feedback.message)} 
                            disabled={isItemLoading}>
                            <Ionicons name="eye-outline" size={18} color={PALETTE.white} />
                        </TouchableOpacity>

                        {nextStatusAction && (
                            <TouchableOpacity
                                style={[styles.actionButtonBase, nextStatusAction.style, isItemLoading && styles.buttonDisabled]}
                                onPress={() => handleChangeStatus(feedback.id, nextStatusAction.status)}
                                disabled={isItemLoading}>
                                {actionLoadingId === feedback.id ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Text style={styles.actionButtonText}>{nextStatusAction.label}</Text>}
                            </TouchableOpacity>
                        )}

                         <TouchableOpacity
                             style={[styles.actionButtonBase, styles.deleteButton, isItemLoading && styles.buttonDisabled]}
                             onPress={() => handleDelete(feedback.id, senderDisplay)}
                             disabled={isItemLoading}>
                              {actionLoadingId === feedback.id ? <ActivityIndicator size="small" color={PALETTE.white}/> : <Ionicons name="trash-outline" size={18} color={PALETTE.white} />}
                         </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderFilterButtons = () => (
        <View style={styles.filterContainer}>
            {['All', ...FEEDBACK_STATUSES].map(status => (
                <TouchableOpacity
                    key={status}
                    style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
                    onPress={() => { setFilterStatus(status); fetchFeedbacks(false, status); }} 
                >
                    <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>{status}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );


    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Manage Feedback" />
            {renderFilterButtons()} 
            {isLoading ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>
            ) : error ? (
                 <View style={styles.errorContainer}>
                     <Text style={styles.errorText}>{error}</Text>
                     <TouchableOpacity onPress={() => fetchFeedbacks()} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity>
                 </View>
            ) : (
                <FlatList
                    data={feedbacks}
                    renderItem={renderFeedbackItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No feedback entries found{filterStatus !== 'All' ? ` with status "${filterStatus}"` : ''}.</Text></View>}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.darkGreen]} />}
                />
            )}
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
    filterContainer: { 
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: PALETTE.darkGreen, 
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.grey,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 15,
        backgroundColor: PALETTE.lightCream, 
    },
    filterButtonActive: {
        backgroundColor: PALETTE.mediumGreen, 
    },
    filterButtonText: {
        fontSize: 13,
        color: PALETTE.darkGrey,
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: PALETTE.white, 
    },
    listContainer: { padding: 15, paddingBottom: 90 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, color: PALETTE.darkGrey, fontStyle: 'italic' },

    feedbackItemCard: {
        backgroundColor: PALETTE.lightOrange,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 2, shadowColor: PALETTE.black, shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2,
    },
    feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
    senderInfo: { fontSize: 15, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, flexShrink: 1, marginRight: 10 },
    feedbackDate: { fontSize: 12, color: PALETTE.grey, fontFamily: 'Quicksand_500Medium' },
    feedbackMessage: { fontSize: 14, color: PALETTE.darkGrey, lineHeight: 20, marginBottom: 12, fontFamily: 'Quicksand_500Medium' },

    feedbackFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: PALETTE.lightCream, 
    },
    statusDisplay: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 10 }, 
    statusLabel: { fontSize: 12, color: PALETTE.grey, marginRight: 4, fontFamily: 'Quicksand_500Medium' },
    statusText: { fontSize: 12, fontWeight: '600', fontFamily: 'Quicksand_600SemiBold' }, 

    statusNew: { color: PALETTE.pendingOrange },
    statusRead: { color: PALETTE.readBlue },
    statusArchived: { color: PALETTE.archivedGrey },
    statusResolved: { color: PALETTE.successGreen },

    actionButtonsGroup: { flexDirection: 'row', alignItems: 'center', },
    actionButtonBase: { 
        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
        marginLeft: 6, 
        justifyContent: 'center', alignItems: 'center', minHeight: 30, 
    },
    actionButtonText: { color: PALETTE.white, fontSize: 11, fontWeight: 'bold', fontFamily: 'Quicksand_700Bold' }, 
    detailsButton: { backgroundColor: PALETTE.mediumGreen },
    markReadButton: { backgroundColor: PALETTE.darkGreen }, 
    archiveButton: { backgroundColor: PALETTE.archivedGrey }, 

    deleteButton: { backgroundColor: PALETTE.rejectRed, paddingHorizontal: 8 }, 
    buttonDisabled: { opacity: 0.5, backgroundColor: PALETTE.grey }, 
});