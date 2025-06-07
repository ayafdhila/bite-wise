# FoodSnapFlow Module Integration Guide

## 1. Overview

The `FoodSnapFlow` is a React Native component designed to provide a complete user flow for capturing images of food, analyzing them using the Gemini Vision API, and preparing the nutritional data for logging within a larger application, such as BiteWise.

It encapsulates:

- Camera interaction and image selection from the gallery.
- Image preview and confirmation.
- Communication with the Gemini Vision API for food analysis.
- Display of detailed nutritional results, including confidence scores.
- Basic editing of detected food items and their portions.
- Support for manual addition of food items.

The goal is to offer a well-encapsulated, reusable, and plug-and-play module for food snapping and nutritional analysis.

## 2. Installation & Dependencies

To use the `FoodSnapFlow` module in your BiteWise application, ensure the following dependencies are installed in your project. These should align with the versions specified in the `FoodSnapFlow` module's `package.json` for best compatibility.

```bash
npm install expo-camera expo-image-picker expo-image-manipulator expo-haptics react-native-dotenv
# or
yarn add expo-camera expo-image-picker expo-image-manipulator expo-haptics react-native-dotenv
```

**Permissions:**

The module requires camera and photo library permissions. Ensure these are correctly configured in your host application's `app.json` (or equivalent configuration file if not using Expo directly). For Expo-managed projects:

```json
// app.json (example snippet)
{
  "expo": {
    // ... other configurations
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to snap photos of your meals."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to select meal images."
        }
      ]
      // ... other plugins
    ]
  }
}
```

## 3. Usage / Integration

Import the `FoodSnapFlow` component and its related types into the screen or component where you intend to use it.

```typescript
import {
  FoodSnapFlow,
  type FoodSnapFlowProps, // Use 'type' for type-only imports
  type FoodSnapFlowTheme,
} from "./path/to/your/src/screens/FoodSnapFlow"; // Adjust path to FoodSnapFlow.tsx
import type {
  FoodAnalysisResult,
  ImageData,
} from "./path/to/your/src/types/domain"; // Adjust path to domain.ts

// Example of using FoodSnapFlow within a BiteWise screen component
const MyFoodLoggingScreen = () => {
  const [isFoodSnapVisible, setIsFoodSnapVisible] = useState(false);

  const handleMealLogged = (
    analysisResult: FoodAnalysisResult,
    image: ImageData
  ) => {
    console.log("Meal to be logged in BiteWise:", analysisResult);
    console.log("Associated image URI:", image.uri);
    // Implement logic to save the meal data to BiteWise backend or state management
    // For example, dispatch an action, call an API service, etc.
    setIsFoodSnapVisible(false); // Close the FoodSnapFlow module
  };

  const handleFlowCancel = () => {
    console.log("FoodSnapFlow was cancelled or exited by the user.");
    setIsFoodSnapVisible(false); // Close the FoodSnapFlow module
  };

  // Optional: Define a custom theme to match BiteWise's branding
  const biteWiseTheme: Partial<FoodSnapFlowTheme> = {
    primaryColor: "#4CAF50", // BiteWise primary green
    backgroundColor: "#FFFFFF",
    textColor: "#333333",
    // Add other theme properties as needed
  };

  if (!isFoodSnapVisible) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Button
          title="Log New Meal"
          onPress={() => setIsFoodSnapVisible(true)}
        />
      </View>
    );
  }

  return (
    <FoodSnapFlow
      // apiKey="YOUR_GEMINI_API_KEY" // Optional: Only if overriding the .env key
      onMealLogged={handleMealLogged}
      onFlowCancel={handleFlowCancel}
      userId="currentUserBiteWiseId" // Optional: Pass the current BiteWise user ID
      theme={biteWiseTheme} // Optional: Apply custom theme
    />
  );
};

export default MyFoodLoggingScreen;
```

### Props (`FoodSnapFlowProps`)

- **`apiKey?: string`** (Optional)
  - Your Google Gemini API key.
  - If not provided, `GeminiVisionService` (used internally) defaults to `EXPO_PUBLIC_GEMINI_API_KEY` from your project's `.env` file.
- **`onMealLogged: (analysisResult: FoodAnalysisResult, image: ImageData) => void`** (Required)
  - Callback triggered when the user successfully analyzes food and confirms logging.
  - `analysisResult: FoodAnalysisResult`: Detailed analysis data (see `src/types/domain.ts`).
  - `image: ImageData`: Image data (URI, base64, width, height) of the analyzed food.
- **`onFlowCancel?: () => void`** (Optional)
  - Callback triggered if the user cancels the flow (e.g., closes camera, presses a global back/cancel button that exits the flow) or after `onMealLogged` if the host app is designed to close the flow post-logging.
