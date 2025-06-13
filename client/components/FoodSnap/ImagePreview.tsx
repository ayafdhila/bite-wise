import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../Header"; 
import type { ImageData } from "@/types/domain";

interface ImagePreviewProps {
  image: ImageData;
  onRetake: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onRetake,
  onConfirm,
  loading = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetake();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm();
  };

  return (
    <View style={styles.container}>
      <Header
        showBackButton={true}
        onBackPress={handleRetake}
        subtitle="Food Preview"
      />

      <View style={styles.imageContainer}>
        <Image source={{ uri: image.uri }} style={styles.image} />
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
          {loading && (
            <>
              <ActivityIndicator size="large" color="#2E4A31" />
              <Text style={styles.loadingText}>Analyzing...</Text>
            </>
          )}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instruction}>
          Make sure your food is clearly visible and well-lit
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton]}
            onPress={handleRetake}
            disabled={loading}
          >
            <Ionicons name="camera" size={20} color="#2E4A31" />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.analyzeButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Ionicons
              name={loading ? "hourglass" : "scan"}
              size={20}
              color="#FBCE93"
            />
            <Text style={styles.analyzeButtonText}>
              {loading ? "Analyzing..." : "Analyze Food"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4E4C3",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#F4E4C3",
  },
  image: {
    width: screenWidth - 40,
    height: (screenHeight - 200) * 0.7,
    borderRadius: 12,
    borderColor: "#BDB76B",
    borderWidth: 1,
    backgroundColor: "#FCCF94",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245, 245, 220, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Quicksand_600SemiBold',
    color: "#2E4A31",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: "#88A76C",
  },
  instruction: {
    color: "#000",
    fontSize: 14,
    fontFamily: 'Quicksand_500Medium',
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  retakeButton: {
    backgroundColor: "#FBCE93",
    borderWidth: 1,
    borderColor: "#FBCE93",
  },
  retakeButtonText: {
    color: "#2E4A31",
    fontSize: 16,
    fontFamily: 'Quicksand_700Bold',
  },
  analyzeButton: {
    backgroundColor: "#2E4A31",
  },
  analyzeButtonText: {
    color: "#FBCE93",
    fontSize: 16,
    fontFamily: 'Quicksand_700Bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
