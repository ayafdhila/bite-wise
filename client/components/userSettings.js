// --- START OF FILE userSettings.js ---
import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
    Modal, Pressable, Dimensions // Added Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons'; // Using Ionicons
import Header from './Header'; // Adjust path
import TabNavigation from './TabNavigation'; // Adjust path
import { AuthContext } from './AuthContext'; // Adjust path

// --- Palette (Consistent) ---
const PALETTE = {
    darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94',
    lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000',
    grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F',
    rejectRed: '#E57373', linkBlue: '#007AFF', // Added linkBlue
    modalOverlay: 'rgba(0, 0, 0, 0.6)', modalText: '#333333',
    modalButtonCancelText: '#007AFF', modalButtonDestructiveText: '#FF3B30',
};

// --- Tailles (Adjust as needed) ---
const SIZES = {
    profileImage: 65, // Slightly larger image
    titleFont: 18,    // Larger Section Titles
    labelFont: 16,    // Larger Row Labels
    detailFont: 14,   // Larger detail text
    paddingHorizontal: 18, // Slightly more padding
    cardPadding: 18,
    rowVerticalPadding: 16, // More vertical space in rows
    cardMarginBottom: 20, // More space between cards
    iconSize: 22,       // Standard icon size
    modalTitleFont: 18, modalMessageFont: 14, modalButtonFont: 17,
    modalBorderRadius: 14, modalPadding: 20, modalButtonHeight: 48,
};

// --- Image de profil par défaut ---
const defaultProfileImage = require('../assets/Images/DefaultProfilee.jpg'); // Verify path
const placeholderUserData = { firstName: 'User', lastName: '' };

const SettingsScreen = () => {
    const navigation = useNavigation();
    const { user } = useContext(AuthContext) || {};

    // --- Get User Info ---
    const userFirstName = user?.firstName || placeholderUserData.firstName;
    const userLastName = user?.lastName || placeholderUserData.lastName;
    const displayFullName = `${userFirstName} ${userLastName}`.trim();
    const profileImageUrl = user?.profileImage || user?.photoURL;
    const displayProfileImage = profileImageUrl ? { uri: profileImageUrl } : defaultProfileImage;

    // --- Modal State ---
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

    // --- Fonctions de navigation ---
    const goToEditProfile = () => navigation.navigate('EditUserProfile');
    const goToContactUs = () => navigation.navigate('ContactUsScreen');
    const goToChangePassword = () => navigation.navigate('ResetPassword');
    const goToDeleteAccount = () => navigation.navigate('DeleteUserAccount');
    const goToReminders = () => navigation.navigate('userReminders');

    // --- Gestion de la Déconnexion ---
    const handleLogout = () => setIsLogoutModalVisible(true);
    const confirmLogout = () => { setIsLogoutModalVisible(false); navigation.navigate('userLogOut'); };

    // --- Composant Ligne de Réglage (Added Icon Option) ---
    const SettingsRow = ({ label, iconName, onPress, isFirst = false, isDestructive = false }) => (
        <TouchableOpacity
            style={[ styles.settingsRowTouchable, !isFirst && styles.settingsRowSeparator ]}
            onPress={onPress} >
            <View style={styles.settingsRowLeft}>
                {iconName && <Icon name={iconName} size={SIZES.iconSize} color={isDestructive ? PALETTE.rejectRed : PALETTE.darkGrey} style={styles.settingsRowIcon} />}
                <Text style={[styles.settingsRowLabel, isDestructive && styles.destructiveText]}>{label}</Text>
            </View>
            {!isDestructive && <Icon name="chevron-forward-outline" size={22} color={PALETTE.grey} />}
        </TouchableOpacity>
    );

    // --- RENDER ---
    return (
     <View style={styles.screenContainer}>
         <Header subtitle={"Settings"}/>
           <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scrollContent}>

             {/* Section 1: Profil */}
             <TouchableOpacity style={[styles.card, styles.profileCardTouchable]} onPress={goToEditProfile}>
                 <Image source={displayProfileImage} style={styles.profileImage} />
                 <View style={styles.profileTextContainer}>
                     <Text style={styles.profileNameText}>{displayFullName}</Text>
                     <Text style={styles.profileActionText}>View & Edit Profile</Text>
                 </View>
                 <Icon name="chevron-forward-outline" size={26} color={PALETTE.darkGrey} />
             </TouchableOpacity>

             {/* Section 2: Account Settings */}
             <View style={styles.card}>
                 <Text style={styles.sectionTitle}>Account</Text>
                 <SettingsRow label="Reminders" iconName="notifications-outline" onPress={goToReminders} />
                 <SettingsRow label="Change Password" iconName="lock-closed-outline" onPress={goToChangePassword} />
                 <SettingsRow label="Contact Us" iconName="mail-outline" onPress={goToContactUs} />
                 <SettingsRow label="Delete Account" iconName="trash-outline" onPress={goToDeleteAccount} isDestructive={true}/>
             </View>

             {/* Section 3: Log out */}
             <View style={styles.card}>
                 <TouchableOpacity style={styles.logoutTouchable} onPress={handleLogout}>
                     <Icon name="log-out-outline" size={SIZES.iconSize} color={PALETTE.rejectRed} style={styles.settingsRowIcon} />
                     <Text style={styles.logoutLabel}>Log Out</Text>
                 </TouchableOpacity>
             </View>

         </ScrollView>
         <TabNavigation/>

         {/* Modal de Déconnexion (Styling tweaked slightly) */}
         <Modal
            animationType="fade" transparent={true} visible={isLogoutModalVisible}
            onRequestClose={() => setIsLogoutModalVisible(false)} >
            <Pressable style={styles.modalOverlay} onPress={() => setIsLogoutModalVisible(false)}>
                <View style={styles.modalContent}> {/* Use View instead of Pressable to prevent closing on content press */}
                    <Text style={styles.modalTitle}>Log Out</Text>
                    <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
                    <View style={styles.modalButtonSeparator} />
                    <View style={styles.modalButtonContainer}>
                        <TouchableOpacity style={styles.modalButton} onPress={() => setIsLogoutModalVisible(false)} >
                            <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <View style={styles.modalVerticalSeparator} />
                        <TouchableOpacity style={styles.modalButton} onPress={confirmLogout} >
                            <Text style={styles.modalConfirmButtonText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
         </Modal>

      </View>
  );
};

