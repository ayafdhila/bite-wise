import React from 'react';
import { View, Text, Image, Alert, TouchableOpacity } from 'react-native';
import styles from './Styles';
import { Button, Divider} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons'; 
import { AuthContext } from '../components/AuthContext';
import { useContext } from 'react';
export default function UserType() {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  
const navigation = useNavigation();
const [userType, setUserType] = useState ('');
const handleText = () => {
  console.log('User Type:', userType);
  
  if (userType === 'Personal') {
    navigation.navigate('SignUp', { userType }); 
  } 
  else if (userType === 'Professional') {
    navigation.navigate('NutritionForm', { userType }); 
  } 
  else {
    Alert.alert('Please select an option first');
  }
};
  return (
    <View style={styles.container}>
    
      <TouchableOpacity onPress={() => navigation.goBack() } style={styles.backButton}>
        <Ionicons name="arrow-back" size={38}/>
      </TouchableOpacity>
 
      <Image source={require('../assets/Images/leaf.png')} style= {styles.topLeaf}/>
      <Image source={require('../assets/Images/leaf.png')} style= {styles.bottomLeaf}/>
      <Text style={styles.primaryText}>How will you be {'\n'}using the app ?</Text>
      <View style={styles.buttonUserContainer}>
          <Button mode='contained' style={styles.clientButton} onPress={()=>{setUserType('Personal')}}>
            <View style={styles.textWrapper}>
              <Text style={styles.userText}>I'm here for my</Text>
              <Text style={styles.userText}>personal nutrition</Text>
              <Text style={styles.userText}>journey</Text>
            </View>
          </Button>
          <Button mode='contained' style={styles.proButton} onPress={()=>{setUserType('Professional')}}>
          <View style={styles.textWrapper}>
              <Text style={styles.userText}>I'm a nutrition</Text>
              <Text style={styles.userText}>professional</Text>
            </View>
          </Button>
      </View>
      <View style={styles.DivLeafContainer}>
            <Divider style={styles.Divider} />
            <Image source={require('../assets/Images/twoLeafs.png')} style={styles.twoLeafs}/>
      </View>
      <View style={styles.buttonContainer}>
          <Button mode= 'contained' style={styles.button} labelStyle={styles.textButton} onPress={handleText}>Next</Button>  
      </View>
    </View>
  );
}
