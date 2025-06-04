import React, { useContext, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
    Modal, Pressable, Dimensions, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProHeader from '../components/ProHeader';     
import ProTabNavigation from '../components/ProTabNavigation'; 
import { AuthContext } from '../components/AuthContext';  


const PALETTE = {
    darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3',
    white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555',
    errorRed: '#D32F2F', rejectRed: '#E57373', linkBlue: '#007AFF',
    modalOverlay: 'rgba(0, 0, 0, 0.6)', modalText: '#333333',
    modalButtonCancelText: '#007AFF', modalButtonDestructiveText: '#FF3B30',
};

const SIZES = {
    profileImage: 65, titleFont: 18, labelFont: 16, detailFont: 14, paddingHorizontal: 18,
    cardPadding: 18, rowVerticalPadding: 16, cardMarginBottom: 20, iconSize: 22,
    modalTitleFont: 18, modalMessageFont: 14, modalButtonFont: 17,
    modalBorderRadius: 14, modalPadding: 20, modalButtonHeight: 48,
};


const defaultProfileImage = require('../assets/Images/DefaultProfilee.jpg'); 

const CoachSettings = () => {
    const navigation = useNavigation();

    const { user: coach, logout } = useContext(AuthContext) || {};

    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 

    const coachFirstName = coach?.firstName || 'Coach';
    const coachLastName = coach?.lastName || '';
    const displayFullName = `${coachFirstName} ${coachLastName}`.trim();
    const profileImageUrl = coach?.profileImage || coach?.profileImageUrl || coach?.photoURL;
    const displayProfileImage = profileImageUrl ? { uri: profileImageUrl } : defaultProfileImage;

    useEffect(() => {
        if (!coach) {
            console.warn("[CoachSettings] No coach data found in context.");
           
        } else {
            console.log("[CoachSettings] Coach object from context:", coach?.uid);
            if (!profileImageUrl) {
                console.log("[CoachSettings] Using default profile image.");
            }
        }
    }, [coach, profileImageUrl]);

    const goToEditCoachProfile = () => navigation.navigate('EditCoachProfile');
    const goToCoachContactUs = () => navigation.navigate('CoachContactUs');
    const goToChangeCoachPwd = () => navigation.navigate('ResetPassword');
    const goToDeleteCoachAccount = () => navigation.navigate('DeleteCoachAccount');
    const goToCoachReminders = () => navigation.navigate('CoachReminders');

    const handleLogout = () => setIsLogoutModalVisible(true);
    const confirmLogout = async () => {
        setIsLogoutModalVisible(false);
        if (logout && typeof logout === 'function') {
            console.log("[CoachSettings] Initiating logout...");
            await logout();
   
        } else {
            console.error("[CoachSettings] Logout function missing from AuthContext!");
            Alert.alert("Error", "Logout failed. Please try again later.");
        }
    };

 
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


    if (isLoading) { 
        return (<View style={styles.centeredLoader}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>);
    }

    return (
       <View style={styles.mainContainer}>
           <ProHeader subtitle={"Settings"} onBackPress={() => navigation.canGoBack() ? navigation.goBack() : null} />
             <ScrollView style={styles.screenContainerFlex} contentContainerStyle={styles.scrollContent}>

        
               <TouchableOpacity style={[styles.card, styles.profileCardTouchable]} onPress={goToEditCoachProfile}>
                   <Image source={displayProfileImage} style={styles.profileImage} />
                   <View style={styles.profileTextContainer}>
                       <Text style={styles.profileNameText}>{displayFullName}</Text>
                       <Text style={styles.profileActionText}>View & Edit Profile</Text>
                   </View>
                   <Icon name="chevron-forward-outline" size={26} color={PALETTE.darkGrey} />
               </TouchableOpacity>


               <View style={styles.card}>
                   <Text style={styles.sectionTitle}>Account</Text>
                   <SettingsRow label="Reminders" iconName="notifications-outline" onPress={goToCoachReminders} />
                   <SettingsRow label="Change Password" iconName="lock-closed-outline" onPress={goToChangeCoachPwd} />
                   <SettingsRow label="Contact Us" iconName="mail-outline" onPress={goToCoachContactUs} />
                   <SettingsRow label="Delete Account" iconName="trash-bin-outline" onPress={goToDeleteCoachAccount} isDestructive={true}/>
               </View>

            
               <View style={styles.card}>
                   <TouchableOpacity style={styles.logoutTouchable} onPress={handleLogout}>
                       <Icon name="log-out-outline" size={SIZES.iconSize} color={PALETTE.rejectRed} style={styles.settingsRowIcon} />
                       <Text style={styles.logoutLabel}>Log Out</Text>
                   </TouchableOpacity>
               </View>

           </ScrollView>
           <ProTabNavigation />

     
           <Modal
              animationType="fade" transparent={true} visible={isLogoutModalVisible}
              onRequestClose={() => setIsLogoutModalVisible(false)} >
              <Pressable style={styles.modalOverlay} onPress={() => setIsLogoutModalVisible(false)}>
                
                  <View style={styles.modalContent}>
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

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    screenContainerFlex: { flex: 1 },
    scrollContent: {
        paddingHorizontal: SIZES.paddingHorizontal,
        paddingVertical: 25,
        paddingBottom: 100, 
    },
    centeredLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream },
    card: {
        backgroundColor: PALETTE.lightOrange,
        borderRadius: 20,
        marginBottom: SIZES.cardMarginBottom,
        elevation: 2, shadowColor: PALETTE.grey,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
        overflow: 'hidden',
    },
    profileCardTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.cardPadding, 
    },
    profileImage: {
        width: SIZES.profileImage, height: SIZES.profileImage,
        borderRadius: SIZES.profileImage / 2,
        marginRight: SIZES.cardPadding,
        backgroundColor: PALETTE.grey,
        borderWidth: 2, borderColor: PALETTE.white,
    },
    profileTextContainer: { flex: 1, justifyContent: 'center', },
    profileNameText: { fontSize: SIZES.titleFont + 1, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGreen, marginBottom: 4, },
    profileActionText: { fontSize: SIZES.detailFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', },
    sectionTitle: {
        fontSize: 14, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGrey, 
        marginBottom: 8, paddingHorizontal: SIZES.cardPadding,
        paddingTop: SIZES.cardPadding, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    settingsRowTouchable: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: SIZES.rowVerticalPadding, paddingHorizontal: SIZES.cardPadding,
       
    },
    settingsRowSeparator: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: PALETTE.lightCream, 
        marginHorizontal: SIZES.cardPadding, 
    },
    settingsRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10, },
    settingsRowIcon: { marginRight: 15, width: SIZES.iconSize, textAlign: 'center', color: PALETTE.darkGrey },
    settingsRowLabel: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', },
    destructiveText: { color: PALETTE.rejectRed },
    logoutTouchable: { flexDirection: 'row', paddingVertical: SIZES.rowVerticalPadding, paddingHorizontal: SIZES.cardPadding, alignItems: 'center', },
    logoutLabel: { fontSize: SIZES.labelFont, color: PALETTE.rejectRed, fontFamily: 'Quicksand_600SemiBold', },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.modalOverlay, },
    modalContent: { width: '80%', maxWidth: 320, backgroundColor: PALETTE.lightCream, borderRadius: SIZES.modalBorderRadius, paddingTop: SIZES.modalPadding, alignItems: 'center', overflow: 'hidden', elevation: 5, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, },
    modalTitle: { fontSize: SIZES.modalTitleFont, fontFamily: 'Quicksand_700Bold', color: PALETTE.modalText, marginBottom: 8, textAlign: 'center', },
    modalMessage: { fontSize: SIZES.modalMessageFont, fontFamily: 'Quicksand_500Medium', color: PALETTE.modalText, textAlign: 'center', marginBottom: SIZES.modalPadding - 5, paddingHorizontal: 10, lineHeight: 18 },
    modalButtonSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.grey, opacity: 0.5, alignSelf: 'stretch', },
    modalButtonContainer: { flexDirection: 'row', width: '100%', height: SIZES.modalButtonHeight, },
    modalButton: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    modalVerticalSeparator: { width: StyleSheet.hairlineWidth, backgroundColor: PALETTE.grey, opacity: 0.5, height: '100%', },
    modalCancelButtonText: { fontSize: SIZES.modalButtonFont, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.modalButtonCancelText, fontWeight: '600', },
    modalConfirmButtonText: { fontSize: SIZES.modalButtonFont, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.modalButtonDestructiveText, fontWeight: 'bold', },
});

export default CoachSettings;