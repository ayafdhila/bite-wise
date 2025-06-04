// screens/LogIn.js
import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    View, Text, Image, TextInput, TouchableOpacity, Pressable,
    Alert, StyleSheet, Dimensions, ActivityIndicator,
    KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Divider } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';
// import * as Facebook from 'expo-facebook'; // Uncomment if you are using it
import { Ionicons } from '@expo/vector-icons';
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth"; // Import necessary
import { AuthContext } from './AuthContext'; // Import AuthContext

// --- API Base URL (ensure this is correct) ---
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Fallback

export default function LogIn() {
  // --- V V V --- Use setUser from the corrected AuthContext --- V V V ---
  const { setUser } = useContext(AuthContext);
  // --- ^ ^ ^ --- End Context Usage --- ^ ^ ^ ---

  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state for login process

  // --- Form Validation (Keep as is) ---
  const isFormValid = () => email.trim() !== '' && password.trim() !== '';

  // --- Email/Password Login Handler ---
  const handleEmailPasswordLogin = useCallback(async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Please fill in all fields correctly.');
      return;
    }
    setIsLoading(true);
    setServerError('');

    let response; // Define response outside try for finally block check
    try {
      // 1. Firebase JS SDK sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("LoginScreen: Firebase Auth successful, UID:", firebaseUser.uid);

      // 2. Get ID token
      const idToken = await firebaseUser.getIdToken(true); // Force refresh
      console.log("LoginScreen: Sending token to backend (first 30 chars):", idToken.substring(0,30) + "...");

      // 3. Call YOUR backend login endpoint
      response = await fetch(`${API_BASE_URL}/auth/login`, { // Assign to outer response
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Still needed if your backend might expect a body, even if empty
          'Authorization': `Bearer ${idToken}`
        },
        // body: JSON.stringify({ idToken }) // Body is optional if backend relies on header token
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("LoginScreen: Non-JSON response from backend /auth/login:", text);
        throw new Error(`Server returned an unexpected response format. Status: ${response.status}`);
      }
      console.log("LoginScreen: Backend response:", data);

      if (response.ok && data.user) {
        console.log("LoginScreen: Backend login successful. Updating context user.");
        // --- V V V --- Call setUser from context --- V V V ---
        setUser(data.user);
        // --- ^ ^ ^ --- End context call --- ^ ^ ^ ---
        // Navigation is now handled by RootNavigator reacting to the context change.

      } else if (response.status === 403 && data.errorCode === 'ACCOUNT_PENDING_VERIFICATION') {
        setServerError(data.error || "Account awaiting verification.");

        navigation.navigate('PendingVerificationScreen'); // Navigate to PendingVerificationScreen
        setUser(null); // Clear any partial user state in context
      } else {
        throw new Error(data.error || data.message || `Unknown backend error (${response.status})`);
      }
      if (data.user.userType === 'Professional' && data.user.isVerified === false) {
        console.log("LoginScreen: Professional user is NOT verified. Updating context (minimal) and navigating to PendingVerification.");
        // Update context with the user data so it knows who is pending
        setUser(data.user);
       
        // Reset stack to PendingVerification, making it the only screen in Auth stack
        navigation.reset({
            index: 0,
            routes: [{ name: 'PendingVerificationScreen' }], // Ensure 'PendingVerification' route is in AuthNavigator
        });
        // --- RETURN HERE to prevent further context updates that might trigger RootNavigator prematurely ---
        return; // <<<--- IMPORTANT
    } else {
        // For Personal users, VERIFIED Professionals, or Admins
        console.log("LoginScreen: User verified or personal/admin. Updating context user.");
        setUser(data.user); // This will trigger RootNavigatorContent to switch stacks
    }
    } catch (error) {
      console.error('Login Error:', error);
      setUser(null); // Clear user in context on any error

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
        setServerError("Incorrect email or password.");
      } else {
        setServerError(error.message || "An error occurred during login.");
      }
      // If backend call failed AFTER Firebase sign-in, or if Firebase sign-in itself failed
      if (auth.currentUser) { // Check if a user is signed into Firebase client-side
          if (response && !response.ok) { // If it was a backend error after FB success
              console.log("LoginScreen: Backend error after Firebase auth, signing out from Firebase client.");
              auth.signOut().catch(e => console.error("Firebase signout after backend error failed:", e));
          } else if (!response) { // If error was before backend call (e.g., signInWithEmailAndPassword failed)
              console.log("LoginScreen: Firebase auth error, no backend call made.");
              // No need to signOut explicitly if signInWithEmailAndPassword failed, user isn't set
          }
      }

    } finally {
      setIsLoading(false);
    }
  }, [email, password, setUser, navigation]); // Dependencies

  // --- Google Sign-In ---
  const [request, googleAuthResponse, promptAsync] = Google.useAuthRequest({
    webClientId: '770007658347-fk52e7fhtq0bmep921sajvlosvh5kgep.apps.googleusercontent.com', // REPLACE
    iosClientId: '770007658347-g34junm3haq9ng0i2m6ja4k1bcbcqisv.apps.googleusercontent.com',   // REPLACE
    androidClientId: '770007658347-kakh3u6u63873b8bcbav9h6b3jmefr8u.apps.googleusercontent.com' // REPLACE
  });

