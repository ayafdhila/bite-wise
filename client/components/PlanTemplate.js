// --- START OF FILE PlanTemplate.js ---

// PlanTemplate.js (Côté Utilisateur/Abonné) - Clone Visuel Read-Only de PlanEditor + Opti Chargement
import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet,
    Platform, ActivityIndicator, Alert
} from 'react-native';
import Header from '../components/Header';
import TabNavigation from '../components/TabNavigation';
import { AuthContext } from '../components/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

// Color Palette
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    buttonTextDark: '#333333',
    activeDayBackground: '#E0B870',
    completedGreenIcon: '#4CAF50',
    completedBackground: 'rgba(60, 90, 60, 0.75)',
    checkboxBackground: 'rgba(0,0,0,0.2)',
};

// Constants
const DAYS_OF_WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Helpers
const createInitialMealState = () => ({ 
    food: '', 
    quantity: '', 
    unit: '', 
    prepNotes: '', 
    timing: '', 
    alternatives: '' 
});

const createInitialDayState = () => { 
    const meals = {}; 
    MEAL_TIMES.forEach(meal => { 
        meals[meal] = createInitialMealState(); 
    }); 
    return { 
        dailyWorkout: '', 
        meals, 
        completed: false 
    }; 
};

export default function PlanTemplate() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, getIdToken } = useContext(AuthContext);
    const clientId = user?.uid;

    // State
    const [generalNotes, setGeneralNotes] = useState('');
    const [waterIntake, setWaterIntake] = useState('?');
    const [sleepRecommendation, setSleepRecommendation] = useState('');
    const [currentDayData, setCurrentDayData] = useState(null);
    const [definedDays, setDefinedDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isDayLoading, setIsDayLoading] = useState(false);
    const [completionStatusMap, setCompletionStatusMap] = useState({});

    // Fetch Summary
    useEffect(() => {
        const fetchSummary = async () => {
            if (!clientId || typeof getIdToken !== 'function') { 
                setIsSummaryLoading(false); 
                return; 
            }
            
            setIsSummaryLoading(true); 
            setDefinedDays([]); 
            setSelectedDay(null); 
            setCurrentDayData(null); 
            setCompletionStatusMap({});
            
            try {
                const token = await getIdToken(); 
                if (!token) throw new Error("Auth token missing.");
                
                const apiUrl = `${API_BASE_URL}/nutrition-programs/${clientId}/summary`;
                const response = await axios.get(apiUrl, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                
                if (response.status === 200 && response.data?.summary) {
                    const { summary } = response.data;
                    setGeneralNotes(summary.generalNotes || ''); 
                    setWaterIntake(String(summary.waterIntake ?? '?')); 
                    setSleepRecommendation(summary.sleepRecommendation || '');
                    
                    const daysFromServer = summary.definedDays || [];
                    daysFromServer.sort((a, b) => DAYS_OF_WEEK_ORDER.indexOf(a) - DAYS_OF_WEEK_ORDER.indexOf(b));
                    setDefinedDays(daysFromServer);
                    
                    if (daysFromServer.length > 0) {
                        setSelectedDay(daysFromServer[0]); 
                    } else {
                        setSelectedDay(null);
                    }
                } else { 
                    throw new Error("Invalid summary response"); 
                }
            } catch (error) { 
                console.error("PlanTemplate: Error fetching summary:", error.message); 
                Alert.alert("Error", "Could not load plan structure."); 
                setDefinedDays([]); 
                setSelectedDay(null); 
            } finally { 
                setIsSummaryLoading(false); 
            }
        };
        fetchSummary();
    }, [clientId, getIdToken]);

    // Fetch Day Details
    const fetchDayPlanDetails = async (dayToFetch) => {
        if (!clientId || typeof getIdToken !== 'function' || !dayToFetch) { 
            setIsDayLoading(false); 
            return; 
        }
        
        setIsDayLoading(true); 
        setCurrentDayData(null);
        
        try {
            const token = await getIdToken(); 
            if (!token) throw new Error("Auth token missing.");
            
            const apiUrl = `${API_BASE_URL}/nutrition-programs/${clientId}/day/${dayToFetch}`;
            const response = await axios.get(apiUrl, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (response.status === 200 && response.data?.planView) {
                const { planView } = response.data;
                setCurrentDayData({ 
                    dayName: planView.dayName, 
                    dayData: planView.dayData 
                });
                setCompletionStatusMap(prev => ({ 
                    ...prev, 
                    [planView.dayName]: planView.dayData.completed ?? false 
                }));
            } else { 
                throw new Error("Invalid day detail response"); 
            }
        } catch (error) {
            console.error(`PlanTemplate: Error fetching details for ${dayToFetch}:`, error.message);
            setCurrentDayData({ 
                dayName: dayToFetch, 
                dayData: createInitialDayState() 
            });
            setCompletionStatusMap(prev => ({ 
                ...prev, 
                [dayToFetch]: false 
            }));
            if (error.response?.status !== 404) {
                Alert.alert("Error", `Could not load details for ${dayToFetch}.`);
            }
        } finally {
            setIsDayLoading(false);
        }
    };

    // Trigger fetchDayPlanDetails when selectedDay changes
    useEffect(() => {
        if (selectedDay) {
            fetchDayPlanDetails(selectedDay);
        } else {
            setCurrentDayData(null);
        }
    }, [selectedDay]);

    // Handle Toggle Completion
    const handleToggleCompletion = async (day) => {
        if (!clientId || typeof getIdToken !== 'function' || !day) return;

        const currentStatus = completionStatusMap[day] ?? false;
        const newState = !currentStatus;

        setCompletionStatusMap(prev => ({ ...prev, [day]: newState }));

        try {
            const token = await getIdToken(); 
            if (!token) throw new Error("Auth token missing.");
            
            const apiUrl = `${API_BASE_URL}/nutrition-programs/${clientId}/completion`;
            await axios.patch(apiUrl, { 
                day, 
                completed: newState 
            }, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
        } catch (error) {
            console.error("PlanTemplate: Error saving completion:", error.message);
            Alert.alert("Error", "Could not save completion status.");
            setCompletionStatusMap(prev => ({ ...prev, [day]: currentStatus }));
        }
    };

    // ReadOnly Components
    const ReadOnlyField = ({ value, placeholder, style: viewStyle, textStyle = {} }) => (
        <View style={viewStyle}>
            <Text 
                style={[styles.readOnlyValueText, textStyle]} 
                numberOfLines={viewStyle?.minHeight > 50 ? undefined : 1} 
                ellipsizeMode="tail"
            >
                {value || placeholder}
            </Text>
        </View>
    );

    const ReadOnlyFieldMultiLine = ({ value, placeholder, style: viewStyle, textStyle = {} }) => (
        <View style={viewStyle}>
            <Text style={[styles.readOnlyValueText, textStyle]}>
                {value || placeholder}
            </Text>
        </View>
    );

    // Render Day Card
    const renderDayCard = (day) => {
        if (!day || !currentDayData || currentDayData.dayName !== day || isDayLoading) {
            return null;
        }

        const dayData = currentDayData.dayData;
        const isCompleted = completionStatusMap[day] ?? false;

        return (
            <View key={day} style={styles.dayCard}>
                {/* Completion Checkbox */}
                <TouchableOpacity
                    key={`cb-${day}-${isCompleted}`}
                    style={[
                        styles.completionCheckbox, 
                        isCompleted && styles.completionCheckboxCompleted
                    ]}
                    onPress={() => handleToggleCompletion(day)}
                >
                    <MaterialCommunityIcons
                        name={isCompleted ? "check-circle" : "checkbox-blank-circle-outline"}
                        size={18}
                        color={isCompleted ? PALETTE.completedGreenIcon : PALETTE.white}
                        style={styles.completionIcon}
                    />
                    <Text style={styles.completionText}>
                        Mark Day as Completed
                    </Text>
                </TouchableOpacity>

                {/* Day Title */}
                <Text style={styles.dayTitle}>{day}</Text>

                {/* Meals Section */}
                {MEAL_TIMES.map((meal) => {
                    const mealData = dayData.meals?.[meal] || createInitialMealState();
                    return (
                        <View key={`${day}-${meal}`} style={styles.mealRow}>
                            <Text style={styles.mealLabel}>{meal}</Text>
                            <View style={styles.mealInputsContainer}>
                                <ReadOnlyField 
                                    value={mealData.timing} 
                                    placeholder="Timing" 
                                    style={[styles.inputBase, styles.timingInput]} 
                                />
                                <ReadOnlyField 
                                    value={mealData.food} 
                                    placeholder="Food Item" 
                                    style={[styles.inputBase, styles.foodInput]} 
                                />
                                <View style={styles.quantityRow}>
                                    <ReadOnlyField 
                                        value={mealData.quantity} 
                                        placeholder="Qty" 
                                        style={[styles.inputBase, styles.quantityInput]} 
                                        textStyle={{textAlign: 'center'}} 
                                    />
                                    <ReadOnlyField 
                                        value={mealData.unit} 
                                        placeholder="Unit" 
                                        style={[styles.inputBase, styles.unitInput]} 
                                        textStyle={{textAlign: 'center'}}
                                    />
                                </View>
                                <ReadOnlyFieldMultiLine 
                                    value={mealData.prepNotes} 
                                    placeholder="Prep Notes" 
                                    style={[styles.inputBase, styles.prepNotesInput]} 
                                />
                                <ReadOnlyFieldMultiLine 
                                    value={mealData.alternatives} 
                                    placeholder="Alternatives" 
                                    style={[styles.inputBase, styles.alternativesInput]} 
                                />
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    // Loading Screen
    if (isSummaryLoading) {
        return (
            <View style={styles.screenContainer}>
                <Header 
                    subtitle="Loading Plan..." 
                    showBackButton={true} 
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PALETTE.darkGreen} />
                    <Text style={styles.loadingText}>Loading Your Nutrition Plan...</Text>
                </View>
                <TabNavigation />
            </View>
        );
    }

    // Main Render
    return (
        <View style={styles.screenContainer}>
            <Header 
                subtitle={`${user?.displayName || 'Your'} Nutrition Plan`} 
                showBackButton={true} 
            />
            <ScrollView contentContainerStyle={styles.scrollContainer}>

                {/* General Notes Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General Notes</Text>
                    <ReadOnlyFieldMultiLine 
                        value={generalNotes} 
                        placeholder="No general notes provided." 
                        style={[styles.inputBase, styles.notesInput]} 
                    />
                </View>

                {/* Water Intake Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommended Daily Water Intake</Text>
                    <View style={styles.waterIntakeContainer}>
                        <ReadOnlyField 
                            value={waterIntake} 
                            placeholder="?" 
                            style={[styles.inputBase, styles.waterInput]} 
                            textStyle={{textAlign: 'center'}} 
                        />
                        <View style={[styles.inputBase, styles.waterUnitContainer]}>
                            <Text style={styles.waterUnitText}>Litres</Text>
                        </View>
                    </View>
                </View>

                {/* Sleep Goal Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sleep Goal</Text>
                    <ReadOnlyField 
                        value={sleepRecommendation} 
                        placeholder="N/A" 
                        style={[styles.inputBase, styles.sleepInput]} 
                        textStyle={{textAlign: 'center'}} 
                    />
                </View>

                {/* Activity/Workout Section */}
                {selectedDay && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {`${selectedDay}'s Activity / Workout`}
                        </Text>
                        {isDayLoading ? (
                            <ActivityIndicator 
                                style={{height: 44}} 
                                color={PALETTE.darkGrey} 
                            />
                        ) : (
                            <ReadOnlyField 
                                value={currentDayData?.dayData?.dailyWorkout} 
                                placeholder="No activity specified for this day." 
                                style={[styles.inputBase, styles.workoutInput]} 
                            />
                        )}
                    </View>
                )}

                {/* Day Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Day</Text>
                    {definedDays.length === 0 ? (
                        <Text style={styles.noDaysText}>
                            No plan days defined yet.
                        </Text>
                    ) : (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.daySelectorContainer}
                        >
                            {definedDays.map((day) => (
                                <TouchableOpacity 
                                    key={day} 
                                    style={[
                                        styles.daySelectorButton, 
                                        selectedDay === day && styles.daySelectorButtonActive
                                    ]} 
                                    onPress={() => { 
                                        if(selectedDay !== day) setSelectedDay(day); 
                                    }}
                                >
                                    <Text style={[
                                        styles.daySelectorText, 
                                        selectedDay === day && styles.daySelectorTextActive
                                    ]}>
                                        {day.substring(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Day Plan Details Section */}
                {selectedDay && (
                    <>
                        <Text style={styles.sectionTitle}>
                            {`${selectedDay}'s Plan Details`}
                        </Text>
                        {isDayLoading ? (
                            <ActivityIndicator 
                                style={{ marginTop: 20, marginBottom: 20 }} 
                                color={PALETTE.darkGreen} 
                            />
                        ) : (
                            renderDayCard(selectedDay)
                        )}
                    </>
                )}

                {/* No Days Message */}
                {!isSummaryLoading && definedDays.length === 0 && (
                    <View style={styles.section}>
                        <Text style={styles.noDaysText}>
                            Check back later for your plan!
                        </Text>
                    </View>
                )}

            </ScrollView>
            <TabNavigation />
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    screenContainer: { 
        flex: 1, 
        backgroundColor: PALETTE.lightCream 
    },
    scrollContainer: { 
        paddingHorizontal: 15, 
        paddingTop: 10, 
        marginBottom: 50
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: PALETTE.lightCream 
    },
    loadingText: { 
        marginTop: 10, 
        color: PALETTE.black, 
        fontSize: 16 
    },
    section: { 
        marginBottom: 20
    },
    sectionTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: PALETTE.black, 
        marginBottom: 10 
    },
    inputBase: { 
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 10, 
        paddingHorizontal: 15, 
        paddingVertical: 10, 
        borderWidth: 1, 
        borderColor: PALETTE.mediumGreen, 
        minHeight: 44, 
        marginBottom: 8, 
        justifyContent: 'center' 
    },
    notesInput: { 
        minHeight: 80, 
        paddingTop: 10, 
        marginBottom: 0, 
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
    },
    waterIntakeContainer: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    waterInput: { 
        flex: 1, 
        marginRight: 10, 
        marginBottom: 0 
    },
    waterUnitContainer: { 
        paddingHorizontal: 15, 
        marginBottom: 0 
    },
    waterUnitText: { 
        fontSize: 14, 
        color: PALETTE.black, 
        fontWeight: 'bold'
    },
    sleepInput: { 
        marginBottom: 0 
    },
    workoutInput: { 
        marginBottom: 0 
    },
    daySelectorContainer: { 
        paddingVertical: 5 
    },
    daySelectorButton: { 
        backgroundColor: PALETTE.lightOrange, 
        paddingVertical: 8, 
        paddingHorizontal: 15, 
        borderRadius: 20, 
        marginRight: 10, 
        borderWidth: 1, 
        borderColor: PALETTE.mediumGreen 
    },
    daySelectorButtonActive: { 
        backgroundColor: PALETTE.mediumGreen, 
        borderColor: PALETTE.darkGreen 
    },
    daySelectorText: { 
        color: PALETTE.black, 
        fontWeight: 'bold', 
        fontSize: 14 
    },
    daySelectorTextActive: { 
        color: PALETTE.darkGreen 
    },
    dayCard: { 
        backgroundColor: PALETTE.mediumGreen, 
        borderRadius: 15, 
        padding: 15, 
        marginBottom: 15, 
        elevation: 2, 
        shadowColor: PALETTE.black, 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2, 
        position: 'relative' 
    },
    dayTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: PALETTE.white, 
        marginBottom: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: PALETTE.lightCream, 
        paddingBottom: 8, 
        paddingRight: 40 
    },
    completionCheckbox: {
        position: 'absolute',
        top: 15,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.checkboxBackground,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 18,
        zIndex: 1,
        minHeight: 30,
    },
    completionCheckboxCompleted: {
        backgroundColor: PALETTE.completedBackground,
    },
    completionIcon: {
        marginRight: 5,
    },
    completionText: {
        color: PALETTE.white,
        fontSize: 10,
        fontWeight: 'bold',
        lineHeight: 13,
    },
    mealRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: 15, 
        paddingBottom: 15, 
        borderBottomWidth: 0.5, 
        borderBottomColor: PALETTE.lightCream 
    },
    mealLabel: { 
        width: 85, 
        fontSize: 14, 
        color: PALETTE.white, 
        fontWeight: '500', 
        marginRight: 10, 
        paddingTop: 12 
    },
    mealInputsContainer: { 
        flex: 1, 
        flexDirection: 'column', 
        marginBottom: 15
    },
    timingInput: {},
    foodInput: {},
    quantityRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 8 
    },
    quantityInput: { 
        flex: 1, 
        marginRight: 8, 
        marginBottom: 0 
    },
    unitInput: { 
        minWidth: 80, 
        marginBottom: 0 
    },
    prepNotesInput: { 
        minHeight: 60, 
        paddingTop: 10, 
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
    },
    alternativesInput: { 
        minHeight: 60, 
        paddingTop: 10, 
        marginBottom: 0, 
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
    },
    readOnlyValueText: { 
        fontSize: 14, 
        color: PALETTE.darkGrey, 
        flexWrap: 'wrap' 
    },
    noDaysText: { 
        fontSize: 15, 
        color: PALETTE.darkGrey, 
        textAlign: 'center', 
        fontStyle: 'italic', 
        marginTop: 10, 
        padding: 15, 
        backgroundColor: PALETTE.lightOrange, 
        borderRadius: 8, 
        fontWeight: 'bold' 
    }
});