import React, { useEffect, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './AuthContext'; 

//Palette des couleurs
const PALETTE = { lightCream: '#F5E4C3', darkGreen: '#2E4A32' };

const userLogOut = () => {
    const navigation = useNavigation();
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        const performLogoutAndRedirect = async () => {
            console.log("userLogOut: Attempting logout...");
            if (logout && typeof logout === 'function') {
                try {
                    await logout(); 
                    console.log("userLogOut: Logout successful, navigating to SignIn.");
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'LogIn' }], 
                    });
                } catch (error) {
                  Alert.alert("Logout Error", "An error occurred during logout. Redirecting to login.");
                  navigation.reset({ index: 0, routes: [{ name: 'LogIn' }] });
                }
            } else {
                navigation.reset({ index: 0, routes: [{ name: 'LogIn' }] });
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default userLogOut;