- **`userId?: string`** (Optional)
  - Identifier for the current user. Useful for associating the food log with a user in the BiteWise application.
- **`theme?: Partial<FoodSnapFlowTheme>`** (Optional)
  - Object for custom styling. See "Theming / Styling" below.

## 4. Theming / Styling

The `FoodSnapFlow` component supports basic theming for visual integration with the host (BiteWise) application.

### `FoodSnapFlowTheme` Interface

Located in `src/screens/FoodSnapFlow.tsx` (or can be imported from there).

```typescript
export interface FoodSnapFlowTheme {
  backgroundColor?: string; // Overall background of the flow screens
  textColor?: string; // Default text color
  primaryColor?: string; // Color for primary buttons, interactive elements
  destructiveColor?: string; // Color for error messages or destructive actions
  // Additional properties can be defined as the theme system evolves.
}
```

### Applying a Theme

Pass a `theme` object (a partial implementation of `FoodSnapFlowTheme`) to the `FoodSnapFlow` component. The module uses these values, falling back to its internal defaults if specific properties are omitted.

```typescript
const myAppTheme: Partial<FoodSnapFlowTheme> = {
  primaryColor: "#FF6347", // Tomato red
  backgroundColor: "#F8F8F8",
  textColor: "#2F2F2F",
};

<FoodSnapFlow {...otherProps} theme={myAppTheme} />;
```

**Note on Theming Extent:**
Currently, the `theme` prop primarily styles the top-level `FoodSnapFlow` container and its direct UI elements (e.g., main action buttons, screen backgrounds). While some basic colors might be inherited by child components (`CameraView`, `ImagePreview`, `NutritionDisplay`), they do not possess extensive, independent theming capabilities through this top-level prop alone.

**Future Theming Enhancements could include:**

- A more robust theming context or provider for deeper and more consistent style cascading.
- Specific theme properties for granular customization of elements within `CameraView`, `ImagePreview`, and `NutritionDisplay`.

For extensive customization of child components beyond what the current theme prop offers, direct modification of their respective stylesheets or an extension of the `FoodSnapFlowTheme` interface and its application logic within the module would be necessary.

## 5. Error Handling & Service Initialization

- Internal errors during API calls or image processing are handled within `FoodSnapFlow` and `GeminiVisionService`. The UI will reflect loading, success, or error states appropriately.
- `GeminiVisionService` is initialized by `FoodSnapFlow`. It uses the `apiKey` prop or falls back to the `EXPO_PUBLIC_GEMINI_API_KEY` environment variable. Ensure this key is valid and has the necessary Gemini API permissions.

## 6. Navigation Considerations

The `FoodSnapFlow` module manages its internal navigation between steps (Camera → Preview → Results). The host application (BiteWise) is responsible for presenting and dismissing the `FoodSnapFlow` module itself (e.g., as a modal, a full-screen view, or part of a navigation stack).

- Use the **`onMealLogged`** callback to determine when the user has successfully completed the flow. The host application should then handle the received data (e.g., save it) and typically navigate away from or close the `FoodSnapFlow` module.
- Use the **`onFlowCancel`** callback to know when the user has exited the flow prematurely. The host application should then navigate away or close the `FoodSnapFlow` module.

## 7. Data Structures (`FoodAnalysisResult`, `ImageData`)

Refer to `src/types/domain.ts` within the `FoodSnapFlow` module for the canonical definitions of data structures.

**`FoodAnalysisResult`**: Contains the comprehensive analysis from the Gemini API, including an array of `FoodItem` objects, overall `nutritionPerServing`, confidence scores, image quality assessment, etc.

**`ImageData`**: Provides details about the captured image, including its `uri`, optional `base64` representation, `width`, and `height`.

Example (simplified):

```typescript
// In src/types/domain.ts
export interface FoodAnalysisResult {
  foods: FoodItem[];
  nutritionPerServing: NutritionData;
  recognitionConfidence: number;
  notes?: string;
  imageQuality: ImageQuality;
  confidenceMetrics: ConfidenceMetrics;
  isLikelyFood: boolean;
}

export interface FoodItem {
  name: string;
  ingredients: string[];
  estimatedPortion: string;
  confidence: number;
  nutrition?: NutritionData; // Nutrition for this specific item
  // ... other fields like category, preparationMethod
}

export interface NutritionData {
  /* calories, fat, protein, carbs, etc. */
}

export interface ImageData {
  uri: string;
  base64?: string;
  width: number;
  height: number;
}
```

This guide should serve as a comprehensive starting point for integrating the `FoodSnapFlow` module into the BiteWise application. For any further details, refer to the TSDoc comments within the module's source code.
