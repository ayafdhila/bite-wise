// navigation/AdminNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboard from './AdminDashboard';
import AdminVerifyCoach from './AdminVerifyCoach'; 
import AdminManageUsers from './AdminManageUsers';
import AdminFeedback from './AdminFeedback';
import AdminCoachDetailScreen from './AdminCoachDetailScreen'; 
import AdminSettings from './AdminSettings';
const Stack = createStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="AdminDashboard">
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
     
      />
      <Stack.Screen
        name="AdminVerifyCoach"
        component={AdminVerifyCoach}
   
      />
      <Stack.Screen
        name="AdminManageUsers"
        component={AdminManageUsers}/>
      <Stack.Screen
        name="AdminFeedback"
        component={AdminFeedback}/>
      <Stack.Screen name="AdminCoachDetailScreen" component={AdminCoachDetailScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettings} />
    </Stack.Navigator>
    
    
  );
}