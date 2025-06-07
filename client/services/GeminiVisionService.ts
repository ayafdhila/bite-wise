import type {
  ApiError,
  FoodAnalysisResult,
  ImageData,
  NutritionData,
} from "@/types/domain";
import { EXPO_PUBLIC_GEMINI_API_KEY } from "@env";

// Step 2.2: Enhanced processing interfaces
interface ProcessingMetrics {
  responseTime: number;
  parseTime: number;
  validationTime: number;
  totalProcessingTime: number;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  severity: "low" | "medium" | "high";
}

interface QualityAssessment {
  overallScore: number; // 0-1 scale
  reliability: "high" | "medium" | "low";
  needsReview: boolean;
  recommendations: string[];
}

/**
 * Service class for interacting with the Google Gemini Vision API to analyze food images.
 * It handles API key management, request construction, response parsing, error handling,
 * quality assessment, and retry logic.
 */
export class GeminiVisionService {
  private apiKey: string;
  private baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

  // Step 2.2: Processing metrics tracking
  private processingMetrics: ProcessingMetrics = {
    responseTime: 0,
    parseTime: 0,
    validationTime: 0,
    totalProcessingTime: 0,
  };

  /**
   * Constructs an instance of the GeminiVisionService.
   * @param {string} [apiKey] - Optional API key to use. If not provided, the service
   * attempts to load the key from the `EXPO_PUBLIC_GEMINI_API_KEY` environment variable.
   * @throws {Error} If the API key is not found or provided.
   */
  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    } else {
      const apiKeyFromEnv = EXPO_PUBLIC_GEMINI_API_KEY as string | undefined;
      if (!apiKeyFromEnv) {
        console.error(
          "EXPO_PUBLIC_GEMINI_API_KEY not found in environment variables and no apiKey provided to constructor. Make sure it is set in your .env file (e.g., c:\\Users\\ayoub\\Music\\eya\\bitewise-photo-nutrition\\.env) and prefixed with EXPO_PUBLIC_."
        );
        throw new Error("EXPO_PUBLIC_GEMINI_API_KEY_MISSING");
      }
      this.apiKey = apiKeyFromEnv;
    }

    if (!this.apiKey) {
      // This check is somewhat redundant if the above logic is correct but serves as a final guard.
      console.error(
        "API key is not set. This should not happen if loaded correctly from env or provided to constructor."
      );
      throw new Error("API_KEY_NOT_SET");
    }
  }
  /**
   * Analyzes a food image using the Gemini Vision API.
   * This is the primary method for a single analysis attempt without automatic retries.
   * @param {ImageData} image - The image data to analyze, including a base64 representation.
   * @returns {Promise<FoodAnalysisResult>} A promise that resolves with the food analysis result.
   * @throws {Error} If the API key is not configured, image data is invalid, or an API error occurs.
   */
  async analyzeFoodImage(image: ImageData): Promise<FoodAnalysisResult> {
    // Step 2.2: Start processing metrics tracking
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is not configured. Please provide an API key."
      );
    }
    if (!image.base64) {
      throw new Error("Base64 image data is required for analysis");
    }

    try {
      // Step 2.2: Track API response time
      const apiStartTime = Date.now();
      const response = await this.callGeminiAPI(image);
      this.processingMetrics.responseTime = Date.now() - apiStartTime;

      // Assuming the API directly returns the structured JSON text in the first part
      if (
        !response.candidates ||
        !response.candidates[0] ||
        !response.candidates[0].content ||
        !response.candidates[0].content.parts ||
        !response.candidates[0].content.parts[0] ||
        !response.candidates[0].content.parts[0].text
      ) {
        console.error("Unexpected API response structure:", response);
        throw new Error("Failed to parse API response: Invalid structure.");
      }

      // Step 2.2: Track parsing and validation time
      const parseStartTime = Date.now();
      const result = this.parseResponseText(
        response.candidates[0].content.parts[0].text
      );
      this.processingMetrics.parseTime = Date.now() - parseStartTime;

      // Step 2.2: Enhanced validation and quality assessment
      const validationStartTime = Date.now();
      const qualityAssessment = this.assessResponseQuality(result);
      this.processingMetrics.validationTime = Date.now() - validationStartTime;
      this.processingMetrics.totalProcessingTime = Date.now() - startTime;

      // Step 2.2: Log processing metrics for monitoring
      this.logProcessingMetrics(qualityAssessment);

      return result;
    } catch (error: any) {
      console.error("Gemini API error:", error);
      // Check if it's an HTTP error from fetch
      if (error.response) {
        const errorData = await error.response.json();
        console.error("API Error Response Data:", errorData);
        throw this.handleApiError({
          message: errorData.error?.message || "API request failed",
          status: error.response.status,
          data: errorData,
        });
      }
      throw this.handleApiError(error);
    }
  }

  private async callGeminiAPI(image: ImageData): Promise<any> {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.createFoodAnalysisPrompt() },
            this.prepareImageData(image),
          ],
        },
      ],
      // Optional: Add generationConfig if needed
      // generationConfig: {
      //   temperature: 0.4,
      //   topK: 32,
      //   topP: 1,
      //   maxOutputTokens: 4096,
      //   stopSequences: [],
      // },
      // Optional: Add safetySettings if needed
      // safetySettings: [
      //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      //   { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      // ],
    };

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Throw an error object that includes the response for more detailed handling
      const error: any = new Error(
        `API request failed with status ${response.status}`
      );
      error.response = response; // Attach the full response
      throw error;
    }

    return response.json();
  }
  private parseResponseText(responseText: string): FoodAnalysisResult {
    let jsonString = responseText;
    try {
      // Attempt to extract JSON from within ```json ... ``` fences
      const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1];
      } else {
        // If no markdown fences, try to find the main JSON object
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = responseText.substring(firstBrace, lastBrace + 1);
        }
      }

      jsonString = jsonString.trim();

      if (!jsonString) {
        console.error(
          "Extracted JSON string is empty after cleaning. Original response:",
          responseText
        );
        throw new Error("Extracted JSON string is empty after cleaning.");
      }

      const content = JSON.parse(jsonString);

      // Enhanced validation for new structure
      this.validateEnhancedResponse(content);

      // Process per-item nutrition and calculate total
      let totalNutrition: NutritionData = {
        calories: 0,
        fat: 0,
        protein: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };

      const processedFoods = (content.foods || []).map((food: any) => {
        const itemNutrition: NutritionData = {
          calories: food.nutrition?.calories || 0,
          fat: food.nutrition?.fat || 0,
          protein: food.nutrition?.protein || 0,
          carbs: food.nutrition?.carbs || 0,
          fiber: food.nutrition?.fiber || 0,
          sugar: food.nutrition?.sugar || 0,
          sodium: food.nutrition?.sodium || 0,
        };

        // Add to total
        totalNutrition.calories += itemNutrition.calories;
        totalNutrition.fat += itemNutrition.fat;
        totalNutrition.protein += itemNutrition.protein;
        totalNutrition.carbs += itemNutrition.carbs;
        totalNutrition.fiber += itemNutrition.fiber;
        totalNutrition.sugar += itemNutrition.sugar;
        totalNutrition.sodium += itemNutrition.sodium;

        return {
          name: food.name || "Unknown Food",
          ingredients: food.ingredients || [],
          estimatedPortion: food.estimatedPortion || "N/A",
          confidence: food.confidence || 0,
          category: food.category,
          preparationMethod: food.preparationMethod,
          nutrition: itemNutrition, // Store per-item nutrition
        };
      });

      // Use AI's top-level nutrition if provided and seems valid, otherwise use summed
      // For now, let's trust the AI's sum if it passes basic validation,
      // but we have the calculated sum as a backup or for more complex scenarios later.
      const aiTotalNutrition = content.nutrition;
      const finalTotalNutrition =
        aiTotalNutrition && typeof aiTotalNutrition.calories === "number"
          ? {
              calories: aiTotalNutrition.calories || 0,
              fat: aiTotalNutrition.fat || 0,
              protein: aiTotalNutrition.protein || 0,
              carbs: aiTotalNutrition.carbs || 0,
              fiber: aiTotalNutrition.fiber || 0,
              sugar: aiTotalNutrition.sugar || 0,
              sodium: aiTotalNutrition.sodium || 0,
            }
          : totalNutrition; // Fallback to summed if AI total is missing/invalid

      // Map to FoodAnalysisResult type with enhanced structure
      return {
        foods: processedFoods,
        nutritionPerServing: finalTotalNutrition,
        recognitionConfidence: content.confidence || 0,
        notes: content.notes || "",
        imageQuality: {
          clarity: content.imageQuality?.clarity || 0.5,
          lighting: content.imageQuality?.lighting || 0.5,
          obstructions: content.imageQuality?.obstructions || 0.5,
          overall: content.imageQuality?.overall || 0.5,
        },
        confidenceMetrics: {
          foodIdentification:
            content.confidenceMetrics?.foodIdentification || 0.5,
          ingredientAccuracy:
            content.confidenceMetrics?.ingredientAccuracy || 0.5,
          portionEstimation:
            content.confidenceMetrics?.portionEstimation || 0.5,
          nutritionCalculation:
            content.confidenceMetrics?.nutritionCalculation || 0.5,
        },
        isLikelyFood:
          content.isLikelyFood !== undefined ? content.isLikelyFood : true,
      };
    } catch (error: any) {
      console.error(
        "Failed to parse API response text. Original responseText:",
        responseText
      );
      console.error(
        "Problematic JSON string that was attempted to be parsed:",
        jsonString
      );
      console.error(`Parsing Error: ${error.message}`);

      // Return fallback result for better error handling
      return this.createFallbackResult(error.message);
    }
  }

  private validateEnhancedResponse(content: any): void {
    // Basic structure validation
    if (!content || typeof content !== "object") {
      throw new Error("Response content is not a valid object");
    }

    // Validate required arrays
    if (!content.foods || !Array.isArray(content.foods)) {
      console.warn("Foods array missing or invalid, using empty array");
      content.foods = [];
    }

    // Validate nutrition object
    if (!content.nutrition || typeof content.nutrition !== "object") {
      console.warn("Nutrition object missing or invalid, using defaults");
      content.nutrition = {};
    }

    // Validate confidence metrics
    if (
      !content.confidenceMetrics ||
      typeof content.confidenceMetrics !== "object"
    ) {
      console.warn("Confidence metrics missing or invalid, using defaults");
      content.confidenceMetrics = {};
    }

    // Validate image quality
    if (!content.imageQuality || typeof content.imageQuality !== "object") {
      console.warn("Image quality missing or invalid, using defaults");
      content.imageQuality = {};
    }
  }
  private createFallbackResult(errorMessage: string): FoodAnalysisResult {
    // Enhanced fallback with better error context
    const isCameraError =
      errorMessage.toLowerCase().includes("camera") ||
      errorMessage.toLowerCase().includes("image");
    const isNetworkError =
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("fetch");

    let notes = `Analysis failed: ${errorMessage}. `;

    if (isCameraError) {
      notes += "Please ensure the image is clear and contains food items.";
    } else if (isNetworkError) {
      notes += "Please check your internet connection and try again.";
    } else {
      notes += "Please try with a clearer image or different angle.";
    }

    return {
      foods: [], // Ensure FoodItems here would also have default nutrition if any were added
      nutritionPerServing: {
        calories: 0,
        fat: 0,
        protein: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      },
      recognitionConfidence: 0,
      notes,
      imageQuality: {
        clarity: isCameraError ? 0.1 : 0,
        lighting: isCameraError ? 0.1 : 0,
        obstructions: 1,
        overall: 0,
      },
      confidenceMetrics: {
        foodIdentification: 0,
        ingredientAccuracy: 0,
        portionEstimation: 0,
        nutritionCalculation: 0,
      },
      isLikelyFood: false,
    };
  }

  private handleApiError(error: any): ApiError {
    // Log the full error for debugging
    console.error("Handling API Error:", JSON.stringify(error, null, 2));

    let code = "UNKNOWN_ERROR";
    let message = "An unexpected error occurred during API interaction.";
    const retryable = true; // Default to true, can be overridden

    if (error.status) {
      // HTTP errors from fetch
      message = `API Error (${error.status}): ${
        error.message || "Failed to fetch"
      }`;
      if (error.status === 400) {
        code = "BAD_REQUEST";
        message =
          error.data?.error?.message ||
          "Invalid request to Gemini API. Check the image or prompt.";
      } else if (error.status === 401 || error.status === 403) {
        code = "AUTHENTICATION_ERROR";
        message = "API key is invalid or missing permissions.";
      } else if (error.status === 429) {
        code = "QUOTA_EXCEEDED";
        message = "API quota exceeded. Please try again later.";
      } else if (error.status >= 500) {
        code = "SERVER_ERROR";
        message = "Gemini API server error. Please try again later.";
      }
    } else if (error.message) {
      // Other errors (network, parsing, etc.)
      message = error.message;
      if (error.message.toLowerCase().includes("quota")) {
        code = "QUOTA_EXCEEDED";
      } else if (error.message.toLowerCase().includes("network")) {
        code = "NETWORK_ERROR";
      } else if (error.message.toLowerCase().includes("parse")) {
        code = "PARSING_ERROR";
      }
    }

    return { code, message, retryable };
  }

  // Helper method to prepare image for API
  private prepareImageData(image: ImageData) {
    // Remove data URI prefix if it exists (e.g., "data:image/jpeg;base64,")
    const base64Data = image.base64?.startsWith("data:image")
      ? image.base64.substring(image.base64.indexOf(",") + 1)
      : image.base64;

    return {
      inline_data: {
        mime_type: "image/png", 
        data: base64Data,
      },
    };
  }
  // Helper method to create the prompt for food analysis
  private createFoodAnalysisPrompt(): string {
    return `
      You are an expert nutritionist and food analyst. Analyze this image with comprehensive detail and provide a structured JSON response.

      **PRIMARY TASKS:**
      1. Assess if this image actually contains food
      2. Evaluate image quality for accurate analysis
      3. Identify all food items with detailed nutritional breakdown FOR EACH ITEM based on its estimated portion.
      4. Provide confidence metrics for each aspect of analysis

      **RESPONSE FORMAT:**
      Return ONLY valid JSON in this exact structure:

      {
        "isLikelyFood": boolean,
        "imageQuality": {
          "clarity": 0.0-1.0,
          "lighting": 0.0-1.0,
          "obstructions": 0.0-1.0,
          "overall": 0.0-1.0
        },
        "foods": [
          {
            "name": "Specific food name",
            "ingredients": ["ingredient1", "ingredient2"],
            "estimatedPortion": "precise portion (e.g., '1 medium apple, 180g')",
            "confidence": 0.0-1.0,
            "category": "food category (fruit/vegetable/protein/grain/dairy/fat)",
            "preparationMethod": "cooking method if applicable",
            "nutrition": { // ADDED: Nutrition data for THIS specific food item
              "calories": number,
              "fat": number, // grams
              "protein": number, // grams
              "carbs": number, // grams
              "fiber": number, // grams
              "sugar": number, // grams
              "sodium": number // milligrams
            }
          }
        ],
        "nutrition": { // This will be the SUM of nutrition from all items in the 'foods' array
          "calories": number,
          "fat": number,
          "protein": number,
          "carbs": number,
          "fiber": number,
          "sugar": number,
          "sodium": number
        },
        "confidenceMetrics": {
          "foodIdentification": 0.0-1.0,
          "ingredientAccuracy": 0.0-1.0,
          "portionEstimation": 0.0-1.0,
          "nutritionCalculation": 0.0-1.0
        },
        "confidence": 0.0-1.0,
        "notes": "detailed analysis notes"
      }

      **ANALYSIS GUIDELINES:**
      - isLikelyFood: false if no food is visible, true if food is detected
      - imageQuality.clarity: sharpness and focus (0=very blurry, 1=crystal clear)
      - imageQuality.lighting: adequate lighting for analysis (0=too dark/bright, 1=perfect)
      - imageQuality.obstructions: hands, utensils, packaging blocking view (0=fully blocked, 1=clear view)
      - imageQuality.overall: combined assessment for reliable analysis
      - For each food: be specific about variety, ripeness, cooking method
      - Portions: estimate based on visual cues, reference objects, typical serving sizes
      - Nutrition: calculate per total serving shown, not per 100g. FOR EACH FOOD ITEM, provide its individual nutrition breakdown based on its estimated portion. The top-level "nutrition" object should be the sum of all individual food item nutrition values.
      - confidenceMetrics: assess reliability of each analysis aspect
      - confidence: overall confidence in the complete analysis

      **EDGE CASES:**
      - Non-food images: return isLikelyFood: false, minimal food array, explain in notes
      - Poor quality: reflect in imageQuality scores and confidence metrics
      - Packaged foods: try to identify contents, note packaging in analysis
      - Multiple items: analyze each separately, sum nutrition values
      - Unclear portions: estimate conservatively, note uncertainty

      Analyze the image now and respond with valid JSON only.
    `;
  }

  // Step 2.2: Enhanced validation and quality assessment methods
  private assessResponseQuality(result: FoodAnalysisResult): QualityAssessment {
    let score = 0;
    const recommendations: string[] = [];
    let issueCount = 0;

    // Check image quality metrics
    const avgImageQuality =
      (result.imageQuality.clarity +
        result.imageQuality.lighting +
        (1 - result.imageQuality.obstructions) + // Invert obstructions (less is better)
        result.imageQuality.overall) /
      4;

    score += avgImageQuality * 0.3; // 30% weight for image quality

    if (avgImageQuality < 0.5) {
      recommendations.push(
        "Consider retaking photo with better lighting or focus"
      );
      issueCount++;
    }

    // Check confidence metrics
    const avgConfidence =
      (result.confidenceMetrics.foodIdentification +
        result.confidenceMetrics.ingredientAccuracy +
        result.confidenceMetrics.portionEstimation +
        result.confidenceMetrics.nutritionCalculation) /
      4;

    score += avgConfidence * 0.4; // 40% weight for confidence

    if (avgConfidence < 0.6) {
      recommendations.push("AI confidence is low - consider manual review");
      issueCount++;
    }

    // Check nutrition data reasonableness
    const nutritionValidation = this.validateNutritionReasonableness(
      result.nutritionPerServing
    );
    score += nutritionValidation.score * 0.2; // 20% weight for nutrition validation

    if (!nutritionValidation.isReasonable) {
      recommendations.push(...nutritionValidation.issues);
      issueCount++;
    }

    // Check food identification quality
    const foodValidation = this.validateFoodIdentification(result.foods);
    score += foodValidation.score * 0.1; // 10% weight for food validation

    if (!foodValidation.isValid) {
      recommendations.push(...foodValidation.issues);
      issueCount++;
    }

    // Determine reliability level
    let reliability: "high" | "medium" | "low";
    if (score >= 0.8 && issueCount === 0) {
      reliability = "high";
    } else if (score >= 0.6 && issueCount <= 1) {
      reliability = "medium";
    } else {
      reliability = "low";
    }

    return {
      overallScore: Math.max(0, Math.min(1, score)),
      reliability,
      needsReview: reliability === "low" || issueCount > 2,
      recommendations,
    };
  }

  private validateNutritionReasonableness(nutrition: any): {
    isReasonable: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 1.0;

    // Check for unreasonable values
    if (nutrition.calories < 0 || nutrition.calories > 2000) {
      issues.push("Calorie count seems unrealistic");
      score -= 0.3;
    }

    if (nutrition.protein < 0 || nutrition.protein > 200) {
      issues.push("Protein amount seems unrealistic");
      score -= 0.2;
    }

    if (nutrition.fat < 0 || nutrition.fat > 150) {
      issues.push("Fat amount seems unrealistic");
      score -= 0.2;
    }

    if (nutrition.carbs < 0 || nutrition.carbs > 300) {
      issues.push("Carbohydrate amount seems unrealistic");
      score -= 0.2;
    }

    if (nutrition.sodium < 0 || nutrition.sodium > 5000) {
      issues.push("Sodium amount seems unrealistic");
      score -= 0.1;
    }

    return {
      isReasonable: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateFoodIdentification(foods: any[]): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 1.0;

    if (!foods || foods.length === 0) {
      issues.push("No food items identified");
      return { isValid: false, score: 0, issues };
    }

    for (const food of foods) {
      if (!food.name || food.name.trim().length === 0) {
        issues.push("Food item missing name");
        score -= 0.3;
      }

      if (!food.confidence || food.confidence < 0.3) {
        issues.push(`Low confidence for food item: ${food.name || "unknown"}`);
        score -= 0.2;
      }

      if (!food.estimatedPortion || food.estimatedPortion.trim().length === 0) {
        issues.push(`Missing portion estimate for: ${food.name || "unknown"}`);
        score -= 0.1;
      }
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private logProcessingMetrics(qualityAssessment: QualityAssessment): void {
    // Log processing performance for monitoring
    console.log("=== Food Analysis Processing Metrics ===");
    console.log(`Response Time: ${this.processingMetrics.responseTime}ms`);
    console.log(`Parse Time: ${this.processingMetrics.parseTime}ms`);
    console.log(`Validation Time: ${this.processingMetrics.validationTime}ms`);
    console.log(`Total Time: ${this.processingMetrics.totalProcessingTime}ms`);
    console.log(
      `Quality Score: ${(qualityAssessment.overallScore * 100).toFixed(1)}%`
    );
    console.log(`Reliability: ${qualityAssessment.reliability}`);

    if (qualityAssessment.needsReview) {
      console.warn(
        "⚠️  Analysis needs review:",
        qualityAssessment.recommendations
      );
    }

    // Reset metrics for next analysis
    this.processingMetrics = {
      responseTime: 0,
      parseTime: 0,
      validationTime: 0,
      totalProcessingTime: 0,
    };
  }

  //  Enhanced error recovery with retry logic
  private async retryAnalysis(
    image: ImageData,
    attempt: number = 1,
    maxRetries: number = 2
  ): Promise<FoodAnalysisResult> {
    try {
      return await this.analyzeFoodImage(image);
    } catch (error: any) {
      console.warn(`Analysis attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries && this.isRetryableError(error)) {
        console.log(
          `Retrying analysis (attempt ${attempt + 1}/${maxRetries + 1})...`
        );
        // Add exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        return this.retryAnalysis(image, attempt + 1, maxRetries);
      }

      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Check if error is retryable based on error type
    const retryableCodes = ["NETWORK_ERROR", "SERVER_ERROR", "QUOTA_EXCEEDED"];
    return (
      retryableCodes.some((code) => error.message?.includes(code)) ||
      error.code === 500 ||
      error.code === 503 ||
      error.code === 429
    );
  }

  // Public methods for enhanced functionality

  /**
   * Analyzes a food image with built-in retry logic for transient errors.
   * @param {ImageData} image - The image data to analyze.
   * @param {number} [maxRetries=2] - The maximum number of retry attempts.
   * @returns {Promise<FoodAnalysisResult>} A promise that resolves with the food analysis result.
   * @throws {Error} If analysis fails after all retry attempts.
   */
  async analyzeFoodImageWithRetry(
    image: ImageData,
    maxRetries: number = 2
  ): Promise<FoodAnalysisResult> {
    return this.retryAnalysis(image, 1, maxRetries);
  }

  /**
   * Retrieves the processing metrics from the last `analyzeFoodImage` call.
   * Note: Metrics are reset after each call to `logProcessingMetrics` (which is internal to `analyzeFoodImage`).
   * @returns {ProcessingMetrics} The last recorded processing metrics.
   */
  getLastProcessingMetrics(): ProcessingMetrics {
    return { ...this.processingMetrics };
  }

  /**
   * Validates an existing `FoodAnalysisResult` object and provides a quality assessment.
   * This can be used to assess results obtained from other sources or previous analyses.
   * @param {FoodAnalysisResult} result - The food analysis result to validate.
   * @returns {QualityAssessment} The quality assessment for the provided result.
   */
  validateAnalysisResult(result: FoodAnalysisResult): QualityAssessment {
    return this.assessResponseQuality(result);
  }
}
