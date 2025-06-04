// screens/SignUp.js
import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  Alert, StyleSheet, Dimensions, ActivityIndicator,
  Platform, KeyboardAvoidingView, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AuthContext } from '../components/AuthContext';
import styles from './Styles';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export default function SignUp() {
  const { setUser } = useContext(AuthContext);
  const route = useRoute();
  const navigation = useNavigation();
  const userType = route.params?.userType;

  // Refs (for focus management)
  const passwordRef = useRef();
  const confirmRef = useRef();

  // State
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validators
  const validateEmail = (e) => {
    const trimmed = e.trim();
    if (!trimmed) {
      setEmailError('Email is required.');
      return false;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };
  const validatePassword = (pwd) => {
    if (!pwd) {
      setPasswordError('Password is required.');
      return false;
    }
    if (pwd.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return false;
    }
    setPasswordError('');
    return true;
  };
  const validateConfirm = (cpwd) => {
    if (!cpwd) {
      setConfirmError('Please confirm your password.');
      return false;
    }
    if (cpwd !== password) {
      setConfirmError('Passwords do not match.');
      return false;
    }
    setConfirmError('');
    return true;
  };

  // Combined form validity (for styling only)
  const isFormValid = () =>
    !emailError && !passwordError && !confirmError &&
    email && password && confirmPassword;

  const handleSignUpWithEmail = useCallback(async () => {
    // Run all validations again
    const ok = validateEmail(email)
      && validatePassword(password)
      && validateConfirm(confirmPassword);
    if (!ok) return;

    if (!userType) {
      Alert.alert("Error", "User type missing. Please go back.");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // --- REGISTER BACKEND ---
      const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, userType })
      });
      const regJson = await regRes.json();
      if (!regRes.ok) throw new Error(regJson.error || `Registration failed (${regRes.status})`);

      // --- FIREBASE SIGN-IN ---
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCred.user;
      const idToken = await fbUser.getIdToken(true);

      // --- FETCH FULL PROFILE ---
      const profRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const profJson = await profRes.json();
      if (!profRes.ok || !profJson.user) throw new Error(profJson.error || 'Profile fetch failed.');

      setUser(profJson.user);

    } catch (error) {
      console.error(error);
      let msg = error.message || 'Unexpected error.';
      if (error.code === 'auth/email-already-in-use' ||
          msg.includes('already associated')) {
        msg = 'This email is already registered.';
      } else if (msg.includes('Network request failed')) {
        msg = 'Cannot connect to server.';
      }
      Alert.alert("Registration Error", msg);
      setUser(null);
      if (auth.currentUser) auth.signOut().catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, confirmPassword, userType, setUser, isSubmitting]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
    
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={localstyles.scrollView}
        contentContainerStyle={localstyles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={30} color={styles.backButton?.color || '#000'} />
          </TouchableOpacity>

          <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
          <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />

          <Text style={localstyles.screenTitle}>Your journey starts here</Text>
          <Image source={require('../assets/Images/fruits.png')} style={styles.fruit} />

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder='E-mail'
            keyboardType='email-address'
            autoCapitalize='none'
            value={email}
            onChangeText={txt => { setEmail(txt); if (emailError) validateEmail(txt); }}
            onBlur={() => validateEmail(email)}
            editable={!isSubmitting}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current.focus()}
          />
          {emailError ? <Text style={localstyles.errorText}>{emailError}</Text> : null}

          {/* Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              placeholder='Password (min. 6 characters)'
              value={password}
              onChangeText={txt => { setPassword(txt); if (passwordError) validatePassword(txt); }}
              onBlur={() => validatePassword(password)}
              editable={!isSubmitting}
              secureTextEntry={!isPasswordVisible}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current.focus()}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(v => !v)} disabled={isSubmitting}>
              <Icon name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} style={styles.eyeIcon} />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={localstyles.errorText}>{passwordError}</Text> : null}

          {/* Confirm Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              ref={confirmRef}
              style={styles.passwordInput}
              placeholder='Confirm Password'
              value={confirmPassword}
              onChangeText={txt => { setConfirmPassword(txt); if (confirmError) validateConfirm(txt); }}
              onBlur={() => validateConfirm(confirmPassword)}
              editable={!isSubmitting}
              secureTextEntry={!isConfirmPasswordVisible}
              returnKeyType="done"
              onSubmitEditing={handleSignUpWithEmail}
            />
            <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(v => !v)} disabled={isSubmitting}>
              <Icon name={isConfirmPasswordVisible ? 'eye' : 'eye-off'} size={20} style={styles.eyeIcon} />
            </TouchableOpacity>
          </View>
          {confirmError ? <Text style={localstyles.errorText}>{confirmError}</Text> : null}

          {/* Next Button */}
          <View style={localstyles.actionButtonContainer}>
            <TouchableOpacity
              style={[
                localstyles.primaryActionButton,
                !isFormValid() && localstyles.primaryActionButtonInvalid
              ]}
              onPress={handleSignUpWithEmail}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={localstyles.primaryActionButtonText}>Next</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const localstyles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5E4C3',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 40,
    fontFamily: 'Quicksand_700Bold',
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
  },
 actionButtonContainer: { // Consistent Button Container Style
        width: '100%',
        alignItems: 'center', // Center button horizontally
        marginTop: 30, // Space above and below button
        marginBottom: 10, // Space below button
    },
    primaryActionButton: { // Consistent Primary Button Style
        width: '90%', // Responsive width
        maxWidth: 350, // Max width on larger screens
        height: 55, // Standard height
        borderRadius: 25, // More rounded
        backgroundColor: '#2E4A32', // Dark Green
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
     primaryActionButtonText: { // Consistent Button Text Style
        color: '#FFFFFF', // White text
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18, // Standard button text size
    },
  screenTitle: {
    fontSize: 40,
    fontFamily: 'Quicksand_700Bold',
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 10,
  },
});