// --- Styles (Enhanced for better visuals) ---
const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    scrollFlex: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SIZES.paddingHorizontal,
        paddingVertical: 25, // More space at top/bottom
        paddingBottom: 100, // Extra space for tab bar
    },
    card: {
        backgroundColor: PALETTE.lightOrange, // Use white cards for contrast
        borderRadius: 20, // Softer corners
        marginBottom: SIZES.cardMarginBottom,
        elevation: 2, shadowColor: PALETTE.grey, // Lighter shadow
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
        overflow: 'hidden', // Clip content to border radius
    },
    profileCardTouchable: { // Specific style for the profile card touchable area
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.cardPadding, // Padding inside the touchable area
        backgroundColor: PALETTE.lightOrange, // Keep profile card orange
    },
    profileImage: {
        width: SIZES.profileImage, height: SIZES.profileImage,
        borderRadius: SIZES.profileImage / 2,
        marginRight: SIZES.cardPadding, // Use card padding for consistency
        backgroundColor: PALETTE.grey,
        borderWidth: 2, borderColor: PALETTE.white, // White border stands out on orange
    },
    profileTextContainer: { flex: 1, justifyContent: 'center', },
    profileNameText: { fontSize: SIZES.titleFont + 1, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginBottom: 4, }, // Slightly larger, dark green
    profileActionText: { fontSize: SIZES.detailFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', },
    sectionTitle: {
        fontSize: 14, // Smaller title *inside* the card
        fontFamily: 'Quicksand_600SemiBold',
        color: PALETTE.black, // Subtler title color
        marginBottom: 8,
        paddingHorizontal: SIZES.cardPadding,
        paddingTop: SIZES.cardPadding, // Add padding above title
        textTransform: 'uppercase', // Make it look like a section header
        letterSpacing: 0.5, // Add some letter spacing
    },
    settingsRowTouchable: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: SIZES.rowVerticalPadding, paddingHorizontal: SIZES.cardPadding,
        backgroundColor: PALETTE.lightOrange, // Rows have white background inside orange card
    },
    settingsRowSeparator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.lightCream, marginHorizontal: SIZES.cardPadding, }, // Use light cream separator
    settingsRowLeft: { // Group icon and label
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Allow text to wrap
        paddingRight: 10, // Space before chevron
    },
    settingsRowIcon: { marginRight: 15, width: SIZES.iconSize }, // Fixed width for alignment
    settingsRowLabel: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', },
    destructiveText: { color: PALETTE.rejectRed }, // Style for destructive action labels
    logoutTouchable: { flexDirection: 'row', paddingVertical: SIZES.rowVerticalPadding, paddingHorizontal: SIZES.cardPadding, alignItems: 'center', backgroundColor: PALETTE.lightOrange }, // Similar to settings row but full touchable
    logoutLabel: { fontSize: SIZES.labelFont, color: PALETTE.rejectRed, fontFamily: 'Quicksand_600SemiBold', marginLeft: 0 }, // Remove left margin if icon present
    // Error/Loading (Can remain simple)
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginVertical: 10, fontSize: 14, fontFamily: 'Quicksand_500Medium'},
    // Modal Styles (Minor tweaks for consistency)
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.modalOverlay, },
    modalContent: { width: '80%', maxWidth: 320, backgroundColor: PALETTE.lightCream, borderRadius: SIZES.modalBorderRadius, paddingTop: SIZES.modalPadding, alignItems: 'center', overflow: 'hidden', elevation: 5, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, },
    modalTitle: { fontSize: SIZES.modalTitleFont, fontWeight: 'bold', color: PALETTE.modalText, marginBottom: 8, textAlign: 'center', fontFamily: 'Quicksand_700Bold' },
    modalMessage: { fontSize: SIZES.modalMessageFont, color: PALETTE.modalText, textAlign: 'center', marginBottom: SIZES.modalPadding, paddingHorizontal: 15, fontFamily: 'Quicksand_500Medium', lineHeight: 18 },
    modalButtonSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.grey, opacity: 0.5, alignSelf: 'stretch', },
    modalButtonContainer: { flexDirection: 'row', width: '100%', height: SIZES.modalButtonHeight, },
    modalButton: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    modalVerticalSeparator: { width: StyleSheet.hairlineWidth, backgroundColor: PALETTE.grey, opacity: 0.5, height: '100%', },
    modalCancelButtonText: { fontSize: SIZES.modalButtonFont, color: PALETTE.modalButtonCancelText, fontWeight: '600', fontFamily: 'Quicksand_600SemiBold' }, // SemiBold for cancel
    modalConfirmButtonText: { fontSize: SIZES.modalButtonFont, color: PALETTE.modalButtonDestructiveText, fontWeight: '600', fontFamily: 'Quicksand_600SemiBold' }, // SemiBold for confirm
});

export default SettingsScreen;
// --- END OF FILE userSettings.js ---