import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Platform, Image, Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons'; 


import { auth as firebaseAuthInstance } from '../firebaseConfig'; 
// --- ^ ^ ^ --- END IMPORT --- ^ ^ ^ ---
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; 
import Ionicons from 'react-native-vector-icons/Ionicons'; 

import Header from './Header';
import TabNavigation from './TabNavigation'; 
import { AuthContext } from './AuthContext';    

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', declineRed: '#F44336', nextButtonBackground: '#D32F2F', nextButtonText: '#FFFFFF', buttonBorder: '#E0E0E0', acceptGreen: '#4CAF50', initialContinueBtnBackground: '#A0A0A0', initialContinueBtnText: '#555555', initialCancelBtnBackground: '#555555', initialCancelBtnText: '#FFFFFF', confirmDeleteBtnBackground: '#F44336', confirmDeleteBtnText: '#FFFFFF', confirmCancelBtnBackground: '#FFFFFF', confirmCancelBtnText: '#555555', };

const SIZES = { labelFont: 15, titleFont: 18, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, inputPaddingVertical: 10, inputPaddingHorizontal: 12, inputMarginBottom: 18, optionButtonBorderRadius: 20, iconSize: 22, };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 

const DeleteUserAccount = () => {
    const navigation = useNavigation();

    const { user: userFromContext, logout, getIdToken } = useContext(AuthContext);

    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    const startDeletionProcess = () => {
        setShowPasswordPrompt(true);
        setError(''); 
    };

     const cancelInitial = () => {
        navigation.goBack(); 
     };

    const confirmAndPasswordAndDelete = () => {
         Alert.alert(
            "Final Confirmation",
            "Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel", onPress: () => { console.log("User final deletion cancelled"); setIsDeleting(false); /* Ensure loading stops */ } },
                { text: "Yes, Delete Permanently", style: "destructive", onPress: handleDeleteAccount }
            ]
         );
    };

    const handleDeleteAccount = async () => {
        if (!currentPassword) { setError("Password is required to confirm deletion."); return; }
   
        if (!userFromContext || !userFromContext.email || !userFromContext.uid) {
             setError("User information is missing. Cannot proceed with deletion.");
             Alert.alert("Error", "Unable to identify your account. Please try logging in again.");
             return;
        }

        setIsDeleting(true);
        setError('');

        try {
            const currentAuthUser = firebaseAuthInstance.currentUser; 
            if (!currentAuthUser) {
          
                throw new Error("No active Firebase session found. Please log out and log back in.");
            }
            
            if (currentAuthUser.email !== userFromContext.email) {
                console.warn(`[Delete User] Email mismatch: Context (${userFromContext.email}) vs Firebase Auth (${currentAuthUser.email}). Proceeding with Firebase Auth email for reauthentication.`);
            }


            console.log("[Delete User] Attempting to reauthenticate with email:", currentAuthUser.email);
            const credential = EmailAuthProvider.credential(currentAuthUser.email, currentPassword);

            await reauthenticateWithCredential(currentAuthUser, credential);
            // --- ^ ^ ^ --- END USE --- ^ ^ ^ ---
            console.log("[Delete User] Reauthentication successful.");

            // Étape 2: Appel Backend pour supprimer TOUT (Firestore, Storage via backend)
            console.log(`[Delete User] Calling backend DELETE endpoint: /user/${userFromContext.uid}`);
            const token = await getIdToken(); // Get fresh token for backend call
            if (!token) { throw new Error("Failed to get authorization token after reauthentication."); }

            const apiUrl = `${API_BASE_URL}/user/${userFromContext.uid}`; // Endpoint spécifique utilisateur
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Handle potential non-JSON error responses from backend
            let responseData;
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                responseData = await response.json();
            } else {
                const responseBodyText = await response.text();
                console.log(`[Delete User] Backend Response (Non-JSON) Status: ${response.status}, Body: ${responseBodyText.substring(0, 300)}`);
                if (!response.ok) throw new Error(responseBodyText || `Backend deletion failed (${response.status})`);
                responseData = { message: responseBodyText }; // Treat as success message if non-JSON but ok
            }
            console.log(`[Delete User] Backend Response Status: ${response.status}, Parsed Data:`, responseData);


            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || `Backend deletion failed (${response.status})`);
            }

            // Étape 3: Succès - Le backend a tout supprimé. Déconnexion client gérée par AuthContext.
            console.log("[Delete User] Backend confirmed successful deletion. Triggering context logout...");
            Alert.alert("Account Deleted", "Your account and all associated data have been permanently deleted.");

            if (logout && typeof logout === 'function') {
                await logout(); // This should call auth.signOut() and trigger context update
                // The RootNavigator listening to AuthContext will handle redirection to Login
            } else {
                console.warn("[Delete User] Logout function not available in context. Attempting manual navigation to LogIn.");
                // Fallback navigation if context logout is not correctly set up
                navigation.reset({ index: 0, routes: [{ name: 'LogIn' }] });
            }

        } catch (error) {
            console.error("[Delete User] Error during deletion process:", error);
            let msg = error.message || "An unknown error occurred during deletion.";
            if (error.code === 'auth/wrong-password') { msg = "Incorrect password. Please verify and try again."; }
            else if (error.code === 'auth/too-many-requests') { msg = "Too many attempts. Please try again later."; }
            else if (error.code === 'auth/requires-recent-login') { msg = "This is a sensitive action and requires a recent login. Please log out and log back in before deleting your account."; }
            // For other errors, use error.message
            setError(msg);
            Alert.alert("Deletion Failed", msg);
        } finally {
            console.log("[Delete User] Deletion process finished (either success or fail).");
            setIsDeleting(false); // Stop loading indicator
        }
    }; // --- Fin handleDeleteAccount ---

    const toggleVisibility = () => setIsPasswordVisible(v => !v);

    // --- Rendu du Composant ---
    return (
        <View style={styles.mainContainer}>
            <Header subtitle="Delete Account" onBackPress={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Ionicons name="warning-outline" size={SIZES.iconSize + 20} color={PALETTE.errorRed} style={{marginBottom: 15}} />
                    <Text style={styles.warningTitle}>Permanently Delete Account</Text>
                    <Text style={styles.warningText}>
                        This action is irreversible. All your personal data, including profile information,
                        meal logs, nutrition plans, and any saved progress will be permanently removed.
                        Are you absolutely sure you want to proceed?
                    </Text>

                    {showPasswordPrompt ? (
                        <>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>To confirm, please enter your current password:</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Current Password"
                                        placeholderTextColor={PALETTE.grey}
                                        secureTextEntry={!isPasswordVisible}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        editable={!isDeleting}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={toggleVisibility} disabled={isDeleting}>
                                        <Icon name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={SIZES.iconSize} color={PALETTE.grey} style={styles.visibilityIcon} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.buttonHalf, styles.confirmCancelButton]}
                                    onPress={() => { setShowPasswordPrompt(false); setError(''); setCurrentPassword(''); }}
                                    disabled={isDeleting} >
                                    <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.buttonHalf, styles.confirmDeleteButton, (isDeleting || !currentPassword) && styles.buttonDisabled]}
                                    onPress={confirmAndPasswordAndDelete} // Calls the final confirmation alert
                                    disabled={isDeleting || !currentPassword} >
                                    {isDeleting ? ( <ActivityIndicator size="small" color={PALETTE.white} /> ) : ( <Text style={styles.confirmDeleteButtonText}>Confirm & Delete</Text> )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.buttonHalf, styles.initialCancelButton]}
                                onPress={cancelInitial} >
                                <Text style={styles.initialCancelButtonText}>Go Back</Text>
                            </TouchableOpacity>
                             <TouchableOpacity
                                style={[styles.buttonHalf, styles.initialContinueButton]}
                                onPress={startDeletionProcess} >
                                <Text style={styles.initialContinueButtonText}>Proceed to Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
            {/* Decide if TabNavigation should be here. Usually not on a final action screen. */}
            {/* <TabNavigation /> */}
        </View>
    );
};

