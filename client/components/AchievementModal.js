import React, { useContext } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { GamificationContext } from './GamificationContext'; 

const PALETTE = {
    darkGreen: '#2E4A32',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    darkGrey: '#555555',
    
};

const AchievementModal = () => {
    const { isAchievementModalVisible, currentAchievementDetails, closeAchievementModal } = useContext(GamificationContext);

    if (!isAchievementModalVisible || !currentAchievementDetails) {
        return null; 
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isAchievementModalVisible}
            onRequestClose={closeAchievementModal} 
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPressOut={closeAchievementModal} 
            >
                <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
                    {currentAchievementDetails.image && (
                        <Image source={currentAchievementDetails.image} style={styles.badgeImage} resizeMode="contain" />
                    )}
                    <Text style={styles.modalTitle}>{currentAchievementDetails.title}</Text>
                    {currentAchievementDetails.body && (
                        <Text style={styles.modalBody}>{currentAchievementDetails.body}</Text>
                    )}
                    <TouchableOpacity style={styles.dismissButton} onPress={closeAchievementModal}>
                        <Text style={styles.dismissButtonText}>Awesome!</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)', // Slightly darker overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20, // Add padding for smaller screens
    },
    modalCard: {
        width: '90%', // Responsive width
        maxWidth: 380, // Max width
        backgroundColor: PALETTE.lightCream,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        elevation: 10,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    badgeImage: {
        width: 130, // Adjust based on your badge image aspect ratio
        height: 130,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24, // Larger title
        fontFamily: 'Quicksand_700Bold', // Use your font
        color: PALETTE.darkGreen,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalBody: {
        fontSize: 16,
        fontFamily: 'Quicksand_500Medium', // Use your font
        color: PALETTE.darkGrey,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 23,
    },
    dismissButton: {
        backgroundColor: PALETTE.darkGreen,
        paddingVertical: 12,
        paddingHorizontal: 40, // Wider button
        borderRadius: 25, // More rounded
    },
    dismissButtonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontFamily: 'Quicksand_600SemiBold', // Use your font
    },
});

export default AchievementModal;