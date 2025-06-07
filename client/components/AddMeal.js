// components/AddMeal.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, Button, StyleSheet, ActivityIndicator, Alert, Linking,
    TouchableOpacity, Image, Platform, FlatList, RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { CameraView as ExpoCameraView, useCameraPermissions, PermissionStatus } from 'expo-camera'; // Renamed to avoid conflict if you have another CameraView
import Ionicons from '@expo/vector-icons/Ionicons';

// Contexts and Components
import { AuthContext } from './AuthContext';
import { GamificationContext } from './GamificationContext';
import Header from './Header';
import TabNavigation from './TabNavigation';
import Card from './Card'; // Assuming Card.js is in ./components/

// Import the TypeScript FoodSnapFlow component
import { FoodSnapFlow } from './FoodSnap/FoodSnapFlow'; // Path from components/AddMeal.js to components/FoodSnap/

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const PRODUCT_API_ENDPOINT = "/api/food/"; // For barcode scanning

if (!API_BASE_URL) { console.error("FATAL: API_BASE_URL not defined in AddMeal.js"); }

const PALETTE = {
    darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94',
    lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000',
    grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', // Added errorRed
};

const AddMeal = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const mealType = route.params?.mealType;

    const { user, loading: authLoading, getIdToken } = useContext(AuthContext);
    const { unlockAchievement } = useContext(GamificationContext);

    // --- UI Control State ---
    const [activeSegment, setActiveSegment] = useState('Analyze'); // 'Analyze', 'Saved'
    const [displayMode, setDisplayMode] = useState('options'); // 'options', 'barcodeCamera' for barcode scanner UI

    // --- FoodSnapFlow State ---
    const [isFoodSnapFlowVisible, setIsFoodSnapFlowVisible] = useState(false);
    const [isLoggingFoodSnapMeal, setIsLoggingFoodSnapMeal] = useState(false);

    // --- Barcode Scanner State ---
    const [scannedData, setScannedData] = useState(null);
    const [isLoadingBarcodeProduct, setIsLoadingBarcodeProduct] = useState(false); // Specific loader for barcode product fetch
    const [barcodePermission, requestBarcodePermission] = useCameraPermissions();

    // --- Saved Recipes State ---
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [isSavedLoading, setIsSavedLoading] = useState(false);
    const [savedError, setSavedError] = useState(null);
    const [isSavedRefreshing, setIsSavedRefreshing] = useState(false);

    useEffect(() => {
        console.log("[AddMeal] Auth User State:", user ? user.uid : 'null', "Auth Loading:", authLoading);
    }, [user, authLoading]);

    // --- Saved Recipes Logic ---
    const fetchSavedRecipes = useCallback(async (isRefresh = false) => {
        if (!user?.uid) {
            setSavedRecipes([]); if (!isRefresh) setIsSavedLoading(false); setIsSavedRefreshing(false); return;
        }
        if (!isRefresh) setIsSavedLoading(true);
        setSavedError(null);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Auth token missing for saved recipes.");
            const response = await fetch(`${API_BASE_URL}/recipes/saved`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch saved recipes");
            setSavedRecipes(data.savedRecipes || []);
        } catch (err) { setSavedError(err.message); setSavedRecipes([]); }
        finally { setIsSavedLoading(false); setIsSavedRefreshing(false); }
    }, [user, getIdToken]);

    useFocusEffect(useCallback(() => {
        if (activeSegment === 'Saved' && user?.uid) fetchSavedRecipes();
    }, [activeSegment, user, fetchSavedRecipes]));

    const onSavedRefresh = useCallback(() => {
        setIsSavedRefreshing(true); fetchSavedRecipes(true);
    }, [fetchSavedRecipes]);

    // --- Barcode Scanning Logic ---
    const fetchProductInfoFromBackend = useCallback(async (barcode) => {
        if (!API_BASE_URL) { Alert.alert("Config Error", "Cannot connect."); return null; }
        console.log(`Fetching barcode: ${barcode} from ${API_BASE_URL}${PRODUCT_API_ENDPOINT}${barcode}`);
        setIsLoadingBarcodeProduct(true);
        try {
            const response = await fetch(`${API_BASE_URL}${PRODUCT_API_ENDPOINT}${barcode}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ found: false, error: `Server error: ${response.status}` }));
                Alert.alert("Product Not Found", errorData.error || "This product isn't in our database yet, or the barcode is incorrect.");
                return null;
            }
            const data = await response.json();
            if (data.found === false) {
                Alert.alert("Product Not Found", "This product isn't in our database yet.");
                return null;
            }
            return { ...data, barcode: barcode };
        } catch (error) {
            Alert.alert("Network Error", "Could not connect or read server response for barcode.");
            return null;
        } finally {
            setIsLoadingBarcodeProduct(false);
        }
    }, [API_BASE_URL]);

    const handleBarCodeScanned = useCallback(async ({ type, data }) => {
        if (isLoadingBarcodeProduct || !data || data.trim() === "") return;
        console.log(`Barcode scanned: Type: ${type}, Data: ${data}`);
        setScannedData(data); // Show scanned data briefly
        const productInfo = await fetchProductInfoFromBackend(data);
        if (productInfo) {
            navigation.navigate('ProductResultScreen', { productData: productInfo, mealType: mealType });
            setDisplayMode('options'); // Reset to options view after navigating
            setScannedData(null); // Clear scanned data
        } else {
            // Error/not found alerts handled in fetchProductInfoFromBackend
            // Allow rescan by not immediately clearing displayMode here, or add a "Scan Again" button
             setTimeout(() => setScannedData(null), 2000); // Clear scanned data after a bit
        }
    }, [isLoadingBarcodeProduct, navigation, mealType, fetchProductInfoFromBackend]);

    const openAppSettings = () => Linking.openSettings();

    const handleBarcodeOptionPress = async () => {
        if (!barcodePermission) return; // Still loading permission object
        let currentStatus = barcodePermission.status;
        if (currentStatus === PermissionStatus.UNDETERMINED || (currentStatus === PermissionStatus.DENIED && barcodePermission.canAskAgain)) {
            const { status } = await requestBarcodePermission();
            currentStatus = status;
        }
        if (currentStatus === PermissionStatus.GRANTED) {
            setActiveSegment('Analyze'); // Ensure analyze segment is active
            setDisplayMode('barcodeCamera');
            setScannedData(null);
        } else {
            Alert.alert("Permission Required", "Camera access is needed for barcode scanning.",
                [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: openAppSettings }]
            );
        }
    };

    // --- FoodSnapFlow Callbacks & Logic ---
    const handleLaunchFoodSnapFlow = () => {
        setActiveSegment('Analyze'); // Ensure analyze segment is active
        setDisplayMode('options'); // Go back to options before launching full flow
        setIsFoodSnapFlowVisible(true);
    };

    const handleMealLoggedFromSnap = useCallback(async (analysisResult, image) => {
        console.log("[AddMeal] Meal Logged from FoodSnapFlow. Items:", analysisResult.foods.length);
        setIsFoodSnapFlowVisible(false);
        if (!user?.uid || !mealType) { Alert.alert("Error", "User or meal type missing."); return; }

        setIsLoggingFoodSnapMeal(true);
        const date = new Date().toISOString().split('T')[0];
        const mealPayload = {
            uid: user.uid, mealType: mealType.toLowerCase(), date: date,
            title: analysisResult.foods[0]?.name || (analysisResult.foods.length > 1 ? `${analysisResult.foods.length} food items` : 'Analyzed Meal'),
            calories: analysisResult.nutritionPerServing?.calories ?? 0,
            protein: analysisResult.nutritionPerServing?.protein ?? 0,
            carbs: analysisResult.nutritionPerServing?.carbs ?? 0,
            fat: analysisResult.nutritionPerServing?.fat ?? 0,
            fiber: analysisResult.nutritionPerServing?.fiber ?? 0,
            imageUrl: image.uri,
            source: `foodsnap-vision-${analysisResult.recognitionConfidence.toFixed(2)}`,
            analyzedDetails: {
                foods: analysisResult.foods,
                recognitionConfidence: analysisResult.recognitionConfidence,
                imageQuality: analysisResult.imageQuality,
                notes: analysisResult.notes,
                metrics: analysisResult.confidenceMetrics,
            }
        };
        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication failed.");
            const response = await fetch(`${API_BASE_URL}/logMeal/log-meal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(mealPayload),
            });
            const responseBody = await response.json();
            if (!response.ok) throw new Error(responseBody.message || "Failed to log meal via FoodSnap.");
            Alert.alert("Success!", `${mealPayload.title} added to your ${mealType}!`);
            if (responseBody?.isFirstMeal === true && unlockAchievement) {
                await unlockAchievement('firstMealLogged');
            }
            // TODO: Streak update logic (call /logMeal/update-streak)
        } catch (err) { Alert.alert("Logging Failed", `Could not log meal: ${err.message}`); }
        finally { setIsLoggingFoodSnapMeal(false); }
    }, [user, mealType, getIdToken, unlockAchievement, navigation]);

    const handleFlowCancelFromSnap = useCallback(() => {
        console.log("[AddMeal] FoodSnapFlow was Cancelled.");
        setIsFoodSnapFlowVisible(false);
    }, []);

    // --- Back Navigation Handler (Maintains context for barcode vs. general) ---
    const handleBackPress = () => {
        if (displayMode === 'barcodeCamera') {
            setDisplayMode('options'); // Go from barcode camera back to analyze options
            setScannedData(null);
        } else {
            navigation.goBack(); // Default go back
        }
    };

    // --- Render Logic ---
    if (authLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>;
    if (!user?.uid) return <View style={styles.centered}><Text style={styles.messageText}>Please log in.</Text><Button title="Login" onPress={() => navigation.navigate('LogIn')} /></View>;
    if (!mealType) return <View style={styles.centered}><Text style={styles.messageText}>Meal type missing.</Text><Button title="Go Back" onPress={() => navigation.goBack()} /></View>;

    // --- Render FoodSnapFlow if active ---
    if (isFoodSnapFlowVisible) {
        return (
            <FoodSnapFlow
                onMealLogged={handleMealLoggedFromSnap}
                onFlowCancel={handleFlowCancelFromSnap}
                userId={user?.uid}
                theme={{ primaryColor: PALETTE.darkGreen, backgroundColor: PALETTE.lightCream, textColor: PALETTE.darkGrey }}
            />
        );
    }

    // --- Render main AddMeal content ---
    const renderSegmentContent = () => {
        if (activeSegment === 'Analyze') {
            if (displayMode === 'options') {
                return (
                    <View style={styles.optionsContentContainer}>
                        <Image source={require('../assets/Images/potato.png')} style={styles.mascotImage} resizeMode="contain" />
                        <TouchableOpacity style={styles.optionButton} onPress={handleLaunchFoodSnapFlow}>
                            <Text style={styles.buttonText}>Analyze with Camera/Gallery</Text>
                            <Ionicons name="camera-outline" size={28} color={PALETTE.darkGreen} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionButton} onPress={handleBarcodeOptionPress}>
                            <Text style={styles.buttonText}>Scan Barcode</Text>
                            <Ionicons name="barcode-outline" size={28} color={PALETTE.darkGreen} />
                        </TouchableOpacity>
                    </View>
                );
            } else if (displayMode === 'barcodeCamera') {
                if (!barcodePermission) return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>;
                if (!barcodePermission.granted) {
                    return (
                        <View style={styles.centered}>
                            <Text style={styles.messageText}>Camera Permission Required for Barcode Scanning.</Text>
                            <View style={{marginVertical: 10}} />
                            {barcodePermission.canAskAgain ?
                                <Button title="Grant Permission" onPress={requestBarcodePermission} color={PALETTE.darkGreen} /> :
                                <Button title="Open Settings" onPress={openAppSettings} color={PALETTE.darkGreen} />
                            }
                            <View style={{marginVertical: 10}} />
                            <Button title="Back to Options" onPress={() => setDisplayMode('options')} color={PALETTE.grey}/>
                        </View>
                    );
                }
                return ( // Barcode Camera View
                    <View style={styles.cameraContainer}>
                        <ExpoCameraView
                            style={styles.camera}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128", "code39", "datamatrix"] }}
                            onBarcodeScanned={isLoadingBarcodeProduct ? undefined : handleBarCodeScanned}
                        />
                        {isLoadingBarcodeProduct && (
                            <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={PALETTE.white} /><Text style={styles.loadingText}>Looking up {scannedData || 'product'}...</Text></View>
                        )}
                        {!isLoadingBarcodeProduct && scannedData && (
                            <View style={styles.scannedDataOverlay}><Text style={styles.scannedDataText}>Scanned: {scannedData}</Text></View>
                        )}
                        <TouchableOpacity onPress={() => setDisplayMode('options')} style={styles.cameraBackButton}>
                            <Ionicons name="arrow-back-circle" size={40} color={PALETTE.white} />
                        </TouchableOpacity>
                    </View>
                );
            }
        } else if (activeSegment === 'Saved') {
            // Saved Recipes List
            if (isSavedLoading && !isSavedRefreshing) return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /><Text style={styles.loadingInfoText}>Loading Saved Recipes...</Text></View>;
            if (savedError) return <View style={styles.centered}><Text style={styles.errorText}>{savedError}</Text><TouchableOpacity onPress={() => fetchSavedRecipes(true)} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>;
            return (
                <FlatList
                    data={savedRecipes}
                    renderItem={({ item }) => (
                        <Card
                            title={item.title || "Untitled Recipe"}
                            imageUrl={item.imageUrl}
                            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id, title: item.title, imageUrl: item.imageUrl, mealType: mealType })}
                        />
                    )}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.savedListContainer}
                    ListEmptyComponent={<View style={styles.emptyListContainer}><Ionicons name="bookmark-outline" size={50} color={PALETTE.grey} /><Text style={styles.emptyListText}>No Saved Recipes Yet</Text></View>}
                    refreshControl={<RefreshControl refreshing={isSavedRefreshing} onRefresh={onSavedRefresh} colors={[PALETTE.darkGreen]} />}
                />
            );
        }
        return null;
    };

    return (
        <View style={styles.screenContainer}>
            <Header showBackButton={true} onBackPress={handleBackPress} subtitle={`Add to ${mealType || 'Meal'}`} />
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PALETTE.grey }}>
                <TouchableOpacity
                    style={[styles.segmentButton, activeSegment === 'Analyze' && styles.segmentActive]}
                    onPress={() => { setActiveSegment('Analyze'); setDisplayMode('options'); }}
                >
                    <Text style={[styles.segmentText, activeSegment === 'Analyze' && styles.segmentTextActive]}>New Analysis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentButton, activeSegment === 'Saved' && styles.segmentActive]}
                    onPress={() => { setActiveSegment('Saved'); setDisplayMode('options'); }}
                >
                    <Text style={[styles.segmentText, activeSegment === 'Saved' && styles.segmentTextActive]}>Saved Recipes</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                {isLoggingFoodSnapMeal ?
                    <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /><Text style={{marginTop: 10}}>Logging your meal...</Text></View>
                    : renderSegmentContent()
                }
            </View>
            <TabNavigation />
        </View>
    );
};

