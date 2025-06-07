import React, { useEffect, useState, useContext, useCallback } from 'react'; 
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'; 
import styles from './Styles'; 
import Header from './Header'; 
import TabNavigation from './TabNavigation'; 
import { ProgressChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons';
import { Divider } from 'react-native-paper';
import { Bar } from 'react-native-progress';
import axios from 'axios';
import { AuthContext } from '../components/AuthContext'; 

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0]; 
};

const defaultPlan = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: { recommended: 0 }, goal: '' };
const defaultConsumed = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export default function Home() {
  const { user } = useContext(AuthContext);
 
  const [uid, setUid] = useState(user?.uid || null);
  const navigation = useNavigation();
  const [plan, setPlan] = useState(defaultPlan);
  const [consumedTotals, setConsumedTotals] = useState(defaultConsumed);
  const [streak, setStreak] = useState(0);
  const [userGoalText, setUserGoalText] = useState('Set Goal'); 
  const [isLoading, setIsLoading] = useState(true);
 
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
  const DAILY_DATA_ENDPOINT = '/logMeal/daily-data'; 
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']; 

  useEffect(() => {
    if (user?.uid && user.uid !== uid) {
      console.log("Home: Setting UID from context:", user.uid);
      setUid(user.uid);
    } else if (!user?.uid && uid !== null) {
      console.log("Home: Clearing UID and resetting data due to user logout/null.");
      setUid(null);
      setPlan(defaultPlan);
      setConsumedTotals(defaultConsumed);
      setStreak(0);
      setUserGoalText('Set Goal');
      setIsLoading(false); 
    }
  }, [user, uid]); 

  const fetchData = useCallback(async () => {
    if (!uid) {
      console.log("fetchData skipped: No UID.");
      setIsLoading(false);
      return; 
    }

    console.log(`Home: Fetching data for UID: ${uid}`);
    setIsLoading(true); 
    const todayDate = getTodayDateString();
    const url = `${API_BASE_URL}${DAILY_DATA_ENDPOINT}/${uid}/${todayDate}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.success) {
        console.log("Home: Received data:", data);
        setPlan(data.nutritionPlan || defaultPlan);
        setConsumedTotals(data.consumedTotals || defaultConsumed);
        setStreak(data.streak || 0);
        setUserGoalText(String(data.nutritionPlan?.goal || user?.goal || 'Set Goal'));
      } else {
        console.warn("Home: false", data);
        setPlan(defaultPlan);
        setConsumedTotals(defaultConsumed);
        setStreak(0);
        setUserGoalText(String(user?.goal || 'Set Goal'));
      }
    } catch (err) {
      console.error('Error loading daily data:', err.response ? JSON.stringify(err.response.data) : err.message);
      setPlan(defaultPlan);
      setConsumedTotals(defaultConsumed);
      setStreak(0);
      setUserGoalText(String(user?.goal || 'Set Goal'));
    } finally {
      setIsLoading(false); 
    }
  }, [uid, user?.goal]); 

  useFocusEffect(
    useCallback(() => {
      if (uid) { 
        console.log("Home screen focused, fetching data...");
        fetchData();
      } else {
        console.log("Home screen focused, but no UID. Skipping fetch.");
        setIsLoading(false); 
      }
    }, [fetchData, uid]) 
  );

  // Safe number conversion
  const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Safe string formatter
  const safeFormatValue = (value, decimals = 0) => {
    const num = safeNumber(value, 0);
    return num.toFixed(decimals);
  };

  // Safe string conversion
  const safeString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    return String(value);
  };

  const goalCalories = safeNumber(plan?.calories);
  const goalCarbs = safeNumber(plan?.carbs);
  const goalProtein = safeNumber(plan?.protein);
  const goalFat = safeNumber(plan?.fat);
  const goalFiber = safeNumber(plan?.fiber?.recommended);

  const consumedCals = safeNumber(consumedTotals?.calories);
  const consumedCarbs = safeNumber(consumedTotals?.carbs);
  const consumedProtein = safeNumber(consumedTotals?.protein);
  const consumedFat = safeNumber(consumedTotals?.fat);
  const consumedFiber = safeNumber(consumedTotals?.fiber);

  const remainingCalories = Math.max(0, goalCalories - consumedCals);
  const calorieProgress = goalCalories > 0 ? Math.min(consumedCals / goalCalories, 1) : 0;

  const progressBar = (consumed, goal) => {
    const numericGoal = safeNumber(goal);
    const numericConsumed = safeNumber(consumed);
    if (numericGoal <= 0) return 0;
    return Math.min(numericConsumed / numericGoal, 1); 
  };

  // Debug log all values
  console.log('Debug values:', {
    userGoalText,
    goalCalories,
    consumedCals,
    remainingCalories,
    streak,
    meals
  });

  if (isLoading && uid) { 
    return (
      <View style={styles.mainContainer}>
        <Header subtitle="Welcome Back !" />        
        <TabNavigation />
        <View style={[styles.container, {flex: 1, justifyContent: 'center', alignItems: 'center'}]}>
          <ActivityIndicator size="large" color="#2E4A32" />
          <Text style={{marginTop: 10, color: '#555'}}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.mainContainer}>
        <Header subtitle="Welcome Back !" />
        <TabNavigation />
        <View style={[styles.container, {flex: 1, justifyContent: 'center', alignItems: 'center'}]}>
          <Text style={{fontSize: 18, textAlign: 'center'}}>
            Please log in to view your dashboard.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <Header subtitle="Welcome Back !" />
      <TabNavigation />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.container}>
          <View style={styles.chartContainer}>
            <View style={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              backgroundColor: '#88A76C', 
              borderBottomLeftRadius: 20, 
              borderTopRightRadius: 20, 
              height: 40, 
              width: 140, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Text style={styles.chartText}>
                {safeString(userGoalText, 'Set Goal')}
              </Text>
            </View>
            
            <Text style={styles.caloriesText}>Today's goal</Text>
            <Text style={styles.caloriesSubText}>Remaining = Goal - Food Calories Consumed</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ position: 'relative' }}>
                <ProgressChart
                  data={{ data: [calorieProgress] }} 
                  width={150}
                  height={150}
                  strokeWidth={9}
                  radius={55}
                  chartConfig={{ 
                    backgroundColor: '#FCCF94',
                    backgroundGradientFrom: '#FCCF94',
                    backgroundGradientTo: '#FCCF94',
                    color: (opacity = 1) => `rgba(212, 138, 115, ${opacity})`,
                    propsForLabels: {fontSize: 0} 
                  }}
                  hideLegend={true}
                />

                <View style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Text style={styles.goalText}>Remaining</Text>
                  <Text style={styles.remainingValue}>
                    {safeFormatValue(remainingCalories, 0)}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'column', justifyContent: 'space-around', height: 150 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={require('../assets/Images/BaseGoal.png')} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.remaining}>Base Goal</Text>
                    <Text style={styles.remainingValue}>
                      {`${safeFormatValue(goalCalories, 0)} kcal`}
                    </Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={require('../assets/Images/Food.png')} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.remaining}>Consumed</Text>
                    <Text style={styles.remainingValue}>
                      {safeFormatValue(consumedCals, 0)}
                    </Text> 
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={require('../assets/Images/Streak.png')} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.remaining}>Streak</Text>
                    <Text style={styles.remainingValue}>
                      {`${safeNumber(streak, 0)} ${safeNumber(streak, 0) === 1 ? 'day' : 'days'}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Divider style={styles.Divider} />

            <View style={{ flexDirection: 'column', width: '100%', marginTop: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.remaining}>Carbs</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.remaining}>Protein</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.remaining}>Fat</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.remaining}>Fiber</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Bar
                    progress={progressBar(consumedCarbs, goalCarbs)}  
                    width={70}
                    height={10}
                    color="#D48A73"
                    borderWidth={0}
                    unfilledColor="white"
                  />
                  <Text style={{ marginTop: 10 }}>
                    {`${safeFormatValue(consumedCarbs, 0)} / ${safeFormatValue(goalCarbs, 0)}g`}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Bar
                    progress={progressBar(consumedProtein, goalProtein)} 
                    width={70}
                    height={10}
                    color="#D48A73"
                    borderWidth={0}
                    unfilledColor="white"
                  />
                  <Text style={{ marginTop: 10 }}>
                    {`${safeFormatValue(consumedProtein, 0)} / ${safeFormatValue(goalProtein, 0)}g`}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Bar
                    progress={progressBar(consumedFat, goalFat)}
                    width={70}
                    height={10}
                    color="#D48A73"
                    borderWidth={0}
                    unfilledColor="white"
                  />
                  <Text style={{ marginTop: 10 }}>
                    {`${safeFormatValue(consumedFat, 0)} / ${safeFormatValue(goalFat, 0)}g`}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Bar
                    progress={progressBar(consumedFiber, goalFiber)}
                    width={70}
                    height={10}
                    color="#D48A73"
                    borderWidth={0}
                    unfilledColor="white"
                  />
                  <Text style={{ marginTop: 10 }}>
                    {`${safeFormatValue(consumedFiber, 1)} / ${safeFormatValue(goalFiber, 0)}g`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <Image source={require('../assets/Images/SportyPear.png')} style={styles.sportyPear} />
          
          <View style={styles.buttonHomeContainer}>
            <TouchableOpacity 
              style={[styles.homeButton, { backgroundColor: '#88A76C' }]} 
              onPress={() => navigation.navigate('PlanTemplate')}
            >
              <Text style={[styles.buttonHomeText, { color: 'white' }]}>My Nutrition Plan</Text>
            </TouchableOpacity>
           
            {meals.map((meal, index) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddMeal', { mealType: meal })}
                key={index}
                style={[styles.homeButton, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              >
                <Text style={styles.buttonHomeText}>{safeString(meal, '')}</Text>
                <Ionicons name="add-circle-outline" size={24} color="black" style={styles.addIcon} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}