/*  useEffect(() => {
    const handleGoogleSignIn = async (gResponse) => {
        if (!gResponse.authentication?.idToken) { Alert.alert("Google Sign-In Error", "No ID token from Google."); return; }
        setIsLoading(true); setServerError('');
        try {
            const googleCredential = GoogleAuthProvider.credential(gResponse.authentication.idToken);
            const userCredential = await signInWithCredential(auth, googleCredential);
            const firebaseUser = userCredential.user;
            const idToken = await firebaseUser.getIdToken(true);
            const response = await fetch(`${API_BASE_URL}/auth/socialAuth`, { // Or /auth/login if it handles social tokens
                method: 'POST', headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            });
            const backendData = await response.json();
            if (!response.ok || !backendData.user) throw new Error(backendData.error || "Backend social login failed.");
            setUser(backendData.user); // Update context
        } catch (error) {
            console.error("Google Sign-In Full Flow Error:", error);
            setServerError(error.message || "Google Sign-In failed."); setUser(null);
            if (auth.currentUser) auth.signOut();
        } finally { setIsLoading(false); }
    };
    if (googleAuthResponse?.type === 'success') { handleGoogleSignIn(googleAuthResponse); }
    else if (googleAuthResponse?.type === 'error') { console.error("Google Auth Request Error:", googleAuthResponse.error); Alert.alert("Google Sign-In Error");}
  }, [googleAuthResponse, setUser]); // Add setUser

  // --- Facebook Sign-In (Placeholder) ---
  // useEffect(() => { Facebook.initializeAsync().then(() => ); }, []);
  const handleFacebookLogin = async () => { Alert.alert("Facebook Sign-In", "Not implemented yet."); };*/


  // --- RETURN JSX (Your Original Structure with KeyboardAvoidingView) ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardAvoidingContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} >
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} >
        {/* Your existing UI elements - NO STYLE CHANGES MADE HERE */}
        <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
        <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />
        <View style={styles.logoContainer}>
          <View style={styles.circle}>
            <Image source={require('../assets/Images/logo.png')} style={styles.logo} />
          </View>
        </View>

        <Text style={styles.welcomeText}>Welcome Back!</Text>
        <TextInput
          style={styles.input}
          placeholder='E-mail'
          keyboardType='email-address'
          autoCapitalize='none'
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder='Password'
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isLoading}>
            <Icon name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} style={styles.eyeIcon} />
          </TouchableOpacity>
        </View>

        {serverError !== '' && <Text style={styles.errorText}>{serverError}</Text>}

        <Pressable onPress={() => !isLoading && navigation.navigate('ResetPassword')} disabled={isLoading}>
          <Text style={styles.reset}>Forgot Password?</Text>
        </Pressable>

        <Divider style={styles.Divider} />


        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, (!isFormValid() || isLoading) && styles.buttonDisabled]}
            onPress={handleEmailPasswordLogin}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.textButton}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.accountText}>Don't you have an account?</Text>
          <Pressable onPress={() => !isLoading && navigation.navigate('UserType')} disabled={isLoading}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Styles (Your Exact Original Styles + KeyboardAvoidingView wrapper styles) ---
