import React, { useState, useContext } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import ProHeader from './ProHeader';
import ProTabNavigation from './ProTabNavigation';
import { AuthContext } from './AuthContext';

import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', declineRed: '#F44336', nextButtonBackground: '#D32F2F', nextButtonText: '#FFFFFF', buttonBorder: '#E0E0E0', acceptGreen: '#4CAF50', initialContinueBtnBackground: '#A0A0A0', initialContinueBtnText: '#555555', initialCancelBtnBackground: '#555555', initialCancelBtnText: '#FFFFFF', confirmDeleteBtnBackground: '#F44336', confirmDeleteBtnText: '#FFFFFF', confirmCancelBtnBackground: '#FFFFFF', confirmCancelBtnText: '#555555', };
const SIZES = { labelFont: 15, titleFont: 18, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, inputPaddingVertical: 10, inputPaddingHorizontal: 12, inputMarginBottom: 18, optionButtonBorderRadius: 20, iconSize: 22, };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

const DeleteCoachAccount = () => {
    const navigation = useNavigation();
  
    const { user: coach, logout, getIdToken } = useContext(AuthContext);
  
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    const startDeletionProcess = () => {
        setShowPasswordPrompt(true);
        setError('');
    };

    
     const cancelInitial = () => { navigation.goBack(); };

    const confirmAndPasswordAndDelete = () => {
         Alert.alert(
            "Final Confirmation", 
            "Are you absolutely sure? This will permanently delete your coach account and all associated data. This action cannot be undone.", // Message
            [
                { text: "Cancel", style: "cancel", onPress: () => console.log("Coach final deletion cancelled") },
                { text: "Yes, Delete Permanently", style: "destructive", onPress: handleDeleteAccount } 
            ]
         );
    }


    const handleDeleteAccount = async () => {
      
        if (!currentPassword) { setError("Password is required."); return; }
        if (!coach || !coach.email || !coach.uid) { setError("Coach information is missing."); Alert.alert("Error", "Unable to identify the coach account."); return; }

        setIsDeleting(true);
        setError(''); 

        try {

            console.log("[Delete Coach] Attempting to reauthenticate...");
            const credential = EmailAuthProvider.credential(coach.email, currentPassword);
            await reauthenticateWithCredential(coach, credential); 
            console.log("[Delete Coach] Reauthentication successful.");

 
            console.log(`[Delete Coach] Calling backend DELETE endpoint: /expert/${coach.uid}`);
            const token = await getIdToken(); 

            if (!token) { throw new Error("Failed to get authorization token after reauthentication."); }

            const apiUrl = `${API_BASE_URL}/expert/${coach.uid}`; 
            const response = await fetch(apiUrl, {
                method: 'DELETE', 
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });

            const responseBodyText = await response.text();
            console.log(`[Delete Coach] Backend Response Status: ${response.status}, Body: ${responseBodyText.substring(0, 300)}`);

      
            if (!response.ok) {
                let errorMsg = `Backend deletion failed (${response.status})`;
                try { const jsonError = JSON.parse(responseBodyText); errorMsg = jsonError.error || jsonError.message || responseBodyText; } catch(e){}
      
                throw new Error(errorMsg);
            }


            console.log("[Delete Coach] Backend confirmed successful deletion. Logging out client...");
            Alert.alert(
                "Account Deleted",
                "Your coach account and all associated data have been permanently deleted."
            );

    
            if (logout && typeof logout === 'function') {
                await logout();
            } else {
                console.warn("[Delete Coach] Logout function not available in context. Navigating manually.");
                
                 navigation.reset({ index: 0, routes: [{ name: 'CoachLogin' }] });
            }

        } catch (error) { 
            console.error("[Delete Coach] Error during deletion process:", error);
            let msg = error.message || "An unknown error occurred.";
            
            if (error.code === 'auth/wrong-password') { msg = "Incorrect password. Please try again."; }
            else if (error.code === 'auth/too-many-requests') { msg = "Too many attempts. Please try again later."; }
            else if (error.code === 'auth/requires-recent-login') { msg = "This action requires a recent login. Please log out and log back in before deleting your account."; }
           
            setError(msg);
            Alert.alert("Deletion Failed", msg);
        } finally {
            console.log("[Delete Coach] Deletion process finished (success or fail).");
            setIsDeleting(false); 
        }
    }; 


    const toggleVisibility = () => setIsPasswordVisible(v => !v);

    return (
        <View style={styles.mainContainer}>
         
            <ProHeader subtitle="Delete Account" onBackPress={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
  
                    <Text style={styles.warningTitle}>Warning!</Text>
                    <Text style={styles.warningText}>
                        Deleting your coach account is permanent. All your profile data,
                        client associations, plans created, and message history
                        will be permanently removed and cannot be recovered.
                    </Text>

                    {showPasswordPrompt ? (
                        <>
                   
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Confirm with Password:</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your current password"
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
                                    onPress={() => { setShowPasswordPrompt(false); setError(''); setCurrentPassword(''); }} // Annule la saisie du mdp
                                    disabled={isDeleting} >
                                    <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.buttonHalf, styles.confirmDeleteButton, (isDeleting || !currentPassword) && styles.buttonDisabled]}
                                    onPress={confirmAndPasswordAndDelete} 
                                    disabled={isDeleting || !currentPassword} >
                                    {isDeleting ? ( <ActivityIndicator size="small" color={PALETTE.white} /> ) : ( <Text style={styles.confirmDeleteButtonText}>Delete Account</Text> )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                     
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.buttonHalf, styles.initialCancelButton]}
                                onPress={cancelInitial} >
                                <Text style={styles.initialCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                             <TouchableOpacity
                                style={[styles.buttonHalf, styles.initialContinueButton]}
                                onPress={startDeletionProcess} >
                                <Text style={styles.initialContinueButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
       
            <ProTabNavigation />
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, }, scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 30, flexGrow: 1, justifyContent: 'center' }, card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding + 10, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignItems: 'center' }, warningTitle: { fontSize: SIZES.titleFont + 2, fontWeight: 'bold', color: PALETTE.errorRed, marginBottom: 15, textAlign: 'center', }, warningText: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, marginBottom: 30, lineHeight: 21, textAlign: 'center', }, fieldGroup: { marginBottom: SIZES.inputMarginBottom, width: '100%' }, label: { fontSize: SIZES.labelFont, marginBottom: 8, color: PALETTE.darkGrey, fontWeight: '500', }, inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius / 1.5, borderWidth: 1, borderColor: PALETTE.buttonBorder, }, input: { flex: 1, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 1, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, }, visibilityIcon: { paddingHorizontal: 12, }, buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, }, buttonHalf: { flex: 1, paddingVertical: 14, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', marginHorizontal: 5, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, initialContinueButton: { backgroundColor: PALETTE.initialContinueBtnBackground, }, initialCancelButton: { backgroundColor: PALETTE.initialCancelBtnBackground, }, initialContinueButtonText: { color: PALETTE.initialContinueBtnText, fontSize: 16, fontWeight: 'bold', }, initialCancelButtonText: { color: PALETTE.initialCancelBtnText, fontSize: 16, fontWeight: 'bold', }, confirmDeleteButton: { backgroundColor: PALETTE.confirmDeleteBtnBackground, }, confirmCancelButton: { backgroundColor: PALETTE.confirmCancelBtnBackground, borderWidth: 1, borderColor: PALETTE.grey }, confirmDeleteButtonText: { color: PALETTE.confirmDeleteBtnText, fontSize: 16, fontWeight: 'bold', }, confirmCancelButtonText: { color: PALETTE.confirmCancelBtnText, fontSize: 16, fontWeight: 'bold', }, buttonDisabled: { backgroundColor: PALETTE.grey, }, errorText: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 15, fontSize: 14, fontWeight: '500' }
});


export default DeleteCoachAccount;