// Styles (ensure all referenced styles are defined here or imported)
const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: PALETTE.lightCream, },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: PALETTE.lightCream, },
    messageText: { fontSize: 16, textAlign: 'center', marginBottom: 15, color: PALETTE.darkGrey, fontFamily: "Quicksand_700Bold" },
    subMessageText: { fontSize: 14, color: PALETTE.grey, fontFamily: "Quicksand_700Bold" }, // For barcode permission denied
    buttonSpacer: { height: 15 }, // For barcode permission denied
    loadingInfoText: { marginTop: 10, color: PALETTE.darkGrey, fontFamily: 'Quicksand_600SemiBold', },
    errorText: { color: PALETTE.errorRed, textAlign: 'center', fontFamily: 'Quicksand_600SemiBold', fontSize: 16, marginBottom: 15, },
    retryButton: { backgroundColor: PALETTE.darkGreen, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, },
    retryButtonText: { color: PALETTE.white, fontSize: 16, fontFamily: 'Quicksand_700Bold', },

    segmentButton: { flex: 1, paddingVertical: 15, alignItems: 'center', backgroundColor: PALETTE.lightOrange },
    segmentActive: { borderBottomWidth: 3, borderBottomColor: PALETTE.darkGreen },
    segmentText: { fontSize: 16, color: PALETTE.darkGrey, fontFamily: 'Quicksand_600SemiBold'},
    segmentTextActive: { color: PALETTE.darkGreen, fontFamily: 'Quicksand_700Bold'},

    contentContainer: { flex: 1, },
    optionsContentContainer: { flex: 1, paddingTop: 20, alignItems: 'center', paddingHorizontal: 20, },
    mascotImage: { width: 120, height: 120, marginVertical: 20, marginBottom: 30 },
    optionButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.lightOrange,
        paddingVertical: 18, paddingHorizontal: 25, borderRadius: 15,
        marginBottom: 18, width: '100%',
        justifyContent: 'space-between', elevation: 2,
        shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1,
    },
    buttonText: { fontSize: 18, color: PALETTE.darkGreen, fontFamily: 'Quicksand_600SemiBold' },

    cameraContainer: { flex: 1, position: 'relative', backgroundColor: 'black' },
    camera: { ...StyleSheet.absoluteFillObject },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: PALETTE.white, marginTop: 10, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
    scannedDataOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
    scannedDataText: { color: PALETTE.white, textAlign: 'center', fontSize: 14 },
    cameraBackButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 15, padding: 5, zIndex: 10 },

    savedListContainer: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 20, },
    emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50, },
    emptyListText: { fontSize: 17, color: PALETTE.darkGrey, textAlign: 'center', fontFamily: 'Quicksand_600SemiBold', marginBottom: 8, },
});

export default AddMeal;