// App.js (or your main Navigator file)
import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import AchievementModal from './components/AchievementModal'; // Adjust path
import { AuthProvider, AuthContext } from './components/AuthContext'; // Adjust path
import { SimpleNotificationProvider } from './components/NotificationContext';
// --- Navigators ---
import AuthNavigator from './components/AuthNavigator';
import PersonalNavigator from './components/PersonalNavigator';
import ProfessionalNavigator from './components/ProfessionalNavigator';
import OnboardingNavigator from './components/OnboardingNavigator';
import AdminNavigator from './components/AdminNavigator';
import {GamificationProvider} from './components/GamificationContext'; // Adjust path
import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';

const PALETTE = { darkGreen: '#2E4A32', lightCream: '#F5E4C3' };
const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream || '#F5E4C3' }
});
const LoadingIndicator = () => ( <View style={styles.loaderContainer}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View> );

// --- Root Navigation Logic Component ---
function RootNavigatorContent() {
  const { user, loading } = useContext(AuthContext);

  console.log( /* ... your existing log ... */ );

  if (loading) {
    console.log("[RootNavigator] State: Initial Loading (from AuthContext)");
    return <LoadingIndicator />;
  }

  // --- V V V --- Conditional Logic to SELECT the Navigator --- V V V ---
  if (!user) {
      console.log("[RootNavigator] No user. Rendering AuthNavigator.");
      return <AuthNavigator />; // Render the entire AuthNavigator stack
  }
  if (!user.onboardingComplete) {
      console.log("[RootNavigator] User onboard incomplete. Rendering OnboardingNavigator.");
      return <OnboardingNavigator />; // Render the OnboardingNavigator stack
  }
  if (user.admin === true) {
      console.log("[RootNavigator] User is Admin. Rendering AdminNavigator.");
      return <AdminNavigator />; // Render the AdminNavigator stack
  }
  if (user.userType === 'Professional') {
      if (user.isVerified === true) {
          console.log("[RootNavigator] User is Verified Professional. Rendering ProfessionalNavigator.");
          return <ProfessionalNavigator />; // Render the ProfessionalNavigator stack
      } else {
          // Professional but not verified.
          // LoginScreen should have redirected to PendingVerification (part of AuthNavigator).
          // This is a fallback to ensure they see auth flow if they reach here.
          console.log("[RootNavigator] User is Unverified Professional. Rendering AuthNavigator (should go to PendingVerification).");
          return <AuthNavigator initialRouteName="PendingVerification" />; // Or just AuthNavigator and let it default
      }
  }
  if (user.userType === 'Personal') {
      console.log("[RootNavigator] User is Personal. Rendering PersonalNavigator.");
      return <PersonalNavigator />; // Render the PersonalNavigator stack
  }

  // Fallback if none of the above conditions met (should ideally not happen with a logged-in user)
  console.warn("[RootNavigator] Unknown user state after login. Defaulting to AuthNavigator.");
  return <AuthNavigator />;
  // --- ^ ^ ^ --- End Conditional Logic --- ^ ^ ^ ---
}

// --- Main App Component ---
export default function App() {
  const [fontsLoaded] = useFonts({ Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold });
  if (!fontsLoaded) { return <LoadingIndicator />; }

  return (
    <PaperProvider>
      <AuthProvider>
        <GamificationProvider>
          <SimpleNotificationProvider>
            {/* Wrap the entire app in the providers */}
            <NavigationContainer>
              <RootNavigatorContent />
              <AchievementModal />
            </NavigationContainer>
          </SimpleNotificationProvider>
        </GamificationProvider>
      </AuthProvider>
    </PaperProvider>
  );
}