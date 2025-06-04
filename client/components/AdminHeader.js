import { Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


export default function AdminHeader({subtitle, style}) {
    const navigation = useNavigation();
    return (
     
        <View style={[styles.header, style]}>
       
            <View style={styles.topRow}>
                <Image
                    source={require("../assets/Images/logo.png")} 
                    style={styles.headerLogo} 
                />
    
                <Text style={styles.appName}>BiteWise</Text>
         
                 <TouchableOpacity onPress={() => navigation.navigate('AdminSettings')} >
                    <Ionicons name="settings-outline" size={24} color={"black"} />
                 </TouchableOpacity>
                 <MaterialIcons name="admin-panel-settings" size={24} color="black" />
            </View>

             {subtitle && (
                 <Text style={styles.subText}>{subtitle}</Text>
             )}
             
        </View>
    );
}