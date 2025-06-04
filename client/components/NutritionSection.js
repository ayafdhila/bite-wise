// screens/NutritionSection.js
import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TouchableOpacity, TextInput,
    FlatList, StyleSheet, ActivityIndicator
} from 'react-native';
import Header from '../components/Header';
import TabNavigation from '../components/TabNavigation';
import { Ionicons } from '@expo/vector-icons';
import NutritionistCard from '../components/NutritionistCard';
import { db } from '../firebaseConfig';
// 'average' from firestore is not typically used for client-side aggregation,
// assuming you mean 'collection' and 'getDocs' for fetching.
import { collection, getDocs } from "firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../components/AuthContext';

// Your existing styles
const styles = StyleSheet.create({
     mainContainer: { flex: 1, backgroundColor: '#F5E4C3' },
     loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5E4C3' },
     contentWrapper: { flex: 1, marginBottom: 50 },
     searchContainer: {
         flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCCF94',
         borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8,
         marginHorizontal: 30, marginTop: 15, marginBottom: 10,
         elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
     },
     searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#2E4A32' },
     listContainer: { paddingHorizontal: 10, paddingBottom: 15 },
     noResultsText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
});

export default function NutritionSection() {
  const { user } = useContext(AuthContext); // Assuming user might be used for something later
  const [loading, setLoading] = useState(true);
  const [nutritionists, setNutritionists] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredNutritionists, setFilteredNutritionists] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchNutritionists = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "nutritionists"));
        const nutritionistList = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data, // Spread all data from Firestore
                // Ensure defaults if fields might be missing from some documents
                averageRating: data.averageRating !== undefined ? data.averageRating : 0,
                ratingCount: data.ratingCount !== undefined ? data.ratingCount : 0,
                profileImageUrl: data.profileImage || data.profileImageUrl || null // Handle both potential field names
            };
        });
        setNutritionists(nutritionistList);
        setFilteredNutritionists(nutritionistList); // Initialize filtered list
      } catch (error) { console.error("Error fetching nutritionists: ", error); }
      finally { setLoading(false); }
    };
    fetchNutritionists();
  }, []); // Fetch only on mount

  // Your existing search filter logic
  useEffect(() => {
    if (searchText === '') {
      setFilteredNutritionists(nutritionists);
    } else {
      setFilteredNutritionists(
        nutritionists.filter(nutri =>
          `${nutri.firstName || ''} ${nutri.lastName || ''}`.toLowerCase().includes(searchText.toLowerCase()) ||
          (nutri.specialization?.toLowerCase() || '').includes(searchText.toLowerCase())
        )
      );
    }
  }, [searchText, nutritionists]);

  const renderNutritionist = ({ item }) => (
    <TouchableOpacity
        onPress={() => {
            console.log("Navigating to NutritionistInfo with ID:", item.id, "Data:", item); // Log full item
            navigation.navigate('NutritionistInfo', {
                nutritionistId: item.id,
                firstName: item.firstName,
                lastName: item.lastName,
                workplace: item.workplace,
                yearsOfExperience: item.yearsOfExperience,
                shortBio: item.shortBio,
                specialization: item.specialization,
                profileImage: item.profileImageUrl, // Use the consistent profileImageUrl from mapping
                // --- V V V --- PASSING RATING DATA --- V V V ---
                averageRating: item.averageRating,
                ratingCount: item.ratingCount     // Pass ratingCount as well
                // --- ^ ^ ^ --- END PASSING RATING DATA --- ^ ^ ^ ---
            });
        }}
    >
      {/* Pass the full item (which now includes averageRating and ratingCount directly) */}
      {/* The user prop for NutritionistCard expects profileImageUrl */}
      <NutritionistCard user={{
          ...item,
          profileImageUrl: item.profileImageUrl // Already handled in mapping
          }} />
    </TouchableOpacity>
  );


  // --- Your Existing JSX Return Structure ---
  return (
    <View style={styles.mainContainer}>
      <Header subtitle={"Find your specialist"} />
        {loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2E4A32" />
            </View>
        ) : (
            <View style={styles.contentWrapper}>
                {/* Search Container */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#A0A0A0" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or specialization..."
                        placeholderTextColor="#A0A0A0"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#A0A0A0" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Nutritionist List */}
                <FlatList
                    data={filteredNutritionists}
                    renderItem={renderNutritionist}
                    keyExtractor={(item) => item.id} // Ensure item.id is unique and string
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.noResultsText}>No nutritionists found matching your search.</Text>}
                />
            </View>
        )}
      <TabNavigation />
    </View>
  );
}