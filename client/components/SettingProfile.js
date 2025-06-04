import React, { useState, useRef, useCallback, useContext } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Dimensions, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { AuthContext } from '../components/AuthContext';
import axios from 'axios';
import styles from './Styles';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SettingProfile() {
    const { user } = useContext(AuthContext);
    const uid = user?.uid;
    const navigation = useNavigation();

    const [selectedGender, setSelectedGender] = useState(null);
    const [customInput, setCustomInput] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [targetWeightValue, setTargetWeightValue] = useState('70.0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const screenWidth = Dimensions.get('window').width;
    const itemWidth = 20;
    const min = 35;
    const max = 230;
    const step = 0.1;
    const numbers = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => (min + i * step).toFixed(1));
    const rulerListRef = useRef(null);

    const handleOptions = (option) => { setSelectedGender(option); };

    const handleRulerScroll = useCallback((event) => {
        const centerOffset = event.nativeEvent.contentOffset.x;
        let index = Math.round(centerOffset / itemWidth);
        index = Math.max(0, Math.min(index, numbers.length - 1));
        if (numbers[index]) { setTargetWeightValue(numbers[index]); }
    }, [itemWidth, numbers]);

    const calculateInitialIndex = () => {
        const initialTarget = parseFloat(targetWeightValue) || 70.0;
        const index = numbers.findIndex(num => Math.abs(parseFloat(num) - initialTarget) < step / 2);
        return index >= 0 ? index : Math.round(numbers.length / 2);
    };

    const handleNext = async () => {
        if (isSubmitting) return;

        if (!uid) { Alert.alert("Error", "User session not found. Please log in again."); return; }
        if (!selectedGender && !customInput.trim()) { Alert.alert("Input Required", "Please select or specify your gender."); return; }
        const parsedAge = parseInt(age, 10);
        if (!age || isNaN(parsedAge) || parsedAge <= 10 || parsedAge > 120) { Alert.alert("Input Required", "Please enter a valid age (11-120)."); return; }
        const parsedHeight = parseFloat(heightCm);
        if (!heightCm || isNaN(parsedHeight) || parsedHeight <= 50 || parsedHeight > 250) { Alert.alert("Input Required", "Please enter a valid height in cm (e.g., 51-250)."); return; }
        const parsedWeight = parseFloat(weight);
        if (!weight || isNaN(parsedWeight) || parsedWeight <= 20 || parsedWeight > 400) { Alert.alert("Input Required", "Please enter a valid weight in kg (e.g., 21-400)."); return; }
        const parsedTargetWeight = parseFloat(targetWeightValue);
        if (!targetWeightValue || isNaN(parsedTargetWeight) || parsedTargetWeight < min || parsedTargetWeight > max) { Alert.alert("Input Required", "Please select a valid target weight using the ruler."); return; }
        if (!API_BASE_URL) {
            Alert.alert("Configuration Error", "Cannot connect to the server.");
            return;
        }

        setIsSubmitting(true);

        const API_ENDPOINT = `${API_BASE_URL}/user/profile-details`;

        const finalGender = customInput.trim() ? customInput.trim() : selectedGender;

        const requestBody = {
            uid,
            gender: finalGender,
            age: parsedAge,
            height: parsedHeight,
            weight: parsedWeight,
            targetWeight: parsedTargetWeight,
            isKg: true,
            startWeight: parsedWeight,
        };

        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) {
                throw new Error("Authentication token is missing. Please log in again.");
            }

            await axios.patch(API_ENDPOINT, requestBody, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });

            navigation.navigate("MotivationalScreen", { uid });

        } catch (error) {
            Alert.alert("Update Error", "An error occurred while updating your profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image source={require('../assets/Images/leaf.png')} style={styles.topLeaf} />
            <Image source={require('../assets/Images/leaf.png')} style={styles.bottomLeaf} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={[localstyles.backButton, { marginTop: 45 }]}>
                <Ionicons name="arrow-back" size={30} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', paddingVertical: 40, marginVertical: 55 }}>
                <Text style={localstyles.screenTitle}>Let's set up your profile</Text>

                {/* Gender */}
                <Text style={localstyles.screenSubtitle}>What is your gender?</Text>
                <View style={styles.genderContainer}>
                    {['Male', 'Female'].map((option) => (
                        <TouchableOpacity key={option} style={[styles.genderButton, selectedGender === option && styles.selected]} onPress={() => handleOptions(option)}>
                            <Text style={[styles.optionText, selectedGender === option && styles.selectedOptionText]}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
               

                {/* Age */}
                <Text style={localstyles.screenSubtitle}>How old are you?</Text>
                <TextInput
                    style={[styles.input, styles.customGender]}
                    placeholder='e.g. 25'
                    keyboardType='number-pad'
                    value={age}
                    onChangeText={setAge}
                    maxLength={3}
                />

                {/* Height (CM) */}
                <Text style={localstyles.screenSubtitle}>What is your height (cm)?</Text>
                <TextInput
                    style={[styles.input, styles.customGender]}
                    placeholder='e.g. 175'
                    keyboardType='number-pad'
                    value={heightCm}
                    onChangeText={setHeightCm}
                    maxLength={3}
                />

                {/* Weight (KG) */}
                <Text style={localstyles.screenSubtitle}>What is your weight (kg)?</Text>
                <TextInput
                    style={[styles.input, styles.customGender]}
                    placeholder='e.g. 75.5'
                    keyboardType='decimal-pad'
                    value={weight}
                    onChangeText={setWeight}
                />

                {/* Target Weight (KG) */}
                <Text style={localstyles.screenSubtitle}>What is your target weight (kg)?</Text>
                <View style={[styles.rulerContainer]}>
                    <Text style={styles.selectedValue}>{targetWeightValue} kg</Text>
                    <FlatList
                        ref={rulerListRef}
                        data={numbers}
                        horizontal
                        bounces={false}
                        snapToAlignment="start"
                        snapToInterval={itemWidth}
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => `weight-${item}`}
                        initialScrollIndex={calculateInitialIndex()}
                        getItemLayout={(data, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
                        contentContainerStyle={{ paddingHorizontal: (screenWidth / 2) - (itemWidth / 2) }}
                        renderItem={({ item }) => {
                            const numValue = parseFloat(item);
                            const isMajorTick = Math.abs(numValue % 5) < (step / 2);
                            const isMidTick = Math.abs(numValue % 1) < (step / 2);
                            return (
                                <View style={[styles.rulerItem, { width: itemWidth }]}>
                                    <Text style={[styles.rulerText, !isMajorTick && { opacity: 0 }]}>
                                        {Math.round(numValue)}
                                    </Text>
                                    <View style={[styles.line, isMajorTick ? styles.majorTick : (isMidTick ? styles.midTick : styles.minorTick)]} />
                                </View>
                            );
                        }}
                        onScroll={handleRulerScroll}
                        scrollEventThrottle={16}
                    />
                    <View style={styles.centerIndicator} />
                </View>

                {/* Next Button */}
                <View style={localstyles.actionButtonContainer}>
                    <Button
                        mode='contained'
                        style={[localstyles.primaryActionButton, isSubmitting && styles.buttonDisabled]}
                        labelStyle={localstyles.primaryActionButtonText}
                        onPress={handleNext}
                        disabled={isSubmitting}
                        loading={isSubmitting}
                    >
                        {isSubmitting ? "" : "Next"}
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const localstyles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F5E4C3',
    },
    scrollContentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    screenSubtitle: {
        fontSize: 20,
        fontFamily: 'Quicksand_600SemiBold',
        color: '#555555',
        textAlign: 'center',
        marginVertical: 20,
    },
    screenTitle: {
        fontSize: 40,
        fontFamily: 'Quicksand_700Bold',
        color: 'black',
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    actionButtonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 75,
        marginBottom: 50,
    },
    primaryActionButton: {
        width: '90%',
        maxWidth: 350,
        height: 55,
        borderRadius: 25,
        backgroundColor: '#2E4A32',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    primaryActionButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Quicksand_700Bold',
        fontSize: 18,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 10,
        backgroundColor: 'transparent',
        padding: 10,
    },
});