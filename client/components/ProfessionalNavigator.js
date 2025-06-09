import HomeCoach from './HomeCoach';
import Clients from './Clients';
import Invitations from './Invitations';
import CoachClientDetails from './CoachClientDetails';
import CoachMessagesListScreen from './CoachMessagesListScreen';
import PlanEditor from './PlanEditor';
import CoachClientChatScreen from './CoachClientChatScreen';
import ResetPassword from './ResetPassword';
import CoachContactUs from './CoachContactUs'
import CoachLogOut from './CoachLogOut';
import CoachReminders from './CoachReminders'
import DeleteCoachAccount from './DeleteCoachAccount';
import EditCoachProfile from './EditCoachProfile';
import CoachSettings from './CoachSettings';

import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();
export default function ProfessionalNavigator(){
    return(

            <Stack.Navigator screenOptions={{headerShown: false}}> 
           
                <Stack.Screen name='HomeCoach' component={HomeCoach}/> 
                <Stack.Screen name='Invitations' component={Invitations}/>
                <Stack.Screen name= 'CoachClientDetails' component={CoachClientDetails}/>
                <Stack.Screen name = 'Clients' component= {Clients}/>
                <Stack.Screen name = 'CoachMessagesListScreen' component={CoachMessagesListScreen}/>
                <Stack.Screen name='CoachClientChatScreen' component={CoachClientChatScreen}/>
                <Stack.Screen name= 'PlanEditor' component={PlanEditor} />
                <Stack.Screen name='ResetPassword' component={ResetPassword}/>
                <Stack.Screen name='CoachContactUs' component={CoachContactUs}/>    
                <Stack.Screen name='CoachLogOut' component={CoachLogOut}/>
               
                <Stack.Screen name='DeleteCoachAccount' component={DeleteCoachAccount}/>
                <Stack.Screen name='EditCoachProfile' component={EditCoachProfile}/>
                <Stack.Screen name='CoachSettings' component={CoachSettings}/>
                <Stack.Screen name='CoachReminders' component={CoachReminders}/>
               
            </Stack.Navigator>

    )
}