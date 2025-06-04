import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from './AuthContext'; 
import Header from './Header'; 

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL 
const CHATBOT_ENDPOINT = `${API_BASE_URL}/chatbot/message`; 

console.log("Chatbot API Endpoint:", CHATBOT_ENDPOINT); 

export default function ChatbotScreen({ navigation }) {

    const { user, getIdToken } = useContext(AuthContext); 
    const [messages, setMessages] = useState([

        { _id: Math.random().toString(), text: "Hey! How can i help you?", createdAt: new Date(), sender: 'bot' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const flatListRef = useRef(null); 

    const handleSend = useCallback(async () => {
        const userMessageText = inputText.trim();
        if (userMessageText === '') {
            return; 
        }

  
        if (!user) {
            console.error("handleSend Error: User profile not available in AuthContext.");
            setMessages(previousMessages => [...previousMessages, {
                 _id: Math.random().toString(),
                 text: "Erreur: Données utilisateur non chargées. Veuillez patienter ou vous reconnecter.",
                 createdAt: new Date(),
                 sender: 'bot',
                 isError: true
            }]);
            setIsLoading(false);
            return;
        }

        const userMessage = {
            _id: Math.random().toString(), 
            text: userMessageText,
            createdAt: new Date(),
            sender: 'user' 
        };
        setMessages(previousMessages => [...previousMessages, userMessage]);
        setInputText(''); 
        setIsLoading(true); 

      
        let idToken = null;
        try {

            console.log("[handleSend] Attempting to get Firebase ID token via context function...");
            idToken = await getIdToken(); 

            if (!idToken) {
        
                throw new Error("Impossible de récupérer le token d'authentification via le contexte.");
            }
            console.log("[handleSend] Firebase ID token obtained via context successfully.");


            console.log(`[handleSend] Sending POST to backend (${CHATBOT_ENDPOINT})`);
            const response = await axios.post(
                CHATBOT_ENDPOINT,
                {
                    message: userMessageText,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 20000
                }
            );

            console.log("[handleSend] Backend response received:", response.data);

            if (response.data && response.data.reply) {
                const botMessage = {
                    _id: Math.random().toString(),
                    text: response.data.reply,
                    createdAt: new Date(),
                    sender: 'bot'
                };
                setMessages(previousMessages => [...previousMessages, botMessage]);
            } else {
                console.error("[handleSend] Invalid response structure from server:", response.data);
                throw new Error("Réponse invalide ou mal formatée du serveur.");
            }

        } catch (error) {
       
            let displayErrorMessage = "Désolé, une erreur s'est produite. Veuillez réessayer.";

         
            if (!idToken && error.message.includes('token')) {
                 console.error("[handleSend] Error fetching Firebase ID token via context:", error);
                 displayErrorMessage = "Erreur d'authentification. Impossible de vérifier l'utilisateur.";
            } else if (axios.isAxiosError(error)) {
                console.error("[handleSend] Axios API Call Error:", error.message);
                if (error.response) {
                    console.error("[handleSend] API Error Status:", error.response.status);
                    console.error("[handleSend] API Error Data:", error.response.data);
                    if (error.response.status === 401) {
                        displayErrorMessage = "Session expirée ou invalide. Veuillez vous reconnecter.";
                    } else if (error.response.status === 400) {
                        displayErrorMessage = `Erreur de requête: ${error.response.data?.error || 'Données invalides.'}`;
                    } else if (error.response.status >= 500) {
                         displayErrorMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
                    } else {
                        displayErrorMessage = `Erreur de communication (${error.response.status}).`;
                    }
                } else if (error.request) {
                    console.error('[handleSend] Network Error or No Response:', error.request);
                    displayErrorMessage = "Erreur de réseau. Vérifiez votre connexion internet.";
                } else {
                    console.error('[handleSend] Request Setup Error:', error.message);
                    displayErrorMessage = "Erreur lors de la préparation de la requête.";
                }
            } else {
                 console.error("[handleSend] Non-Axios Error:", error.message);
                 displayErrorMessage = error.message; 
            }

         
            const errorMessage = {
                 _id: Math.random().toString(),
                 text: displayErrorMessage,
                 createdAt: new Date(),
                 sender: 'bot',
                 isError: true
            };
            setMessages(previousMessages => [...previousMessages, errorMessage]);

        } finally {
            setIsLoading(false);
            console.log("[handleSend] Request finished.");
        }

    }, [inputText, user, getIdToken]); 

    
    useEffect(() => {
        if (flatListRef.current) {
             flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

   
    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubbleContainer,
                isUser ? styles.userMessageContainer : styles.botMessageContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userMessageBubble : styles.botMessageBubble,
                    item.isError ? styles.errorMessageBubble : {}
                ]}>
                    <Text style={isUser ? styles.userMessageText : styles.botMessageText}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <Header subtitle="ChatBot" showBackButton={true} onBackPress={() => navigation.goBack()} />
            <KeyboardAvoidingView
              
                style={{ flex: 1 }}
                
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item._id}
                    style={styles.messageList}
                    contentContainerStyle={{ paddingBottom: 10 }}
                />
                {isLoading && (
                    <View style={styles.loadingIndicator}>
                        <ActivityIndicator size="small" color="#2e4a32" />
                         <Text style={styles.typingText}>Bot is typing...</Text>
                    </View>
                )}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type your message"
                        placeholderTextColor="#A0A0A0"
                        multiline
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        style={styles.sendButton}
                        disabled={isLoading || inputText.trim() === ''}
                    >
                        <Ionicons
                            name="send"
                            size={24}
                            color={isLoading || inputText.trim() === '' ? "#B0B0B0" : "#FFFFFF"}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5E4C3',
    
    },
    messageList: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10, 
    },
    messageBubbleContainer: {
        marginVertical: 5,
        maxWidth: '80%',
    },
    userMessageContainer: {
        alignSelf: 'flex-end',
    },
    botMessageContainer: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    userMessageBubble: {
        backgroundColor: '#FCCF94',
    },
    botMessageBubble: {
        backgroundColor: '#88A76C',
    },
     errorMessageBubble: {
        backgroundColor: '#FFDEDE',
        borderColor: '#D8000C',
        borderWidth: 1,
     },
    userMessageText: {
        color: '#000000',
        fontSize: 17,
        fontFamily: 'Quicksand_600SemiBold'
    },
    botMessageText: {
        color: '#000000',
        fontSize: 17,
        fontFamily: 'Quicksand_600SemiBold'
    },
     loadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    typingText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        backgroundColor: '#88A76C',
       
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: '#F5E4C3',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#2e4a32',
        borderRadius: 25,
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
});