// components/NutritionistCard.js
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import styles from "./Styles";
import { Ionicons } from '@expo/vector-icons';


export default function NutritionistCard({ user }) {
    const {
        profileImageUrl, firstName = '', lastName = '', specialization = 'N/A',
        averageRating = 0, ratingCount = 0
    } = user || {};

    const renderStars = (ratingValue) => {
        let starsArray = [];
        const currentRating = parseFloat(ratingValue) || 0;
        const fullStars = Math.floor(currentRating);
        const hasHalfStar = (currentRating % 1) >= 0.25 && (currentRating % 1) < 0.75;

        for (let i = 0; i < fullStars; i++) {
            starsArray.push(<Ionicons key={`full-${i}`} name='star' size={18} color={styles.starColor} />);
        }
        if (hasHalfStar) {
            starsArray.push(<Ionicons key="half" name='star-half-sharp' size={18} color={styles.starColor} />);
        }
        const emptyStarsCount = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStarsCount; i++) {
            starsArray.push(<Ionicons key={`empty-${i}`} name='star-outline' size={18} color={styles.starColor} />);
        }
        while (starsArray.length < 5) {
             starsArray.push(<Ionicons key={`padding-empty-${starsArray.length}`} name='star-outline' size={18} color={styles.starColor} />);
        }
        return starsArray.slice(0, 5);
    };

    const displayName = `${firstName} ${lastName}`.trim() || "Nutritionist";
    const defaultImage = require('../assets/Images/DefaultProfile.jpg');

    return (
        <View style={styles.cardNutritionistContainer}>
            <Image
                source={profileImageUrl ? { uri: profileImageUrl } : defaultImage}
                style={styles.cardNutritionistImage}
            />
            <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
                <Text style={styles.specializationText}>Specialization</Text>
                <Text style={styles.cardDescription} numberOfLines={1} ellipsizeMode="tail">{specialization}</Text>
                <View style={styles.cardRating}>
                    {renderStars(averageRating)}
                    {ratingCount > 0 ? (
                        <Text style={styles.ratingText}>
                            ({(averageRating || 0).toFixed(1)})
                        </Text>
                    ) : (
                        <Text style={styles.ratingText}>(Not rated)</Text>
                    )}
                </View>
            </View>
        </View>
    );
}