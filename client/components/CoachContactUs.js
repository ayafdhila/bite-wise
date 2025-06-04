
import React, { useState, useContext } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ProHeader from './ProHeader'; 
import ProTabNavigation from './ProTabNavigation';
import { AuthContext } from './AuthContext'; 

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF', buttonBorder: '#E0E0E0', };
const SIZES = { labelFont: 15, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, inputPaddingVertical: 12, inputPaddingHorizontal: 12, inputMarginBottom: 18, optionButtonBorderRadius: 20, };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

const CoachContactUs = () => {
    const navigation = useNavigation();
    const { user: coach, getIdToken } = useContext(AuthContext);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(''); 

    const handleSendMessage = async () => {
        setError(''); 
        if (message.trim().length < 10) {
            Alert.alert("Message Too Short", "Please provide a bit more detail in your message (at least 10 characters).");
            return;
        }
        if (!getIdToken) {
            Alert.alert("Error", "Authentication context is not available.");
            console.error("Error: getIdToken function is missing from AuthContext.");
            return;
        }

        setIsSending(true);
        let response;
        let responseBodyText = null;

        try {
            const token = await getIdToken();
            const coachUid = coach?.uid;
            if (!coachUid) { throw new Error("Coach UID is missing."); }

            const apiUrl = `${API_BASE_URL}/expert/feedback`; 
            const method = 'POST';
            console.log(`[Coach Feedback SEND] Attempting ${method} to ${apiUrl} for coach ${coachUid}`);

            response = await fetch(apiUrl, { 
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: message.trim(),
                    userId: coachUid,
                    userType: 'Professional' 
                }),
            });

            console.log(`[Coach Feedback] Received Response Status: ${response.status}`);

            try {
                 responseBodyText = await response.text();
                 console.log(`[Coach Feedback] Raw Response Body Text: ${responseBodyText.substring(0, 500)}`);
            } catch (readError) {
                 console.error("[Coach Feedback] CRITICAL ERROR reading response body:", readError);
                 throw new Error("Failed to read server response.");
            }

            if (!response.ok) {
                console.error(`[Coach Feedback API Error] Status: ${response.status}. Body: ${responseBodyText}`);
                let errorMessage = responseBodyText;
                try {
                    const jsonError = JSON.parse(responseBodyText);
                    errorMessage = jsonError.error || jsonError.message || responseBodyText;
                } catch (e) { errorMessage = responseBodyText || `Server responded with status ${response.status}`; }
            
                if (response.status === 404 && errorMessage.includes("Cannot POST")) {
                    errorMessage = "Could not find the feedback submission endpoint on the server. (404)";
                }
                throw new Error(errorMessage);
            }

       
            let result = {};
            try {
                result = JSON.parse(responseBodyText);
                console.log("[Coach Feedback] Backend success response parsed:", result);
            } catch (e) {
                console.warn("[Coach Feedback] Could not parse success response as JSON:", e, "Body was:", responseBodyText);

                result = { message: "Your message has been received!" };
            }

            Alert.alert("Thank you!", result.message); 
            setMessage('');
            navigation.goBack();

        } catch (error) {
            console.error("Error sending coach feedback (in catch block):", error);
            setError(error.message || "An unexpected error occurred.");
            Alert.alert("Error", `Could not send your message. ${error.message || "Please try again later."}`);
        } finally {
            console.log("[Coach Feedback] Finally block. Setting isSending to false.");
            setIsSending(false);
        }
    }; 

    return (
        <View style={styles.mainContainer}>
            <ProHeader
                subtitle="Contact Us"
                onBackPress={() => navigation.goBack()} 
            />
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.infoText}>
                    Your feedback helps us improve! Have a question or encountered an issue? Please describe it below.
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type your message here..."
                        placeholderTextColor={PALETTE.grey}
                        multiline={true}
                        numberOfLines={8}
                        value={message}
                        onChangeText={setMessage}
                        editable={!isSending}
                        textAlignVertical="top"
                    />
                    
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.button, isSending && styles.buttonDisabled]}
                        onPress={handleSendMessage}
                        disabled={isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={PALETTE.nextButtonText} />
                        ) : (
                            <Text style={styles.buttonText}>Send Message</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <ProTabNavigation />
        </View>
    );
};


const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, },
    scrollContainer: { flex: 1, },
    scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 40, },
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, marginBottom: SIZES.cardMarginBottom, padding: SIZES.cardPadding, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
    infoText: { fontSize: 14, color: PALETTE.darkGrey, marginBottom: 20, lineHeight: 20, textAlign: 'center', },
    textInput: { backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius / 2, borderWidth: 1, borderColor: PALETTE.buttonBorder, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: SIZES.inputPaddingVertical, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, minHeight: 150, marginBottom: SIZES.inputMarginBottom, textAlignVertical: 'top', },
    button: { backgroundColor: PALETTE.nextButtonBackground, paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'center', elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, minWidth: '60%', marginTop: 10, },
    buttonDisabled: { backgroundColor: PALETTE.grey, },
    buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontWeight: 'bold', },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginBottom: 10, fontSize: 14, },
});


export default CoachContactUs;
