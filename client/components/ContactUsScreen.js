import React, { useState, useContext } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from './Header';         
import TabNavigation from './TabNavigation'; 
import { AuthContext } from './AuthContext';

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF', buttonBorder: '#E0E0E0', };
const SIZES = { labelFont: 15, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, inputPaddingVertical: 12, inputPaddingHorizontal: 12, inputMarginBottom: 18, optionButtonBorderRadius: 20, };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

const ContactUsScreen = () => {
    const navigation = useNavigation();
    const { user, getIdToken } = useContext(AuthContext); 
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSendMessage = async () => {
        setError(''); 
        if (message.trim().length < 10) {
            Alert.alert("Message Too Short", "Please provide a bit more detail (at least 10 characters).");
            return;
        }
        if (!getIdToken) {
            Alert.alert("Error", "Authentication context unavailable.");
            console.error("Error: getIdToken missing from AuthContext.");
            return;
        }

        setIsSending(true);
        let response;
        let responseBodyText = null;

        try {
            const token = await getIdToken();
            const userId = user?.uid; 
            if (!userId) { throw new Error("User UID is missing."); }

            const apiUrl = `${API_BASE_URL}/user/feedback`; 
            const method = 'POST';
            console.log(`[User Feedback SEND] Attempting ${method} to ${apiUrl} for user ${userId}`);

            response = await fetch(apiUrl, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: message.trim(),
                    userId: userId, 
                }),
            });

            console.log(`[User Feedback] Received Response Status: ${response.status}`);

            try {
                 responseBodyText = await response.text();
                 console.log(`[User Feedback] Raw Response Body Text: ${responseBodyText.substring(0, 500)}`);
            } catch (readError) {
                 console.error("[User Feedback] CRITICAL ERROR reading response body:", readError);
                 throw new Error("Failed to read response body.");
            }

            if (!response.ok) {
                console.error(`[User Feedback API Error] Status: ${response.status}. Body: ${responseBodyText}`);
                let errorMessage = responseBodyText;
                try {
                    const jsonError = JSON.parse(responseBodyText);
                    errorMessage = jsonError.error || jsonError.message || responseBodyText;
                } catch (e) { errorMessage = responseBodyText || `Server responded with status ${response.status}`; }
                throw new Error(errorMessage);
            }

            // Succès
            let result = {};
            try {
                result = JSON.parse(responseBodyText);
                console.log("[User Feedback] Backend success response parsed:", result);
            } catch (e) {
                console.error("[User Feedback] Failed to parse SUCCESS response JSON:", e, "Body was:", responseBodyText);
                throw new Error("Received an invalid success response from the server.");
            }

            Alert.alert("Thank you!", result.message || "Your message has been received!");
            setMessage('');
            navigation.goBack();

        } catch (error) {
            console.error("Error sending user feedback:", error);
            setError(error.message || "An unexpected error occurred.");
            Alert.alert("Error", `Could not send your message. ${error.message || "Please try again later."}`);
        } finally {
            console.log("[User Feedback] Finally block. Setting isSending to false.");
            setIsSending(false);
        }
    }; 


    return (
        <View style={styles.mainContainer}>
  
            <Header
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
                        {isSending ? ( <ActivityIndicator size="small" color={PALETTE.nextButtonText} /> ) : ( <Text style={styles.buttonText}>Send Message</Text> )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <TabNavigation /> 
        </View>
    );
};


const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, },
    scrollContainer: { flex: 1, },
    scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 40, },
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, marginBottom: SIZES.cardMarginBottom, padding: SIZES.cardPadding, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
    infoText: { fontSize: 16, color: PALETTE.black, marginBottom: 20, lineHeight: 20, textAlign: 'center', fontFamily: 'QuickSand_600SemiBold', },
    label: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, fontFamily: 'QuickSand_500Medium', marginBottom: 8, },
    textInput: { backgroundColor: PALETTE.lightCream, borderRadius: SIZES.optionButtonBorderRadius / 2, borderWidth: 1, borderColor: PALETTE.buttonBorder, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: SIZES.inputPaddingVertical, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, minHeight: 150, marginBottom: SIZES.inputMarginBottom, textAlignVertical: 'top', },
    button: { backgroundColor: PALETTE.nextButtonBackground, paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'center', elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, width: '80%', marginTop: 10, },
    buttonDisabled: { backgroundColor: PALETTE.grey, },
    buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontFamily: 'QuickSand_700Bold', },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginBottom: 10, fontSize: 14, },
});

export default ContactUsScreen;
