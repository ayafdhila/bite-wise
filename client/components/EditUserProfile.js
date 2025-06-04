import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform, Image, Dimensions, showGlobalActivity, Modal // Added Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRefImport, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage as firebaseStorage } from '../firebaseConfig'; // Ensure this is your initialized Firebase Storage instance

import Header from './Header';
import TabNavigation from './TabNavigation';
import { AuthContext } from '../components/AuthContext';
const defaultProfileImage = require('../assets/Images/DefaultProfilee.jpg');

const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', acceptGreen: '#4CAF50', declineRed: '#F44336', errorRed: '#D32F2F', buttonBorder: '#E0E0E0', buttonSelectedBackground: '#E8F5E9', buttonSelectedBorder: '#88A76C', buttonSelectedText: '#2E4A32', disabledInputBackground: '#e0e0e0', disabledInputText: '#757575', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF', ignoreButtonBackground: '#88A76C', ignoreButtonText: '#FFFFFF', };
const SIZES = { profileImage: 100, titleFont: 16, labelFont: 15, detailFont: 13, inputFont: 15, optionFont: 14, paddingHorizontal: 15, cardPadding: 15, rowVerticalPadding: 12, cardMarginBottom: 15, inputPaddingVertical: 10, inputPaddingHorizontal: 12, inputMarginBottom: 18, iconSize: 20, optionButtonPaddingVertical: 10, optionButtonPaddingHorizontal: 15, optionButtonMargin: 5, optionButtonBorderRadius: 20, };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const GOALS = ["Losing weight", "Maintaining Weight", "Gaining weight"];
const GENDERS = ["Male", "Female", "Other"];
const TRANSFORMATION_GOALS = [ "I want to feel more confident in my body", "I want to improve my energy and overall health", "I want to build strength and endurance", "I want to develop better eating habits", "I have a specific goal (event, sport, lifestyle change)", "Other 📝" ];
const DIETARY_PREFERENCES = [ "Vegan 🌱", "Vegetarian 🥕", "Pescatarian 🐟", "Gluten-Free 🍞", "Lactose Intolerant 🥛", "Low-Sodium Diet🧂", "Seafood or Shellfish Allergy 🦐", "Diabetic-Friendly Diet 🍬", "Religious Dietary Restrictions (Halal/Kosher, etc.) 🙏", "No Restrictions ✅", "Other 📝" ];
const ACTIVITY_LEVELS = [ "Mostly Sitting 🪑", "Lightly Active 🚶", "Moderately Active 🏃‍♂️", "Active Lifestyle 🚴", "Highly Active 💪" ];

