import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import styles from './Styles';
export default function Card({ title, description, calories, imageUrl, onPress }) {

  const validImageUrl = imageUrl || 'https://via.placeholder.com/150'; 

  return (
    <TouchableOpacity onPress={onPress} style={styles.cardRecipeContainer}>
      <Image source={{ uri: validImageUrl }} style={styles.cardImage} />
      <Text style={styles.cardRecipeTitle}>{title}</Text>
      <Text style={styles.cardRecipeDescription}>🕒{description}</Text>
      <Text style={styles.cardRecipeDescription}>   {calories}</Text>
    </TouchableOpacity>
  );
}

