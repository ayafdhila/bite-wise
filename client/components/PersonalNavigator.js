import Home from './Home';
import PlanTemplate from './PlanTemplate';
import Chatbot from './Chatbot';
import Profile from './Profile';
import Recipes from './recipes';
import NotificationBadge from './NotificationBadge';
import NotificationsScreen from './NotificationsScreen'; // Add this import
import userSettings from './userSettings';
import userReminders from './userReminders';
import userLogOut from './userLogOut';
import changeUserPwd from './changeUserPwd';
import DeleteUserAccount from './DeleteUserAccount';
import EditUserProfile from './EditUserProfile';
import ContactUsScreen from './ContactUsScreen';
import NutritionSection from './NutritionSection';
import AddMeal from './AddMeal'
import ActivityScreen from './ActivityScreen';
import NutritionistInfo from './NutritionistInfo';
import MessagesGuidance from './MessagesGuidance';
import UserChatScreen from './UserChatScreen';
import RecipeDetail from './RecipeDetail';
import FindSpecialist from './FindSpecialist';
import ActiveCoachDashboard from './ActiveCoachDashboard';
import ProductResultScreen from './ProductResultScreen';
import ResetPassword from './ResetPassword';

import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function PersonalNavigator(){
    return(
        <Stack.Navigator screenOptions={{headerShown: false}}> 
            <Stack.Screen name='Home' component={Home}/>
            <Stack.Screen name='PlanTemplate' component={PlanTemplate}/>
            <Stack.Screen name='Recipes' component={Recipes}/>
            <Stack.Screen name = 'RecipeDetail' component={RecipeDetail}/>
            <Stack.Screen name='Profile' component={Profile}/>
            <Stack.Screen name='Chatbot' component={Chatbot}/>
            <Stack.Screen name='NotificationBadge' component={NotificationBadge}/>
            <Stack.Screen name='NotificationsScreen' component={NotificationsScreen}/> 
            <Stack.Screen name = 'FindSpecialist' component={FindSpecialist}/>
            <Stack.Screen name='NutritionSection' component={NutritionSection}/>
            <Stack.Screen name = 'NutritionistInfo' component={NutritionistInfo}/>
            <Stack.Screen name ='AddMeal' component={AddMeal}/>
            <Stack.Screen name= 'ProductResultScreen' component={ProductResultScreen}/>
            <Stack.Screen name ='ActivityScreen' component={ActivityScreen}/>
            <Stack.Screen name = 'ActiveCoachDashboard' component={ActiveCoachDashboard}/>
            <Stack.Screen name = 'MessagesGuidance' component={MessagesGuidance}/>
            <Stack.Screen name = 'UserChatScreen' component={UserChatScreen}/> 
            <Stack.Screen name = 'ContactUsScreen' component={ContactUsScreen}/>
            <Stack.Screen name = 'userSettings' component={userSettings}/>
            <Stack.Screen name = 'userReminders' component={userReminders}/>
            <Stack.Screen name = 'userLogOut' component={userLogOut}/>
            <Stack.Screen name = 'changeUserPwd' component={changeUserPwd}/>
            <Stack.Screen name = 'DeleteUserAccount' component={DeleteUserAccount}/>
            <Stack.Screen name = 'EditUserProfile' component={EditUserProfile}/>
            <Stack.Screen name = 'ResetPassword' component={ResetPassword}/>
        </Stack.Navigator>
    );
}