const EditUserProfile = () => {
    const navigation = useNavigation();
    const { user, getIdToken, refreshUserProfile, setUser: setContextUser } = useContext(AuthContext);
    const [initialProfileData, setInitialProfileData] = useState(null); 
    const [formValues, setFormValues] = useState({ firstName: '', lastName: '', email: user?.email || '', age: '', height: '', weight: '', targetWeight: '' });
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [selectedGender, setSelectedGender] = useState(null);
    const [otherGenderText, setOtherGenderText] = useState('');
    const [selectedTransformationGoals, setSelectedTransformationGoals] = useState([]);
    const [otherTransformationGoalText, setOtherTransformationGoalText] = useState('');
    const [selectedDietaryPreferences, setSelectedDietaryPreferences] = useState([]);
    const [otherDietaryPrefText, setOtherDietaryPrefText] = useState('');
    const [selectedActivityLevel, setSelectedActivityLevel] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // For initial data fetch
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [profileImageUri, setProfileImageUri] = useState(null); // Local URI (file:///...) or "DELETED"
    const [existingProfileImageUrl, setExistingProfileImageUrl] = useState(null); // URL from Firestore
    const [isUploading, setIsUploading] = useState(false);
     const [showPlanPopup, setShowPlanPopup] = useState(false);
    const [popupPlanData, setPopupPlanData] = useState(null);
    const fetchProfileData = useCallback(async () => {
        if (!user?.uid) { setError("User not authenticated."); setIsLoading(false); return; }
        setIsLoading(true); setError(null); console.log(`EditProfile: Fetching profile for UID: ${user.uid}`);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing.");
            const response = await fetch(`${API_BASE_URL}/user/profile/${user.uid}`, { headers: { 'Authorization': `Bearer ${token}` }});
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { const txt = await response.text(); throw new Error(`Non-JSON [${response.status}]: ${txt.substring(0,100)}`); }
            const data = await response.json(); if (!response.ok) throw new Error(data.error || `Fetch failed ${response.status}`);
            console.log("EditProfile: Fetched Data OK:", JSON.stringify(data, null, 2));
            setFormValues({ firstName: data.firstName || '', lastName: data.lastName || '', email: user.email || '', age: data.age?.toString() || '', height: data.height?.toString() || '', weight: data.weight?.toString() || '', targetWeight: data.targetWeight?.toString() || '' });
            setSelectedGoal(data.goal || null);
            setSelectedGender(data.gender || null); setOtherGenderText(data.otherGenderText || '');
            setSelectedTransformationGoals(data.transformationGoals || []); setOtherTransformationGoalText(data.otherTransformationGoalText || '');
            setSelectedDietaryPreferences(data.dietaryPreferences || []); setOtherDietaryPrefText(data.otherDietaryPrefText || '');
            setSelectedActivityLevel(data.activityLevel || null);
            setExistingProfileImageUrl(data.profileImage || data.profileImageUrl || null); // Set existing URL
            setProfileImageUri(null); // Clear local preview/delete flag on fresh fetch
        } catch (err) { console.error("EditProfile: Fetch Error:", err); setError(err.message); }
        finally { setIsLoading(false); }
    }, [user?.uid, user?.email, getIdToken]);

    // useEffect to load initial data
    useEffect(() => {
        // Fetch only if user exists and we haven't fetched yet (isLoading is true initially or after error)
        // Or if isFocused triggers a desire to refetch (can be added with useIsFocused)
        if (user?.uid && isLoading) { // Rely on isLoading to control initial fetch
            console.log("EditProfile Effect: Fetching initial data because user.uid exists and isLoading is true.");
            fetchProfileData();
        } else if (!user?.uid) {
            console.log("EditProfile Effect: No user, ensuring loading is false.");
            setIsLoading(false); // Not loading if no user
        }
    }, [user?.uid, isLoading, fetchProfileData]); // isLoading dependency ensures it runs once after mount if user


    const handleInputChange=(n,v)=>{if(['age','height','weight','targetWeight'].includes(n)){if(v===''||/^\d*\.?\d*$/.test(v)){setFormValues(p=>({...p,[n]:v}));}}else{setFormValues(p=>({...p,[n]:v}));}};const handleOtherGenderChange=(t)=>setOtherGenderText(t);const handleOtherDietaryPrefChange=(t)=>setOtherDietaryPrefText(t);const handleOtherTransformationGoalChange=(t)=>setOtherTransformationGoalText(t);const handleSingleSelect=(s,v,g=false)=>{s(p=>{const n=p===v?null:v;if(g&&n!=='Other')setOtherGenderText('');return n;});};const handleMultiSelect=(s,c,v,d=false,t=false)=>{s(p=>{const n=p.includes(v)?p.filter(i=>i!==v):[...p,v];if(d&&v==="Other 📝"&&!n.includes("Other 📝"))setOtherDietaryPrefText('');if(t&&v==="Other 📝"&&!n.includes("Other 📝"))setOtherTransformationGoalText('');return n;});};

    const uploadImageAsync = async (uri, userId) => {
        if (!firebaseStorage) { Alert.alert("Error", "Storage service not configured."); return null; } // Use firebaseStorage
        if (!uri || !userId) { console.warn("Upload: No URI or UserId"); return null; }
        console.log(`[Upload] Starting for ${userId} with URI: ${uri.substring(0,60)}...`);
        setIsUploading(true); setError(null);
        try {
            const response = await fetch(uri); const blob = await response.blob();
            if(blob.size === 0) throw new Error("Image is empty/invalid.");
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}_profile.${fileExtension}`; // Simpler filename
            const storagePath = `user_profile_images/${userId}/${fileName}`;
            const imageRef = storageRefImport(firebaseStorage, storagePath); // Use imported storageRef and firebaseStorage
            console.log("Uploading to:", imageRef.fullPath);
            const uploadTask = uploadBytesResumable(imageRef, blob, { contentType: blob.type });
            await uploadTask;
            const downloadURL = await getDownloadURL(imageRef);
            console.log("Upload OK! URL:", downloadURL);
            return downloadURL;
        } catch (e) { console.error("Upload Error:", e); Alert.alert("Upload Error", e.message || "Failed."); return null; }
        finally { setIsUploading(false); }
    };

    const deleteImageFromStorage = async (imageUrlToDelete) => {
        if (!imageUrlToDelete || !imageUrlToDelete.startsWith('https://firebasestorage.googleapis.com/')) return;
        try {
            const imageRef = storageRefImport(firebaseStorage, imageUrlToDelete); // Use imported storageRef and firebaseStorage
            console.log("DeleteStorage: Deleting:", imageRef.fullPath);
            await deleteObject(imageRef); console.log("DeleteStorage: Success.");
        } catch (error) { console.error("DeleteStorage Error:", error); }
    };

     const handleSaveChanges = async () => {
        setError(null); // Clear previous errors
        console.log("EditProfile - Save: Initiating save process...");

        // Basic validation for required fields
        if (!formValues.firstName?.trim() || !formValues.lastName?.trim() || !selectedGoal || !selectedGender || !selectedActivityLevel) {
            Alert.alert("Missing Information", "Please fill all required fields (*).");
            return;
        }

        setIsSaving(true); // Set loading state for the entire save operation
        let finalProfileImageUrl = existingProfileImageUrl; // Start with existing image URL

        try {
            // --- Step 1: Image Handling ---
            if (profileImageUri === "DELETED") {
                console.log("EditProfile - Save: Profile image marked for deletion.");
                if (existingProfileImageUrl) {
                    console.log("EditProfile - Save: Deleting existing image from storage:", existingProfileImageUrl);
                    await deleteImageFromStorage(existingProfileImageUrl); // Assuming deleteImageFromStorage is defined
                }
                finalProfileImageUrl = null; // Set to null after deletion
            } else if (profileImageUri && profileImageUri !== existingProfileImageUrl) {
                // New image was selected (profileImageUri is a local file URI)
                console.log("EditProfile - Save: New profile image selected. Uploading...");
                setIsUploading(true); // Indicate image upload specifically if needed for UI
                const newUrl = await uploadImageAsync(profileImageUri, user.uid); // Assuming uploadImageAsync is defined
                setIsUploading(false);
                if (newUrl) {
                    console.log("EditProfile - Save: New image uploaded successfully. URL:", newUrl);
                    // If there was an old image, delete it from storage
                    if (existingProfileImageUrl) {
                        console.log("EditProfile - Save: Deleting old existing image from storage:", existingProfileImageUrl);
                        await deleteImageFromStorage(existingProfileImageUrl);
                    }
                    finalProfileImageUrl = newUrl; // Update to the new URL
                } else {
                    // Critical failure if new image upload fails but an image was selected
                    throw new Error("New profile image upload failed. Changes not saved.");
                }
            }
            // If no new image selected and not deleted, finalProfileImageUrl remains existingProfileImageUrl

            // --- Step 2: Prepare Profile Data for the first API call ---
            const profileDataToSave = {
                firstName: formValues.firstName.trim(),
                lastName: formValues.lastName.trim(),
                // Email is usually not updated via profile, taken from Auth context
                age: formValues.age ? parseInt(formValues.age, 10) : null,
                height: formValues.height ? parseFloat(formValues.height) : null,
                weight: formValues.weight ? parseFloat(formValues.weight) : null,
                targetWeight: formValues.targetWeight ? parseFloat(formValues.targetWeight) : null,
                goal: selectedGoal,
                gender: selectedGender,
                otherGenderText: selectedGender === 'Other' ? (otherGenderText.trim() || null) : null,
                transformationGoals: selectedTransformationGoals,
                otherTransformationGoalText: selectedTransformationGoals.includes("Other 📝") ? (otherTransformationGoalText.trim() || null) : null,
                dietaryPreferences: selectedDietaryPreferences,
                otherDietaryPrefText: selectedDietaryPreferences.includes("Other 📝") ? (otherDietaryPrefText.trim() || null) : null,
                activityLevel: selectedActivityLevel,
                profileImageUrl: finalProfileImageUrl, // Use the determined image URL
                onboardingComplete: true // Assuming completing this form means onboarding is done
            };
            console.log("EditProfile - Save: Profile data for PUT /user/profile:", JSON.stringify(profileDataToSave, null, 2));

            const token = await getIdToken();
            if (!token) throw new Error("Authentication error. Please log in again.");

            // --- Step 3: Call Backend to Update General User Profile ---
            console.log(`EditProfile - Save: Updating user profile at ${API_BASE_URL}/user/profile/${user.uid}`);
            const profileResponse = await fetch(`${API_BASE_URL}/user/profile/${user.uid}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                 body: JSON.stringify(profileDataToSave)
            });

            // Check for non-JSON response from profile update
            const profileResponseContentType = profileResponse.headers.get("content-type");
            if (!profileResponseContentType?.includes("application/json")) {
                 const text = await profileResponse.text();
                 console.error("EditProfile - Save: Profile update response is NOT JSON. Status:", profileResponse.status, "Body:", text.substring(0, 200));
                 throw new Error(`Server returned non-JSON for profile update. Status: ${profileResponse.status}`);
            }

            const profileResponseData = await profileResponse.json();
            console.log("EditProfile - Save: Profile update backend response:", profileResponseData);
            if (!profileResponse.ok) {
                throw new Error(profileResponseData.error || profileResponseData.message || "Failed to save profile details.");
            }
            // Profile was updated, now trigger plan recalculation

            // --- Step 4: Call Backend to Recalculate and Get Nutrition Plan ---
            const planRecalcEndpoint = `${API_BASE_URL}/nutritionPlan/${user.uid}`;
            console.log(`EditProfile - Save: Triggering plan recalculation via PUT ${planRecalcEndpoint}`);
            const planResponse = await fetch(planRecalcEndpoint, {
                method: 'PUT', // As per your nutritionPlanRoutes.js
                headers: {
                    'Content-Type': 'application/json', // Although body might be empty, standard for PUT/POST
                    'Authorization': `Bearer ${token}`
                },
                // Your nutritionPlanController.saveNutritionPlan calculates based on user data
                // already in Firestore (which was just updated), so no specific body needed here.
                // body: JSON.stringify({}) // Send empty body if backend expects JSON content-type
            });

            const planResponseContentType = planResponse.headers.get("content-type");
            if (!planResponseContentType?.includes("application/json")) {
                 const text = await planResponse.text();
                 console.error("EditProfile - Save: Plan recalculation response is NOT JSON. Status:", planResponse.status, "Body:", text.substring(0, 200));
                 throw new Error(`Server returned non-JSON for plan recalculation. Status: ${planResponse.status}`);
            }

            const planResponseData = await planResponse.json();
            console.log("EditProfile - Save: Plan recalculation backend response:", planResponseData);
            if (!planResponse.ok) {
                throw new Error(planResponseData.error || planResponseData.message || "Failed to update nutrition plan after profile save.");
            }

            // If both API calls were successful

            setExistingProfileImageUrl(finalProfileImageUrl); // Update local knowledge of saved image
            setProfileImageUri(null); // Clear the local temporary URI
            setInitialProfileData(profileDataToSave); // Update the 'initial data' for "ignore changes" to current saved state

            // --- Show Popup with plan from the SECOND API call's response ---
            if (planResponseData.nutritionPlan) {
                console.log("EditProfile: New nutrition plan received from /nutritionPlan endpoint:", planResponseData.nutritionPlan);
                setPopupPlanData(planResponseData.nutritionPlan);
                setShowPlanPopup(true); // This triggers the modal
            } else {
                console.warn("EditProfile: newNutritionPlan was NOT found in the response from /nutritionPlan endpoint. Modal will not show for plan.");
            }

            // Refresh global user context
            // The backend response from /user/profile/:uid should contain the updated user object
            if (profileResponseData.user && setContextUser) {
                console.log("EditProfile: Updating context with user data from profileResponseData.");
                setContextUser(profileResponseData.user);
            } else if (refreshUserProfile) {
                console.log("EditProfile: Calling generic refreshUserProfile from context.");
                await refreshUserProfile();
            }

        } catch (error) {
            console.error("EditProfile - Save: Error during save sequence:", error);
            Alert.alert("Error Updating Profile", error.message || "An unexpected error occurred. Please try again.");
            setError(error.message); // Set error state to display in UI if needed
        } finally {
            setIsSaving(false); // Stop overall save loading indicator
            setIsUploading(false); // Ensure upload indicator is also off
        }
    };

    // --- handleChoosePhoto & handleRemovePhoto & handleIgnoreChanges ---
    const handleChoosePhoto = async () => { const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Please allow access to your photos in settings."); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 }); if (r.canceled || !r.assets || r.assets.length === 0) return; setProfileImageUri(r.assets[0].uri); console.log("New local image URI:", r.assets[0].uri); };
    const handleRemovePhoto = () => { Alert.alert( "Remove Photo?", "This will remove your current profile picture.", [ { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => { setProfileImageUri("DELETED"); console.log("Image marked for deletion."); } } ]); };
    const handleIgnoreChanges = () => { if (!initialProfileData) { fetchProfileData(); return; } console.log("Ignoring changes, resetting form..."); setFormValues({ firstName: initialProfileData.firstName || '', lastName: initialProfileData.lastName || '', email: user?.email || '', age: initialProfileData.age?.toString() || '', height: initialProfileData.height?.toString() || '', weight: initialProfileData.weight?.toString() || '', targetWeight: initialProfileData.targetWeight?.toString() || '' }); setSelectedGoal(initialProfileData.goal || null); setSelectedGender(initialProfileData.gender || null); setOtherGenderText(initialProfileData.otherGenderText || ''); setSelectedTransformationGoals(initialProfileData.transformationGoals || []); setOtherTransformationGoalText(initialProfileData.otherTransformationGoalText || ''); setSelectedDietaryPreferences(initialProfileData.dietaryPreferences || []); setOtherDietaryPrefText(initialProfileData.otherDietaryPrefText || ''); setSelectedActivityLevel(initialProfileData.activityLevel || null); setProfileImageUri(null); // Clear any selected local image/delete flag
        setExistingProfileImageUrl(initialProfileData.profileImageUrl || null); // Reset to original fetched URL
        setError(null); };

    // --- Render Helpers & Get Image Source ---
    const RenderSelectableButton = ({ value, selectedValue, onPress }) => { const isSelected = value === selectedValue; return ( <TouchableOpacity style={[styles.optionButton, isSelected ? styles.optionButtonSelected : styles.optionButtonDeselected]} onPress={onPress} disabled={isSaving||isUploading}><Text style={[styles.optionButtonText, isSelected ? styles.optionButtonTextSelected : styles.optionButtonTextDeselected]}>{value}</Text></TouchableOpacity> ); };
    const RenderMultiSelectableButton = ({ value, selectedValues, onPress }) => { const isSelected = selectedValues.includes(value); return ( <TouchableOpacity style={[styles.optionButton, isSelected ? styles.optionButtonSelected : styles.optionButtonDeselected]} onPress={onPress} disabled={isSaving||isUploading}><Text style={[styles.optionButtonText, isSelected ? styles.optionButtonTextSelected : styles.optionButtonTextDeselected]}>{value}</Text></TouchableOpacity> ); };
    const getProfileImageSource = () => {
         if (profileImageUri === "DELETED") return defaultProfileImage;
         if (profileImageUri) return { uri: profileImageUri }; // New local image selected
         if (existingProfileImageUrl) return { uri: existingProfileImageUrl }; // Existing remote image
         return defaultProfileImage; // Fallback if nothing else
    };


    return (
        <View style={styles.mainContainer}>
            <Header subtitle={"Edit Profile"} />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
                <>
                     <View style={styles.profileImageContainer}>
                         <TouchableOpacity onPress={handleChoosePhoto} disabled={showGlobalActivity}>
                             <Image source={getProfileImageSource()} style={styles.profileImage} />
                             {/* Show upload indicator over the image */}
                             {isUploading && ( <View style={styles.uploadIndicatorOverlay}><ActivityIndicator size="large" color={PALETTE.white} /></View> )}
                             {/* Show edit icon only if not uploading */}
                             {!isUploading && profileImageUri !== "DELETED" && ( <View style={styles.editImageIconOverlay}><Icon name="camera-outline" size={SIZES.iconSize + 4} color={PALETTE.white} /></View> )}
                         </TouchableOpacity>
                         {/* Add Remove Photo Button if an image exists */}
                         {(profileImageUri || existingProfileImageUrl) && profileImageUri !== "DELETED" && !isUploading && (
                             <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton} disabled={showGlobalActivity}>
                                 <Icon name="trash-outline" size={SIZES.iconSize -2} color={PALETTE.errorRed} />
                                 <Text style={styles.removePhotoText}>Remove</Text>
                             </TouchableOpacity>
                         )}
                     </View>

                     {error && <Text style={styles.errorText}>{error}</Text>} {/* Display general errors */}

                     {/* --- FORMULAIRE --- */}
                     {/* Card 1: Basic Info */}
                     <View style={styles.card}>
                         <View style={styles.fieldGroup}><Text style={styles.label}>First Name *</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.firstName} onChangeText={(t) => handleInputChange('firstName', t)} editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                         <View style={styles.fieldGroup}><Text style={styles.label}>Last Name *</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.lastName} onChangeText={(t) => handleInputChange('lastName', t)} editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                         <View style={styles.fieldGroup}><Text style={styles.label}>Email</Text><View style={styles.inputRow}><TextInput style={[styles.input, styles.disabledInput]} value={user?.email || ''} editable={false}/></View></View>
                      </View>

                     {/* Card 2: Goal */}
                     <View style={styles.card}>
                          <Text style={styles.cardTitle}>What is your main goal? *</Text>
                          <View style={styles.optionContainerHorizontal}>
                              {GOALS.map(goal => (<RenderSelectableButton key={goal} value={goal} selectedValue={selectedGoal} onPress={() => handleSingleSelect(setSelectedGoal, goal)} /> ))}
                          </View>
                     </View>

                      {/* Card 3: Gender, Age, Height */}
                      <View style={styles.card}>
                          <View style={styles.fieldGroup}><Text style={styles.label}>Gender *</Text><View style={styles.optionContainerHorizontal}>{GENDERS.map(g => (<RenderSelectableButton key={g} value={g} selectedValue={selectedGender} onPress={() => handleSingleSelect(setSelectedGender, g, true)} /> ))}</View>{selectedGender === 'Other' && (<View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherGenderText} onChangeText={handleOtherGenderChange} placeholder="Please specify" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View>)}</View>
                          <View style={styles.fieldGroup}><Text style={styles.label}>Age</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.age} onChangeText={(t) => handleInputChange('age', t)} keyboardType="numeric" placeholder="e.g., 25" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                          <View style={styles.fieldGroup}><Text style={styles.label}>Height (cm)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.height} onChangeText={(t) => handleInputChange('height', t)} keyboardType="numeric" placeholder="e.g., 170" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                     </View>

                      {/* Card 4: Weights */}
                      <View style={styles.card}>
                           <View style={styles.fieldGroup}><Text style={styles.label}>Current Weight (kg)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.weight} onChangeText={(t) => handleInputChange('weight', t)} keyboardType="numeric" placeholder="e.g., 70" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                           <View style={styles.fieldGroup}><Text style={styles.label}>Target Weight (kg)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.targetWeight} onChangeText={(t) => handleInputChange('targetWeight', t)} keyboardType="numeric" placeholder="e.g., 65" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View>
                      </View>

                     {/* Card 5: Transformation Goals */}
                     <View style={styles.card}>
                          <Text style={styles.cardTitle}>What's driving your transformation?</Text>
                          <View style={styles.optionContainer}>{TRANSFORMATION_GOALS.map(g => (<RenderMultiSelectableButton key={g} value={g} selectedValues={selectedTransformationGoals} onPress={() => handleMultiSelect(setSelectedTransformationGoals, selectedTransformationGoals, g, false, true)} />))}</View>
                          {selectedTransformationGoals.includes("Other 📝") && ( <View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherTransformationGoalText} onChangeText={handleOtherTransformationGoalChange} placeholder="Specify your other goal" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View> )}
                      </View>

                      {/* Card 6: Dietary Preferences */}
                      <View style={styles.card}>
                           <Text style={styles.cardTitle}>Dietary preferences or restrictions?</Text>
                           <View style={styles.optionContainer}>{DIETARY_PREFERENCES.map(p => (<RenderMultiSelectableButton key={p} value={p} selectedValues={selectedDietaryPreferences} onPress={() => handleMultiSelect(setSelectedDietaryPreferences, selectedDietaryPreferences, p, true)} /> ))}</View>
                           {selectedDietaryPreferences.includes("Other 📝") && ( <View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherDietaryPrefText} onChangeText={handleOtherDietaryPrefChange} placeholder="Specify your other preference" editable={!showGlobalActivity}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View> )}
                      </View>

                      {/* Card 7: Activity Level */}
                      <View style={styles.card}>
                          <Text style={styles.cardTitle}>How active are you daily? *</Text>
                          <View style={styles.optionContainer}>{ACTIVITY_LEVELS.map(l => (<RenderSelectableButton key={l} value={l} selectedValue={selectedActivityLevel} onPress={() => handleSingleSelect(setSelectedActivityLevel, l)} />))}</View>
                      </View>

                     {/* Action Buttons */}
                     <TouchableOpacity style={[styles.button, styles.saveButton, showGlobalActivity && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={showGlobalActivity}>
                         {isSaving ? <ActivityIndicator size="small" color={PALETTE.nextButtonText} /> : <Text style={styles.buttonText}>Save Changes</Text>}
                     </TouchableOpacity>
                     
                </>
            </ScrollView>
            <TabNavigation />
             <Modal
                animationType="slide"
                transparent={true}
                visible={showPlanPopup}
                onRequestClose={() => setShowPlanPopup(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay} // Use your style
                    activeOpacity={1}
                    onPressOut={() => setShowPlanPopup(false)} // Close on overlay press
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}> {/* Use your style */}
                        <Text style={styles.modalTitle}>Your Plan is Updated!</Text> {/* Use your style */}
                        {popupPlanData && (
                            <View style={styles.planDetailsContainer}> {/* Use your style */}
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Calories:</Text><Text style={styles.planDetailValue}>{popupPlanData.calories?.toFixed(0)} kcal</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Protein:</Text><Text style={styles.planDetailValue}>{popupPlanData.protein?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Carbs:</Text><Text style={styles.planDetailValue}>{popupPlanData.carbs?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fat:</Text><Text style={styles.planDetailValue}>{popupPlanData.fat?.toFixed(0)} g</Text></View>
                                <View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fiber:</Text><Text style={styles.planDetailValue}>{popupPlanData.fiberGoal}</Text></View>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton} // Use your style
                            onPress={() => setShowPlanPopup(false)}
                        >
                            <Text style={styles.closeButtonText}>Got it!</Text> {/* Use your style */}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// --- Styles (Keep YOUR existing styles as passed before) ---
// This should be your complete styles object from before
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    scrollContainer: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 120 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream, padding: 20 },
    profileImageContainer: { alignItems: 'center', marginBottom: 15, position: 'relative' }, // Reduced bottom margin
    profileImage: { width: SIZES.profileImage, height: SIZES.profileImage, borderRadius: SIZES.profileImage / 2, borderWidth: 2, borderColor: PALETTE.mediumGreen, backgroundColor: PALETTE.lightOrange },
    editImageIconOverlay: { position: 'absolute', bottom: 0, right: 5, backgroundColor: 'rgba(46, 74, 50, 0.7)', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    uploadIndicatorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.profileImage / 2, },
    removePhotoButton: { // Style for the remove photo button
        flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white,
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15,
        marginTop: 8, elevation: 1, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1,
    },
    removePhotoText: { marginLeft: 5, color: PALETTE.errorRed, fontSize: SIZES.detailFont, fontFamily: 'Quicksand_500Medium'},
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding, marginBottom: SIZES.cardMarginBottom, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardTitle: { fontSize: SIZES.titleFont, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, marginBottom: 15, textAlign: 'left' },
    fieldGroup: { marginBottom: SIZES.inputMarginBottom },
    label: { fontSize: SIZES.labelFont, marginBottom: 8, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1, borderColor: PALETTE.buttonBorder },
    input: { flex: 1, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 2, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' }, // Added font family
    editIcon: { paddingHorizontal: 10, color: PALETTE.grey },
    disabledInput: { backgroundColor: PALETTE.disabledInputBackground, color: PALETTE.disabledInputText },
    optionContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    optionContainerHorizontal: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' },
    optionButton: { paddingVertical: SIZES.optionButtonPaddingVertical, paddingHorizontal: SIZES.optionButtonPaddingHorizontal, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1.5, margin: SIZES.optionButtonMargin, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.white, borderColor: PALETTE.buttonBorder },
    optionButtonDeselected: { backgroundColor: PALETTE.white, borderColor: PALETTE.buttonBorder },
    optionButtonSelected: { borderColor: PALETTE.buttonSelectedBorder, backgroundColor: PALETTE.buttonSelectedBackground },
    optionButtonText: { fontSize: SIZES.optionFont, fontFamily: 'Quicksand_500Medium', textAlign: 'center' },
    optionButtonTextDeselected: { color: PALETTE.darkGrey },
    optionButtonTextSelected: { color: PALETTE.buttonSelectedText, fontFamily: 'Quicksand_700Bold' },
    button: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'center', elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, marginVertical: 5, width: '90%'  },
    saveButton: { backgroundColor: PALETTE.nextButtonBackground, marginTop: 20, marginBottom: 10, width: '90%' }, // Reduced top margin
    retryButton: { backgroundColor: PALETTE.nextButtonBackground, marginTop: 20, paddingHorizontal: 30, },
    ignoreButton: { backgroundColor: PALETTE.ignoreButtonBackground, marginBottom: 15, elevation: 1, },
    ignoreButtonText: { color: PALETTE.ignoreButtonText, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    buttonDisabled: { backgroundColor: PALETTE.grey, elevation: 0, shadowOpacity: 0 },
    buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
    errorTextTitle: { fontSize: 18, fontFamily: 'Quicksand_700Bold', color: PALETTE.errorRed, marginBottom: 10, textAlign: 'center' },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginVertical: 10, fontSize: 14, fontFamily: 'Quicksand_500Medium', paddingHorizontal: 10 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)' },
    modalContent: { backgroundColor: PALETTE.lightCream, paddingVertical: 25, paddingHorizontal: 20, borderRadius: 15, width: '88%', alignItems: 'stretch', elevation: 10, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
    modalTitle: { fontSize: 22, fontFamily: "Quicksand_700Bold", marginBottom: 20, color: PALETTE.darkGreen, textAlign: 'center' },
    planDetailsContainer: { marginBottom: 20, width: '100%' },
    planDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
    planDetailLabel: { fontSize: 16, fontFamily: "Quicksand_600SemiBold", color: PALETTE.darkGrey },
    planDetailValue: { fontSize: 16, fontFamily: "Quicksand_700Bold", color: PALETTE.darkGreen },
    closeButton: { marginTop: 15, backgroundColor: PALETTE.darkGreen, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, alignSelf: 'center' },
    closeButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: "Quicksand_700Bold" },
});

export default EditUserProfile;