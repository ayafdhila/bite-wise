import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform, Image, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from '../firebaseConfig';
import ProHeader from './ProHeader'; // Utilisation de ProHeader
import ProTabNavigation from './ProTabNavigation';
import { AuthContext } from './AuthContext'; 
const defaultProfileImage = require('../assets/Images/DefaultProfilee.jpg');

// Palette
const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', acceptGreen: '#4CAF50', declineRed: '#F44336', errorRed: '#D32F2F', buttonBorder: '#E0E0E0', buttonSelectedBackground: '#E8F5E9', buttonSelectedBorder: '#88A76C', buttonSelectedText: '#2E4A32', disabledInputBackground: '#e0e0e0', disabledInputText: '#757575', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF', ignoreButtonBackground: '#88A76C', ignoreButtonText: '#FFFFFF', linkColor: '#007AFF' };

// Sizes
const SIZES = { profileImage: 100, titleFont: 16, labelFont: 15, detailFont: 13, inputFont: 15, optionFont: 14, paddingHorizontal: 15, cardPadding: 15, rowVerticalPadding: 12, cardMarginBottom: 15, inputPaddingVertical: 10, inputPaddingHorizontal: 12, inputMarginBottom: 18, iconSize: 20, optionButtonPaddingVertical: 10, optionButtonPaddingHorizontal: 15, optionButtonMargin: 5, optionButtonBorderRadius: 20, phoneInputWidthCode: 70, bioInputHeight: 100 };

// Base URL & Options
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const SPECIALIZATIONS = ["Clinical Nutrition", "Sports Nutrition", "Weight Management", "Pediatric Nutrition", "Digestive Health"];

