import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext'; 

const initialAchievementState = {
    firstMealLogged: false,
    goalWeightReached: false,
    streak7Days: false,
  
};

const ACHIEVEMENT_DETAILS = {
    firstMealLogged: {
        key: 'firstMealLogged',
        title: "Fresh Start!",
        body: "You've earn your first streak! This is a great step towards your goals.",
        image: require('../assets/Images/fresh_start_badge.png'), 
    },
    goalWeightReached: {
        key: 'goalWeightReached',
        title: "Goal Achieved!",
        body: "Congratulations! You've reached your target weight. Amazing dedication!",
        image: require('../assets/Images/goal_achieved_badge.png'), 
    },
    streak7Days: {
        key: 'streak7Days',
        title: "7-Day Streak!",
        body: "One week of healthy habits – you're building real change!",
        image: require('../assets/Images/streak_7_days_badge.png'),
    },
   
};


const defaultGamificationContext = {
    achievements: initialAchievementState,
    unlockAchievement: async (achievementKey) => {},
    isAchievementModalVisible: false,
    currentAchievementDetails: null,
    closeAchievementModal: () => {},
};

export const GamificationContext = createContext(defaultGamificationContext);

export const GamificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext); 
    const [achievements, setAchievements] = useState(initialAchievementState);
    const [achievementQueue, setAchievementQueue] = useState([]); 
    const [currentAchievementDetails, setCurrentAchievementDetails] = useState(null);
    const [isAchievementModalVisible, setIsAchievementModalVisible] = useState(false);

    const storageKey = useMemo(() => user ? `@userAchievements_${user.uid}` : null, [user]);

    useEffect(() => {
        const loadAchievements = async () => {
            if (!storageKey) { 
                setAchievements(initialAchievementState);
                console.log("GamificationContext: No user, achievements reset to initial.");
                return;
            }
            console.log("GamificationContext: Loading achievements from storage for key:", storageKey);
            try {
                const storedAchievements = await AsyncStorage.getItem(storageKey);
                if (storedAchievements !== null) {
                    setAchievements(JSON.parse(storedAchievements));
                    console.log("GamificationContext: Achievements loaded from storage.");
                } else {
                    setAchievements(initialAchievementState); 
                    console.log("GamificationContext: No stored achievements, using initial.");
                }
            } catch (e) {
                console.error("GamificationContext: Failed to load achievements:", e);
                setAchievements(initialAchievementState); 
            }
        };
        loadAchievements();
    }, [storageKey]); 

    const unlockAchievement = useCallback(async (achievementKey) => {
        if (!storageKey) {
            console.warn("GamificationContext: Cannot unlock achievement, no user logged in.");
            return;
        }

        if (!ACHIEVEMENT_DETAILS[achievementKey]) {
            console.warn(`GamificationContext: Invalid achievement key: ${achievementKey}`);
            return;
        }

        if (achievements[achievementKey]) {
            console.log(`GamificationContext: Achievement ${achievementKey} already unlocked.`);
            return;
        }

        console.log(`GamificationContext: Unlocking achievement: ${achievementKey}`);
        const newAchievements = { ...achievements, [achievementKey]: true };
        setAchievements(newAchievements); 

        try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(newAchievements));
            console.log(`GamificationContext: Achievement ${achievementKey} saved to storage.`);

            setAchievementQueue(prevQueue => [...prevQueue, ACHIEVEMENT_DETAILS[achievementKey]]);
        } catch (e) {
            console.error("GamificationContext: Failed to save achievement:", e);
     
        }
    }, [achievements, storageKey]);

    useEffect(() => {
        if (achievementQueue.length > 0 && !isAchievementModalVisible) {
            const nextAchievement = achievementQueue[0];
            console.log("GamificationContext: Displaying achievement from queue:", nextAchievement.title);
            setCurrentAchievementDetails(nextAchievement);
            setIsAchievementModalVisible(true);
        }
    }, [achievementQueue, isAchievementModalVisible]);

    const closeAchievementModal = () => {
        console.log("GamificationContext: Closing achievement modal.");
        setIsAchievementModalVisible(false);
        setCurrentAchievementDetails(null);

        setAchievementQueue(prevQueue => prevQueue.slice(1));
    };

    const contextValue = useMemo(() => ({
        achievements,
        unlockAchievement,
        isAchievementModalVisible,
        currentAchievementDetails,
        closeAchievementModal
    }), [achievements, unlockAchievement, isAchievementModalVisible, currentAchievementDetails]);

    return (
        <GamificationContext.Provider value={contextValue}>
            {children}
        </GamificationContext.Provider>
    );
};