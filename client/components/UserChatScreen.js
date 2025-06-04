// screens/UserChatScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
    Image
} from 'react-native';
import Header from '../components/Header'; // Adjust path
// import TabNavigation from '../components/TabNavigation'; // Assuming user has different tabs
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; // Adjust path
import { db } from '../firebaseConfig'; // Adjust path
import {
    collection, query, orderBy, onSnapshot,
    addDoc, serverTimestamp, doc, updateDoc, FieldValue // Note: FieldValue won't work here
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';

// --- Palette (Use your app's palette) ---
const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', chatBubbleUser: '#88A76C', chatBubbleCoach: '#FCCF94', chatTextUser: '#FFFFFF', chatTextCoach: '#333333' };

// --- Helper to Format Time ---
const formatMessageTimestamp = (timestamp) => {
    if (!timestamp) return '';
    if (typeof timestamp.toDate === 'function') {
        try {
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { console.error("Error formatting Firestore timestamp:", e); return ''; }
    } else if (timestamp instanceof Date) {
         try { return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); } catch(e) { console.error("Error formatting Date object:", e); return ''; }
    }
    console.warn("Unrecognized timestamp format in formatMessageTimestamp:", timestamp);
    return '';
};


export default function UserChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken } = useContext(AuthContext); // PERSONAL User info

    // --- Get params passed from e.g. ActiveCoachDashboard ---
    // Expecting chatId, coachId, coachName
    const { chatId, coachId, coachName } = route.params || {};

    // --- State ---
    const [messages, setMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);

    const userId = user?.uid; // Current logged-in USER's ID
    const flatListRef = useRef();

    // --- Real-time Listener for Messages ---
    useEffect(() => {
        // Validate necessary IDs
        if (!chatId || !userId) {
            console.log("UserChatScreen: Missing chatId or userId, cannot listen.");
            setError(chatId ? "User information missing." : "Chat information missing.");
            setIsLoading(false);
            return;
        }
        if (!coachId) {
             console.warn("UserChatScreen: CoachID missing from route params. Sending messages will fail.");
             // Continue listening for reads, but sending needs coachId
        }

        console.log(`UserChatScreen: Setting up listener for chat ${chatId}`);
        setIsLoading(true);
        setError(null);

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc')); // Fetch newest first

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log(`UserChatScreen: Snapshot received ${querySnapshot.size} messages.`);
            const fetchedMessages = querySnapshot.docs.map(doc => ({
                _id: doc.id,
                text: doc.data().text,
                createdAt: doc.data().timestamp, // Keep Firestore timestamp
                senderId: doc.data().senderId
            }));
            setMessages(fetchedMessages);
            setIsLoading(false);

            // --- Mark Chat as Read for the USER ---
            if (fetchedMessages.length > 0 && fetchedMessages[0].senderId !== userId) {
                 const chatDocRef = doc(db, 'chats', chatId);
                 updateDoc(chatDocRef, { userUnreadCount: 0 }) // Reset USER's unread count
                    .then(() => console.log(`UserChatScreen: Marked chat ${chatId} as read for user.`))
                    .catch(err => console.error("UserChatScreen: Error marking chat as read:", err));
                 // Ensure rules allow user to update their own unread count
            }

        }, (err) => {
            console.error("UserChatScreen: Firestore listener error:", err);
            setError("Failed to load messages.");
            setIsLoading(false);
        });

        // Cleanup
        return () => {
             console.log("UserChatScreen: Unsubscribing message listener.");
             unsubscribe();
        };

    }, [chatId, userId]); // Dependencies

    // --- Send Message Handler ---
    const handleSend = useCallback(async () => {
        const textToSend = newMessageText.trim();
        // Check all required IDs
        if (!textToSend || !userId || !coachId || !chatId) {
            console.log("Send Message Error: Missing data", { textToSend, userId, coachId, chatId });
            if (!coachId) Alert.alert("Error", "Cannot send message. Coach information missing.");
            return;
        }

        setIsSending(true);
        setError(null);

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        // Ref to parent chat doc needed ONLY if updating via client (not recommended)
        // const chatDocRef = doc(db, 'chats', chatId);

        try {
            // Prepare message data with correct sender/receiver
            const messageData = {
                senderId: userId,   // USER is sending
                receiverId: coachId, // COACH is receiving
                text: textToSend,
                timestamp: serverTimestamp(),
            };

            // *** ONLY add the message document ***
            await addDoc(messagesRef, messageData);
            console.log(`UserChatScreen: Message sent by user ${userId}.`);

            setNewMessageText(''); // Clear input

            // --- REMOVED client-side updateDoc for parent chat metadata ---
            // --- Let Cloud Function handle updating lastMessage, lastActivity, ---
            // --- and coachUnreadCount ---

        } catch (err) {
            console.error("UserChatScreen: Error sending message:", err);
             if (err.code === 'permission-denied') {
                 Alert.alert("Error", "You do not have permission to send messages in this chat.");
            } else {
                Alert.alert("Error", "Could not send message. Please try again.");
            }
            setError("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    }, [newMessageText, userId, coachId, chatId]); // Dependencies

    // --- Render Function for Message Item ---
    const renderMessageItem = ({ item }) => {
        // Check if message was sent by the currently logged-in USER
        const isMyMessage = item.senderId === userId;

        return (
            <View style={[ styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow ]}>
                <View style={[ styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble ]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
                        {item.text}
                    </Text>
                    <Text style={[ styles.messageTime, isMyMessage ? styles.myMessageTime : styles.theirMessageTime ]}>
                        {formatMessageTimestamp(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    // --- Main Render ---
    return (
        <KeyboardAvoidingView
        
            style={styles.screenContainer}
          
        >
            {/* Use coachName received from params */}
            <Header subtitle={coachName || "Chat"} showBackButton={true} navigation={navigation} />

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
                        inverted // Standard chat display
                        contentContainerStyle={styles.messagesListContent}
                    />
                )}
            </View>

            {/* Input Area */}
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
                    disabled={isSending || newMessageText.trim().length === 0 || !coachId /* Disable if coachId missing */}
                >
                    {isSending ? (
                         <ActivityIndicator size="small" color={PALETTE.white} />
                    ) : (
                         <Ionicons name="arrow-forward-circle" size={32} color={PALETTE.white} />
                    )}
                </TouchableOpacity>
            </View>
             {/* Include user's TabNavigation if needed */}
             {/* <TabNavigation /> */}
        </KeyboardAvoidingView>
    );
}

// --- Styles (Use styles consistent with CoachClientChatScreen, adjusting bubble colors) ---
const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
  chatContainer: { flex: 1 },
  centeredMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: PALETTE.errorRed, textAlign: 'center' },
  messagesListContent: { paddingVertical: 10, paddingHorizontal: 10 },
  messageRow: { flexDirection: 'row', marginVertical: 5 },
  // --- Style Alignment Based on Sender (User is 'my') ---
  myMessageRow: { justifyContent: 'flex-end' }, // User's message aligns right
  theirMessageRow: { justifyContent: 'flex-start' }, // Coach's message aligns left
  // --- Bubble Styles ---
  messageBubble: { maxWidth: '80%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  myMessageBubble: { backgroundColor: PALETTE.chatBubbleUser, borderBottomRightRadius: 5 }, // User's bubble style (e.g., Green)
  theirMessageBubble: { backgroundColor: PALETTE.chatBubbleCoach, borderBottomLeftRadius: 5 }, // Coach's bubble style (e.g., Tan)
  // --- Text Styles ---
  myMessageText: { color: PALETTE.chatTextUser, fontSize:17, fontFamily: 'Quicksand_700Bold', }, // Text in User's bubble
  theirMessageText: { color: PALETTE.chatTextCoach, fontSize: 17, fontFamily: 'Quicksand_700Bold', }, // Text in Coach's bubble
  // --- Timestamp Styles ---
  messageTime: { fontSize: 10, marginTop: 4 },
  myMessageTime: { color: PALETTE.white, alignSelf: 'flex-end' }, // Time in User's bubble
  theirMessageTime: { color: PALETTE.darkGrey, alignSelf: 'flex-end' }, // Time in Coach's bubble
  // --- Input Area Styles ---
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: PALETTE.grey, backgroundColor: PALETTE.mediumGreen /* Or user's theme color */ },
  textInput: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: PALETTE.white, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10 },
  sendButton: { backgroundColor: PALETTE.darkGreen, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: PALETTE.grey },
});

// --- END OF FILE UserChatScreen.js ---