// Component Name matches the export
const EditCoachProfile = () => {
    const navigation = useNavigation();
    const { user: coach, getIdToken, refreshUserProfile } = useContext(AuthContext);

    // States
    const [formValues, setFormValues] = useState({ firstName: '', lastName: '', email: '', phoneCountryCode: '', phoneNumber: '', yearsExperience: '', workplace: '', shortBio: '' });
    const [selectedSpecialization, setSelectedSpecialization] = useState(null);
    const [isLoading, setIsLoading] = useState(!!coach);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [profileImageUri, setProfileImageUri] = useState(null);
    const [initialProfileData, setInitialProfileData] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingCert, setIsUploadingCert] = useState(false);
    const [selectedCertificateUri, setSelectedCertificateUri] = useState(null);
    const [initialCertificateUrl, setInitialCertificateUrl] = useState(null);
    const [certificateFileName, setCertificateFileName] = useState(null);

    // Combined loading/saving state for disabling buttons
    const showGlobalActivity = isLoading || isUploadingImage || isUploadingCert || isSaving;
    // console.log("Current showGlobalActivity state:", showGlobalActivity, {isLoading, isUploadingImage, isUploadingCert, isSaving}); // Keep for debug if needed


    // --- Fetch Initial Profile Data ---
    const fetchProfileData = useCallback(async () => {
        if (!coach?.uid) { setError("Coach not authenticated."); setIsLoading(false); return; }
         console.log(`[FETCH START] Fetching coach profile for UID: ${coach.uid}`); setError(null);
         try {
             const token = await getIdToken();
             const apiUrl = `${API_BASE_URL}/expert/profile/${coach.uid}`; // Correct URL
             console.log(`[FETCH] Requesting URL: ${apiUrl}`);
             const response = await fetch(apiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
             const responseText = await response.text();
             console.log(`[FETCH RESPONSE] Status: ${response.status}, Response Text (start): ${responseText.substring(0, 250)}`);
             if (!response.ok) { let e = responseText; try {const j = JSON.parse(e); e = j.error || j.message || JSON.stringify(j);} catch (p) {if (e.includes("Cannot GET")) {e = `Server route not found (${response.status})`;} else {e = e.substring(0, 200) + "...";}} console.error(`[FETCH FAIL] Fetch failed: ${response.status} - ${e}`); throw new Error(`Fetch fail: ${response.status} - ${e}`); }
             const data = JSON.parse(responseText); console.log("[FETCH SUCCESS] Fetched Coach Data OK. Data:", data);
             setInitialProfileData({ ...data }); // Store initial data
             setFormValues({ // Populate form with fetched data
                 firstName: data.firstName || '', lastName: data.lastName || '', email: coach.email || '',
                 phoneCountryCode: data.phoneCountryCode || '', phoneNumber: data.phoneNumber || '',
                 yearsExperience: data.yearsExperience?.toString() || '', // Use yearsExperience from data
                 workplace: data.workplace || '', shortBio: data.shortBio || '' });
             setSelectedSpecialization(data.specialization || null);
             setInitialCertificateUrl(data.professionalCertificateUrl || null); // Use the key returned by GET
             setInitialProfileData(prev => ({...prev, profileImageUrl: data.profileImageUrl})); // Ensure image URL is in initial data
             setCertificateFileName(data.professionalCertificateUrl ? 'Existing Certificate' : null);
             setProfileImageUri(null); setSelectedCertificateUri(null); console.log("[FETCH SUCCESS] State updated.");
         } catch (err) { console.error("[FETCH CATCH ERROR] Error during fetch:", err); setError(err.message || "Could not load profile data."); setInitialProfileData(null); }
         finally { console.log("[FETCH FINALLY] Setting isLoading to false."); setIsLoading(false); }
    }, [coach?.uid, coach?.email, getIdToken]);

    // useEffect to load data
    useEffect(() => {
        console.log("[EFFECT] Running effect. Coach UID:", coach?.uid);
        if (coach?.uid) {
             fetchProfileData(); // Call fetch when UID is available
        } else {
             setIsLoading(false); setInitialProfileData(null); // Reset if no UID
        }
    }, [coach?.uid, fetchProfileData]); // Depend on UID and the fetch function itself


    // --- Input Handlers ---
    const handleInputChange = (name, value) => {
        if (name === 'yearsExperience') { if (value === '' || /^\d+$/.test(value)) setFormValues(prev => ({ ...prev, [name]: value })); }
        else if (name === 'phoneCountryCode') { if (value === '' || /^\+?\d{0,4}$/.test(value)) setFormValues(prev => ({ ...prev, [name]: value })); }
        else if (name === 'phoneNumber') { if (value === '' || /^[0-9\s-]*$/.test(value)) setFormValues(prev => ({ ...prev, [name]: value })); }
        else setFormValues(prev => ({ ...prev, [name]: value }));
    };
    const handleSingleSelect = (setter, value) => { setter(prev => (prev === value ? null : value)); };

    // --- Upload Functions (with state management) ---
    const uploadImageAsync = async (uri, coachId) => {
        if (!storage || !uri || !coachId) return null;
        console.log(`[Upload Img] Starting for ${coachId}`);
        setIsUploadingImage(true); setError(null);
        try {
            const response = await fetch(uri); const blob = await response.blob();
            if (blob.size === 0) throw new Error("Selected image file is empty");
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            // --- V V V --- CORRECTED FILENAME AND PATH --- V V V ---
            const fileName = `${Date.now()}_profile.${fileExtension}`; // Simpler filename, or keep your coachId prefix if desired
            const storagePath = `nutritionist_profile_images/${coachId}/${fileName}`; // Use "nutritionist_profile_images"
            // --- ^ ^ ^ --- END CORRECTION --- ^ ^ ^ ---
            const storageRef = ref(storage, storagePath);
            console.log("[Upload Img] To:", storageRef.fullPath);
            await uploadBytesResumable(storageRef, blob, { contentType: blob.type || `image/${fileExtension}` }); // Provide contentType fallback
            const downloadURL = await getDownloadURL(storageRef);
            console.log("[Upload Img] Success URL:", downloadURL);
            return downloadURL;
        } catch (e) { console.error("[Upload Img] Err:", e); Alert.alert("Image Upload Error", e.message); setError(`Image upload failed: ${e.message}`); return null; }
        finally { console.log("[Upload Img] Finished."); setIsUploadingImage(false); }
    };

    const uploadCertificateAsync = async (uri, coachId, originalFileName) => {
        if (!storage || !uri || !coachId) return null;
        console.log(`[Upload Cert] Starting for ${coachId}`);
        setIsUploadingCert(true); setError(null);
        try {
            const response = await fetch(uri); const blob = await response.blob();
            if (blob.size === 0) throw new Error("Selected certificate file is empty");
            // Ensure a safe filename for certificate, typically PDF. Extension is less critical for storage path itself.
            const safeFileNameBase = originalFileName ? originalFileName.replace(/[^a-zA-Z0-9.]/g, '_') : `certificate_${Date.now()}`;
            const fileExtension = originalFileName?.split('.').pop()?.toLowerCase() || 'pdf'; // Default to pdf
            const fileName = `${safeFileNameBase}.${fileExtension}`;

            // --- V V V --- CORRECTED CERTIFICATE PATH --- V V V ---
            const storagePath = `nutritionist_certificates/${coachId}/${fileName}`; // Use "nutritionist_certificates"
            // --- ^ ^ ^ --- END CORRECTION --- ^ ^ ^ ---
            const storageRef = ref(storage, storagePath);
            console.log("[Upload Cert] To:", storageRef.fullPath);
            await uploadBytesResumable(storageRef, blob, { contentType: blob.type || 'application/pdf' }); // Provide contentType fallback
            const downloadURL = await getDownloadURL(storageRef);
            console.log("[Upload Cert] Success URL:", downloadURL);
             return downloadURL;
        } catch (e) { console.error("[Upload Cert] Err:", e); Alert.alert("Certificate Upload Error", e.message); setError(`Certificate upload failed: ${e.message}`); return null; }
        finally { console.log("[Upload Cert] Finished."); setIsUploadingCert(false); }
    };
   

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        console.log(">>> handleSaveChanges triggered <<<");
        setError(null);
        if (!formValues.firstName?.trim() || !formValues.lastName?.trim()) { Alert.alert("Missing Information", "First name and last name are required."); return; }
        if (!selectedSpecialization) { Alert.alert("Missing Information", "Please select your specialization."); return; }

        setIsSaving(true);
        let finalImageUrl = initialProfileData?.profileImageUrl || null; // Start with existing image URL
        let finalCertificateUrl = initialCertificateUrl; // Start with existing cert URL
        let uploadsSuccessful = true;

        try {
            // Upload Image if a new one was selected
            if (profileImageUri) {
                console.log("Save: Uploading new profile image...");
                const newImageUrl = await uploadImageAsync(profileImageUri, coach.uid);
                if (newImageUrl) { finalImageUrl = newImageUrl; }
                else { uploadsSuccessful = false; } // Set flag to false if upload failed
            }

            // Upload Certificate if a new one was selected AND previous uploads were okay
            if (selectedCertificateUri && uploadsSuccessful) {
                console.log("Save: Uploading new certificate...");
                const newCertUrl = await uploadCertificateAsync(selectedCertificateUri, coach.uid, certificateFileName);
                if (newCertUrl) { finalCertificateUrl = newCertUrl; }
                else { uploadsSuccessful = false; } // Set flag to false if upload failed
            }

            // Proceed with API call ONLY if all necessary uploads succeeded
            if (uploadsSuccessful) {
                 console.log("Save: Proceeding with API update...");
                 // Prepare data - Ensure keys match what the PUT endpoint expects
                 // Based on GET, backend likely expects 'yearsOfExperience', 'profileImage', 'professionalCertificate'
                 const profileData = {
                    firstName: formValues.firstName.trim(),
                    lastName: formValues.lastName.trim(),
                    phoneNumber: formValues.phoneNumber.trim(),
                    yearsOfExperience: formValues.yearsExperience, // Send the value from the form state
                    specialization: selectedSpecialization,
                    workplace: formValues.workplace.trim(),
                    shortBio: formValues.shortBio.trim(),
                    profileImage: finalImageUrl, // Send the final (potentially new) image URL
                    professionalCertificate: finalCertificateUrl // Send the final (potentially new) cert URL
                 };
                 console.log("Save: Data to backend:", JSON.stringify(profileData));

                 const token = await getIdToken();
                 const updateUrl = `${API_BASE_URL}/expert/profile/${coach.uid}`; // PUT Endpoint
                 console.log(`Saving profile update to ${updateUrl}`);

                 const response = await fetch(updateUrl, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                     body: JSON.stringify(profileData)
                 });
                 const responseText = await response.text();
                 console.log(`Save response (${response.status}):`, responseText.substring(0, 200));

                 if (!response.ok) {
                     let e=responseText; try{const j=JSON.parse(e); e=j.error||j.message||JSON.stringify(j);}catch(p){}
                     console.error(`Save API call failed: ${response.status} - ${e}`);
                     throw new Error(`Save failed: ${response.status} - ${e}`);
                 }

                 Alert.alert("Success", "Profile updated!");

                 // Update local initial data to reflect the saved state
                 // Use the URLs that were actually sent to the backend
                 setInitialProfileData(prev => ({
                     ...prev,
                     ...profileData, // Update with all sent form data
                     profileImageUrl: finalImageUrl, // Update image URL locally
                     professionalCertificateUrl: finalCertificateUrl // Update cert URL locally
                 }));
                 setProfileImageUri(null); // Clear local image selection
                 setSelectedCertificateUri(null); // Clear local cert selection
                 setInitialCertificateUrl(finalCertificateUrl); // Update state for initial cert URL
                 setCertificateFileName(finalCertificateUrl ? 'Existing Certificate' : null); // Update display name

                 if(refreshUserProfile) await refreshUserProfile(); // Refresh global context
                 // navigation.goBack(); // Optionnel: retourne en arrière

            } else {
                 console.log("Save: Halted because one or more uploads failed.");
                 // Error alert was already shown by the failing upload function
            }

        } catch (err) {
            console.error("handleSaveChanges Error:", err);
            setError(err.message || "An unexpected error occurred while saving.");
            Alert.alert("Error", `Could not save profile: ${err.message || "Unknown error"}`);
        } finally {
            console.log("handleSaveChanges Finished.");
            setIsSaving(false); // <<< Stop Saving indicator
        }
    };


    // --- File Choosers and Other Handlers ---
    const handleChoosePhoto = async () => {
        console.log(">>> handleChoosePhoto triggered <<<");
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) { Alert.alert("Permission Required", "Allow access to photos."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
            if (result.canceled) { console.log("Image selection cancelled."); return; }
            if (result.assets && result.assets.length > 0) { setProfileImageUri(result.assets[0].uri); console.log("Selected Image URI:", result.assets[0].uri); setError(null); }
        } catch(e) { console.error("Error picking image:", e); Alert.alert("Error", "Could not select image."); }
    };
     const handleChooseCertificate = async () => {
        console.log(">>> handleChooseCertificate triggered <<<");
        try {
            const result = await DocumentPicker.getDocumentAsync({
                // --- V V V --- ALLOW MULTIPLE COMMON CERTIFICATE TYPES --- V V V ---
                type: [
                    'application/pdf', // For PDF files
                    'image/jpeg',      // For .jpg and .jpeg files
                    'image/png'        // For .png files
                    // Add 'image/*' if you want to allow ANY image type, but can be too broad
                ],
                // --- ^ ^ ^ --- END ALLOW MULTIPLE TYPES --- ^ ^ ^ ---
                copyToCacheDirectory: true, // Recommended for reliable file access
                multiple: false // Ensure only one file is selected
            });

            // Log the entire result object from DocumentPicker for detailed debugging
            console.log("Document Picker Result:", JSON.stringify(result, null, 2));

            // Modern Expo SDKs (>=48) primarily use result.canceled and result.assets
            if (result.canceled) {
                console.log("Certificate selection cancelled by user.");
                return; // Exit if cancelled
            }

            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                console.log("Selected Certificate Asset:", JSON.stringify(asset, null, 2));

                // Basic validation of the asset
                if (asset.uri && asset.name && asset.size && asset.size > 0) {
                    // Check if MIME type is one of the allowed ones, though picker should filter
                    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                    if (asset.mimeType && allowedMimeTypes.includes(asset.mimeType.toLowerCase())) {
                        setSelectedCertificateUri(asset.uri);
                        setCertificateFileName(asset.name); // Use the actual file name
                        setError(null); // Clear previous errors
                        console.log("Selected Cert URI:", asset.uri, "Name:", asset.name, "Type:", asset.mimeType);
                    } else {
                        Alert.alert("Invalid File Type", `Selected file type (${asset.mimeType}) is not supported. Please select a PDF, JPG, or PNG.`);
                        setSelectedCertificateUri(null);
                        setCertificateFileName(initialCertificateUrl ? 'Current Certificate' : null);
                    }
                } else {
                    Alert.alert("Invalid File", "The selected file is invalid or empty. Please try again.");
                    setSelectedCertificateUri(null);
                    setCertificateFileName(initialCertificateUrl ? 'Existing Certificate' : null);
                }
            } else if (result.type === 'success' && result.uri) {
                // Fallback for older SDKs or different (less common) result structures
                console.log("Using legacy DocumentPicker result structure for certificate.");
                setSelectedCertificateUri(result.uri);
                setCertificateFileName(result.name || 'selected_document');
                setError(null);
            } else if (result.type !== 'cancel' && !result.canceled) {
                // If not success, not cancelled, and no assets (should be rare)
                Alert.alert("File Error", "Could not select the file. Please try again or choose a different file.");
                setSelectedCertificateUri(null);
                setCertificateFileName(initialCertificateUrl ? 'Current Certificate' : null);
            }

        } catch (err) {
            console.error("Error picking document (certificate):", err);
            Alert.alert("Error", "An error occurred while selecting the certificate. Please ensure you have a file manager app installed or try again.");
        }
    };
    
    const handleViewCertificate = () => {
        console.log(">>> handleViewCertificate triggered <<<");
        console.log("Attempting to open URL:", initialCertificateUrl);
        if (initialCertificateUrl && typeof initialCertificateUrl === 'string' && initialCertificateUrl.startsWith('http')) {
            Linking.openURL(initialCertificateUrl).catch(err => { console.error("Failed to open cert URL:", err); Alert.alert("Error", "Could not open file."); });
        } else { Alert.alert("No Certificate", initialCertificateUrl ? "Invalid URL." : "No certificate uploaded."); }
    };
    const RenderSelectableButton = ({ value, selectedValue, onPress }) => ( <TouchableOpacity style={[styles.optionButton, value === selectedValue ? styles.optionButtonSelected : styles.optionButtonDeselected]} onPress={onPress} disabled={showGlobalActivity}><Text style={[styles.optionButtonText, value === selectedValue ? styles.optionButtonTextSelected : styles.optionButtonTextDeselected]}>{value}</Text></TouchableOpacity> );
    const getProfileImageSource = () => { if (profileImageUri) return { uri: profileImageUri }; if (initialProfileData?.profileImageUrl) return { uri: initialProfileData.profileImageUrl }; return defaultProfileImage; };


    // --- RENDER LOGIC ---
    if (isLoading) { return ( <View style={styles.mainContainer}><ProHeader subtitle="Edit Profile" onBackPress={() => navigation.goBack()}/><View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View><ProTabNavigation /></View> ); }
    if (!coach) { return ( <View style={styles.mainContainer}><ProHeader subtitle="Edit Profile" onBackPress={() => navigation.goBack()} /><View style={styles.centered}><Text style={styles.errorText}>Coach not logged in.</Text></View><ProTabNavigation /></View> ); }
    if (error && !initialProfileData) { return ( <View style={styles.mainContainer}><ProHeader subtitle="Edit Profile" onBackPress={() => navigation.goBack()} /><View style={styles.centered}><Text style={styles.errorTextTitle}>Error Loading Profile</Text><Text style={styles.errorText}>{String(error)}</Text><TouchableOpacity style={[styles.button, styles.retryButton]} onPress={fetchProfileData} disabled={isLoading}><Text style={styles.buttonText}>Retry</Text></TouchableOpacity></View><ProTabNavigation /></View> ); }

    // --- Rendu Principal ---
    return (
        <View style={styles.mainContainer}>
            <ProHeader subtitle={"Edit Profile"} onBackPress={() => navigation.goBack()} />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
                <>
                    {/* Image Profil */}
                    <View style={styles.profileImageContainer}>
                         <TouchableOpacity onPress={handleChoosePhoto} disabled={showGlobalActivity}>
                             <Image source={getProfileImageSource()} style={styles.profileImage} />
                             {isUploadingImage && ( <View style={styles.uploadIndicatorOverlay}><ActivityIndicator size="large" color={PALETTE.white} /></View> )}
                             {!isUploadingImage && ( <View style={styles.editImageIconOverlay}><Icon name="camera-outline" size={SIZES.iconSize + 4} color={PALETTE.white} /></View> )}
                         </TouchableOpacity>
                     </View>
                     {error && initialProfileData && <Text style={styles.errorText}>{error}</Text>}

                    {/* FORMULAIRE */}
                     <View style={styles.card}>
                         <View style={styles.fieldGroup}><Text style={styles.label}>First Name</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.firstName} onChangeText={(t) => handleInputChange('firstName', t)} editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                         <View style={styles.fieldGroup}><Text style={styles.label}>Last Name</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.lastName} onChangeText={(t) => handleInputChange('lastName', t)} editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                         <View style={styles.fieldGroup}><Text style={styles.label}>Email Address</Text><View style={styles.inputRow}><TextInput style={[styles.input, styles.disabledInput]} value={coach?.email || ''} editable={false}/></View></View>
                         <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Phone number:</Text>
                            <View style={styles.phoneInputContainer}>
                                <View style={[styles.inputRow, styles.phoneInputRowNumber]}>
                                     <TextInput style={[styles.input, styles.phoneInputNumber]} value={formValues.phoneNumber} onChangeText={(t) => handleInputChange('phoneNumber', t)} placeholder="Phone number" keyboardType="phone-pad" editable={!showGlobalActivity} />
                                </View>
                            </View>
                         </View>
                      </View>
                      <View style={styles.card}>
                          <View style={styles.fieldGroup}><Text style={styles.label}>Years of Experience</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.yearsExperience} onChangeText={(t) => handleInputChange('yearsExperience', t)} keyboardType="numeric" placeholder="e.g., 5" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                          <Text style={[styles.label, {marginBottom: 10}]}>Specialization</Text>
                          <View style={styles.optionContainer}>
                              {SPECIALIZATIONS.map(spec => (<RenderSelectableButton key={spec} value={spec} selectedValue={selectedSpecialization} onPress={() => handleSingleSelect(setSelectedSpecialization, spec)} /> ))}
                          </View>
                      </View>
                      <View style={styles.card}>
                           <View style={styles.fieldGroup}><Text style={styles.label}>Workplace </Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.workplace} onChangeText={(t) => handleInputChange('workplace', t)} placeholder="Your primary work location" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                           <View style={styles.fieldGroup}>
                               <Text style={styles.label}>Short Bio</Text>
                               <View style={[styles.inputRow, {height: SIZES.bioInputHeight, alignItems: 'flex-start'}]}>
                                   <TextInput style={[styles.input, {textAlignVertical: 'top', height: SIZES.bioInputHeight - SIZES.inputPaddingVertical * 2}]} value={formValues.shortBio} onChangeText={(t) => handleInputChange('shortBio', t)} placeholder="Tell users a bit about yourself..." multiline={true} numberOfLines={4} editable={!showGlobalActivity}/>
                                   <Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={[styles.editIcon, {paddingTop: SIZES.inputPaddingVertical }]}/>
                                </View>
                            </View>
                      </View>
                      {/* Section Certificat */}
                      <View style={styles.card}>
                           <Text style={styles.cardTitle}>Professional Certificate </Text>
                           {initialCertificateUrl && !selectedCertificateUri && ( <View style={styles.certificateDisplay}><Icon name="document-attach-outline" size={SIZES.iconSize} color={PALETTE.darkGrey} /><Text style={styles.certificateText} numberOfLines={1}>{certificateFileName || 'Current Certificate'}</Text><TouchableOpacity onPress={handleViewCertificate} disabled={showGlobalActivity}><Text style={styles.viewLink}>View</Text></TouchableOpacity></View> )}
                           {selectedCertificateUri && ( <View style={styles.certificateDisplay}><Icon name="document-attach" size={SIZES.iconSize} color={PALETTE.acceptGreen} /><Text style={styles.certificateText} numberOfLines={1}>{certificateFileName || 'New certificate'}</Text><TouchableOpacity onPress={() => {setSelectedCertificateUri(null); setCertificateFileName(initialCertificateUrl ? 'Existing Certificate' : null);}} disabled={showGlobalActivity}><Icon name="close-circle" size={SIZES.iconSize + 2} color={PALETTE.declineRed} style={{marginLeft: 10}}/></TouchableOpacity></View> )}
                           <TouchableOpacity style={[styles.button, styles.uploadButton, (showGlobalActivity || isUploadingCert) && styles.buttonDisabled]} onPress={handleChooseCertificate} disabled={showGlobalActivity || isUploadingCert}>
                               {isUploadingCert ? ( <ActivityIndicator size="small" color={PALETTE.darkGreen} /> ) : ( <Text style={styles.uploadButtonText}>{initialCertificateUrl || selectedCertificateUri ? 'Replace Certificate' : 'Upload Certificate'}</Text> )}
                           </TouchableOpacity>
                      </View>

                    {/* Boutons d'action */}
                     <TouchableOpacity style={[styles.button, styles.saveButton, showGlobalActivity && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={showGlobalActivity}>
                         {isSaving ? <ActivityIndicator size="small" color={PALETTE.nextButtonText} /> : <Text style={styles.buttonText}>Save Changes</Text>}
                     </TouchableOpacity>
                    
                </>
            </ScrollView>
            <ProTabNavigation />
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
     mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream }, scrollContainer: { flex: 1 }, scrollContentContainer: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 120 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream, padding: 20 }, profileImageContainer: { alignItems: 'center', marginBottom: 25, position: 'relative' }, profileImage: { width: SIZES.profileImage, height: SIZES.profileImage, borderRadius: SIZES.profileImage / 2, borderWidth: 2, borderColor: PALETTE.mediumGreen, backgroundColor: PALETTE.lightOrange }, editImageIconOverlay: { position: 'absolute', bottom: 0, right: 5, backgroundColor: 'rgba(46, 74, 50, 0.7)', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }, uploadIndicatorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.profileImage / 2, }, card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding, marginBottom: SIZES.cardMarginBottom, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, cardTitle: { fontSize: SIZES.titleFont, fontWeight: 'bold', color: PALETTE.darkGrey, marginBottom: 15, textAlign: 'left' }, fieldGroup: { marginBottom: SIZES.inputMarginBottom }, label: { fontSize: SIZES.labelFont, marginBottom: 8, color: PALETTE.darkGrey, fontWeight: '500' }, inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1, borderColor: PALETTE.buttonBorder, overflow: 'hidden' }, input: { flex: 1, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 2, fontSize: SIZES.inputFont, color: PALETTE.darkGrey }, editIcon: { paddingHorizontal: 10, color: PALETTE.grey }, disabledInput: { backgroundColor: PALETTE.disabledInputBackground, color: PALETTE.disabledInputText }, phoneInputContainer: { flexDirection: 'row', alignItems: 'center', }, phoneInputRowCode: { width: SIZES.phoneInputWidthCode, marginRight: 8, }, phoneInputCode: { textAlign: 'center', paddingHorizontal: 5 }, phoneInputRowNumber: { flex: 1, }, phoneInputNumber: { flex: 1, }, bioInput: { height: SIZES.bioInputHeight, textAlignVertical: 'top', }, optionContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: -SIZES.optionButtonMargin }, optionButton: { paddingVertical: SIZES.optionButtonPaddingVertical, paddingHorizontal: SIZES.optionButtonPaddingHorizontal, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1.5, margin: SIZES.optionButtonMargin, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.white, borderColor: PALETTE.buttonBorder }, optionButtonDeselected: { backgroundColor: PALETTE.white, borderColor: PALETTE.buttonBorder }, optionButtonSelected: { borderColor: PALETTE.buttonSelectedBorder, backgroundColor: PALETTE.buttonSelectedBackground }, optionButtonText: { fontSize: SIZES.optionFont, fontWeight: '500', textAlign: 'center' }, optionButtonTextDeselected: { color: PALETTE.darkGrey }, optionButtonTextSelected: { color: PALETTE.buttonSelectedText, fontWeight: 'bold' }, certificateDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, paddingHorizontal: 15, paddingVertical: 12, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1, borderColor: PALETTE.buttonBorder, marginBottom: 15, }, certificateText: { flex: 1, marginLeft: 10, fontSize: SIZES.inputFont, color: PALETTE.darkGrey }, viewLink: { color: PALETTE.linkColor, fontWeight: '500', marginLeft: 10, fontSize: SIZES.inputFont }, uploadButton: { backgroundColor: PALETTE.white, borderColor: PALETTE.darkGreen, borderWidth: 1.5, paddingVertical: 10, alignSelf: 'stretch', marginTop: 5, }, uploadButtonText: { color: PALETTE.darkGreen, fontSize: 15, fontWeight: 'bold' }, button: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'stretch', elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, marginVertical: 5, }, saveButton: { backgroundColor: PALETTE.nextButtonBackground, marginTop: 20, marginBottom: 10, }, retryButton: { backgroundColor: PALETTE.nextButtonBackground, marginTop: 20, paddingHorizontal: 30, alignSelf: 'center' }, ignoreButton: { backgroundColor: PALETTE.ignoreButtonBackground, marginBottom: 15, elevation: 1, }, ignoreButtonText: { color: PALETTE.ignoreButtonText, fontSize: 16, fontWeight: 'bold', }, buttonDisabled: { backgroundColor: PALETTE.grey, elevation: 0, shadowOpacity: 0, borderColor: PALETTE.grey }, buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontWeight: 'bold', }, errorTextTitle: { fontSize: 18, fontWeight: 'bold', color: PALETTE.errorRed, marginBottom: 10, textAlign: 'center' }, errorText: { color: PALETTE.errorRed, textAlign: 'center', marginVertical: 10, fontSize: 14, fontWeight: '500', paddingHorizontal: 10 }
});

export default EditCoachProfile;
