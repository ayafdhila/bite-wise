import type { ImageData } from "@/types/domain";
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

/**
 * Props for the ImagePreview component.
 */
interface ImagePreviewProps {
  /**
   * The image data to be previewed.
   */
  image: ImageData;
  /**
   * Callback function invoked when the user chooses to retake the photo.
   */
  onRetake: () => void;
  /**
   * Callback function invoked when the user confirms the photo for analysis.
   */
  onConfirm: () => void;
  /**
   * Optional flag to indicate if the image is currently being processed (e.g., uploaded or analyzed).
   * Defaults to false.
   */
  loading?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/**
 * ImagePreview component displays a captured image, allowing the user to review it,
 * retake the photo, or confirm it for further processing.
 * It also shows a loading indicator when processing is in progress.
 */
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
      {/* Unified Header */}
      <View style={styles.unifiedHeader}>
        {/* Top Row: Logo, App Name, Icons */}
        <View style={styles.headerTopRow}>
          <Image
            source={require("../../assets/Images/logo.png")} 
            style={styles.headerLogo}
          />
          <Text style={styles.headerAppName}>Bite wise</Text>
          <View style={styles.headerIconsContainer}>
            <TouchableOpacity>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#333333"
              />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 15 }}>
              <Ionicons name="settings-outline" size={24} color="#333333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Row: Back Arrow, "Review Your Photo" Title */}
        <View style={styles.headerBottomRow}>
          <TouchableOpacity
            style={styles.headerBackAction}
            onPress={handleRetake}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>Review Your Photo</Text>
          <View style={styles.headerSubtitlePlaceholder} />
        </View>
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: image.uri }}
          style={styles.image}
          resizeMode="contain"
        />
        {/* Use Animated.View for the overlay */}
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
          {/* Ensure content is only rendered when loading to prevent premature rendering during fade-out */}
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
  unifiedHeader: {
    backgroundColor: "#88A76C",
    paddingHorizontal: 15,
    paddingTop: 35, 
    paddingBottom: 15,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15, 
  },
  headerLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  headerAppName: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333333", 
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBackAction: {
    padding: 5, 
  },
  headerSubtitle: {
    color: "black", 
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 5, 
  },
  headerSubtitlePlaceholder: {
    width: 34, 
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
    color: "#2E4A31", 
    fontWeight: "600",
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
    fontWeight: "600",
  },
  analyzeButton: {
    backgroundColor: "#2E4A31",
  },
  analyzeButtonText: {
    color: "#FBCE93", 
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
