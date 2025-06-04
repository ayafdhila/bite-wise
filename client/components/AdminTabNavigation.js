import { View, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import stylesFromSheet from './Styles'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';


const styles = StyleSheet.create({
    ...stylesFromSheet,
   
    adminTabNavigation: stylesFromSheet.tabNavigation || { 
         flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
         height: 60, backgroundColor: '#88A76C', borderTopWidth: 1, borderTopColor: '#ccc'
     },
   
     adminIconColor: 'black', 
});

export default function AdminTabNavigation() {
    const navigation = useNavigation();

    const goToDashboard = () => navigation.navigate('AdminDashboard');
    const goToVerifyCoaches = () => navigation.navigate('AdminVerifyCoach');
    const goToManageUsers = () => navigation.navigate('AdminManageUsers');   
    const goToManageCoaches = () => navigation.navigate('AdminManageCoaches');
    const goToFeedback = () => navigation.navigate('AdminFeedback');      

    return(
        <View style={styles.adminTabNavigation}>

           <TouchableOpacity onPress={goToDashboard} >
               <Ionicons name="stats-chart-outline" size={28} color={styles.adminIconColor} />
        
           </TouchableOpacity>

             <TouchableOpacity onPress={goToVerifyCoaches}  >
             
                <Ionicons name="shield-checkmark-outline" size={28} color={styles.adminIconColor} />
              
            </TouchableOpacity>

             <TouchableOpacity onPress={goToManageUsers}  >
                 <Ionicons name="people-outline" size={28} color={styles.adminIconColor} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goToFeedback}  >
                <Ionicons name="document-text-outline" size={28} color={styles.adminIconColor} />
        
            </TouchableOpacity>

         

        </View>
    );
}