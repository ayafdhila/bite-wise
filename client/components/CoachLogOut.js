import React, { useEffect, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './AuthContext';
const PALETTE = { lightCream: '#F5E4C3', darkGreen: '#2E4A32' };

const CoachLogOut = () => {
    const navigation = useNavigation();
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        const performLogoutAndRedirect = async () => {
            console.log("CoachLogOut: Attempting logout...");
            if (logout && typeof logout === 'function') {
                try {
                    await logout();
                    console.log("CoachLogOut: Logout successful, navigating to CoachLogin.");
                    navigation.reset({ index: 0, routes: [{ name: 'CoachLogin' }], }); // Ensure 'CoachLogin' screen name is correct
                } catch (error) {
                  console.error("CoachLogOut Error:", error);
                  Alert.alert("Logout Error", "An error occurred during logout. Redirecting to login.");
                  navigation.reset({ index: 0, routes: [{ name: 'CoachLogin' }] }); // Ensure 'CoachLogin' screen name is correct
                }
            } else {
                console.warn("CoachLogOut: Logout function not found in context, redirecting directly.");
                navigation.reset({ index: 0, routes: [{ name: 'CoachLogin' }] }); // Ensure 'CoachLogin' screen name is correct
            }
        };
        performLogoutAndRedirect();
    }, [logout, navigation]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={PALETTE.darkGreen} />
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.lightCream, justifyContent: 'center', alignItems: 'center', }
});

export default CoachLogOut; 
