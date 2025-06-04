import React, { useState, useEffect, useCallback, useContext } from 'react'; // Added useContext
import {
    View,
    Text,
    Button, // Keep react-native Button for Back/Permission
    StyleSheet,
    ActivityIndicator,
    Alert,
    Linking,
    TouchableOpacity,
    Image,
    Platform,
    FlatList,
    RefreshControl // For platform-specific styles
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions, PermissionStatus } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '../components/AuthContext'; // *** Import AuthContext ***
import Header from '../components/Header';           // *** Import Header ***
import TabNavigation from '../components/TabNavigation'; // *** Import TabNavigation ***
import Card from './Card'; // *** Import Card ***
// --- API Config ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const PRODUCT_API_ENDPOINT = "/api/food/";

// Check API URL
if (!API_BASE_URL) { console.error("FATAL: API_BASE_URL not defined in AddMeal.js"); }

const AddMeal = () => {
    // --- Hooks ---
    const navigation = useNavigation();
    const route = useRoute();
    const mealType = route.params?.mealType; // Get mealType passed from previous screen
    const { user, loading: authLoading,  getIdToken  } = useContext(AuthContext); // *** Use AuthContext ***

    // --- State ---
    const [activeSegment, setActiveSegment] = useState('Analyze'); // State for top segmented control
    // 'options', 'camera', or maybe 'search', 'saved' if implementing those segments
    const [displayMode, setDisplayMode] = useState('options');
    const [scannedData, setScannedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // For API calls/camera prep
    const [permission, requestPermission] = useCameraPermissions();

    const [savedRecipes, setSavedRecipes] = useState([]);
    const [isSavedLoading, setIsSavedLoading] = useState(false);
    const [savedError, setSavedError] = useState(null);
    const [isSavedRefreshing, setIsSavedRefreshing] = useState(false);
    useEffect(() => {
        console.log("[AddMeal] Auth User State:", user ? user.uid : 'null', "Auth Loading:", authLoading);
    }, [user, authLoading]);

const fetchSavedRecipes = useCallback(async (isRefresh = false) => {
        if (!user?.uid) {
            console.log("AddMeal/Saved: No user, cannot fetch saved recipes.");
            setSavedRecipes([]); if (!isRefresh) setIsSavedLoading(false); setIsSavedRefreshing(false);
            return;
        }
        if (!isRefresh) setIsSavedLoading(true);
        setSavedError(null);
        console.log("AddMeal/Saved: Fetching saved recipes...");

        try {
            const token = await getIdToken();
            if (!token) throw new Error("Authentication token is missing for saved recipes.");

            const response = await fetch(`${API_BASE_URL}/recipes/saved`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Unexpected server response (Saved). Status: ${response.status}. Body: ${text.substring(0, 100)}...`);
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || "Failed to fetch saved recipes");
            }
            console.log(`AddMeal/Saved: Received ${data.savedRecipes?.length || 0} saved recipes.`);
            setSavedRecipes(data.savedRecipes || []);
        } catch (err) {
            console.error("AddMeal/Saved: Fetch error:", err);
            setSavedError(err.message || "Could not load your saved recipes.");
            setSavedRecipes([]);
        } finally {
            setIsSavedLoading(false);
            setIsSavedRefreshing(false);
        }
    }, [user, getIdToken]);

    // --- Effect to fetch saved recipes when 'Saved' tab is active and screen is focused ---
    // Using useFocusEffect for more precise focus handling if needed, or simple isFocused prop
    useFocusEffect(
        useCallback(() => {
            if (activeSegment === 'Saved' && user?.uid) {
                console.log("AddMeal: 'Saved' segment focused, fetching saved recipes.");
                fetchSavedRecipes();
            }
        }, [activeSegment, user, fetchSavedRecipes])
    );

    const onSavedRefresh = useCallback(() => {
        setIsSavedRefreshing(true);
        fetchSavedRecipes(true);
    }, [fetchSavedRecipes]);
    useFocusEffect(
        useCallback(() => {
            // console.log("[AddMeal] Focused. Camera Permission:", permission?.status);
        }, [permission?.status])
    );

    // --- Backend Fetch Function (Keep as is) ---
    const fetchProductInfoFromBackend = useCallback(async (barcode) => {
        if (!API_BASE_URL) {
            Alert.alert("Configuration Error", "Cannot connect to server.");
            return null;
        }
        console.log(`Fetching info for barcode: ${barcode}`);
        const targetUrl = `${API_BASE_URL}${PRODUCT_API_ENDPOINT}${barcode}`;
        console.log("Attempting to fetch URL:", targetUrl);
        setIsLoading(true);
        try {
            const response = await fetch(targetUrl);
            // ... (rest of fetch logic with error handling and parsing remains the same) ...
             if (!response.ok) { /* ... error handling ... */ return null; }
             const data = await response.json();
             if (data.found === false) { /* ... handle not found ... */ return null; }
             console.log("Product found, preparing navigation...");
             setIsLoading(false);
             return { ...data, barcode: barcode };
        } catch (error) {
            console.error(`[${barcode}] Network/parsing error:`, error);
            Alert.alert("Network Error", "Could not connect or read server response.");
            setIsLoading(false);
            return null;
        }
    }, [API_BASE_URL]); // Dependency


    // --- Barcode Scan Handler (Keep as is, but check navigationInitiated logic if needed) ---
    const handleBarCodeScanned = useCallback(async ({ type, data }) => {
         if (isLoading || !data || data.trim() === "") return;
         console.log(`Barcode scanned: Type: ${type}, Data: ${data}`);
         setScannedData(data);
         const productInfo = await fetchProductInfoFromBackend(data);
         if (productInfo) {
             console.log("Navigating to ProductResultScreen...");
             navigation.navigate('ProductResultScreen', { productData: productInfo, mealType: mealType });
             setDisplayMode('options'); // Go back to options after navigating away? Or handle on return.
             setScannedData(null);
         } else {
             console.log("Product not found/error. Ready for new scan.");
             // Consider resetting scannedData after a short delay if you want the overlay to disappear
             // setTimeout(() => setScannedData(null), 1500);
         }
     }, [isLoading, navigation, mealType, fetchProductInfoFromBackend]); // Removed displayMode dependency


    // --- App Settings & Permission Handlers (Keep as is) ---
    const openAppSettings = () => Linking.openSettings();
    const handleBarcodeOptionPress = async () => {
        if (!permission) return;
        let currentStatus = permission.status;
        if (currentStatus === PermissionStatus.UNDETERMINED || (currentStatus === PermissionStatus.DENIED && permission.canAskAgain)) {
            const { status } = await requestPermission();
            currentStatus = status;
        }
        if (currentStatus === PermissionStatus.GRANTED) {
            setDisplayMode('camera');
            setScannedData(null);
        } else {
            Alert.alert("Permission Required", "Camera access needed for barcode scanning.",
                [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: openAppSettings }]
            );
        }
    };
    const handleImportOptionPress = () => Alert.alert("Coming Soon", "Importing from gallery is not yet implemented.");
    const handleSnapOptionPress = () => Alert.alert("Coming Soon", "Snapping a photo is not yet implemented.");

    // --- Back Navigation Handler (Keep as is) ---
    const handleBackPress = () => {
        if (displayMode === 'camera') {
            setDisplayMode('options');
            setScannedData(null);
        } else {
            navigation.goBack();
        }
    };

    // --- Render Logic ---

    // 1. Initial Auth Loading State
    if (authLoading) {
        console.log("Auth state loading...");
        return <View style={styles.centered}><ActivityIndicator size="large" color="#556B2F" /></View>;
    }

    // 2. Check User Authentication
    if (!user?.uid) {
        console.log("User not logged in.");
        // Consider navigating to login or just showing message + back button
        return (
            <View style={styles.centered}>
                <Text style={styles.messageText}>Please log in to add a meal.</Text>
                <Button title="Go Back" onPress={() => navigation.goBack()} color="grey"/>
            </View>
        );
    }

    // 3. Check Meal Type Parameter
    if (!mealType) {
        console.log("Meal type not specified.");
        // Should ideally not happen if navigation is set up correctly
        return (
            <View style={styles.centered}>
                <Text style={styles.messageText}>Meal type not specified.</Text>
                <Button title="Go Back" onPress={() => navigation.goBack()} color="grey"/>
            </View>
        );
    }

    // 4. Check Camera Permissions (only needed for camera mode)
     if (displayMode === 'camera' && !permission) {
        console.log("Camera permission status loading...");
        // Show loading specifically for permissions if needed
        return <View style={styles.centered}><ActivityIndicator size="large" color="#556B2F" /></View>;
    }

    // --- Function to Render Content Based on Segment ---
    const renderSegmentContent = () => {
        switch (activeSegment) {
            case 'Analyze':
                // If displayMode is options, show buttons; if camera, show camera/permission denied
                if (displayMode === 'options') {
                    return (
                        <View style={styles.optionsContentContainer}>
                             <Image source={require('../assets/Images/potato.png')} style={styles.mascotImage} resizeMode="contain" />
                            <TouchableOpacity style={styles.optionButton} onPress={handleImportOptionPress}>
                                <Text style={styles.buttonText}>Import from Gallery</Text>
                                <Ionicons name="image-outline" size={28} color="black" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.optionButton} onPress={handleSnapOptionPress}>
                                <Text style={styles.buttonText}>Snap a New photo</Text>
                                <Ionicons name="camera-outline" size={28} color="black" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.optionButton} onPress={handleBarcodeOptionPress}>
                                <Text style={styles.buttonText}>Barcode Scan</Text>
                                <Ionicons name="barcode-outline" size={28} color="black" />
                            </TouchableOpacity>
                        </View>
                    );
                } else { // displayMode === 'camera'
                    if (permission?.granted) {
                        return (
                            <View style={styles.cameraContainer}>
                                <CameraView
                                    style={styles.camera}
                                    facing="back"
                                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128", "code39"] }}
                                    onBarcodeScanned={isLoading ? undefined : handleBarCodeScanned}
                                />
                                {/* Loading Overlay */}
                                {isLoading && (
                                    <View style={styles.loadingOverlay}>
                                        <ActivityIndicator size="large" color="#FFFFFF" />
                                        {scannedData && <Text style={styles.loadingText}>Code: {scannedData}</Text>}
                                        <Text style={styles.loadingText}>Looking up product...</Text>
                                    </View>
                                )}
                                {/* Scanned Data Overlay */}
                                {!isLoading && scannedData && (
                                    <View style={styles.scannedDataOverlay}>
                                        <Text style={styles.scannedDataText}>Last scan: {scannedData}</Text>
                                    </View>
                                )}
                                {/* Add Back Button Here specifically for Camera View */}
                                <TouchableOpacity onPress={handleBackPress} style={styles.cameraBackButton}>
                                     <Ionicons name="arrow-back-circle" size={40} color={PALETTE.white} />
                                </TouchableOpacity>
                            </View>
                        );
                    } else {
                         // Permission Denied View
                        return (
                            <View style={styles.centered}>
                                <Text style={styles.messageText}>Camera Permission Required.</Text>
                                <Text style={[styles.messageText, styles.subMessageText]}>
                                    {permission?.canAskAgain ? "Grant permission?" : "Enable in settings."}
                                </Text>
                                 <View style={styles.buttonSpacer} />
                                 {permission?.canAskAgain ? (
                                     <Button title="Grant Permission" onPress={requestPermission} />
                                 ) : (
                                     <Button title="Open Settings" onPress={openAppSettings} />
                                 )}
                                  <View style={styles.buttonSpacer} />
                                  <Button title="Back to Options" onPress={handleBackPress} color="grey"/>
                            </View>
                        );
                    }
                } // End Camera Mode
            
            case 'Saved':
                if (isSavedLoading && !isSavedRefreshing) {
                    return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /><Text style={styles.loadingInfoText}>Loading Saved Recipes...</Text></View>;
                }
                if (savedError) {
                    return <View style={styles.centered}><Text style={styles.errorText}>{savedError}</Text><TouchableOpacity onPress={() => fetchSavedRecipes()} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>;
                }
                return (
                    <FlatList
                        data={savedRecipes}
                        renderItem={({ item }) => (
                            <Card
                                title={item.title || "Untitled Recipe"}
                                // description={`Saved: ...`} // Add saved date if needed
                                imageUrl={item.imageUrl || 'https://via.placeholder.com/150?text=No+Image'}
                                onPress={() => navigation.navigate('RecipeDetail', {
                                    recipeId: item.id, // recipeId is stored as item.id from backend
                                    title: item.title,
                                    imageUrl: item.imageUrl,
                                })}
                                // You might need to pass other props your Card component expects
                            />
                        )}
                        keyExtractor={(item) => String(item.id)} // Ensure key is string
                        contentContainerStyle={styles.savedListContainer}
                        ListEmptyComponent={
                            !isSavedLoading && (
                                <View style={styles.emptyListContainer}>
                                    <Ionicons name="bookmark-outline" size={50} color={PALETTE.grey} />
                                    <Text style={styles.emptyListText}>No Saved Recipes Yet</Text>
                                    <Text style={styles.emptyListSubText}>Find recipes you like and tap the bookmark to save them here!</Text>
                                </View>
                            )
                        }
                        refreshControl={
                            <RefreshControl refreshing={isSavedRefreshing} onRefresh={onSavedRefresh} colors={[PALETTE.darkGreen]} />
                        }
                    />
                );
            default:
                return null;
        }
    }; // End renderSegmentContent

    // --- Main Return JSX ---
    return (
        <View style={styles.screenContainer}>
            {/* Use your reusable Header Component */}
            <Header showBackButton={true} onBackPress={handleBackPress} subtitle={"Add your Meal!"} />

          

            {/* Segmented Control */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', elevation: 2}}>
                
                <TouchableOpacity
                    style={[{backgroundColor: '#FCCF94', flex: 1, alignItems: 'center', height: 60, justifyContent : 'center', elevation: 2}, activeSegment === 'Analyze' && styles.segmentActive]}
                    onPress={() => { setActiveSegment('Analyze'); setDisplayMode('options'); /* Reset display mode */ }}
                >
                    <Text style={[styles.segmentText, activeSegment === 'Analyze' && styles.segmentTextActive]}>Analyze</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[{backgroundColor: '#FCCF94', flex: 1, alignItems: 'center', height: 60, justifyContent : 'center', elevation: 2}, activeSegment === 'Saved' && styles.segmentActive]}
                    onPress={() => { setActiveSegment('Saved'); setDisplayMode('options'); /* Reset display mode */ }}
                 >
                    <Text style={[styles.segmentText, activeSegment === 'Saved' && styles.segmentTextActive]}>Saved</Text>
                </TouchableOpacity>
            </View>

            {/* Render Content based on Active Segment */}
            <View style={styles.contentContainer}>
                 {renderSegmentContent()}
            </View>


            {/* Render Bottom Tab Navigation */}
            <TabNavigation />
        </View>
    );
};

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

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: PALETTE.lightCream, 
    },
    centered: { 
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: PALETTE.lightCream, 
    },
    messageText: { fontSize: 16, textAlign: 'center', marginBottom: 15, color: PALETTE.darkGrey, fontFamily: "Quicksand_700Bold" },
    subMessageText: { fontSize: 14, color: PALETTE.grey, fontFamily: "Quicksand_700Bold" },
    buttonSpacer: { height: 15 },
 
    subHeaderContainer: { 
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: PALETTE.lightCream, 
    },
    subHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: PALETTE.darkGreen,
        fontFamily: 'Quicksand_700Bold'
    },

    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: PALETTE.lightOrange, 
        marginHorizontal: 20, 
        marginTop: 10,       
        borderRadius: 20,    
        overflow: 'hidden',  
        elevation: 2,       
        shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.5,
    },
    segmentButton: {
        flex: 1, 
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentActive: {
        backgroundColor: PALETTE.darkGreen, 
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600', 
        color: PALETTE.darkGrey, 
        fontFamily: 'Quicksand_700Bold'
    },
    segmentTextActive: {
        color: PALETTE.white, 
        fontFamily: 'Quicksand_700Bold'
    },

    contentContainer: {
        flex: 1,
        marginTop: 15, 
        marginBottom: 70,
    },

    optionsContentContainer: {
        flex: 1, 
        paddingTop: 20, 
      
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    mascotImage: { width: 120, height: 120, marginVertical: 40 },
    optionButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.lightOrange, 
        paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20, 
        marginBottom: 15, width: '95%', marginVertical: 20, 
        justifyContent: 'space-between', elevation: 2, shadowColor: PALETTE.black,
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
    },
    buttonText: { fontSize: 20, color: 'black', fontFamily: 'Quicksand_700Bold' }, 
    
    cameraContainer: { flex: 1, position: 'relative', backgroundColor: 'black' },
    camera: { ...StyleSheet.absoluteFillObject },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: PALETTE.white, marginTop: 10, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
    scannedDataOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
    scannedDataText: { color: PALETTE.white, textAlign: 'center', fontSize: 14 },
    cameraBackButton: { 
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30, 
        left: 15,
        padding: 5,
        
    },
    savedListContainer: {
        paddingHorizontal: 10, // Match Recipes screen
        paddingTop: 10,
        paddingBottom: 20, // Space from bottom or TabNavigation
    },
    emptyListContainer: { // For "No saved recipes" message
        flex: 1, // Take up available space if list is short
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50, // Push down a bit
    },
    emptyListText: {
        fontSize: 17, // Slightly larger
        color: PALETTE.darkGrey,
        textAlign: 'center',
        fontFamily: 'Quicksand_600SemiBold',
        marginBottom: 8,
    },
    emptyListSubText: {
        fontSize: 14,
        color: PALETTE.grey,
        textAlign: 'center',
        fontFamily: 'Quicksand_500Medium',
    },
    loadingInfoText: { // Text below loader for saved recipes
        marginTop: 10,
        color: PALETTE.darkGrey,
        fontFamily: 'Quicksand_600SemiBold',
    },
    errorText: { // General error text for saved recipes fetch
        color: PALETTE.errorRed,
        textAlign: 'center',
        fontFamily: 'Quicksand_600SemiBold',
        fontSize: 16,
        marginBottom: 15,
    },
    retryButton: { // Copied from other screens
        backgroundColor: PALETTE.darkGreen,
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
    },
    retryButtonText: {
        color: PALETTE.white,
        fontSize: 16,
        fontFamily: 'Quicksand_700Bold',
    }
  
});

export default AddMeal; 