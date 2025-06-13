
export interface ImageQuality {
  clarity: number; 
  lighting: number; 
  obstructions: number;
  overall: number; 
}
export interface ConfidenceMetrics {
  foodIdentification: number; 
  ingredientAccuracy: number;
  portionEstimation: number;
  nutritionCalculation: number; 
}

export interface FoodItem {
  name: string;
  ingredients: string[];
  estimatedPortion: string;
  confidence: number;
  category?: string;
  preparationMethod?: string; 
  nutrition?: NutritionData; 
}

export interface NutritionData {
  calories: number;
  fat: number; 
  protein: number; 
  carbs: number; 
  fiber: number; 
  sugar: number; 
  sodium: number; 
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

export interface CameraPermission {
  granted: boolean;
  canAskAgain: boolean;
}

export interface CameraOptions {
  quality: number;
  allowsEditing: boolean;
  aspect: [number, number];
}
