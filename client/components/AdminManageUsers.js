import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Platform, Image 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
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
    adminBlue: '#42A5F5', 
    coachOrange: '#FFB74D', 
    personalGreen: '#81C784', 
};

// --- API ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const USERS_ENDPOINT = `${API_BASE_URL}/admin/users`;
const TOGGLE_STATUS_ENDPOINT = (userId) => `${API_BASE_URL}/admin/users/${userId}/toggle-status`;
const DELETE_USER_ENDPOINT = (userId) => `${API_BASE_URL}/admin/users/${userId}`;

export default function AdminManageUsers() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user: adminUser, getIdToken } = useContext(AuthContext);

    // --- State ---
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('All'); // Add filter state

    const fetchUsers = useCallback(async (isRefresh = false) => {
        if (!adminUser?.admin) { return; }
        if (!isRefresh) setIsLoading(true); 
        setError(null); 
        setActionLoadingId(null);
        
        try {
            const token = await getIdToken(); 
            if (!token) throw new Error("Auth error");
            
            const response = await fetch(USERS_ENDPOINT, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const data = await response.json(); 
            if (!response.ok) throw new Error(data.error || "Failed fetch");
  
            const sortedUsers = (data.users || []).sort((a, b) => a.email?.localeCompare(b.email || ''));
            setUsers(sortedUsers);
            setFilteredUsers(sortedUsers); // ✅ Fixed: changed from sortedSortedUsers to sortedUsers
        } catch (err) { 
            console.error("AdminManageUsers: Fetch error:", err); 
            setError(err.message); 
            setUsers([]); 
            setFilteredUsers([]);
        } finally { 
            setIsLoading(false); 
            setRefreshing(false); 
        }
    }, [adminUser, getIdToken]);

    // Filter users based on selected filter
    useEffect(() => {
        let filtered = users;
        
        switch (selectedFilter) {
            case 'Personal':
                filtered = users.filter(user => user.userType === 'Personal');
                break;
            case 'Coach':
                filtered = users.filter(user => user.userType === 'Professional');
                break;
            case 'Admin':
                filtered = users.filter(user => user.userType === 'Admin' || user.isAdmin === true);
                break;
            case 'All':
            default:
                filtered = users;
                break;
        }
        
        setFilteredUsers(filtered);
    }, [users, selectedFilter]);

    useEffect(() => { 
        if (isFocused && adminUser?.admin) { 
            fetchUsers(); 
        } 
    }, [isFocused, adminUser, fetchUsers]);

    const onRefresh = useCallback(() => { 
        setRefreshing(true); 
        fetchUsers(true); 
    }, [fetchUsers]);

    const performUserAction = useCallback(async (userId, endpoint, method, body, successMsg, confirmTitle, confirmMsg) => {
        Alert.alert(confirmTitle, confirmMsg, [
            { text: "Cancel", style: "cancel", onPress: () => setActionLoadingId(null)},
            { text: confirmTitle.split(' ')[0], style: method === 'DELETE' ? "destructive" : "default", onPress: async () => {
                setActionLoadingId(userId); setError(null);
                try {
                    const token = await getIdToken(); if (!token) throw new Error("Auth error");
                    const options = { method, headers: { 'Authorization': `Bearer ${token}` }};
                    if (body) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
                    const response = await fetch(endpoint, options);
                    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Action failed");
                    Alert.alert("Success", successMsg);
                
                    setUsers(prevUsers => prevUsers.map(u => {
                        if (u.uid === userId) {
                            if (method === 'PATCH' && body?.hasOwnProperty('disabled')) return { ...u, authDisabled: body.disabled };
                            return u; 
                        }
                        return u;
                     }).filter(u => !(method === 'DELETE' && u.uid === userId)) 
                     );
                } catch (err) { console.error(`Error performing action ${method} on ${endpoint}:`, err); Alert.alert("Error", err.message || "Action failed"); setError(err.message); }
                finally { setActionLoadingId(null); }
             }}
        ]);
    }, [getIdToken]); 

    const handleToggleStatus = useCallback((userToToggle) => {
         if (!userToToggle?.uid) return;
         const targetStatus = !userToToggle.authDisabled; 
         const actionText = targetStatus ? "disable" : "enable";
         performUserAction(
             userToToggle.uid, TOGGLE_STATUS_ENDPOINT(userToToggle.uid), 'PATCH',
             { disabled: targetStatus },
             `User ${actionText}d successfully.`,
             `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User?`,
             `Are you sure you want to ${actionText} ${userToToggle.email}?`
         );
    }, [performUserAction]);

    const handleDeleteUser = useCallback((userToDelete) => {
         if (!userToDelete?.uid) return;
          performUserAction(
             userToDelete.uid, DELETE_USER_ENDPOINT(userToDelete.uid), 'DELETE', null,
             `User ${userToDelete.email} deleted.`, `Delete User?`,
             `PERMANENTLY DELETE user ${userToDelete.email}? This cannot be undone.`
         );
    }, [performUserAction]);

    const handleModifyUser = useCallback((user) => {
        navigation.navigate('AdminEditUser', { 
            userId: user.uid || user.id,
            userType: user.userType || (user.isAdmin ? 'Admin' : 'Unknown'), // Pass the user type
            userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email, // Optional: pass name for header
        });
    }, [navigation]);

    // Filter buttons component
    const renderFilterButtons = () => {
        const filters = ['All', 'Personal', 'Coach', 'Admin'];
        
        return (
            <View style={styles.filterContainer}>
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterButton,
                            selectedFilter === filter && styles.filterButtonActive
                        ]}
                        onPress={() => setSelectedFilter(filter)}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            selectedFilter === filter && styles.filterButtonTextActive
                        ]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderUserItem = ({ item }) => {
        const user = item;
        const isItemLoading = actionLoadingId === user.uid;
        const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || '(No Name Set)';
        const displayEmail = user.email || '(No Email)';

        let roleText = user.userType || 'Unknown';
        let roleStyle = styles.roleUnknown; 
        if (user.isAdmin === true || user.userType === 'Admin') { roleText = 'Admin'; roleStyle = styles.roleAdmin; }
        else if (user.userType === 'Professional') { roleText = 'Coach'; roleStyle = styles.roleCoach; }
        else if (user.userType === 'Personal') { roleText = 'Personal'; roleStyle = styles.rolePersonal; }

        let joinedDate = 'N/A';
        const timestamp = user.createdAt;
        if (timestamp) {
             try {
                 const dateObject = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
                 if (!isNaN(dateObject)) { 
                     joinedDate = format(dateObject, 'PP');
                 }
             } catch (e) { console.error("Date format error for user:", user.uid, e); }
        }

        const isDisabled = user.authDisabled === true;
        const statusText = isDisabled ? 'Disabled' : 'Active';
        const statusStyle = isDisabled ? styles.statusDisabled : styles.statusActive;

        const renderActionButtons = () => {
            if (user.userType === 'Admin' || user.isAdmin) {
                return (
                    <View style={styles.actionButtonsGroup}>
                        <TouchableOpacity
                            style={[styles.actionButtonBase, styles.modifyButton]}
                            onPress={() => handleModifyUser(user)}
                            disabled={isItemLoading}>
                            <Ionicons name="create-outline" size={16} color={PALETTE.white} />
                        </TouchableOpacity>
                    </View>
                ); 
            }
            if (user.userType === 'Professional' && user.isVerified !== true) {
                return (
                    <View style={styles.actionButtonsGroup}>
                        <TouchableOpacity
                            style={[styles.actionButtonBase, styles.verifyButton]}
                            onPress={() => navigation.navigate('AdminVerifyCoach', { focusCoachId: user.uid })}
                            disabled={isItemLoading} >
                            {isItemLoading ? <ActivityIndicator size="small" color={PALETTE.white} /> : <Text style={styles.actionButtonText}>Verify</Text>}
                        </TouchableOpacity>
                    </View>
                );
            }

            return (
                <View style={styles.actionButtonsGroup}>
                    <TouchableOpacity
                        style={[styles.actionButtonBase, styles.modifyButton]}
                        onPress={() => handleModifyUser(user)}
                        disabled={isItemLoading}>
                        <Ionicons name="create-outline" size={16} color={PALETTE.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButtonBase, styles.deleteButton]}
                        onPress={() => handleDeleteUser(user)}
                        disabled={isItemLoading}>
                        <Ionicons name="trash-outline" size={16} color={PALETTE.white} />
                    </TouchableOpacity>
                </View>
            );
        };

        return (
            <View style={styles.userCard}>
                <View style={styles.userInfoContainer}>
                    <Text style={styles.nameText}>{displayName}</Text>
                    <Text style={styles.emailText}>{displayEmail}</Text>
                    <View style={styles.detailRow}>
                         <Text style={[styles.roleText, roleStyle]}>{roleText}</Text>
                         <Text style={[styles.statusText, statusStyle]}>{statusText}</Text>
                         <Text style={styles.dateText}>Joined: {joinedDate}</Text>
                    </View>
                </View>
                <View style={styles.actionsContainer}>
                     {isItemLoading ? <ActivityIndicator color={PALETTE.darkGreen} /> : renderActionButtons()}
                 </View>
            </View>
        );
    };

    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Manage Users" />
            
            {/* Filter Section */}
            {renderFilterButtons()}
            
            {isLoading && !refreshing ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>
            ) : error ? (
                 <View style={styles.errorContainer}>
                     <Text style={styles.errorText}>{error}</Text>
                      <TouchableOpacity onPress={onRefresh} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity>
                 </View>
            ) : (
                <FlatList
                    data={filteredUsers} // Use filtered users instead of all users
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id || item.uid}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {selectedFilter === 'All' ? 'No users found.' : `No ${selectedFilter.toLowerCase()} users found.`}
                            </Text>
                        </View>
                    }
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
    listPadding: { padding: 15, paddingBottom: 90 }, 
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, color: PALETTE.darkGrey, fontStyle: 'italic' },

    // Updated Filter styles to match AdminFeedback
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

    userCard: {
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 15,
        padding: 15,
        marginBottom: 15, 
        elevation: 3, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
        flexDirection: 'row', 
        alignItems: 'center',
    },
    userInfoContainer: { 
        flex: 1,
        marginRight: 10, 
    },
    nameText: { fontSize: 16, fontFamily: 'Quicksand_700Bold', color: PALETTE.black, marginBottom: 3 },
    emailText: { fontSize: 13, color: PALETTE.darkGrey, marginBottom: 5, fontFamily: 'Quicksand_500Medium' },
    detailRow: { 
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap', 
        marginTop: 5,
    },
    roleText: {
        fontSize: 11, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 3,
        borderRadius: 5, overflow: 'hidden', 
        marginRight: 8, marginBottom: 3, 
        color: PALETTE.white, 
        textAlign: 'center',
    },
    rolePersonal: { backgroundColor: PALETTE.personalGreen },
    roleCoach: { backgroundColor: PALETTE.coachOrange },
    roleAdmin: { backgroundColor: PALETTE.adminBlue },
    roleUnknown: { backgroundColor: PALETTE.grey },
    statusText: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, overflow: 'hidden', marginRight: 8, marginBottom: 3, textAlign: 'center', },
    statusActive: { backgroundColor: PALETTE.successGreen, color: PALETTE.white },
    statusDisabled: { backgroundColor: PALETTE.rejectRed, color: PALETTE.white },
    statusTextAdmin: { 
        fontSize: 11, fontStyle: 'italic', color: PALETTE.darkGrey
    },
    dateText: { fontSize: 11, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', marginBottom: 3 },
  
    actionsContainer: {
         justifyContent: 'center',
    },
    actionButtonsGroup: { 
         flexDirection: 'row',
         justifyContent: 'flex-end', 
    },
    actionButtonBase: { 
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
        marginHorizontal: 3, 
        minHeight: 30, 
        justifyContent: 'center', alignItems: 'center',
        elevation: 1,
    },
    actionButtonText: { color: PALETTE.white, fontSize: 12, fontWeight: 'bold', fontFamily: 'Quicksand_600SemiBold' },
    verifyButton: { backgroundColor: PALETTE.mediumGreen, width: 80 }, 
    modifyButton: { backgroundColor: PALETTE.pendingOrange, paddingHorizontal: 8 }, // New modify button style
    enableButton: { backgroundColor: PALETTE.successGreen },
    disableButton: { backgroundColor: PALETTE.pendingOrange },
    deleteButton: { backgroundColor: PALETTE.errorRed, paddingHorizontal: 8 }, 
    buttonDisabled: { opacity: 0.5, backgroundColor: PALETTE.grey }, 
});