// --- Styles (Keep YOUR existing styles as passed before) ---
// This should be your complete styles object from the previous message
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, },
    scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 30, flexGrow: 1, justifyContent: 'center' },
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding + 10, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignItems: 'center' },
    warningTitle: { fontSize: SIZES.titleFont + 4, fontFamily: 'Quicksand_700Bold', color: PALETTE.errorRed, marginBottom: 15, textAlign: 'center', }, // Made title larger
    warningText: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, marginBottom: 30, lineHeight: 21, textAlign: 'center', fontFamily: 'Quicksand_500Medium' },
    fieldGroup: { marginBottom: SIZES.inputMarginBottom, width: '100%' },
    label: { fontSize: SIZES.labelFont, marginBottom: 8, color: PALETTE.darkGrey, fontWeight: '500', fontFamily: 'Quicksand_600SemiBold' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius / 1.5, borderWidth: 1, borderColor: PALETTE.buttonBorder, },
    input: { flex: 1, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 1, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' },
    visibilityIcon: { paddingHorizontal: 12, },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, },
    buttonHalf: { flex: 0.48, paddingVertical: 14, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, // Use flex for better spacing
    initialContinueButton: { backgroundColor: PALETTE.declineRed, }, // Make initial continue red
    initialCancelButton: { backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.grey },
    initialContinueButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    initialCancelButtonText: { color: PALETTE.darkGrey, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    confirmDeleteButton: { backgroundColor: PALETTE.confirmDeleteBtnBackground, },
    confirmCancelButton: { backgroundColor: PALETTE.confirmCancelBtnBackground, borderWidth: 1, borderColor: PALETTE.grey },
    confirmDeleteButtonText: { color: PALETTE.confirmDeleteBtnText, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    confirmCancelButtonText: { color: PALETTE.confirmCancelBtnText, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    buttonDisabled: { opacity: 0.5, backgroundColor: PALETTE.grey, },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 15, fontSize: 14, fontWeight: '500', fontFamily: 'Quicksand_500Medium' }
});

export default DeleteUserAccount;