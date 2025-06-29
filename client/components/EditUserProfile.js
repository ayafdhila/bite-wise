import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform, Image, Dimensions, Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRefImport, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage as firebaseStorage } from '../firebaseConfig';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [profileImageUri, setProfileImageUri] = useState(null);
    const [existingProfileImageUrl, setExistingProfileImageUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPlanPopup, setShowPlanPopup] = useState(false);
    const [popupPlanData, setPopupPlanData] = useState(null);

    const fetchProfileData = useCallback(async () => {
        if (!user?.uid) { setError("User not authenticated."); setIsLoading(false); return; }
        setIsLoading(true); setError(null);
        try {
            const token = await getIdToken(); if (!token) throw new Error("Auth token missing.");
            const response = await fetch(`${API_BASE_URL}/user/profile/${user.uid}`, { headers: { 'Authorization': `Bearer ${token}` }});
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { const txt = await response.text(); throw new Error(`Non-JSON [${response.status}]: ${txt.substring(0,100)}`); }
            const data = await response.json(); if (!response.ok) throw new Error(data.error || `Fetch failed ${response.status}`);
            setInitialProfileData(data);
            setFormValues({ firstName: data.firstName || '', lastName: data.lastName || '', email: user.email || '', age: data.age?.toString() || '', height: data.height?.toString() || '', weight: data.weight?.toString() || '', targetWeight: data.targetWeight?.toString() || '' });
            setSelectedGoal(data.goal || null);
            setSelectedGender(data.gender || null); setOtherGenderText(data.otherGenderText || '');
            setSelectedTransformationGoals(data.transformationGoals || []); setOtherTransformationGoalText(data.otherTransformationGoalText || '');
            setSelectedDietaryPreferences(data.dietaryPreferences || []); setOtherDietaryPrefText(data.otherDietaryPrefText || '');
            setSelectedActivityLevel(data.activityLevel || null);
            setExistingProfileImageUrl(data.profileImage || data.profileImageUrl || null);
            setProfileImageUri(null);
        } catch (err) { console.error("EditProfile: Fetch Error:", err); setError(err.message); }
        finally { setIsLoading(false); }
    }, [user?.uid, user?.email, getIdToken]);

    useEffect(() => {
        if (user?.uid) { fetchProfileData(); }
        else { setIsLoading(false); }
    }, [user?.uid, fetchProfileData]);

    const handleInputChange=(n,v)=>{if(['age','height','weight','targetWeight'].includes(n)){if(v===''||/^\d*\.?\d*$/.test(v)){setFormValues(p=>({...p,[n]:v}));}}else{setFormValues(p=>({...p,[n]:v}));}};
    const handleOtherGenderChange=(t)=>setOtherGenderText(t);
    const handleOtherDietaryPrefChange=(t)=>setOtherDietaryPrefText(t);
    const handleOtherTransformationGoalChange=(t)=>setOtherTransformationGoalText(t);
    const handleSingleSelect=(s,v,g=false)=>{s(p=>{const n=p===v?null:v;if(g&&n!=='Other')setOtherGenderText('');return n;});};
    const handleMultiSelect=(s,c,v,d=false,t=false)=>{s(p=>{const n=p.includes(v)?p.filter(i=>i!==v):[...p,v];if(d&&v==="Other 📝"&&!n.includes("Other 📝"))setOtherDietaryPrefText('');if(t&&v==="Other 📝"&&!n.includes("Other 📝"))setOtherTransformationGoalText('');return n;});};

    const uploadImageAsync = async (uri, userId) => {
        if (!firebaseStorage) { Alert.alert("Error", "Storage service not configured."); return null; }
        if (!uri || !userId) { return null; }
        setIsUploading(true); setError(null);
        try {
            const response = await fetch(uri); const blob = await response.blob();
            if(blob.size === 0) throw new Error("Image is empty/invalid.");
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}_profile.${fileExtension}`;
            const storagePath = `user_profile_images/${userId}/${fileName}`;
            const imageRef = storageRefImport(firebaseStorage, storagePath);
            const uploadTask = uploadBytesResumable(imageRef, blob, { contentType: blob.type });
            await uploadTask;
            return await getDownloadURL(imageRef);
        } catch (e) { console.error("Upload Error:", e); Alert.alert("Upload Error", e.message || "Failed."); return null; }
        finally { setIsUploading(false); }
    };

    const deleteImageFromStorage = async (imageUrlToDelete) => {
        if (!imageUrlToDelete || !imageUrlToDelete.startsWith('https://firebasestorage.googleapis.com/')) return;
        try {
            const imageRef = storageRefImport(firebaseStorage, imageUrlToDelete);
            await deleteObject(imageRef);
        } catch (error) { console.error("DeleteStorage Error:", error); }
    };

     const handleSaveChanges = async () => {
        setError(null);
        if (!formValues.firstName?.trim() || !formValues.lastName?.trim() || !selectedGoal || !selectedGender || !selectedActivityLevel) {
            Alert.alert("Missing Information", "Please fill all required fields (*)."); return;
        }
        setIsSaving(true);
        let finalProfileImageUrl = existingProfileImageUrl;
        try {
            if (profileImageUri === "DELETED") {
                if (existingProfileImageUrl) { await deleteImageFromStorage(existingProfileImageUrl); }
                finalProfileImageUrl = null;
            } else if (profileImageUri && profileImageUri !== existingProfileImageUrl) {
                const newUrl = await uploadImageAsync(profileImageUri, user.uid);
                if (newUrl) {
                    if (existingProfileImageUrl) { await deleteImageFromStorage(existingProfileImageUrl); }
                    finalProfileImageUrl = newUrl;
                } else { throw new Error("New profile image upload failed. Changes not saved."); }
            }
            const profileDataToSave = {
                firstName: formValues.firstName.trim(), lastName: formValues.lastName.trim(),
                age: formValues.age ? parseInt(formValues.age, 10) : null, height: formValues.height ? parseFloat(formValues.height) : null,
                weight: formValues.weight ? parseFloat(formValues.weight) : null, targetWeight: formValues.targetWeight ? parseFloat(formValues.targetWeight) : null,
                goal: selectedGoal, gender: selectedGender, otherGenderText: selectedGender === 'Other' ? (otherGenderText.trim() || null) : null,
                transformationGoals: selectedTransformationGoals, otherTransformationGoalText: selectedTransformationGoals.includes("Other 📝") ? (otherTransformationGoalText.trim() || null) : null,
                dietaryPreferences: selectedDietaryPreferences, otherDietaryPrefText: selectedDietaryPreferences.includes("Other 📝") ? (otherDietaryPrefText.trim() || null) : null,
                activityLevel: selectedActivityLevel, profileImageUrl: finalProfileImageUrl, onboardingComplete: true
            };
            const token = await getIdToken(); if (!token) throw new Error("Authentication error.");
            const profileResponse = await fetch(`${API_BASE_URL}/user/profile/${user.uid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profileDataToSave) });
            const profileResponseContentType = profileResponse.headers.get("content-type");
            if (!profileResponseContentType?.includes("application/json")) { const text = await profileResponse.text(); throw new Error(`Server returned non-JSON for profile update. Status: ${profileResponse.status}`); }
            const profileResponseData = await profileResponse.json();
            if (!profileResponse.ok) throw new Error(profileResponseData.error || profileResponseData.message || "Failed to save profile details.");
            
            const planResponse = await fetch(`${API_BASE_URL}/nutritionPlan/${user.uid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
            const planResponseContentType = planResponse.headers.get("content-type");
            if (!planResponseContentType?.includes("application/json")) { const text = await planResponse.text(); throw new Error(`Server returned non-JSON for plan recalculation. Status: ${planResponse.status}`); }
            const planResponseData = await planResponse.json();
            if (!planResponse.ok) throw new Error(planResponseData.error || planResponseData.message || "Failed to update nutrition plan.");

            setExistingProfileImageUrl(finalProfileImageUrl); setProfileImageUri(null); setInitialProfileData(profileDataToSave); 
            if (planResponseData.nutritionPlan) { setPopupPlanData(planResponseData.nutritionPlan); setShowPlanPopup(true); }
            if (profileResponseData.user && setContextUser) { setContextUser(profileResponseData.user); }
            else if (refreshUserProfile) { await refreshUserProfile(); }
        } catch (error) { console.error("EditProfile - Save: Error:", error); Alert.alert("Error Updating Profile", error.message); setError(error.message); }
        finally { setIsSaving(false); setIsUploading(false); }
    };

    const handleChoosePhoto = async () => { const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Please allow access to photos."); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 }); if (r.canceled || !r.assets || r.assets.length === 0) return; setProfileImageUri(r.assets[0].uri); };
    const handleRemovePhoto = () => { Alert.alert( "Remove Photo?", "This will remove your profile picture.", [ { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => { setProfileImageUri("DELETED"); } } ]); };
    
    const RenderSelectableButton = ({ value, selectedValue, onPress }) => { const isSelected = value === selectedValue; return ( <TouchableOpacity style={[styles.optionButton, isSelected ? styles.optionButtonSelected : styles.optionButtonDeselected]} onPress={onPress} disabled={isSaving||isUploading}><Text style={[styles.optionButtonText, isSelected ? styles.optionButtonTextSelected : styles.optionButtonTextDeselected]}>{value}</Text></TouchableOpacity> ); };
    const RenderMultiSelectableButton = ({ value, selectedValues, onPress }) => { const isSelected = selectedValues.includes(value); return ( <TouchableOpacity style={[styles.optionButton, isSelected ? styles.optionButtonSelected : styles.optionButtonDeselected]} onPress={onPress} disabled={isSaving||isUploading}><Text style={[styles.optionButtonText, isSelected ? styles.optionButtonTextSelected : styles.optionButtonTextDeselected]}>{value}</Text></TouchableOpacity> ); };
    const getProfileImageSource = () => {
         if (profileImageUri === "DELETED") return defaultProfileImage;
         if (profileImageUri) return { uri: profileImageUri };
         if (existingProfileImageUrl) return { uri: existingProfileImageUrl };
         return defaultProfileImage;
    };

    const shouldShowRemovePhotoButton = (profileImageUri || existingProfileImageUrl) && profileImageUri !== "DELETED" && !isUploading;

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /><Text>Loading Profile...</Text></View>;
    }

    return (
        <View style={styles.mainContainer}><Header subtitle={"Edit Profile"} /><ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled"><View style={styles.profileImageContainer}><TouchableOpacity onPress={handleChoosePhoto} disabled={isSaving||isUploading}><Image source={getProfileImageSource()} style={styles.profileImage} />{isUploading && ( <View style={styles.uploadIndicatorOverlay}><ActivityIndicator size="large" color={PALETTE.white} /></View> )}{!isUploading && profileImageUri !== "DELETED" && ( <View style={styles.editImageIconOverlay}><Icon name="camera-outline" size={SIZES.iconSize + 4} color={PALETTE.white} /></View> )}</TouchableOpacity>{shouldShowRemovePhotoButton && (<TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton} disabled={isSaving||isUploading}><Icon name="trash-outline" size={SIZES.iconSize -2} color={PALETTE.errorRed} /><Text style={styles.removePhotoText}>Remove</Text></TouchableOpacity>)}</View>{error && <Text style={styles.errorText}>{error}</Text>}<View style={styles.card}><View style={styles.fieldGroup}><Text style={styles.label}>First Name *</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.firstName} onChangeText={(t) => handleInputChange('firstName', t)} editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View><View style={styles.fieldGroup}><Text style={styles.label}>Last Name *</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.lastName} onChangeText={(t) => handleInputChange('lastName', t)} editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View><View style={styles.fieldGroup}><Text style={styles.label}>Email</Text><View style={styles.inputRow}><TextInput style={[styles.input, styles.disabledInput]} value={user?.email || ''} editable={false}/></View></View></View><View style={styles.card}><Text style={styles.cardTitle}>What is your main goal? *</Text><View style={styles.optionContainerHorizontal}>{GOALS.map(goal => (<RenderSelectableButton key={goal} value={goal} selectedValue={selectedGoal} onPress={() => handleSingleSelect(setSelectedGoal, goal)} /> ))}</View></View><View style={styles.card}><View style={styles.fieldGroup}><Text style={styles.label}>Gender *</Text><View style={styles.optionContainerHorizontal}>{GENDERS.map(g => (<RenderSelectableButton key={g} value={g} selectedValue={selectedGender} onPress={() => handleSingleSelect(setSelectedGender, g, true)} /> ))}</View>{selectedGender === 'Other' && (<View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherGenderText} onChangeText={handleOtherGenderChange} placeholder="Please specify" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View>)}</View><View style={styles.fieldGroup}><Text style={styles.label}>Age</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.age} onChangeText={(t) => handleInputChange('age', t)} keyboardType="numeric" placeholder="e.g., 25" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View><View style={styles.fieldGroup}><Text style={styles.label}>Height (cm)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.height} onChangeText={(t) => handleInputChange('height', t)} keyboardType="numeric" placeholder="e.g., 170" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View></View><View style={styles.card}><View style={styles.fieldGroup}><Text style={styles.label}>Current Weight (kg)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.weight} onChangeText={(t) => handleInputChange('weight', t)} keyboardType="numeric" placeholder="e.g., 70" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View><View style={styles.fieldGroup}><Text style={styles.label}>Target Weight (kg)</Text><View style={styles.inputRow}><TextInput style={styles.input} value={formValues.targetWeight} onChangeText={(t) => handleInputChange('targetWeight', t)} keyboardType="numeric" placeholder="e.g., 65" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View></View></View><View style={styles.card}><Text style={styles.cardTitle}>What's driving your transformation?</Text><View style={styles.optionContainer}>{TRANSFORMATION_GOALS.map(g => (<RenderMultiSelectableButton key={g} value={g} selectedValues={selectedTransformationGoals} onPress={() => handleMultiSelect(setSelectedTransformationGoals, selectedTransformationGoals, g, false, true)} />))}</View>{selectedTransformationGoals.includes("Other 📝") && ( <View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherTransformationGoalText} onChangeText={handleOtherTransformationGoalChange} placeholder="Specify your other goal" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View> )}</View><View style={styles.card}><Text style={styles.cardTitle}>Dietary preferences or restrictions?</Text><View style={styles.optionContainer}>{DIETARY_PREFERENCES.map(p => (<RenderMultiSelectableButton key={p} value={p} selectedValues={selectedDietaryPreferences} onPress={() => handleMultiSelect(setSelectedDietaryPreferences, selectedDietaryPreferences, p, true)} /> ))}</View>{selectedDietaryPreferences.includes("Other 📝") && ( <View style={[styles.inputRow, {marginTop: 10}]}><TextInput style={styles.input} value={otherDietaryPrefText} onChangeText={handleOtherDietaryPrefChange} placeholder="Specify your other preference" editable={!isSaving&&!isUploading}/><Icon name="pencil-outline" size={SIZES.iconSize} color={PALETTE.grey} style={styles.editIcon}/></View> )}</View><View style={styles.card}><Text style={styles.cardTitle}>How active are you daily? *</Text><View style={styles.optionContainer}>{ACTIVITY_LEVELS.map(l => (<RenderSelectableButton key={l} value={l} selectedValue={selectedActivityLevel} onPress={() => handleSingleSelect(setSelectedActivityLevel, l)} />))}</View></View><TouchableOpacity style={[styles.button, styles.saveButton, (isSaving||isUploading) && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving||isUploading}>{isSaving ? <ActivityIndicator size="small" color={PALETTE.nextButtonText} /> : <Text style={styles.buttonText}>Save Changes</Text>}</TouchableOpacity></ScrollView><TabNavigation /><Modal animationType="slide" transparent={true} visible={showPlanPopup} onRequestClose={() => setShowPlanPopup(false)}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowPlanPopup(false)}><TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={()=>{/* Prevent close on content touch */}}><Text style={styles.modalTitle}>Your Plan is Updated!</Text>{popupPlanData && (<View style={styles.planDetailsContainer}><View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Calories:</Text><Text style={styles.planDetailValue}>{popupPlanData.calories?.toFixed(0)} kcal</Text></View><View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Protein:</Text><Text style={styles.planDetailValue}>{popupPlanData.protein?.toFixed(0)} g</Text></View><View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Carbs:</Text><Text style={styles.planDetailValue}>{popupPlanData.carbs?.toFixed(0)} g</Text></View><View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fat:</Text><Text style={styles.planDetailValue}>{popupPlanData.fat?.toFixed(0)} g</Text></View><View style={styles.planDetailRow}><Text style={styles.planDetailLabel}>Fiber:</Text><Text style={styles.planDetailValue}>{popupPlanData.fiberGoal}</Text></View></View>)}<TouchableOpacity style={styles.closeButton} onPress={() => setShowPlanPopup(false)}><Text style={styles.closeButtonText}>Got it!</Text></TouchableOpacity></TouchableOpacity></TouchableOpacity></Modal></View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream },
    scrollContainer: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 120 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream, padding: 20 },
    profileImageContainer: { alignItems: 'center', marginBottom: 15, position: 'relative' },
    profileImage: { width: SIZES.profileImage, height: SIZES.profileImage, borderRadius: SIZES.profileImage / 2, borderWidth: 2, borderColor: PALETTE.mediumGreen, backgroundColor: PALETTE.lightOrange },
    editImageIconOverlay: { position: 'absolute', bottom: 0, right: 5, backgroundColor: 'rgba(46, 74, 50, 0.7)', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    uploadIndicatorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.profileImage / 2, },
    removePhotoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, marginTop: 8, elevation: 1, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, },
    removePhotoText: { marginLeft: 5, color: PALETTE.errorRed, fontSize: SIZES.detailFont, fontFamily: 'Quicksand_500Medium'},
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding, marginBottom: SIZES.cardMarginBottom, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardTitle: { fontSize: SIZES.titleFont, fontFamily: 'Quicksand_700Bold', color: PALETTE.darkGrey, marginBottom: 15, textAlign: 'left' },
    fieldGroup: { marginBottom: SIZES.inputMarginBottom },
    label: { fontSize: SIZES.labelFont, marginBottom: 8, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.white, borderRadius: SIZES.optionButtonBorderRadius, borderWidth: 1, borderColor: PALETTE.buttonBorder },
    input: { flex: 1, paddingHorizontal: SIZES.inputPaddingHorizontal, paddingVertical: Platform.OS === 'ios' ? SIZES.inputPaddingVertical : SIZES.inputPaddingVertical - 2, fontSize: SIZES.inputFont, color: PALETTE.darkGrey, fontFamily: 'Quicksand_500Medium' },
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
    saveButton: { backgroundColor: PALETTE.nextButtonBackground, marginTop: 20, marginBottom: 10, width: '90%' },
    buttonDisabled: { backgroundColor: PALETTE.grey, elevation: 0, shadowOpacity: 0 },
    buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontFamily: 'Quicksand_700Bold', },
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