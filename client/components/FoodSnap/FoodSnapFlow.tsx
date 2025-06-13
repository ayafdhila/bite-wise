import { CameraView } from "@/components/FoodSnap/CameraView";
import { ImagePreview } from "@/components/FoodSnap/ImagePreview";
import { NutritionDisplay } from "@/components/FoodSnap/NutritionDisplay";
import { GeminiVisionService } from "@/services/GeminiVisionService";
import Header from "../Header";
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

export interface FoodSnapFlowTheme {
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  destructiveColor?: string;
 
}
export interface FoodSnapFlowProps {
  apiKey?: string;

  onMealLogged: (analysisResult: FoodAnalysisResult, image: ImageData) => void;
  onFlowCancel: () => void;
  userId: string;
  theme?: Partial<FoodSnapFlowTheme>; 
  initialStep?: FlowStep; 
  preferredSource?: 'camera' | 'gallery'; 
}

type FlowStep =
  | "initialChoice"
  | "camera"
  | "preview"
  | "analysis"
  | "results"
  | "imageIssue"; 
export const FoodSnapFlow: React.FC<FoodSnapFlowProps> = (props) => {
  const { theme = {} } = props;
  
  const [currentStep, setCurrentStep] = useState<FlowStep>(() => {
    if (props.preferredSource === 'camera') {
      return 'camera';
    } else if (props.preferredSource === 'gallery') {
      return 'initialChoice';
    }
    return props.initialStep || 'initialChoice';
  });
  
  const [capturedImage, setCapturedImage] = useState<ImageData | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    loading: false,
    result: null,
    error: null,
  });
  const [geminiService, setGeminiService] = useState<GeminiVisionService | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const resultsFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try {
      const service = new GeminiVisionService(props.apiKey);
      setGeminiService(service);
    } catch (error) {
      console.error("Failed to initialize GeminiVisionService:", error);
      Alert.alert(
        "Initialization Error",
        "Could not initialize the food analysis service. Please check your setup and API key."
      );
    }
  }, [props.apiKey]); 

  useEffect(() => {
    if (currentStep === "results" && analysisState.result) {
      Animated.timing(resultsFadeAnim, {
        toValue: 1,
        duration: 500, 
        useNativeDriver: true,
      }).start();
    } else {
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
      allowsEditing: true,
      aspect: [4, 3], 
      quality: 0.8, 
      base64: true, 
    });

    if (
      !pickerResult.canceled &&
      pickerResult.assets &&
      pickerResult.assets.length > 0
    ) {
      const selectedImage = pickerResult.assets[0];
      if (selectedImage.uri && selectedImage.base64) {
        
        const imageData: ImageData = {
          uri: selectedImage.uri,
          base64: selectedImage.base64,
          width: selectedImage.width,
          height: selectedImage.height,
        };
        handleImageCaptured(imageData); 
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
    setRejectionReason(null); 

    if (props.preferredSource === 'camera') {
      setCurrentStep("camera");
    } else if (props.preferredSource === 'gallery') {
      setCurrentStep("initialChoice");
    } else {
      setCurrentStep("initialChoice"); 
    }
  }, [props.preferredSource]);

  const handleAnalyzeImage = useCallback(async () => {
    if (!capturedImage || !geminiService) return; 

    setAnalysisState({ loading: true, result: null, error: null });
    setRejectionReason(null); 
    setCurrentStep("analysis");

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        capturedImage.uri,
        [{ resize: { width: 1024, height: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipResult.base64) {
        throw new Error("Failed to get Base64 string from manipulated image.");
      }

      const imageData: ImageData = {
        uri: manipResult.uri, 
        width: manipResult.width,
        height: manipResult.height,
        base64: manipResult.base64, 
      };

      const analysisResult = await geminiService.analyzeFoodImage(imageData);

      if (!analysisResult.isLikelyFood) {
        setRejectionReason(
          "No food detected in the image. Please try a different image or retake the photo."
        );
        setAnalysisState({ loading: false, result: null, error: null }); 
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
        setAnalysisState({ loading: false, result: null, error: null }); 
        setCurrentStep("imageIssue");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
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
          { text: "Retry", onPress: handleAnalyzeImage },
          { text: "Retake Photo", onPress: handleRetakePhoto },
        ]
      );
    }
  }, [capturedImage, geminiService, handleRetakePhoto]); 

  const handleEditResult = useCallback((updatedResult: FoodAnalysisResult) => {
    setAnalysisState((prev) => ({
      ...prev,
      result: updatedResult,
    }));
  }, []);

  const handleSaveToLog = useCallback(() => {
    if (!analysisState.result || !capturedImage) return; 
    props.onMealLogged(analysisState.result, capturedImage);
    if (props.onFlowCancel) {
      props.onFlowCancel();
    } else {
    
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
  ]); 

  useEffect(() => {
    if (props.preferredSource === 'gallery' && currentStep === 'initialChoice') {

      const timer = setTimeout(() => {
        handleImageSelectedFromGallery();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [props.preferredSource, currentStep, handleImageSelectedFromGallery]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "initialChoice":
        if (props.preferredSource === 'camera') {
          return (
            <View style={styles.container}>
              <Header 
                showBackButton={true} 
                onBackPress={() => {
                  if (props.onFlowCancel) {
                    props.onFlowCancel();
                  } else {
                    setCurrentStep("initialChoice");
                  }
                }}
                subtitle="Capture Your Meal" 
              />
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
            </View>
          );
        } else if (props.preferredSource === 'gallery') {
 
          return (
            <View style={styles.container}>
              <Header 
                showBackButton={true} 
                onBackPress={() => {
                  if (props.onFlowCancel) {
                    props.onFlowCancel();
                  }
                }}
                subtitle="Opening Gallery..." 
              />
              <View style={styles.choiceContainer}>
                <Text style={styles.choiceTitle}>Opening Gallery...</Text>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.container}>
            <Header 
              showBackButton={true} 
              onBackPress={() => {
                if (props.onFlowCancel) {
                  props.onFlowCancel();
                }
              }}
              subtitle="Select Image Source" 
            />
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
                  color={theme.primaryColor}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  title="Choose from Gallery"
                  onPress={handleImageSelectedFromGallery}
                  color={theme.primaryColor}
                />
              </View>
            </View>
          </View>
        );

      case "camera":
        return (
          <View style={styles.container}>
            <Header 
              showBackButton={true} 
              onBackPress={() => {
                if (props.onFlowCancel) {
                  props.onFlowCancel();
                } else {
                  setCurrentStep("initialChoice");
                }
              }}
              subtitle="Capture Your Meal" 
            />
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
          </View>
        );

      case "imageIssue":
        return (
          <View style={styles.container}>
            <Header 
              showBackButton={true} 
              onBackPress={handleRetakePhoto}
              subtitle="Image Issue" 
            />
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
              imageDataUri={capturedImage?.uri}
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
    fontFamily: 'Quicksand_700Bold',
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
    fontFamily: 'Quicksand_700Bold',
    color: "#A52A2A", 
    marginBottom: 15,
  },
  issueMessage: {
    fontSize: 16,
    fontFamily: 'Quicksand_500Medium',
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
    color: "#333333", 
  },
});
