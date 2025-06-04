// components/OnboardingNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import NameScreen from './NameScreen';
import GoalScreen from './GoalScreen';
import SettingProfile from './SettingProfile'; // Assuming this sets Height, Weight, Gender, Age
import MotivationalScreen from './MotivationalScreen'; // If this is part of onboarding
import TransformationScreen from './TransformationScreen'; // If this is part of onboarding
import DietaryPreferences from './DietaryPreferences';
import ActivityLevel from './ActivityLevel';
import EstimationScreen from './EstimationScreen'; // If this is the final calculation screen




const Stack = createStackNavigator();

export default function OnboardingNavigator() {
    return (
  
        <Stack.Navigator initialRouteName="NameScreen" screenOptions={{ headerShown: false }}>
            <Stack.Screen name='NameScreen' component={NameScreen} />
            <Stack.Screen name='GoalScreen' component={GoalScreen} />
            <Stack.Screen name='SettingProfile' component={SettingProfile} />
            <Stack.Screen name='MotivationalScreen' component={MotivationalScreen} />
            <Stack.Screen name='TransformationScreen' component={TransformationScreen} />
            <Stack.Screen name='DietaryPreferences' component={DietaryPreferences} />
            <Stack.Screen name='ActivityLevel' component={ActivityLevel} />
            <Stack.Screen name='EstimationScreen' component={EstimationScreen} />
     
  
        </Stack.Navigator>
    );
}