import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Image,
    RefreshControl,
    Alert,
    Platform 
} from 'react-native';
import ProHeader from './ProHeader';
import ProTabNavigation from '../components/ProTabNavigation'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 


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
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Clients() {
    const { user, getIdToken } = useContext(AuthContext);
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [clients, setClients] = useState([]); 
    const [filteredClients, setFilteredClients] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchClients = useCallback(async (isRefresh = false) => {
        if (!user) {
            console.log("CoachClientsScreen: No coach logged in.");
            if (!isRefresh) setIsLoading(false);
            setRefreshing(false);
            setClients([]);
            setFilteredClients([]);
            return;
        }

        if (!isRefresh) setIsLoading(true);
        setError(null);

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication required.");

            console.log("CoachClientsScreen: Fetching client list...");
            const response = await fetch(`${API_BASE_URL}/coaching/coach/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = response.headers.get("content-type");
             if (!contentType || !contentType.includes("application/json")) {
                 const text = await response.text();
                 throw new Error(`Server error: ${response.status}. Response: ${text.substring(0, 100)}...`);
             }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to fetch clients.");

            const clientList = Array.isArray(data.clients) ? data.clients : [];
            console.log(`CoachClientsScreen: Received ${clientList.length} clients.`);
            setClients(clientList);
    
            if (searchText === '') {
                setFilteredClients(clientList);
            } else {
                const lowerCaseSearch = searchText.toLowerCase();
                setFilteredClients(
                     clientList.filter(client =>
                         `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase().includes(lowerCaseSearch)
                     )
                );
            }

        } catch (err) {
            console.error("CoachClientsScreen: Error fetching clients:", err);
            setError(err.message || "Could not load clients.");
            setClients([]); 
            setFilteredClients([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user, getIdToken, searchText]); 

    useEffect(() => {
        if (isFocused && user) {
            fetchClients();
        }
 
        if (!user) {
            setClients([]);
            setFilteredClients([]);
            setError(null);
        }
    }, [isFocused, user, fetchClients]);

    useEffect(() => {
        if (searchText === '') {
            setFilteredClients(clients); 
        } else {
            const lowerCaseSearch = searchText.toLowerCase();
            setFilteredClients(
                clients.filter(client =>
                    `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase().includes(lowerCaseSearch)
                    
                )
            );
        }
    }, [searchText, clients]); 


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchClients(true); 
    }, [fetchClients]);


  
    const renderClientItem = ({ item }) => {
        
        const fullName = `${item.firstName || 'Unknown'} ${item.lastName || 'User'}`;
     
        const imageUrl = item.profileImage || item.profileImageUrl;

        return (
            <TouchableOpacity
                style={styles.clientCard}
                onPress={() => {
                    console.log(`Navigating to details for client: ${item.id}`);
                    navigation.navigate('CoachClientDetails', { 
                        clientId: item.id,
                        clientName: fullName 
                    });
                }}
            >
                <Image
                    source={imageUrl ? { uri: imageUrl } : require('../assets/Images/DefaultProfile.png')} 
                    style={styles.clientAvatar}
                />
                <Text style={styles.clientName}>{fullName}</Text>
            </TouchableOpacity>
        );
    };


    return (
        <View style={styles.mainContainer}>
   
            <ProHeader subtitle={"My Clients"} showBackButton={false} /> 
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={PALETTE.darkGrey} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search clients..."
                    placeholderTextColor={PALETTE.grey}
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    clearButtonMode="while-editing" 
                />

                 {searchText.length > 0 && Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 5 }}>
                        <Ionicons name="close-circle" size={20} color={PALETTE.grey} />
                    </TouchableOpacity>
                )}
            </View>


            {isLoading && !refreshing ? ( 
                <View style={styles.centeredMessage}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                </View>
            ) : error ? ( 
                <View style={styles.centeredMessage}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => fetchClients()} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : ( 
                <FlatList
                    data={filteredClients}
                    renderItem={renderClientItem}
                    keyExtractor={(item) => item.id} 
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={ 
                        <View style={styles.centeredMessage}>
                            <Text style={styles.emptyText}>
                                {clients.length === 0 ? "You have no active clients yet." : "No clients match your search."}
                            </Text>
                        </View>
                    }
                    refreshControl={ 
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[PALETTE.darkGreen]} 
                            tintColor={PALETTE.darkGreen} 
                        />
                    }
                />
            )}

   
            <ProTabNavigation />
        </View>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream, // Main background color
    },
    loadingContainer: { // Reusable centered container
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PALETTE.lightCream,
    },
    centeredMessage: { // Used for Loading, Error, Empty states
        flex: 1, // Make it take space if list is empty
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50, // Give some space from search bar
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.lightOrange, // Tan background
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginHorizontal: 15,
        marginTop: 10, // Adjusted margin
        marginBottom: 15,
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
        paddingHorizontal: 20, // Padding for the sides of the list
        paddingBottom: 80, // Ensure space below list for tab nav
    },
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.lightOrange, // Tan card background
        borderRadius: 20,
        padding: 12,
        marginBottom: 12, // Space between cards
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    clientAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40, // Circular
        marginRight: 15,
        backgroundColor: PALETTE.lightCream, // Background while loading image or default
    },
    clientName: {
        fontSize: 20,
        fontFamily: 'Quicksand_700Bold', // Or use custom font
        color: PALETTE.black,
        flex: 1, // Allow text to wrap if needed
    },
    emptyText: {
        fontSize: 16,
        color: PALETTE.darkGrey,
        textAlign: 'center',
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
        fontFamily: 'Quicksand_700Bold', // Or custom font
    },
});