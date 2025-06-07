// Core domain types for food recognition feature

// Enhanced image quality assessment
export interface ImageQuality {
  clarity: number; // 0-1 scale
  lighting: number; // 0-1 scale
  obstructions: number; // 0-1 scale (0 = no obstructions)
  overall: number; // 0-1 scale
}

// Enhanced confidence metrics for different aspects
export interface ConfidenceMetrics {
  foodIdentification: number; // 0-1 scale
  ingredientAccuracy: number; // 0-1 scale
  portionEstimation: number; // 0-1 scale
  nutritionCalculation: number; // 0-1 scale
}

export interface FoodItem {
  name: string;
  ingredients: string[];
  estimatedPortion: string;
  confidence: number;
  category?: string; // e.g., "vegetable", "protein", "grain"
  preparationMethod?: string; // e.g., "grilled", "fried", "steamed"
  nutrition?: NutritionData; // Nutrition data for this specific item
}

export interface NutritionData {
  calories: number;
  fat: number; // grams
  protein: number; // grams
  carbs: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // milligrams
}

export interface FoodAnalysisResult {
  foods: FoodItem[];
  nutritionPerServing: NutritionData;
  recognitionConfidence: number;
  notes?: string;
  imageQuality: ImageQuality;
  confidenceMetrics: ConfidenceMetrics;
  isLikelyFood: boolean;
}

export interface ImageData {
  uri: string;
  base64?: string;
  width: number;
  height: number;
}

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AnalysisState {
  loading: boolean;
  result: FoodAnalysisResult | null;
  error: ApiError | null;
}

// Camera related types
export interface CameraPermission {
  granted: boolean;
  canAskAgain: boolean;
}

export interface CameraOptions {
  quality: number;
  allowsEditing: boolean;
  aspect: [number, number];
}
