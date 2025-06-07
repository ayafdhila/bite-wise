import { CameraView } from "@/components/FoodSnap/CameraView";
import { ImagePreview } from "@/components/FoodSnap/ImagePreview";
import { NutritionDisplay } from "@/components/FoodSnap/NutritionDisplay";
import { GeminiVisionService } from "@/services/GeminiVisionService";
import type {
  AnalysisState,
  FoodAnalysisResult,
  ImageData,
} from "@/types/domain";
import * as Haptics from "expo-haptics"; 
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker"; 
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react"; 
import { Alert, Animated, Button, StyleSheet, Text, View } from "react-native"; 

const IMAGE_QUALITY_THRESHOLD = 0.4; 

// Define Theme interface for FoodSnapFlow styling
export interface FoodSnapFlowTheme {
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  destructiveColor?: string;
  // Add other theme properties as needed, e.g., font sizes, specific component styles
}

/**
 * Props for the `FoodSnapFlow` component.
 */
export interface FoodSnapFlowProps {
  /** Optional API key for the GeminiVisionService. Overrides environment variable if provided. */
  apiKey?: string;
  /**
   * Callback triggered when the food analysis is successfully completed and the user
   * decides to save/log the meal.
   * @param {FoodAnalysisResult} analysisResult - The detailed result of the food analysis.
   * @param {ImageData} image - The image data associated with the analysis.
   */
  onMealLogged: (analysisResult: FoodAnalysisResult, image: ImageData) => void;
  /**
   * Callback triggered if the user decides to exit or cancel the flow
   * before completing a meal log.
   */
  onFlowCancel?: () => void;
  /**
   * Optional user ID to associate with the logged meal.
   * Useful for personalizing experiences or storing data under a specific user account.
   */
  userId?: string;
  /**
   * Optional theme object to customize the appearance of the FoodSnapFlow module.
   * Allows the component to adapt to the host application's look and feel.
   */
  theme?: Partial<FoodSnapFlowTheme>; // Theme prop for custom styling
}

type FlowStep =
  | "initialChoice"
  | "camera"
  | "preview"
  | "analysis"
  | "results"
  | "imageIssue"; 

/**
 * `FoodSnapFlow` is a comprehensive React Native component that orchestrates the entire
 * food image capture, analysis, and review process. It integrates camera functionality,
 * image preview, interaction with `GeminiVisionService` for AI-powered nutritional analysis,
 * and displays results, allowing users to confirm or retake photos.
 *
 * This component is designed to be a reusable module for applications needing to incorporate
 * a "snap and analyze food" feature.
 *
 * @param {FoodSnapFlowProps} props - The properties to configure and interact with the component.
 * @returns {React.ReactElement} The rendered FoodSnapFlow component.
 */
