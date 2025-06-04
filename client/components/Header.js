import { Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

 
export default function Header({subtitle, style}) {
    const navigation = useNavigation();
    return (
   
    <View style={[styles.header, style]}>
        <View style={styles.topRow}>
        <Image
            source={require("../assets/Images/logo.png") } style={styles.headerLogo}
        />
        <Text style={styles.appName}>Bite wise</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} >
            <Ionicons name="notifications-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('userSettings')} >
            <Ionicons name="settings-outline" size={24} color="black" />
        </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack() }>
             <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.subText}>{subtitle}</Text>
        
    </View>
    
    );
}
