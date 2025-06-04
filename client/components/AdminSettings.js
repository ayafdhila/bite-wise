import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext'; 
import AdminHeader from '../components/AdminHeader';       
import AdminTabNavigation from './AdminTabNavigation'; 
import { Ionicons } from '@expo/vector-icons'; 

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

export default function AdminSettings() {
    const navigation = useNavigation();

    const { logout, user } = useContext(AuthContext);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            "Confirm Logout",
            "Are you sure you want to log out of your admin account?",
            [
                { text: "Cancel", style: "cancel", onPress: () => console.log("Admin Logout cancelled") },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoggingOut(true);
                        console.log("AdminLogOutScreen: Initiating logout...");
                        try {
                            if (logout && typeof logout === 'function') {
                                await logout(); 
                                console.log("AdminLogOutScreen: Logout process triggered via context.");
                            } else {
                                console.error("AdminLogOutScreen:  function is missing from AuthContext!");
                                Alert.alert("Logout Error", "Logout function is unavailable.");
                                setIsLoggingOut(false); 
                            }
                        } catch (error) {
                            console.error("AdminLogOutScreen: Error during logout:", error);
                            Alert.alert("Logout Failed", error.message || "An error occurred.");
                            setIsLoggingOut(false); 
                        }
                       
                    }
                }
            ]
        );
    };


    if (!user && !isLoggingOut) {
        console.log("AdminLogOutScreen: No user, redirecting to Login (should be handled by RootNav).");
 
        return (
             <View style={styles.screenContainer}>
                 <AdminHeader subtitle="Logout" showBackButton={false} />
                 <View style={styles.centeredMessageContainer}>
                     <Text>No active session.</Text>
                 </View>

             </View>
         );
    }

    return (
        <View style={styles.screenContainer}>
            <AdminHeader subtitle="Logout Confirmation" showBackButton={true} />
            <View style={styles.contentContainer}>
                <Ionicons name="log-out-outline" size={80} color={PALETTE.darkGrey} style={styles.logoutIcon} />
                <Text style={styles.confirmationText}>
                    Are you sure you want to log out?
                </Text>

                <TouchableOpacity
                    style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
                    onPress={handleLogout}
                    disabled={isLoggingOut} >
                    {isLoggingOut ? (
                        <ActivityIndicator size="small" color={PALETTE.white} />
                    ) : (
                        <Text style={styles.logoutButtonText}>Confirm Logout</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.cancelButton, isLoggingOut && styles.buttonDisabled]}
                    onPress={() => navigation.goBack()} 
                    disabled={isLoggingOut} >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
            <AdminTabNavigation/>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream, },
    contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, },
    logoutIcon: { marginBottom: 30, },
    confirmationText: { fontSize: 20, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, textAlign: 'center', marginBottom: 40, }, // Increased bottom margin
    logoutButton: { backgroundColor: PALETTE.errorRed, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 25, width: '90%', alignItems: 'center', marginBottom: 15, elevation: 2, },
    logoutButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    cancelButton: { backgroundColor: PALETTE.lightOrange, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 25, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.darkGreen, },
    cancelButtonText: { color: PALETTE.darkGreen, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    buttonDisabled: { opacity: 0.7, backgroundColor: PALETTE.grey, },
    centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
 
});