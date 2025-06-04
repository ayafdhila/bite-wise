import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from './Header';
import TabNavigation from './TabNavigation'; 

const PALETTE = { lightCream: '#F5E4C3', darkGreen: '#2E4A32' };

const ChangeUserPwd = () => {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.replace('ResetPassword');
    }, [navigation]); 


    return (
        <View style={styles.container}>
            <Header subtitle="Reset your password" /> {/* Optionnel: Titre pendant redirection */}
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={PALETTE.darkGreen} />
            </View>
            <TabNavigation /> {/* Optionnel: garder la barre de navigation */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ChangeUserPwd; // Exporte le composant sous le nom ChangeUserPwd

// --- END OF FILE changeUserPwd.js ---