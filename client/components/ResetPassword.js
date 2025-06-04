import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Alert, Pressable } from 'react-native';
import styles from './Styles';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import firebaseApp from '../firebaseConfig';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { SafeAreaView } from 'react-native';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [Success, setSuccess] = useState(false);
  const navigation = useNavigation();

  const sendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    try {
      const auth = getAuth(firebaseApp);
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error) {
    alert(error.message);
  }
  }

  return (
    <SafeAreaView style={styles.container}>
     
         <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
           <Ionicons name="arrow-back" size={38}/>
         </TouchableOpacity>
      
      <Image source={require('../assets/Images/leaf.png')} style= {styles.topLeaf}/>
      <Image source={require('../assets/Images/leaf.png')} style= {styles.bottomLeaf}/>
      <Text style={styles.resetText}>Reset Your Password ?</Text>
      <Text style={[styles.caloriesText, {marginVertical: 20, textAlign: 'center'}]}>Enter your email, and we'll send you a reset link</Text>
      <TextInput style={styles.input} placeholder='E-mail' value= {email} onChangeText={setEmail} keyboardType='email-address'/>
      <Image source={require('../assets/Images/Pear.png')} style={styles.smallPear}/>
      <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.button} onPress={() => sendResetLink(email)}>
        <Text style={styles.textButton}>Send Reset Link!</Text>
      </TouchableOpacity>
      {Success && (
        <>
          <Text style={styles.subNameText}>
            Check your email! We've sent you a link to change your password.
          </Text>
          <Pressable onPress={() => navigation.navigate('LogIn')}>
            <Text style={styles.subNameText}>Back to Login</Text>
          </Pressable>
        </>
      )}
      </View>
    </SafeAreaView>
  );
}
