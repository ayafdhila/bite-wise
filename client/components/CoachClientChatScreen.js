import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
    Image 
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import { db } from '../firebaseConfig'; 
import {
    collection, query, orderBy, onSnapshot,
    addDoc, serverTimestamp, 
    doc, updateDoc 
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import ProHeader from './ProHeader';

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', chatBubbleCoach: '#88A76C', chatBubbleUser: '#FCCF94', chatTextCoach: '#FFFFFF', chatTextUser: '#333333' };

const formatMessageTimestamp = (timestamp) => {
    if (!timestamp) return '';
    if (typeof timestamp.toDate === 'function') { 
        try {
            const date = timestamp.toDate(); 
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { console.error("Error formatting Firestore timestamp:", e); return ''; }
    } else if (timestamp instanceof Date) { 
         try {
             return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
         } catch(e) { console.error("Error formatting Date object:", e); return ''; }
    }
    console.warn("Unrecognized timestamp format in formatMessageTimestamp:", timestamp);
    return ''; 
};


export default function CoachClientChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken } = useContext(AuthContext); 

    const { chatId, clientId, clientName } = route.params || {};

    const [messages, setMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);

    const coachId = user?.uid;
    const flatListRef = useRef();

    useEffect(() => {
        if (!chatId || !coachId) {
            console.log("CoachChatScreen: Missing chatId or coachId, cannot listen.");
            setError("Chat information missing.");
            setIsLoading(false);
            return;
        }

        console.log(`CoachChatScreen: Setting up listener for chat ${chatId}`);
        setIsLoading(true);
        setError(null);

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc')); 

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log(`CoachChatScreen: Snapshot received ${querySnapshot.size} messages.`);
            const fetchedMessages = querySnapshot.docs.map(doc => ({
                _id: doc.id,
                text: doc.data().text,
                createdAt: doc.data().timestamp, 
                senderId: doc.data().senderId
            }));
            setMessages(fetchedMessages);
            setIsLoading(false);

            if (fetchedMessages.length > 0 && fetchedMessages[0].senderId !== coachId) {
                 const chatDocRef = doc(db, 'chats', chatId);
                 updateDoc(chatDocRef, { coachUnreadCount: 0 }) 
                    .then(() => console.log(`CoachChatScreen: Marked chat ${chatId} as read for coach.`))
                    .catch(err => console.error("CoachChatScreen: Error marking chat as read:", err));
               
            }

        }, (err) => {
            console.error("CoachChatScreen: Firestore listener error:", err);
            setError("Failed to load messages.");
            setIsLoading(false);
        });

        return () => {
             console.log("CoachChatScreen: Unsubscribing message listener.");
             unsubscribe();
        };

    }, [chatId, coachId]); 
    
    const handleSend = useCallback(async () => {
        const textToSend = newMessageText.trim();
        if (!textToSend || !coachId || !clientId || !chatId) {
            console.log("Send Message Error: Missing data", { textToSend, coachId, clientId, chatId });
            return;
        }

        setIsSending(true);
        setError(null);

        const messagesRef = collection(db, 'chats', chatId, 'messages');

        try {
        
            const messageData = {
                senderId: coachId,
                receiverId: clientId,
                text: textToSend,
                timestamp: serverTimestamp(), 
            };

            await addDoc(messagesRef, messageData);
            console.log(`CoachChatScreen: Message sent by coach ${coachId}.`);

            setNewMessageText(''); 


        } catch (err) {
            console.error("CoachChatScreen: Error sending message:", err);
   
            if (err.code === 'permission-denied') {
                 Alert.alert("Error", "You do not have permission to send messages in this chat.");
            } else {
                Alert.alert("Error", "Could not send message. Please try again.");
            }
            setError("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    }, [newMessageText, coachId, clientId, chatId]); 

    const renderMessageItem = ({ item }) => {
        const isMyMessage = item.senderId === coachId;

        return (
            <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
                <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
                        {item.text}
                    </Text>
                    <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.theirMessageTime]}>
                
                        {formatMessageTimestamp(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    
    return (
        <KeyboardAvoidingView
           
            style={styles.screenContainer}
           
        >

            <ProHeader subtitle={clientName || "Chat"} showBackButton={true} navigation={navigation} />

            <View style={styles.chatContainer}>
                {isLoading ? (
                    <View style={styles.centeredMessage}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>
                ) : error ? (
                     <View style={styles.centeredMessage}><Text style={styles.errorText}>{error}</Text></View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessageItem}
                        keyExtractor={(item) => item._id}
                        inverted 
                        contentContainerStyle={styles.messagesListContent}
                    />
                )}
            </View>


            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    placeholderTextColor={PALETTE.grey}
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={isSending || newMessageText.trim().length === 0}
                >
                    {isSending ? (
                         <ActivityIndicator size="small" color={PALETTE.white} />
                    ) : (
                         <Ionicons name="arrow-forward-circle" size={32} color={PALETTE.white} />
                    )}
                </TouchableOpacity>
            </View>
          
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({

    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    chatContainer: { flex: 1 },
    centeredMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center' },
    messagesListContent: { paddingVertical: 10, paddingHorizontal: 10 },
    messageRow: { flexDirection: 'row', marginVertical: 5 },
    myMessageRow: { justifyContent: 'flex-end' },
    theirMessageRow: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '80%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
    myMessageBubble: { backgroundColor: PALETTE.mediumGreen, borderBottomRightRadius: 5 },
    theirMessageBubble: { backgroundColor: PALETTE.lightOrange, borderBottomLeftRadius: 5 },
    myMessageText: { color: PALETTE.chatTextCoach || PALETTE.white, fontSize: 17, fontFamily: 'Quicksand_700Bold', },
    theirMessageText: { color: PALETTE.chatTextUser || PALETTE.darkGrey, fontSize: 17, fontFamily: 'Quicksand_700Bold', },
    messageTime: { fontSize: 10, marginTop: 4 },
    myMessageTime: { color: PALETTE.lightCream, alignSelf: 'flex-end' },
    theirMessageTime: { color: PALETTE.darkGrey, alignSelf: 'flex-end' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: PALETTE.grey, backgroundColor: PALETTE.mediumGreen },
    textInput: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: PALETTE.white, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10 },
    sendButton: { backgroundColor: PALETTE.darkGreen, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: PALETTE.grey },
});