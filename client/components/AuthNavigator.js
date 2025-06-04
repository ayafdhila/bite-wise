import WelcomeScreen from './WelcomeScreen';
import LogIn from './LogIn';
import ResetPassword from './ResetPassword';
import UserType from './UserType';
import NutritionForm from './NutritionForm';
import PendingVerificationScreen from './PendingVerificationScreen';
import SignUp from './SignUp';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();
export default function AuthNavigator(){
    return(
        <Stack.Navigator screenOptions={{headerShown: false}}
        initialRouteName="WelcomeScreen"> 
            <Stack.Screen name='WelcomeScreen' component={WelcomeScreen}/> 
            <Stack.Screen name='LogIn' component={LogIn} />
            <Stack.Screen name='PendingVerificationScreen' component={PendingVerificationScreen}/>
            <Stack.Screen name='UserType' component={UserType}/>
            <Stack.Screen name='SignUp' component={SignUp}/>
            <Stack.Screen name='NutritionForm' component={NutritionForm} />
                 
            <Stack.Screen name='ResetPassword' component={ResetPassword}/>
        </Stack.Navigator>
    );
}
