import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig'; 
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { TokenManager } from '../utils/tokenManager';


const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; 


const PALETTE = {
    darkGreen: '#2E4A32',
    lightCream: '#F5E4C3', 
};

const defaultContextValue = {
  user: null, 
  setUser: (userData) => { console.warn("AuthContext: Default setUser called from defaultContextValue. Provider might not be properly mounted or value overwritten by mistake."); },
  loading: true, 
  activeCoachId: undefined, 
  isCoachStatusLoading: true, 
  getIdToken: async (forceRefresh = false) => null,
  refreshCoachingStatus: async () => {}, 
  setActiveCoachInContext: (coachId) => {}, 
  logout: async () => {}, 

};

export const AuthContext = createContext(defaultContextValue);

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null); 
  

    const [loading, setLoading] = useState(true); 
    const [activeCoachId, setActiveCoachId] = useState(undefined);
    const [isCoachStatusLoading, setIsCoachStatusLoading] = useState(true); 

    const getIdToken = useCallback(async (forceRefresh = false) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                console.log("AuthCtx: Getting ID token...");
                return await currentUser.getIdToken(forceRefresh);
            } catch (e) {
                console.error("AuthCtx: Error getting ID token:", e.code, e.message);
                if (e.code === 'auth/user-token-expired' || e.code === 'auth/invalid-user-token') {
               
                }
                return null;
            }
        }
        console.log("AuthCtx: No auth.currentUser for getIdToken.");
        return null;
    }, []);


    const fetchFullUserProfile = useCallback(async (firebaseUserId) => {
        const uidToFetch = firebaseUserId; 
        console.log(`AuthCtx: fetchFullUserProfile STARTING for UID: ${uidToFetch}...`);
      
        if (activeCoachId === undefined) { 
            setIsCoachStatusLoading(true);
        }

        try {
            const token = await getIdToken(true);
            if (!token) {
                throw new Error("No valid token for profile fetch after Firebase auth confirmation.");
            }

            console.log(`AuthCtx: Token for profile fetch for ${uidToFetch} retrieved. Calling backend /auth/login...`);
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`  
                },
                
            });

            const contentType = response.headers.get("content-type");
            let data;
            if (contentType?.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error(`AuthCtx: Non-JSON response from /auth/login (${response.status}): ${text.substring(0, 200)}`);
                throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
            }
            console.log("AuthCtx: Backend /auth/login response data:", data);

            if (response.ok && data.user) {
                 const backendUser = data.user;
             
                 const fullUserProfile = {
                      ...backendUser, 
                      uid: uidToFetch, 
                      email: auth.currentUser?.email || backendUser.email, 
                      onboardingComplete: typeof backendUser.onboardingComplete === 'boolean' ? backendUser.onboardingComplete : false,
                      userType: backendUser.userType || null, 
                      admin: backendUser.admin === true,      
                      isVerified: backendUser.isVerified === true, 
                      activeCoachId: backendUser.userType === 'Personal' ? (backendUser.activeCoachId || null) : null,
                 };
                 console.log("AuthCtx: fetchFullUserProfile SUCCESS. Updating context user state:", fullUserProfile);
                 setUser(fullUserProfile); 

                 setActiveCoachId(fullUserProfile.activeCoachId);
                 setIsCoachStatusLoading(false); 
                 return fullUserProfile;
            } else {
         
                 console.error(`AuthCtx: Backend /auth/login failed or missing user data. Status: ${response.status}`, data);
                 throw new Error(data.error || data.message || `Backend profile fetch failed (${response.status})`);
            }
        } catch (error) {
            console.error("AuthCtx: Error in fetchFullUserProfile (catch block):", error);
          
             setUser({
                 uid: uidToFetch, 
                 email: auth.currentUser?.email, 
                 errorFetchingProfile: true, 
                 onboardingComplete: false, userType: null, admin: false, activeCoachId: null, isVerified: false
             });
             setActiveCoachId(null);
             setIsCoachStatusLoading(false);
            return null; 
        } finally {
       
            console.log("AuthCtx: fetchFullUserProfile FINALLY block.");
        }
    }, [getIdToken, loading, activeCoachId, isCoachStatusLoading]); 


    const fetchCoachingStatus = useCallback(async () => {
    console.log("AuthContext: fetchCoachingStatus STARTING...");

    setIsCoachStatusLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("AuthContext: No auth.currentUser in fetchCoachingStatus. Setting coach status null, loading false.");
        setActiveCoachId(null);
        setIsCoachStatusLoading(false); 
        return; 
    }
    

    let token = null;
    try {
         console.log(`AuthContext: Getting ID token for fetch (User ${currentUser.uid})...`);
         token = await getIdToken();
         if (!token) {
            
             throw new Error("Auth token could not be retrieved for an authenticated user.");
         }

        console.log("AuthContext: Token ok, fetching /coaching/status...");
        const response = await fetch(`${API_BASE_URL}/coaching/status`, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log("AuthContext: Fetch status:", response.status);
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) { const text = await response.text(); throw new Error(`Non-JSON: ${text.substring(0,100)}`); }
        const data = await response.json();
        console.log("AuthContext: Parsed data:", data);

        if (!response.ok) { throw new Error(data.message || `Fetch failed (${response.status})`); }

        console.log("AuthContext: Setting activeCoachId:", data.activeCoachId || null);
        setActiveCoachId(data.activeCoachId || null);
 
        console.log("AuthContext: Fetch successful. Setting isCoachStatusLoading to FALSE.");
        setIsCoachStatusLoading(false);

    } catch (error) {
        console.error("AuthContext: Error during fetchCoachingStatus:", error);
        setActiveCoachId(null); 

        console.log("AuthContext: Fetch errored. Setting isCoachStatusLoading to FALSE.");
        setIsCoachStatusLoading(false);
    }

}, [getIdToken]);


    
    const setActiveCoachInContext = useCallback((coachId) => {
        const newCoachId = coachId || null;
        console.log(`AuthCtx: Manually setting activeCoachId in context to: ${newCoachId}`);
        setActiveCoachId(newCoachId);
        if (isCoachStatusLoading) { setIsCoachStatusLoading(false); }
    }, [isCoachStatusLoading]);


    useEffect(() => {
        console.log("AuthCtx: Setting up Firebase onAuthStateChanged listener.");
        let isMounted = true;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
             if (!isMounted) return;
             console.log("################ AUTH STATE LISTENER FIRED ################");
             console.log("AuthCtx Listener: Firebase User state:", firebaseUser?.uid || "null");

            if (firebaseUser) {
             
                console.log("AuthCtx Listener: Firebase user detected. Calling fetchFullUserProfile...");
                await fetchFullUserProfile(firebaseUser.uid);
           
            } else {
            
                console.log("AuthCtx Listener: No Firebase user. Clearing all context state.");
                setUser(null);
                setActiveCoachId(null);
                setIsCoachStatusLoading(false);
            }
  
            if (loading) {
                console.log("AuthCtx Listener: Initial Firebase auth check complete. Setting app loading=false.");
                setLoading(false);
            }
        });
        return () => { isMounted = false; unsubscribe(); console.log("AuthCtx Listener: Unsubscribed."); };

    }, [loading, fetchFullUserProfile]); 


    const refreshCoachingStatus = useCallback(async () => {
        console.log("AuthCtx: Manual refreshCoachingStatus called.");
        if (auth.currentUser) await fetchCoachingStatus(); else { setActiveCoachId(null); setIsCoachStatusLoading(false); }
    }, [fetchCoachingStatus]);

    const refreshUserProfile = useCallback(async () => {
        console.log("AuthCtx: Manual refreshUserProfile called.");
        setIsCoachStatusLoading(true); 
        return await fetchFullUserProfile(auth.currentUser?.uid); 
    }, [fetchFullUserProfile]);


    const logout = useCallback(async () => {
         console.log("AuthCtx: Logout function called.");
         try { await auth.signOut(); }
         catch (error) { console.error("AuthCtx: SignOut Error:", error); setUser(null); setActiveCoachId(null); setIsCoachStatusLoading(false); } // Defensive clear
    }, []);


    const registerForPushNotifications = async (user) => {
        try {
            console.log(`🔔 Registering push notifications for ${user.userType}: ${user.uid}`);
            
            // Generate unique token
            const uniqueToken = await TokenManager.generateUniqueToken(user.uid, user.userType);
            
            if (uniqueToken) {
                // Update in database
                const collection = user.userType === 'coach' ? 'nutritionists' : 'users';
                await updateDoc(doc(db, collection, user.uid), {
                    expoPushToken: uniqueToken,
                    tokenGeneratedAt: new Date(),
                    deviceInfo: {
                        userType: user.userType,
                        registeredAt: new Date().toISOString()
                    }
                });
                
                console.log(`✅ Unique push token registered for ${user.userType} ${user.uid}`);
                return uniqueToken;
            }
        } catch (error) {
            console.error('❌ Failed to register push notifications:', error);
        }
    };

    // Call this when user logs in
    const handleLogin = async (userData) => {
        // ... existing login logic ...
        
        // Register unique push token
        await registerForPushNotifications(userData);
    };

    const contextValue = useMemo(() => ({
        user,          
        setUser,        
        loading,        
        activeCoachId,
        isCoachStatusLoading,
        getIdToken,
        refreshCoachingStatus,
        setActiveCoachInContext,
        logout,
        refreshUserProfile 
    }), [
        user, setUser, loading, activeCoachId, isCoachStatusLoading,
        getIdToken, refreshCoachingStatus, setActiveCoachInContext, logout, refreshUserProfile
    ]);


    if (loading) {
        console.log("AuthCtx: Initial auth/profile loading is TRUE, rendering loader.");
        return <LoadingIndicator />;
    }

    console.log("AuthCtx: Rendering Provider.", { userUID: user?.uid, userType: user?.userType, isCoachLoading: isCoachStatusLoading, coachId: activeCoachId });
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

const LoadingIndicator = () => (
     <View style={styles.fullScreenLoader}>
         <ActivityIndicator size="large" color={PALETTE.darkGreen}/>
     </View>
 );

const styles = StyleSheet.create({
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream || '#F5E4C3' }
});