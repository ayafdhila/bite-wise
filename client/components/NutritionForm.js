// screens/NutritionForm.js
import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, TextInput, ScrollView,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView, StyleSheet, Dimensions
} from 'react-native';
// Assuming your main styles are in a file at this relative path
import stylesFromSheet from './Styles'; // IF YOU HAVE A CENTRAL STYLES.JS
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/Feather'; // For password eye
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import PhoneInput from 'react-native-phone-number-input';
// Removed AuthContext if not used in this specific form
// import { AuthContext } from '../components/AuthContext';

// --- API Base URL ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Default for Android emulator

// --- Palette (Define your theme colors here or import from a central file) ---
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
    placeholderGrey: '#B0B0B0',
};

// --- Main Component ---
export default function NutritionForm() {
    const navigation = useNavigation();
    const route = useRoute();
    // const { user } = useContext(AuthContext); // Uncomment if needed

    const { userType } = route.params || {}; // Get userType passed from UserType screen

    // --- State ---
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(''); // Raw number
    const [formattedPhoneNumber, setFormattedPhoneNumber] = useState(''); // Formatted number
    const [specialization, setSpecialization] = useState('');
    const [workplace, setWorkplace] = useState('');
    const [shortBio, setShortBio] = useState('');
    const [profileImage, setProfileImage] = useState(null);    // { uri, name, type }
    const [certificateImage, setCertificateImage] = useState(null); // { uri, name, type }
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const phoneInput = useRef(null);

    // --- Permissions Effect ---
    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (libraryStatus.status !== 'granted') {
                    console.warn('[Permissions] Media Library permissions were not granted.');
                }
            }
        })();
    }, []);

    // --- Phone Number Handler ---
    const handlePhoneChange = (number) => {
        setPhoneNumber(number);
        const isValid = phoneInput.current?.isValidNumber(number);
        if (isValid) {
            const numberDetails = phoneInput.current?.getNumberAfterPossiblyEliminatingZero();
            setFormattedPhoneNumber(numberDetails?.formattedNumber || number);
        } else {
            setFormattedPhoneNumber('');
        }
    };

    // --- Image/Document Picker ---
    const pickImage = useCallback(async (type) => {
        try {
            let result, asset, fileName, mimeType, fileExtension;
            if (type === 'certificate') {
                result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
                if (result.canceled || !result.assets || result.assets.length === 0) return;
                asset = result.assets[0];
                if (!asset.uri || !asset.mimeType) { Alert.alert('File Error', 'Could not get certificate details.'); return; }
                mimeType = asset.mimeType.toLowerCase();
                if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) { Alert.alert('Invalid Type', 'Certificate: PDF, JPG, PNG only.'); return; }
                fileExtension = mimeType.split('/')[1] || 'file';
                fileName = asset.name || `certificate_${Date.now()}.${fileExtension}`;
                setCertificateImage({ uri: asset.uri, name: fileName, type: mimeType });
            } else if (type === 'profile') {
                const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission', 'Photo library access needed.'); return; }
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
                if (result.canceled || !result.assets || result.assets.length === 0) return;
                asset = result.assets[0];
                if (!asset.uri) { Alert.alert('Image Error', 'Could not get image location.'); return; }
                mimeType = asset.type || asset.mimeType || 'image/jpeg';
                const uriParts = asset.uri.split('.');
                fileExtension = uriParts.pop()?.toLowerCase() || 'jpg';
                if (!['jpg', 'jpeg', 'png'].includes(fileExtension)) fileExtension = 'jpg';
                if (fileExtension === 'jpeg') mimeType = 'image/jpeg'; else mimeType = `image/${fileExtension}`;
                let baseName = asset.fileName || `profile_${Date.now()}`;
                const nameParts = baseName.split('.'); if (nameParts.length > 1) nameParts.pop(); baseName = nameParts.join('.');
                fileName = `${baseName}.${fileExtension}`;
                setProfileImage({ uri: asset.uri, name: fileName, type: mimeType });
            }
        } catch (error) { console.error(`[File Picker Error] ${type}:`, error); Alert.alert('Error', `Failed to pick ${type}.`); }
    }, []);

    // --- Handle Form Submission ---
    const handleSubmit = useCallback(async () => {
        let errors = [];
        const trimmedFirstName = firstName.trim(); const trimmedLastName = lastName.trim();
        const trimmedEmail = email.trim().toLowerCase(); const trimmedYears = yearsOfExperience.trim();
        const trimmedWorkplace = workplace.trim(); const trimmedBio = shortBio.trim();

        if (!trimmedFirstName) errors.push('First Name'); /* ... other validations ... */
        if (!trimmedLastName) errors.push('Last Name');
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.push('Valid E-mail');
        if (!password) errors.push('Password'); else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) { Alert.alert('Weak Password', '8+ chars, Upper, Lower, Num, Symbol.'); return; }
        if (password !== confirmPassword) { Alert.alert('Password Mismatch', 'Passwords do not match.'); return; }
        if (!formattedPhoneNumber || !phoneInput.current?.isValidNumber(phoneNumber)) errors.push('Valid Phone Number');
        if (!trimmedYears || isNaN(parseInt(trimmedYears, 10)) || parseInt(trimmedYears, 10) < 0 || parseInt(trimmedYears, 10) > 70) errors.push('Years of Exp (0-70)');
        if (!specialization) errors.push('Specialization');
        if (!trimmedWorkplace) errors.push('Workplace');
        if (!trimmedBio) errors.push('Short Bio');
        if (!profileImage) errors.push('Profile Image');
        if (!certificateImage) errors.push('Certificate File');
        if (errors.length > 0) { Alert.alert('Missing Information', `Please complete:\n- ${errors.join('\n- ')}`); return; }

        const formData = new FormData();
        formData.append('firstName', trimmedFirstName); formData.append('lastName', trimmedLastName);
        formData.append('email', trimmedEmail); formData.append('password', password);
        formData.append('confirmPassword', confirmPassword); formData.append('phoneNumber', formattedPhoneNumber);
        formData.append('yearsOfExperience', trimmedYears); formData.append('specialization', specialization);
        formData.append('workplace', trimmedWorkplace); formData.append('shortBio', trimmedBio);
        formData.append('userType', userType || 'Professional');

        if (!certificateImage?.uri || !certificateImage?.name || !certificateImage?.type) { Alert.alert('File Error', 'Cert details incomplete.'); return; }
        formData.append('professionalCertificate', { uri: Platform.OS === 'android' ? certificateImage.uri : certificateImage.uri.replace('file://', ''), type: certificateImage.type, name: certificateImage.name });
        if (!profileImage?.uri || !profileImage?.name || !profileImage?.type) { Alert.alert('File Error', 'Profile img details incomplete.'); return; }
        formData.append('profileImage', { uri: Platform.OS === 'android' ? profileImage.uri : profileImage.uri.replace('file://', ''), type: profileImage.type, name: profileImage.name });

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expert/register`, { method: 'POST', headers: { 'Accept': 'application/json' }, body: formData });
            const responseData = await response.json();
            if (response.ok) {
           
                navigation.reset({ index: 0, routes: [{ name: 'PendingVerificationScreen' }] });
            } else { Alert.alert('Registration Failed', responseData.error || `Server error (${response.status}).`); }
        } catch (error) { console.error('[Submit] Network/Fetch Error:', error); Alert.alert('Network Error', 'Could not connect.'); }
        finally { setIsSubmitting(false); }
    }, [
        firstName, lastName, email, password, confirmPassword, phoneNumber, formattedPhoneNumber,
        yearsOfExperience, specialization, workplace, shortBio, profileImage, certificateImage,
        userType, navigation // Add all state/props used
    ]);

    // --- RETURN JSX ---
    return (
        <KeyboardAvoidingView  style={styles.container} >
            <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
            <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={32} color={PALETTE.black} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                <Text style={styles.headerTitle}>Become a BiteWise Coach</Text>
                <Text style={styles.headerSubtitle}>Share your expertise with our users.</Text>

                {/* Form Fields with Labels */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>First Name</Text>
                    <TextInput style={styles.input} placeholder='Enter First Name' value={firstName} onChangeText={setFirstName} autoCapitalize="words" returnKeyType="next" />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Last Name</Text>
                    <TextInput style={styles.input} placeholder='Enter Last Name' value={lastName} onChangeText={setLastName} autoCapitalize="words" returnKeyType="next" />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>E-mail Address</Text>
                    <TextInput style={styles.input} placeholder='your.email@example.com' keyboardType='email-address' autoCapitalize='none' value={email} onChangeText={setEmail} returnKeyType="next" />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.passwordInputContainer}>
                        <TextInput style={styles.passwordInput} placeholder='Create a strong password' secureTextEntry={!isPasswordVisible} value={password} onChangeText={setPassword} textContentType="newPassword" returnKeyType="next" />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIconContainer}><Icon name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} color={PALETTE.grey} /></TouchableOpacity>
                    </View>
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View style={styles.passwordInputContainer}>
                        <TextInput style={styles.passwordInput} placeholder='Re-enter your password' secureTextEntry={!isPasswordVisible} value={confirmPassword} onChangeText={setConfirmPassword} textContentType="newPassword" returnKeyType="next" />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIconContainer}><Icon name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} color={PALETTE.grey} /></TouchableOpacity>
                    </View>
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <PhoneInput
                        ref={phoneInput} defaultValue={phoneNumber} defaultCode='TN' layout='first'
                        onChangeText={handlePhoneChange}
                        containerStyle={styles.phoneInputContainer} // Custom style for phone input container
                        textInputStyle={styles.phoneInputText}
                        textInputProps={{ returnKeyType: 'next', placeholderTextColor: PALETTE.placeholderGrey }}
                        codeTextStyle={styles.phoneInputCodeText}
                        flagButtonStyle={styles.phoneInputFlagButton}
                        withShadow={false}
                    />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Years of Experience</Text>
                    <TextInput style={styles.input} placeholder='e.g., 5' keyboardType='numeric' value={yearsOfExperience} onChangeText={setYearsOfExperience} returnKeyType="next" />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Specialization</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={specialization} onValueChange={setSpecialization} style={styles.pickerStyle} prompt="Select Specialization" itemStyle={styles.pickerItemStyle} >
                            <Picker.Item label="Select Specialization..." value="" style={{ color: PALETTE.grey }} />
                            <Picker.Item label="Clinical Nutrition" value="Clinical Nutrition" />
                            <Picker.Item label="Sports Nutrition" value="Sports Nutrition" />
                            <Picker.Item label="Weight Management" value="Weight Management" />
                            <Picker.Item label="Pediatric Nutrition" value="Pediatric Nutrition" />
                            <Picker.Item label="Digestive Health" value="Digestive Health" />
                        </Picker>
                    </View>
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Workplace</Text>
                    <TextInput style={styles.input} placeholder='e.g., Clinic Name, Hospital' value={workplace} onChangeText={setWorkplace} returnKeyType="next" />
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Short Bio (max 500 characters)</Text>
                    <TextInput style={styles.bioInput} placeholder='Tell clients about your expertise...' multiline={true} maxLength={500} value={shortBio} onChangeText={setShortBio} returnKeyType="done" />
                </View>

                {/* File Uploads */}
                <TouchableOpacity onPress={() => pickImage('certificate')} style={styles.uploadButtonContainer} >
                    <Ionicons name='document-attach-outline' size={26} color={PALETTE.darkGreen} style={styles.uploadIcon} />
                    <Text style={styles.uploadButtonText}>{certificateImage ? 'Change Certificate' : 'Upload Certificate (PDF/Image)'}</Text>
                </TouchableOpacity>
                {certificateImage && (
                  <View style={styles.filePreviewRow}>
                    <Ionicons name="checkmark-circle" size={20} color={PALETTE.successGreen} style={styles.fileIcon} />
                    <Text numberOfLines={1} ellipsizeMode="middle" style={styles.fileNameText}>{certificateImage.name}</Text>
                    <TouchableOpacity onPress={() => setCertificateImage(null)} style={styles.removeFileIcon}><Ionicons name="close-circle" size={22} color={PALETTE.errorRed} /></TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity onPress={() => pickImage('profile')} style={styles.uploadButtonContainer} >
                  <Ionicons name='image-outline' size={26} color={PALETTE.darkGreen} style={styles.uploadIcon}/>
                  <Text style={styles.uploadButtonText}>{profileImage ? 'Change Profile Image' : 'Upload Profile Image'}</Text>
                </TouchableOpacity>
                {profileImage && (
                  <View style={styles.filePreviewRow}>
                    <Image source={{ uri: profileImage.uri }} style={styles.profileImagePreview} />
                    <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.fileNameText, {flexShrink: 1}]}>{profileImage.name}</Text>
                    <TouchableOpacity onPress={() => setProfileImage(null)} style={styles.removeFileIcon}><Ionicons name="close-circle" size={22} color={PALETTE.errorRed} /></TouchableOpacity>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity onPress={handleSubmit} style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} disabled={isSubmitting} >
                  {isSubmitting ? <ActivityIndicator size="small" color={PALETTE.white} /> : <Text style={styles.submitButtonText}>Create Account</Text>}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- Local Styles for NutritionForm ---
// These styles aim for a more visually appealing and themed form
const styles = StyleSheet.create({
    container: { // From your original styles
        flex: 1,
        backgroundColor: PALETTE.lightCream, // Themed
        // Removed padding to apply to ScrollView content
    },
    topLeaf: { // From your original styles
        width: 200, height: 200, transform: [{ rotate: '91.171deg' }],
        top: 0, left: -50, position: 'absolute', 
    },
    bottomLeaf: { // From your original styles
        width: 200, height: 200, transform: [{ rotate: '91.171deg' }, {scaleY: -1}, {scaleX: -1}],
        bottom: 0, right: -50, position: 'absolute',
    },
    backButton: { // From your original styles, ensure correct placement
        position: 'absolute', top: 70, left: 10, zIndex: 10,
        padding: 5, // Make tap area larger
    },
    scrollContainer: { width: '100%', flex: 1, marginVertical: 80}, // For ScrollView
    scrollContentContainer: { // Padding for the content inside ScrollView
        paddingTop: 30, // Space for absolute positioned back button and header text
        paddingBottom: 20,
        paddingHorizontal: 25, // Consistent horizontal padding
    },
    headerTitle: { // Was helloText
        fontSize: 35, fontFamily: 'Quicksand_700Bold', color: PALETTE.black,
        textAlign: 'center', marginBottom: 8,
    },
    headerSubtitle: { // Was secondaryText
        fontSize: 20, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey,
        textAlign: 'center', marginVertical: 30,
    },
    fieldContainer: { // Wrapper for label + input
        marginBottom: 18,
    },
    fieldLabel: {
        fontSize: 17, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.black,
        marginBottom: 6, marginLeft: 2,
    },
    input: { // Themed input
        backgroundColor: PALETTE.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 15 : 12, // Platform specific padding
        fontSize: 15, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey,
        borderWidth: 1, borderColor: PALETTE.grey, // Subtle border
        elevation: 1, shadowColor: PALETTE.black, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    passwordInputContainer: { // Themed password container
        flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white,
        borderRadius: 12, borderWidth: 1, borderColor: PALETTE.grey,
        elevation: 1, shadowColor: PALETTE.black, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    passwordInput: {
        flex: 1, height: Platform.OS === 'ios' ? 50 : 48, // Consistent height
        paddingLeft: 15, fontSize: 15, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey,
    },
    eyeIconContainer: { padding: 12, }, // Make eye icon easier to tap
    eyeIcon: { color: PALETTE.grey }, // From your original style
    phoneInputContainer: { // Style for the PhoneInput component's outer container
        width: '100%', height: 50, // Match other inputs
        backgroundColor: PALETTE.white, borderRadius: 12, borderWidth: 1, borderColor: PALETTE.grey,
        elevation: 1, shadowColor: PALETTE.black, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    phoneInputText: { // Style for the text input part of PhoneInput
        height: 48, // Match other inputs
        fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey, fontSize: 15,
        paddingVertical: 0, // Reset default padding if necessary
    },
    phoneInputCodeText: { fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey, fontSize: 12, },
    phoneInputFlagButton: { /* Defaults are usually fine, add if needed */ },
    pickerWrapper: { // Wrapper to style the Picker like an input
        backgroundColor: PALETTE.white, borderRadius: 12, borderWidth: 1, borderColor: PALETTE.grey,
        height: 55, // Consistent height
        justifyContent: 'center', // Center picker vertically
        elevation: 1, shadowColor: PALETTE.black, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    pickerStyle: { flex: 1, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium', fontSize: 14,  // Match other inputs
        ...(Platform.OS === 'android' ? { marginLeft: -8 } : {}), 
    },
    pickerItemStyle: { fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey, fontSize: 14 }, // For dropdown items
    bioInput: { // Themed bio input
        backgroundColor: PALETTE.white, borderRadius: 12, paddingHorizontal: 15,
        paddingVertical: 12, fontSize: 15, fontFamily: 'Quicksand_500Medium', color: PALETTE.darkGrey,
        borderWidth: 1, borderColor: PALETTE.grey, minHeight: 120, textAlignVertical: 'top',
        elevation: 1, shadowColor: PALETTE.black, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    uploadButtonContainer: { // Themed upload button
        flexDirection: 'row', justifyContent: 'space-between', backgroundColor: PALETTE.lightOrange,
        borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, marginVertical: 12,
        alignItems: 'center', elevation: 2, shadowColor: PALETTE.black, shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    uploadButtonText: { // Text in upload buttons
        fontSize: 15, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGreen, flexShrink: 1, marginRight: 10,
    },
    uploadIcon: { color: PALETTE.darkGreen }, // For icons in upload buttons
    filePreviewRow: { // Container for showing selected file info
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
        backgroundColor: PALETTE.white, borderRadius: 8, marginVertical: 5, borderWidth: 1, borderColor: PALETTE.grey,
    },
    fileIcon: { marginRight: 10 },
    fileNameText: { flex: 1, fontSize: 13, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' },
    profileImagePreview: { width: 30, height: 30, borderRadius: 15, marginRight: 10, backgroundColor: PALETTE.grey },
    removeFileIcon: { paddingLeft: 10, }, // For the 'x' icon to remove a file
    submitButton: { // Themed submit button
        backgroundColor: PALETTE.darkGreen, alignItems: 'center', borderRadius: 25,
        paddingVertical: 15, marginTop: 25, marginBottom: 50, // More margin bottom
        elevation: 3, shadowColor: PALETTE.black, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 },
    },
    submitButtonDisabled: { opacity: 0.6, backgroundColor: PALETTE.grey },
    submitButtonText: { // Text for submit button
        color: PALETTE.white, fontSize: 18, fontFamily: 'Quicksand_700Bold',
    },
    // Copied from your original for caloriesSubText, etc. if used (adjust as per your design)
    caloriesSubText: {
        fontSize: 15, fontFamily: 'Quicksand_600SemiBold', color: PALETTE.darkGreen, flexShrink: 1, marginRight: 10,
    },
    // Fallback if stylesFromSheet doesn't provide, add relevant styles from your main sheet
    // e.g., styles.container, styles.topLeaf, styles.bottomLeaf, etc.
});