const { width } = Dimensions.get('window');
const pxToDp = (px) => px * (width / 390);

const styles = StyleSheet.create ({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F5E4C3', },
  scrollContentContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: pxToDp(20), paddingVertical: pxToDp(40), },
  topLeaf:{ width: 200, height: 200, transform: [{ rotate: '91.171deg' }], top: -3, left: -14, position: 'absolute', resizeMode: 'contain' },
  bottomLeaf:{ width: 200, height: 200, transform: [{ rotate: '91.171deg' }, {scaleY: -1}, {scaleX: -1}], bottom: -3, right: -14, position: 'absolute', resizeMode: 'contain' },
  logoContainer:{ marginTop: pxToDp(20), alignItems: 'center' },
  circle:{ width: pxToDp(170), height:pxToDp(157), borderRadius: pxToDp(100), backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: pxToDp(5), elevation: 3, shadowOffset: { width: 0, height: pxToDp(2) } },
  logo:{ width: pxToDp(200), height: pxToDp(200), resizeMode: 'contain', alignItems: 'center', justifyContent: 'center' },
  welcomeText:{ width: '100%', color: '#000', textAlign: 'center', fontFamily: 'Quicksand_700Bold', fontSize: pxToDp(40), marginVertical: pxToDp(15) },
  input:{ width: '100%', height: 50, backgroundColor: '#fff', borderRadius: 15, paddingLeft: 15, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#ccc', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: pxToDp(10), elevation: 10, shadowOffset: { width: 0, height: pxToDp(2) } },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#ccc', height: 50, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: pxToDp(10), elevation: 10, shadowOffset: { width: 0, height: pxToDp(2) } },
  passwordInput: { flex: 1, height: '100%', paddingLeft: 15, fontSize: 16, },
  eyeIcon: { padding: 10, marginRight: 10, color: '#888' },
  reset: { color: '#4F7B4A', fontFamily: 'Quicksand_700Bold', fontSize: pxToDp(15), textDecorationLine: 'underline', marginVertical: pxToDp(10), textAlign: 'center' },
  Divider: { width: '80%', height: pxToDp(1), backgroundColor: '#000', alignSelf: 'center', marginVertical: pxToDp(10) },
  buttonContainer:{ width: '100%', alignItems: 'center', marginTop: pxToDp(30), paddingBottom: pxToDp(20) },
  button: { width: pxToDp(280), height: pxToDp(60), borderRadius: pxToDp(20), backgroundColor: '#2E4A32', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: pxToDp(10), elevation: 10, shadowOffset: { width: 0, height: pxToDp(2) }, overflow: 'hidden' },
  textButton: { color: 'white', fontFamily: 'Quicksand_700Bold', fontSize: 21 },
  textContainer:{ textAlign: 'center', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', alignContent: 'center', marginTop: 15 },
  signUpText:{ fontFamily: 'Quicksand_700Bold', color: '#4F7B4A', marginLeft: pxToDp(5), fontSize: pxToDp(15), textDecorationLine: 'underline' },
  accountText:{ fontFamily: 'Quicksand_400Regular', color: '#4F7B4A', fontSize: pxToDp(15) },
  signInContainer:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: pxToDp(30), marginVertical: pxToDp(15) },
  errorText: { color: 'red', marginBottom: 10, textAlign: 'center', fontSize: 14 },
  buttonDisabled: { backgroundColor: '#aaa', opacity: 0.7 },
  googleButton: { padding: 5 },
  fbButton: { padding: 5 }
});