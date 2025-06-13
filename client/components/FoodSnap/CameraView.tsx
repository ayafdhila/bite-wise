import type { CameraOptions, ImageData } from "@/types/domain";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraType,
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics"; 
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"; 

import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import Header from "../Header"; 
interface CameraViewProps {
  onImageCaptured: (image: ImageData) => void;
  onClose: () => void;
  options?: CameraOptions;
}
export const CameraView: React.FC<CameraViewProps> = ({
  onImageCaptured,
  onClose,
  options = {
    quality: 0.8,
    allowsEditing: false,
    aspect: [4, 3],
  },
}) => {
  let [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<ExpoCameraView>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); 
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false); 

  useEffect(() => {
    const checkPermissions = async () => {
      if (!permission) {
        return;
      }
      if (!permission.granted && permission.canAskAgain) {
        await requestPermission();
      }
    };

    checkPermissions();
  }, [permission, requestPermission]);

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const toggleCameraFacing = () => {
    if (isProcessing) return; 
    setFacing((current: CameraType) => (current === "back" ? "front" : "back"));
  };

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing || !isCameraReady) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: options.quality,
        base64: true,
        exif: false,
      });

      if (photo) {
        const imageData: ImageData = {
          uri: photo.uri,
          base64: photo.base64,
          width: photo.width,
          height: photo.height,
        };
        onImageCaptured(imageData);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Header 
          showBackButton={true} 
          onBackPress={onClose}
          subtitle="Camera Access" 
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556B2F" />
          <Text style={styles.message}>
            {fontsLoaded ? "Checking camera permissions..." : "Loading..."}
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
       
        <View style={styles.centered}>
          <Text style={styles.message}>
            We need camera access to take photos of your food
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButtonAlt} onPress={onClose}>
            <Text style={styles.closeButtonTextAlt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView
        style={styles.camera}
        facing={facing}
        onCameraReady={handleCameraReady}
        ref={cameraRef}
      >
    
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
            disabled={isProcessing}
          >
            <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              (isProcessing || !isCameraReady) && styles.disabledButton,
            ]}
            onPress={takePicture}
            disabled={isProcessing || !isCameraReady}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
        
        {(isProcessing || !isCameraReady) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingOverlayText}>
              {isProcessing ? "Processing..." : "Preparing camera..."}
            </Text>
          </View>
        )}
      </ExpoCameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 1,
  },
  flipButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    padding: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#F4E4C3",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent", 
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(250, 235, 215, 0.4)", 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF", 
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF", 
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlayText: {
    color: "#FFFFFF",
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Quicksand_600SemiBold',
  },
  message: {
    fontSize: 18,
    fontFamily: 'Quicksand_600SemiBold',
    color: "#556B2F", 
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  permissionButton: {
    backgroundColor: "#556B2F", 
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15, 
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: 'Quicksand_700Bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  closeButtonAlt: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonTextAlt: {
    color: "#007AFF", 
    fontSize: 16,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
