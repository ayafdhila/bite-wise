import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, Switch, Image, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';
import AdminHeader from '../components/AdminHeader';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRefImport, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage as firebaseStorage } from '../firebaseConfig';

const defaultProfileImage = require('../assets/Images/DefaultProfilee.jpg');

// Palette matching your existing screens
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    acceptGreen: '#4CAF50',
    declineRed: '#F44336',
    errorRed: '#D32F2F',
    buttonBorder: '#E0E0E0',
    buttonSelectedBackground: '#E8F5E9',
    buttonSelectedBorder: '#88A76C',
    buttonSelectedText: '#2E4A32',
    disabledInputBackground: '#e0e0e0',
    disabledInputText: '#757575',
    nextButtonBackground: '#2E4A32',
    nextButtonText: '#FFFFFF',
    ignoreButtonBackground: '#88A76C',
    ignoreButtonText: '#FFFFFF',
    adminBlue: '#42A5F5',
    successGreen: '#4CAF50',
};

// Sizes matching your existing screens
const SIZES = {
    profileImage: 100,
    titleFont: 16,
    labelFont: 15,
    detailFont: 13,
    inputFont: 15,
    optionFont: 14,
    paddingHorizontal: 15,
    cardPadding: 15,
    rowVerticalPadding: 12,
    cardMarginBottom: 15,
    inputPaddingVertical: 10,
    inputPaddingHorizontal: 12,
    inputMarginBottom: 18,
    iconSize: 20,
    optionButtonPaddingVertical: 10,
    optionButtonPaddingHorizontal: 15,
    optionButtonMargin: 5,
    optionButtonBorderRadius: 20,
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const UPDATE_USER_ENDPOINT = (userId) => `${API_BASE_URL}/admin/users/${userId}`;
const GET_USER_ENDPOINT = (userId) => `${API_BASE_URL}/admin/users/${userId}`;

// Constants for Coach specializations
const SPECIALIZATIONS = ["Clinical Nutrition", "Sports Nutrition", "Weight Management", "Pediatric Nutrition", "Digestive Health"];

export default function AdminEditUser() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userId, userType: passedUserType, userName } = route.params; // Get passed userType
    const { getIdToken } = useContext(AuthContext);

    // Initialize formData with the passed userType
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        userType: passedUserType || 'Personal', // Use passed userType as initial value
        profileImageUrl: null,
        // Personal user fields
        age: '',
        gender: '',
        activityLevel: '',
        // Professional user fields
        specialization: '',
        yearsOfExperience: '',
        workplace: '',
        shortBio: '',
        isVerified: false,
        // Status fields
        onboardingComplete: false,
        authDisabled: false,
    });

    const [initialUserData, setInitialUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [profileImageUri, setProfileImageUri] = useState(null);
    const [existingProfileImageUrl, setExistingProfileImageUrl] = useState(null);

    const showGlobalActivity = isLoading || isSaving || isUploading;

    // Update the header to show user type and name
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: `Edit ${passedUserType || 'User'}${userName ? ` - ${userName}` : ''}`,
        });
    }, [navigation, passedUserType, userName]);

    // Fetch user data
    const fetchUserData = useCallback(async () => {
        if (!userId) {
            setError("User ID is missing.");
            setIsLoading(false);
            return;
        }

        console.log(`[ADMIN EDIT] Fetching user data for UID: ${userId}`);
        setIsLoading(true);
        
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication error");

            const response = await fetch(GET_USER_ENDPOINT(userId), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const responseText = await response.text();
            console.log(`[ADMIN EDIT] Response status: ${response.status}`);
            
            if (!response.ok) {
                let errorMessage = responseText;
                try {
                    const errorData = JSON.parse(errorMessage);
                    errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    errorMessage = `Server error (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            console.log("[ADMIN EDIT] Fetched user data:", data);

            // Set initial data
            setInitialUserData(data);
            
            // Populate form with fetched data
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                userType: data.userType || 'Personal',
                authDisabled: data.authDisabled || false,
                isVerified: data.isVerified || false,
                // Coach specific
                phoneNumber: data.phoneNumber || '',
                yearsOfExperience: data.yearsOfExperience?.toString() || '',
                specialization: data.specialization || '',
                workplace: data.workplace || '',
                shortBio: data.shortBio || '',
                // Personal user specific
                age: data.age?.toString() || '',
                height: data.height?.toString() || '',
                weight: data.weight?.toString() || '',
                targetWeight: data.targetWeight?.toString() || '',
                goal: data.goal || '',
                gender: data.gender || '',
                activityLevel: data.activityLevel || '',
            });

            setExistingProfileImageUrl(data.profileImageUrl || data.profileImage || null);
            setProfileImageUri(null);

        } catch (error) {
            console.error("[ADMIN EDIT] Fetch error:", error);
            Alert.alert("Error", error.message || "Failed to load user data");
        } finally {
            setIsLoading(false);
        }
    }, [userId, getIdToken]);

    useEffect(() => {
        if (userId) {
            fetchUserData();
        }
    }, [userId, fetchUserData]);

    // Input handlers matching your existing screens
    const handleInputChange = (name, value) => {
        if (['age', 'height', 'weight', 'targetWeight', 'yearsOfExperience'].includes(name)) {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else if (name === 'phoneNumber') {
            if (value === '' || /^[0-9\s-]*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear errors when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Image handling functions
    const uploadImageAsync = async (uri, userIdForUpload) => {
        if (!firebaseStorage || !uri || !userIdForUpload) return null;
        
        console.log(`[ADMIN EDIT] Starting image upload for ${userIdForUpload}`);
        setIsUploading(true);
        
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            
            if (blob.size === 0) throw new Error("Selected image file is empty");
            
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}_profile.${fileExtension}`;
            const storagePath = `admin_managed_profiles/${userIdForUpload}/${fileName}`;
            
            const storageRef = storageRefImport(firebaseStorage, storagePath);
            console.log("[ADMIN EDIT] Uploading to:", storageRef.fullPath);
            
            await uploadBytesResumable(storageRef, blob, {
                contentType: blob.type || `image/${fileExtension}`
            });
            
            const downloadURL = await getDownloadURL(storageRef);
            console.log("[ADMIN EDIT] Upload success:", downloadURL);
            return downloadURL;
            
        } catch (error) {
            console.error("[ADMIN EDIT] Upload error:", error);
            Alert.alert("Image Upload Error", error.message);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleChoosePhoto = async () => {
        console.log(">>> handleChoosePhoto triggered <<<");
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Allow access to photos.");
                return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8
            });
            
            if (result.canceled) {
                console.log("Image selection cancelled.");
                return;
            }
            
            if (result.assets && result.assets.length > 0) {
                setProfileImageUri(result.assets[0].uri);
                console.log("Selected Image URI:", result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Could not select image.");
        }
    };

    const handleRemovePhoto = () => {
        Alert.alert(
            "Remove Photo?",
            "This will remove the user's current profile picture.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setProfileImageUri("DELETED");
                        console.log("Image marked for deletion.");
                    }
                }
            ]
        );
    };

    // Validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (formData.userType === 'Professional') {
            if (!formData.specialization) {
                newErrors.specialization = 'Specialization is required for coaches';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Save function
    const handleSave = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors and try again.');
            return;
        }

        Alert.alert(
            'Confirm Changes',
            'Are you sure you want to save these changes?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save', onPress: performSave },
            ]
        );
    };

    const performSave = async () => {
        setIsSaving(true);
        let finalImageUrl = existingProfileImageUrl;

        try {
            // Handle image upload/deletion
            if (profileImageUri === "DELETED") {
                console.log("AdminEdit: Profile image marked for deletion.");
                finalImageUrl = null;
            } else if (profileImageUri && profileImageUri !== existingProfileImageUrl) {
                console.log("AdminEdit: New profile image selected. Uploading...");
                const newUrl = await uploadImageAsync(profileImageUri, userId);
                if (newUrl) {
                    finalImageUrl = newUrl;
                } else {
                    throw new Error("Image upload failed");
                }
            }

            // Prepare data for update
            const updateData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                userType: formData.userType,
                authDisabled: formData.authDisabled,
                isVerified: formData.isVerified,
                profileImageUrl: finalImageUrl,
            };

            // Add type-specific fields
            if (formData.userType === 'Professional') {
                updateData.phoneNumber = formData.phoneNumber.trim();
                updateData.yearsOfExperience = formData.yearsOfExperience ? parseInt(formData.yearsOfExperience, 10) : null;
                updateData.specialization = formData.specialization;
                updateData.workplace = formData.workplace.trim();
                updateData.shortBio = formData.shortBio.trim();
            } else if (formData.userType === 'Personal') {
                updateData.age = formData.age ? parseInt(formData.age, 10) : null;
                updateData.height = formData.height ? parseFloat(formData.height) : null;
                updateData.weight = formData.weight ? parseFloat(formData.weight) : null;
                updateData.targetWeight = formData.targetWeight ? parseFloat(formData.targetWeight) : null;
                updateData.goal = formData.goal;
                updateData.gender = formData.gender;
                updateData.activityLevel = formData.activityLevel;
            }

            console.log("AdminEdit: Updating user with data:", JSON.stringify(updateData, null, 2));

            const token = await getIdToken();
            if (!token) throw new Error('Authentication error');

            const response = await fetch(UPDATE_USER_ENDPOINT(userId), {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update user');
            }

            Alert.alert(
                'Success',
                'User information updated successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );

        } catch (error) {
            console.error('Error updating user:', error);
            Alert.alert('Error', error.message || 'Failed to update user information');
        } finally {
            setIsSaving(false);
        }
    };

    // Render helper functions
    const getProfileImageSource = () => {
        if (profileImageUri === "DELETED") return defaultProfileImage;
        if (profileImageUri) return { uri: profileImageUri };
        if (existingProfileImageUrl) return { uri: existingProfileImageUrl };
        return defaultProfileImage;
    };

    const renderInputField = (label, field, options = {}) => {
        const { 
            multiline = false, 
            placeholder = '', 
            editable = true, 
            keyboardType = 'default',
            required = false 
        } = options;
        
        return (
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                    {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
                </Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={[
                            styles.input,
                            multiline && styles.textInputMultiline,
                            !editable && styles.disabledInput,
                            errors[field] && styles.textInputError,
                        ]}
                        value={formData[field]}
                        onChangeText={(text) => handleInputChange(field, text)}
                        placeholder={placeholder}
                        multiline={multiline}
                        numberOfLines={multiline ? 4 : 1}
                        editable={editable && !showGlobalActivity}
                        keyboardType={keyboardType}
                    />
                    {editable && (
                        <Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon} />
                    )}
                </View>
                {errors[field] && (
                    <Text style={styles.errorText}>{errors[field]}</Text>
                )}
            </View>
        );
    };

    const renderSpecializationSelector = () => {
        if (formData.userType !== 'Professional') return null;

        return (
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Specialization *</Text>
                <View style={styles.optionContainer}>
                    {SPECIALIZATIONS.map(spec => (
                        <TouchableOpacity
                            key={spec}
                            style={[
                                styles.optionButton,
                                formData.specialization === spec && styles.optionButtonSelected,
                            ]}
                            onPress={() => handleInputChange('specialization', spec)}
                            disabled={showGlobalActivity}
                        >
                            <Text style={[
                                styles.optionButtonText,
                                formData.specialization === spec && styles.optionButtonTextSelected,
                            ]}>
                                {spec}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.specialization && (
                    <Text style={styles.errorText}>{errors.specialization}</Text>
                )}
            </View>
        );
    };

    const renderSwitchField = (label, field, description) => {
        return (
            <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.switchDescription}>{description}</Text>
                </View>
                <Switch
                    value={formData[field]}
                    onValueChange={(value) => handleInputChange(field, value)}
                    trackColor={{ false: PALETTE.grey, true: PALETTE.mediumGreen }}
                    thumbColor={formData[field] ? PALETTE.darkGreen : PALETTE.darkGrey}
                    disabled={showGlobalActivity}
                />
            </View>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.container}>
                <AdminHeader 
                    subtitle="Edit User" 
                    showBackButton={true}
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                    <Text style={styles.loadingText}>Loading user data...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AdminHeader 
                subtitle="Edit User" 
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />
            
            <ScrollView 
                style={styles.scrollContainer} 
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Image Section */}
                <View style={styles.profileImageContainer}>
                    <TouchableOpacity onPress={handleChoosePhoto} disabled={showGlobalActivity}>
                        <Image source={getProfileImageSource()} style={styles.profileImage} />
                        {isUploading && (
                            <View style={styles.uploadIndicatorOverlay}>
                                <ActivityIndicator size="large" color={PALETTE.white} />
                            </View>
                        )}
                        {!isUploading && profileImageUri !== "DELETED" && (
                            <View style={styles.editImageIconOverlay}>
                                <Icon name="camera-outline" size={SIZES.iconSize + 4} color={PALETTE.white} />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    {/* Remove Photo Button */}
                    {(profileImageUri || existingProfileImageUrl) && profileImageUri !== "DELETED" && !isUploading && (
                        <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton} disabled={showGlobalActivity}>
                            <Icon name="trash-outline" size={SIZES.iconSize - 2} color={PALETTE.errorRed} />
                            <Text style={styles.removePhotoText}>Remove</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Basic Information Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Basic Information</Text>
                    
                    {renderInputField('First Name', 'firstName', { 
                        placeholder: 'Enter first name', 
                        required: true 
                    })}
                    
                    {renderInputField('Last Name', 'lastName', { 
                        placeholder: 'Enter last name', 
                        required: true 
                    })}
                    
                    {renderInputField('Email', 'email', { 
                        placeholder: 'Enter email address', 
                        editable: false 
                    })}

                    {/* Show user type as read-only display */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Account Type</Text>
                        <View style={[styles.inputRow, styles.disabledInput]}>
                            <Text style={[styles.input, styles.disabledInput]}>
                                {formData.userType === 'Professional' ? 'Coach' : formData.userType}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Coach-specific fields */}
                {formData.userType === 'Professional' && (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Professional Information</Text>
                            
                            {renderInputField('Phone Number', 'phoneNumber', { 
                                placeholder: 'Enter phone number',
                                keyboardType: 'phone-pad'
                            })}
                            
                            {renderInputField('Years of Experience', 'yearsOfExperience', { 
                                placeholder: 'e.g., 5',
                                keyboardType: 'numeric'
                            })}
                            
                            {renderSpecializationSelector()}
                            
                            {renderInputField('Workplace', 'workplace', { 
                                placeholder: 'Primary work location'
                            })}
                            
                            {renderInputField('Short Bio', 'shortBio', { 
                                placeholder: 'Brief professional summary',
                                multiline: true
                            })}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Coach Status</Text>
                            {renderSwitchField(
                                'Verified Coach',
                                'isVerified',
                                formData.isVerified ? 'This coach is verified' : 'This coach is not yet verified'
                            )}
                        </View>
                    </>
                )}

                {/* Personal user-specific fields */}
                {formData.userType === 'Personal' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Personal Information</Text>
                        
                        {renderInputField('Age', 'age', { 
                            placeholder: 'e.g., 25',
                            keyboardType: 'numeric'
                        })}
                        
                        {renderInputField('Height (cm)', 'height', { 
                            placeholder: 'e.g., 170',
                            keyboardType: 'numeric'
                        })}
                        
                        {renderInputField('Weight (kg)', 'weight', { 
                            placeholder: 'e.g., 70',
                            keyboardType: 'numeric'
                        })}
                        
                        {renderInputField('Target Weight (kg)', 'targetWeight', { 
                            placeholder: 'e.g., 65',
                            keyboardType: 'numeric'
                        })}
                        
                        {renderInputField('Goal', 'goal', { 
                            placeholder: 'e.g., Losing weight'
                        })}
                        
                        {renderInputField('Gender', 'gender', { 
                            placeholder: 'e.g., Male, Female, Other'
                        })}
                        
                        {renderInputField('Activity Level', 'activityLevel', { 
                            placeholder: 'e.g., Moderately Active'
                        })}
                    </View>
                )}

                {/* Account Status Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Account Status</Text>
                    {renderSwitchField(
                        'Account Access',
                        'authDisabled',
                        formData.authDisabled ? 'Account is currently disabled' : 'Account is currently active'
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => navigation.goBack()}
                        disabled={showGlobalActivity}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, showGlobalActivity && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={showGlobalActivity}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={PALETTE.white} />
                        ) : (
                            <>
                                <Icon name="save-outline" size={18} color={PALETTE.white} />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

// Styles matching your existing screens
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.lightCream,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PALETTE.lightCream,
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: SIZES.labelFont,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_500Medium',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: SIZES.paddingHorizontal,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 25,
        position: 'relative',
    },
    profileImage: {
        width: SIZES.profileImage,
        height: SIZES.profileImage,
        borderRadius: SIZES.profileImage / 2,
        borderWidth: 2,
        borderColor: PALETTE.mediumGreen,
        backgroundColor: PALETTE.lightOrange,
    },
    editImageIconOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 5,
        backgroundColor: 'rgba(46, 74, 50, 0.7)',
        padding: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadIndicatorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.profileImage / 2,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.white,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginTop: 8,
        elevation: 1,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
    },
    removePhotoText: {
        marginLeft: 5,
        color: PALETTE.errorRed,
        fontSize: SIZES.detailFont,
        fontFamily: 'Quicksand_500Medium',
    },
    card: {
        backgroundColor: PALETTE.lightOrange,
        borderRadius: 15,
        padding: SIZES.cardPadding,
        marginBottom: SIZES.cardMarginBottom,
        elevation: 2,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: {
        fontSize: SIZES.titleFont,
        fontFamily: 'Quicksand_700Bold',
        color: PALETTE.darkGrey,
        marginBottom: 15,
        textAlign: 'left',
    },
    fieldGroup: {
        marginBottom: SIZES.inputMarginBottom,
    },
    label: {
        fontSize: SIZES.labelFont,
        marginBottom: 8,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_500Medium',
    },
    requiredAsterisk: {
        color: PALETTE.errorRed,
        fontFamily: 'Quicksand_700Bold',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.white,
        borderRadius: SIZES.optionButtonBorderRadius,
        borderWidth: 1,
        borderColor: PALETTE.buttonBorder,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingHorizontal: SIZES.inputPaddingHorizontal,
        paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 2,
        fontSize: SIZES.inputFont,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_500Medium',
    },
    textInputMultiline: {
        height: 100,
        textAlignVertical: 'top',
    },
    textInputError: {
        borderColor: PALETTE.errorRed,
        borderWidth: 2,
    },
    disabledInput: {
        backgroundColor: PALETTE.disabledInputBackground,
        color: PALETTE.disabledInputText,
    },
    editIcon: {
        paddingHorizontal: 10,
        color: PALETTE.grey,
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Quicksand_500Medium',
        color: PALETTE.errorRed,
        marginTop: 5,
    },
    userTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: -SIZES.optionButtonMargin,
    },
    optionButton: {
        paddingVertical: SIZES.optionButtonPaddingVertical,
        paddingHorizontal: SIZES.optionButtonPaddingHorizontal,
        borderRadius: SIZES.optionButtonBorderRadius,
        borderWidth: 1.5,
        margin: SIZES.optionButtonMargin,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PALETTE.white,
        borderColor: PALETTE.buttonBorder,
        flex: 1,
        marginHorizontal: 5,
    },
    optionButtonSelected: {
        borderColor: PALETTE.buttonSelectedBorder,
        backgroundColor: PALETTE.buttonSelectedBackground,
    },
    optionButtonText: {
        fontSize: SIZES.optionFont,
        fontFamily: 'Quicksand_500Medium',
        textAlign: 'center',
        color: PALETTE.darkGrey,
    },
    optionButtonTextSelected: {
        color: PALETTE.buttonSelectedText,
        fontFamily: 'Quicksand_700Bold',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: PALETTE.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        elevation: 1,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    switchLabelContainer: {
        flex: 1,
        marginRight: 15,
    },
    switchDescription: {
        fontSize: 12,
        fontFamily: 'Quicksand_500Medium',
        color: PALETTE.darkGrey,
        marginTop: 2,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    button: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginHorizontal: 10,
        elevation: 2,
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cancelButton: {
        backgroundColor: PALETTE.white,
        borderWidth: 1,
        borderColor: PALETTE.mediumGreen,
    },
    cancelButtonText: {
        fontSize: 16,
        fontFamily: 'Quicksand_600SemiBold',
        color: PALETTE.darkGreen,
    },
    saveButton: {
        backgroundColor: PALETTE.darkGreen,
    },
    saveButtonText: {
        fontSize: 16,
        fontFamily: 'Quicksand_600SemiBold',
        color: PALETTE.white,
        marginLeft: 8,
    },
    buttonDisabled: {
        backgroundColor: PALETTE.grey,
        elevation: 0,
        shadowOpacity: 0,
    },
});

// In your AdminNavigator or main navigator:
// import AdminEditUser from '../components/AdminEditUser';

// Add this screen:
// <Stack.Screen 
//     name="AdminEditUser" 
//     component={AdminEditUser}
//     options={{ headerShown: false }}
// />