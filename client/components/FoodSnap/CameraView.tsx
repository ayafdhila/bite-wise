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

/**
 * Props for the CameraView component.
 */
interface CameraViewProps {
  /**
   * Callback function invoked when an image is successfully captured.
   * @param image - The captured image data.
   */
  onImageCaptured: (image: ImageData) => void;
  /**
   * Callback function invoked when the camera view is closed.
   */
  onClose: () => void;
  /**
   * Optional camera configuration options.
   */
  options?: CameraOptions;
}

/**
 * CameraView component provides a user interface for capturing images using the device camera.
 * It handles camera permissions, allows switching between front and back cameras,
 * and provides feedback during image capture and processing.
 */
export const CameraView: React.FC<CameraViewProps> = ({
  onImageCaptured,
  onClose,
  options = {
    quality: 0.8,
    allowsEditing: false,
    aspect: [4, 3],
  },
}) => {
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
      if (!permission.granted) {
        if (permission.canAskAgain) {
          await requestPermission();
        }
      }
    };

    checkPermissions();
  }, [permission, requestPermission]);

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const toggleCameraFacing = () => {
    if (isProcessing) return; // Prevent action if processing
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

  if (permission === null || (!isCameraReady && !permission?.granted)) {
    // Show loading while permission is null or camera is not ready and permission not explicitly denied
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#556B2F" />
        <Text style={styles.message}>Loading Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        {" "}
        <Text style={styles.message}>
          Camera access is required to analyze food.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          disabled={!permission.canAskAgain} // Disable if cannot ask again
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButtonAlt} onPress={onClose}>
          <Text style={styles.closeButtonTextAlt}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={handleCameraReady} // Set camera ready state
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Capture Your Meal</Text>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
            disabled={isProcessing}
          >
            <Ionicons name="camera-reverse" size={30} color="white" />
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
              {!isCameraReady ? "Initializing Camera..." : "Processing..."}
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
    backgroundColor: "#6B8E23", 
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAEBD7", 
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.3)", 
  },
  closeButton: {
    padding: 10,
  },
  title: {
    color: "#FFFFFF", 
    fontSize: 18,
    fontWeight: "600",
  },
  flipButton: {
    padding: 10,
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
  },
  message: {
    fontSize: 18,
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
    fontWeight: "bold",
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
  },
});