export const FoodSnapFlow: React.FC<FoodSnapFlowProps> = (props) => {
  const { theme = {} } = props; // Destructure theme with a default empty object
  const [currentStep, setCurrentStep] = useState<FlowStep>("initialChoice"); // Start with "initialChoice"
  const [capturedImage, setCapturedImage] = useState<ImageData | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    loading: false,
    result: null,
    error: null,
  });
  const [geminiService, setGeminiService] =
    useState<GeminiVisionService | null>(null); // Added state for service instance
  const [rejectionReason, setRejectionReason] = useState<string | null>(null); // Added state for rejection reason
  const resultsFadeAnim = useRef(new Animated.Value(0)).current; // Animation for results

  // Initialize GeminiVisionService
  React.useEffect(() => {
    try {
      // Use apiKey from props if available, otherwise it will use from .env
      const service = new GeminiVisionService(props.apiKey);
      setGeminiService(service);
    } catch (error) {
      console.error("Failed to initialize GeminiVisionService:", error);
      Alert.alert(
        "Initialization Error",
        "Could not initialize the food analysis service. Please check your setup and API key."
      );
      // Potentially navigate back or disable functionality
    }
  }, [props.apiKey]); // Add props.apiKey to dependency array

  useEffect(() => {
    if (currentStep === "results" && analysisState.result) {
      Animated.timing(resultsFadeAnim, {
        toValue: 1,
        duration: 500, // Slower fade-in for results
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation when not on results screen or no results
      resultsFadeAnim.setValue(0);
    }
  }, [currentStep, analysisState.result, resultsFadeAnim]);

  const handleImageCaptured = useCallback((image: ImageData) => {
    setCapturedImage(image);
    setCurrentStep("preview");
  }, []);

  const handleImageSelectedFromGallery = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to allow access to your photo library to select an image."
      );
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true, // Or false, depending on desired UX
      aspect: [4, 3], // Optional
      quality: 0.8, // Match camera quality
      base64: true, // Ensure base64 is included for GeminiVisionService
    });

    if (
      !pickerResult.canceled &&
      pickerResult.assets &&
      pickerResult.assets.length > 0
    ) {
      const selectedImage = pickerResult.assets[0];
      if (selectedImage.uri && selectedImage.base64) {
        // Ensure base64 is present
        const imageData: ImageData = {
          uri: selectedImage.uri,
          base64: selectedImage.base64,
          width: selectedImage.width,
          height: selectedImage.height,
        };
        handleImageCaptured(imageData); // Use the same handler
      } else {
        Alert.alert(
          "Error",
          "Could not retrieve image data. Please try again."
        );
      }
    }
  }, [handleImageCaptured]);

  const handleRetakePhoto = useCallback(() => {
    setCapturedImage(null);
    setAnalysisState({ loading: false, result: null, error: null });
    setRejectionReason(null); // Clear rejection reason
    setCurrentStep("initialChoice"); // Go back to choice screen
  }, []);

  const handleAnalyzeImage = useCallback(async () => {
    if (!capturedImage || !geminiService) return; // Ensure service is initialized

    setAnalysisState({ loading: true, result: null, error: null });
    setRejectionReason(null); // Clear previous rejection reason
    setCurrentStep("analysis");

    try {
      // Resize and compress the image
      const manipResult = await ImageManipulator.manipulateAsync(
        capturedImage.uri,
        [{ resize: { width: 1024, height: 1024 } }], // Resize to fit within 1024x1024, maintaining aspect ratio
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipResult.base64) {
        throw new Error("Failed to get Base64 string from manipulated image.");
      }

      // Construct the ImageData object for the service
      const imageData: ImageData = {
        uri: manipResult.uri, // The URI of the manipulated image
        width: manipResult.width,
        height: manipResult.height,
        base64: manipResult.base64, // The Base64 string of the manipulated image
      };

      const analysisResult = await geminiService.analyzeFoodImage(imageData);

      if (!analysisResult.isLikelyFood) {
        setRejectionReason(
          "No food detected in the image. Please try a different image or retake the photo."
        );
        setAnalysisState({ loading: false, result: null, error: null }); // Clear previous analysis state
        setCurrentStep("imageIssue");
        return;
      }

      if (analysisResult.imageQuality.overall < IMAGE_QUALITY_THRESHOLD) {
        setRejectionReason(
          `Image quality is too low (Overall: ${(
            analysisResult.imageQuality.overall * 100
          ).toFixed(
            0
          )}%). Please ensure good lighting, clear focus, and no obstructions, then try again.`
        );
        setAnalysisState({ loading: false, result: null, error: null }); // Clear previous analysis state
        setCurrentStep("imageIssue");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Add success haptic feedback
      setAnalysisState({
        loading: false,
        result: analysisResult,
        error: null,
      });
      setCurrentStep("results");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisState({
        loading: false,
        result: null,
        error: {
          code: "ANALYSIS_FAILED",
          message: "Failed to analyze image. Please try again.",
          retryable: true,
        },
      });

      Alert.alert(
        "Analysis Failed",
        "Failed to analyze your food image. Please try again.",
        [
          { text: "Retry", onPress: handleAnalyzeImage }, // handleAnalyzeImage is used in its own definition, this is fine for useCallback
          { text: "Retake Photo", onPress: handleRetakePhoto },
        ]
      );
    }
  }, [capturedImage, geminiService, handleRetakePhoto]); // Added handleRetakePhoto to dependencies

  const handleEditResult = useCallback((updatedResult: FoodAnalysisResult) => {
    setAnalysisState((prev) => ({
      ...prev,
      result: updatedResult,
    }));
  }, []);

  const handleSaveToLog = useCallback(() => {
    if (!analysisState.result || !capturedImage) return; // Ensure capturedImage is also available

    // Call the onMealLogged prop instead of internal Alert and navigation
    props.onMealLogged(analysisState.result, capturedImage);

    // The consuming app will decide what to do next (e.g., navigate or close)
    // For now, let's reset to initial choice if no cancel prop, or call cancel
    if (props.onFlowCancel) {
      props.onFlowCancel();
    } else {
      // Default behavior if onFlowCancel is not provided: reset the flow
      setCapturedImage(null);
      setAnalysisState({ loading: false, result: null, error: null });
      setRejectionReason(null);
      setCurrentStep("initialChoice");
    }
  }, [
    analysisState.result,
    capturedImage,
    props.onMealLogged,
    props.onFlowCancel,
  ]); // Added analysisState.result to dependencies

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "initialChoice":
        return (
          <View
            style={[
              styles.choiceContainer,
              {
                backgroundColor:
                  theme.backgroundColor ||
                  styles.choiceContainer.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.choiceTitle,
                { color: theme.textColor || styles.choiceTitle.color },
              ]}
            >
              Select Image Source
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Take Photo"
                onPress={() => setCurrentStep("camera")}
                color={theme.primaryColor} // Use theme color for button
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button
                title="Choose from Gallery"
                onPress={handleImageSelectedFromGallery}
                color={theme.primaryColor} // Use theme color for button
              />
            </View>
            {/* Optional: Add a close/back button if this flow is part of a larger app */}
          </View>
        );
      case "camera":
        return (
          <CameraView
            onImageCaptured={handleImageCaptured}
            onClose={() => {
              if (props.onFlowCancel) {
                props.onFlowCancel();
              } else {
                setCurrentStep("initialChoice");
              }
            }}
          />
        );

      case "imageIssue": // Added case for imageIssue
        return (
          <View
            style={[
              styles.issueContainer,
              {
                backgroundColor:
                  theme.backgroundColor ||
                  styles.issueContainer.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.issueTitle,
                { color: theme.destructiveColor || styles.issueTitle.color },
              ]}
            >
              Image Problem
            </Text>
            <Text
              style={[
                styles.issueMessage,
                { color: theme.textColor || styles.issueMessage.color },
              ]}
            >
              {rejectionReason}
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Try Again"
                onPress={handleRetakePhoto}
                color={theme.primaryColor}
              />
            </View>
          </View>
        );

      case "preview":
        return capturedImage ? (
          <ImagePreview
            image={capturedImage}
            onRetake={handleRetakePhoto}
            onConfirm={handleAnalyzeImage}
          />
        ) : null;

      case "analysis":
        return capturedImage ? (
          <ImagePreview
            image={capturedImage}
            onRetake={handleRetakePhoto}
            onConfirm={handleAnalyzeImage}
            loading={analysisState.loading}
          />
        ) : null;

      case "results":
        return analysisState.result ? (
          <Animated.View style={{ flex: 1, opacity: resultsFadeAnim }}>
            <NutritionDisplay
              result={analysisState.result}
              imageDataUri={capturedImage?.uri} //
              onEdit={handleEditResult}
              onSave={handleSaveToLog}
              onRetake={handleRetakePhoto}
            />
          </Animated.View>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentStep === "results" ? "dark" : "light"} />
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAEBD7", 
  },
  choiceContainer: {
    
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAEBD7", 
  },
  choiceTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333333", 
  },
  buttonContainer: {
    marginVertical: 10,
    width: "80%",
  },
  issueContainer: {
    
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAEBD7", 
  },
  issueTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#A52A2A", 
    marginBottom: 15,
  },
  issueMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
    color: "#333333", 
  },
});
