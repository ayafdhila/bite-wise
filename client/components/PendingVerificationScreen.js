// screens/PendingVerificationScreen.js
import React from 'react';
// --- V V V --- ADD StyleSheet HERE --- V V V ---
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
// --- ^ ^ ^ --- END ADDITION --- ^ ^ ^ ---
import { Ionicons } from '@expo/vector-icons'; // For potential icons
import { useNavigation } from '@react-navigation/native';

// Palette (ensure consistency with your app's theme)
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
};

export default function PendingVerificationScreen() {
    const navigation = useNavigation();

    const handleGoToLogin = () => {
        // Navigate to the Login screen, resetting the stack
        navigation.reset({
            index: 0,
            routes: [{ name: 'LogIn' }], // Ensure 'LogIn' is your login screen's route name
        });
    };

    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/Images/logo.png')} // Your app logo
                style={styles.logo}
            />
            <Text style={styles.titleText}>Thank You for Registering!</Text>
            <Ionicons name="time-outline" size={80} color={PALETTE.darkGreen} style={styles.icon} />
            <Text style={styles.messageText}>
                Your application to become a coach on BiteWise is currently under review.
            </Text>
            <Text style={styles.subMessageText}>
                Our team will verify your credentials. This usually doesn't take long.
                You will be notified once your account is approved.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
                <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
            <Text style={styles.contactText}>Questions? Contact bitewisebitewise@gmail.com</Text>
        </View>
    );
}

// Define styles for this screen
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: PALETTE.lightCream,
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
        marginBottom: 30,
    },
    icon: {
        marginBottom: 25,
    },
    titleText: {
        fontSize: 24,
        fontFamily: 'Quicksand_700Bold', // Ensure this font is loaded in App.js
        color: PALETTE.darkGreen,
        textAlign: 'center',
        marginBottom: 20,
    },
    messageText: {
        fontSize: 16,
        fontFamily: 'Quicksand_500Medium', // Ensure this font is loaded
        color: PALETTE.darkGrey,
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 24,
    },
    subMessageText: {
        fontSize: 15,
        fontFamily: 'Quicksand_400Regular', // Ensure this font is loaded
        color: PALETTE.mediumGreen,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        backgroundColor: PALETTE.darkGreen,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 2,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    buttonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontFamily: 'Quicksand_600SemiBold', // Ensure this font is loaded
    },
    contactText: {
        marginTop: 30,
        fontSize: 15,
        color: PALETTE.mediumGreen,
        fontFamily: 'Quicksand_400Regular', // Ensure this font is loaded
    }
});