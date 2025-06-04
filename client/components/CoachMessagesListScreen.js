import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, ActivityIndicator, TextInput, Platform
} from 'react-native';

import ProTabNavigation from '../components/ProTabNavigation'; 
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import { db } from '../firebaseConfig'; 
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"; 
import { Ionicons } from '@expo/vector-icons';
import ProHeader from './ProHeader';


const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', unreadBadge: '#FF6B6B'};


const formatChatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    try {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; }
};

export default function CoachMessagesListScreen() {
    const { user } = useContext(AuthContext); 
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');

    const coachId = user?.uid;

    useEffect(() => {
        if (!coachId) {
            console.log("MessagesList: No coach ID, cannot listen.");
            setConversations([]);
            setFilteredConversations([]);
            setIsLoading(false);
            return; 
        }

        console.log(`MessagesList: Setting up listener for coach ${coachId}`);
        setIsLoading(true);
        setError(null);

        const chatsRef = collection(db, 'chats');

        const q = query(
            chatsRef,
            where('participants', 'array-contains', coachId),
            orderBy('lastActivity', 'desc') 
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log(`MessagesList: Snapshot received ${querySnapshot.size} conversations.`);
            const fetchedConversations = querySnapshot.docs.map(doc => ({
                id: doc.id, 
                ...doc.data()
            }));
            setConversations(fetchedConversations);
       
            if (searchText === '') {
                setFilteredConversations(fetchedConversations);
            } else {
                 const lowerCaseSearch = searchText.toLowerCase();
                 setFilteredConversations(
                    fetchedConversations.filter(conv =>
                        conv.userDetails?.userName?.toLowerCase().includes(lowerCaseSearch)
                        
                    )
                 );
            }
            setIsLoading(false); 
        }, (err) => { 
            console.error("MessagesList: Firestore listener error:", err);
            setError("Failed to load messages. Please try again.");
            setIsLoading(false);
            setConversations([]);
            setFilteredConversations([]);
        });

       
        return () => {
            console.log("MessagesList: Unsubscribing listener.");
            unsubscribe();
        };

    }, [coachId, searchText]); 


    const renderConversationItem = ({ item }) => {
  
        const { userDetails, lastMessage, coachUnreadCount = 0 } = item;
        const userName = userDetails?.userName || 'Unknown User';
        const userPhotoUrl = userDetails?.userPhotoUrl;
        const lastMsgText = lastMessage?.text || 'No messages yet';
        const lastMsgTime = formatChatTimestamp(lastMessage?.timestamp); 

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    console.log(`Navigating to chat ${item.id} with user ${userDetails?.userId}`);
                    navigation.navigate('CoachClientChatScreen', { 
                        chatId: item.id,
                        clientId: userDetails?.userId, 
                        clientName: userName,          
                       
                    });
                }}
            >
                <Image
                    source={userPhotoUrl ? { uri: userPhotoUrl } : require('../assets/Images/DefaultProfile.png')}
                    style={styles.avatar}
                />
                <View style={styles.textContainer}>
                    <View style={styles.nameTimeRow}>
                        <Text style={styles.nameText}>{userName}</Text>
                        <Text style={styles.timeText}>{lastMsgTime}</Text>
                    </View>
                    <Text style={styles.messageSnippet} numberOfLines={1}>
                    
                        {lastMessage?.senderId === coachId ? "You: " : ""}{lastMsgText}
                    </Text>
                </View>
      
                {coachUnreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{coachUnreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <ProHeader subtitle={"Messages"} showBackButton={false} />

      
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={PALETTE.darkGrey} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search messages or clients..."
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

            {isLoading ? (
                <View style={styles.centeredMessage}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                </View>
            ) : error ? (
                <View style={styles.centeredMessage}>
                    <Text style={styles.errorText}>{error}</Text>
                  
                     <TouchableOpacity onPress={() => fetchInvitations()} style={styles.retryButton}>
                         <Text style={styles.retryButtonText}>Retry</Text>
                     </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderConversationItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.centeredMessage}>
                            <Text style={styles.emptyText}>
                                {searchText ? 'No results found.' : 'No messages yet.'}
                            </Text>
                        </View>
                    }
                   
                />
            )}

    
            <ProTabNavigation />
        </View>
    );
}


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
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        marginHorizontal: 20,
        marginVertical: 15,
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
        paddingBottom: 80, 
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 20,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30, 
        marginRight: 15,
        backgroundColor: PALETTE.lightCream, 
    },
    textContainer: {
        flex: 1, 
        justifyContent: 'center',
    },
    nameTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 18,
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.black,
    },
    timeText: {
        fontSize: 12,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_700Bold',
    },
    messageSnippet: {
        fontSize: 14,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_700Bold',
    },
    badgeContainer: {
        backgroundColor: PALETTE.unreadBadge || 'red', 
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10, 
        paddingHorizontal: 6,
    },
    badgeText: {
        color: PALETTE.white,
        fontSize: 12,
        fontFamily: 'Quicksand_700Bold',
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
        fontFamily: 'Quicksand_700Bold',
    },
});