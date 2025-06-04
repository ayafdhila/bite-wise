import React from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import Header from './Header';
import TabNavigation from './TabNavigation';
import styles from './Styles';
import {useState} from 'react';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../components/AuthContext';
import { useContext } from 'react';
export default function ActivityScreen() {
  const { user } = useContext(AuthContext);
    const uid = user?.uid;
  const [selectedValue, setSelectedValue] = useState('List');
  const [timeValue, setTimeValue]= useState('');
  const [unitValue, setUnitValue] = useState('Minute')
  return (
    <View style={styles.mainContainer}>
      <Header subtitle='Activity Log'/>
      <TabNavigation/>
      <Text style={[styles.caloriesText, {padding: 10}]}>Select an Activity</Text>
      <View style={styles.pickerContainer}>
     
        <Picker style={styles.picker}
        selectedValue={selectedValue}
        onValueChange= {(itemValue) => setSelectedValue(itemValue)}
        dropdownIconColor = '#000'>
        <Picker.Item label='Workout' value='Workout'/>
        <Picker.Item label='Running' value='Running'/>
        <Picker.Item label='Cycling' value='Cycling'/>
        <Picker.Item label='Swiming' value='Swiming'/>
        <Picker.Item label='Yoga' value='Yoga'/>
        <Picker.Item label='Dancing' value='Dancing'/>
        <Picker.Item label='Pilates' value='Pilates'/>
        <Picker.Item label='General Fitness' value='GeneralFitness'/>
        </Picker>
        </View>
        <Text style={[styles.caloriesText, {padding: 10}]}>Duration</Text>
        <View style={[styles.pickerContainer, {flexDirection:'row'}]}>
             <TextInput style={[styles.inputDuration, Platform.OS === 'ios' && { height: 50 }]}
             itemStyle ={{
              height: 44,
              fontSize: 16,
              
             }}
             placeholder='Enter time' 
             keyboardType='numeric'
          />
            <Picker selectedValue={unitValue}
            dropdownIconColor= '#000'
            onValueChange={itemValue => setUnitValue(itemValue)}
            style={[styles.picker, {width: 120, paddingHorizontal: 0}, Platform.OS === 'ios' && { height: 70}]}>
            <Picker.Item label='Minute' value='Min'/>
            <Picker.Item label= 'Hour' value='Hour'/>
            </Picker>
        </View>
        <Text style={[styles.caloriesText, {padding: 10}]}>Intensity Level</Text>
        <View style={styles.pickerContainer}>
     
        <Picker style={[styles.picker, Platform.OS === 'ios' && { height: 50, textAlign: 'center', paddingTop: 0 }]}
             itemStyle ={{
              height: 44,
              fontSize: 16,}}
        selectedValue={selectedValue}
        onValueChange= {(itemValue) => setSelectedValue(itemValue)}

        dropdownIconColor = '#000'>
        <Picker.Item label='Low' value='Low'/>
        <Picker.Item label='Meduim' value='Meduim'/>
        <Picker.Item label='High' value='High'/>
        </Picker>
        </View>
      
    </View>
  );
}
