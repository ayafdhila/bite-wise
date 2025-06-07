import type {
  FoodItem as DomainFoodItem,
  FoodAnalysisResult, 
  NutritionData,
} from "@/types/domain";
import {
  calculateTotalNutrition,
  parsePortionToGrams,
  scaleNutritionData,
  splitPortionForEditing,
} from "@/utils/nutritionUtils";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"; 

// Extended FoodItem type for editing state
/**
 * @ignore
 */
interface EditableFoodItem extends DomainFoodItem {
  portionTemplate?: string; // e.g., "%%VALUE%% grams of"
  gramValueStr?: string; // The numeric part of the portion, as a string
  unit?: string; // The unit part, e.g., "grams", "cup"
  isManuallyAdded?: boolean; // Flag for manually added items
}

// Extended FoodAnalysisResult for editing state
/**
 * @ignore
 */
interface EditableFoodAnalysisResult extends Omit<FoodAnalysisResult, "foods"> {
  foods: EditableFoodItem[];
}

/**
 * Props for the NutritionDisplay component.
 */
interface NutritionDisplayProps {
  /**
   * The food analysis result to display.
   */
  result: FoodAnalysisResult;
  /**
   * Optional URI of the captured image to display alongside the nutrition data.
   */
  imageDataUri?: string;
  /**
   * Callback function invoked when the user edits the nutrition data.
   * @param updatedResult - The modified food analysis result.
   */
  onEdit: (updatedResult: FoodAnalysisResult) => void;
  /**
   * Callback function invoked when the user saves the (potentially edited) nutrition data.
   */
  onSave: () => void;
  /**
   * Callback function invoked when the user chooses to retake the photo.
   */
  onRetake: () => void;
}

/**
 * NutritionDisplay component presents the food analysis results, including detected food items,
 * their estimated portions, and detailed nutritional information. It allows users to review,
 * edit, and save the analysis.
 */
export const NutritionDisplay: React.FC<NutritionDisplayProps> = React.memo(
  ({
    result,
    imageDataUri, 
    onEdit,
    onSave,
    onRetake,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    // Use the extended type for editedResult
    const [editedResult, setEditedResult] =
      useState<EditableFoodAnalysisResult>(
        () => processResultForEditing(result) 
      );

    // Helper to process FoodAnalysisResult for internal editing state
    function processResultForEditing(
      currentResult: FoodAnalysisResult
    ): EditableFoodAnalysisResult {
      return {
        ...currentResult,
        foods: currentResult.foods.map((food) => {
          const { descriptionTemplate, gramValue, unit } =
            splitPortionForEditing(food.estimatedPortion);
          return {
            ...food,
            portionTemplate: descriptionTemplate,
            gramValueStr: gramValue, // This will hold the numeric part
            unit: unit, // Store the unit
            isManuallyAdded: false, // Existing items are not manually added
          };
        }),
      };
    }

    useEffect(() => {
      // When the result prop changes, re-initialize the editedResult state
      setEditedResult(processResultForEditing(result));
    }, [result]);

    const handleStartEditing = () => {
      setEditedResult(processResultForEditing(result)); // Ensure fresh split when starting edit
      setIsEditing(true);
    };

    const handleSaveEdits = () => {
      const resultToSave: FoodAnalysisResult = {
        ...editedResult,
        foods: editedResult.foods.map(
          ({ portionTemplate, gramValueStr, ...foodItem }) => foodItem
        ),
      };
      onEdit(resultToSave);
      setIsEditing(false);
    };

    const handleCancelEdits = () => {
      setEditedResult(processResultForEditing(result)); // Reset to original processed result
      setIsEditing(false);
    };

    // This function is called when the gram input changes
    const handleGramValueChange = useCallback(
      (index: number, newValueStr: string) => {
        setEditedResult((prev) => {
          if (!prev) return prev;

          const foodItemToUpdate = prev.foods[index];
          if (
            !foodItemToUpdate ||
            foodItemToUpdate.portionTemplate === undefined ||
            foodItemToUpdate.unit === undefined
          )
            return prev;

          // Reconstruct the full portion string using %%VALUE%% and the stored unit
          const reconstructedPortion = foodItemToUpdate.portionTemplate.replace(
            "%%VALUE%%",
            newValueStr
          );

          const updatedFoodItems = prev.foods.map((food, i) => {
            if (i === index) {
              return { ...food, gramValueStr: newValueStr }; // gramValueStr now stores the numeric part of the value
            }
            return food;
          });

          return {
            ...prev,
            foods: updatedFoodItems,
          };
        });
      },
      [] 
    );

    // handlePortionChange now takes the full new portion string
    const handlePortionChange = useCallback(
      (index: number, newFullPortionStr: string) => {
        setEditedResult((prev) => {
          if (!prev) return prev;

          const newFoods = prev.foods.map((food, i) => {
            if (i === index) {
              const originalAiFoodItem = result.foods[index]; // Base for scaling

              let scaledNutritionToUpdate: NutritionData | undefined =
                food.nutrition;
              let finalPortionStrToStore = newFullPortionStr;

              if (
                originalAiFoodItem?.nutrition &&
                originalAiFoodItem.estimatedPortion
              ) {
                const originalPortionGramsForScaling = parsePortionToGrams(
                  originalAiFoodItem.estimatedPortion
                );
                const newPortionGramsFromInput =
                  parsePortionToGrams(newFullPortionStr);

                if (
                  originalPortionGramsForScaling !== null &&
                  originalPortionGramsForScaling > 0 &&
                  newPortionGramsFromInput !== null &&
                  newPortionGramsFromInput >= 0
                ) {
                  scaledNutritionToUpdate = scaleNutritionData(
                    originalAiFoodItem.nutrition,
                    originalPortionGramsForScaling,
                    newPortionGramsFromInput
                  );
                } else if (newPortionGramsFromInput === null) {
                  scaledNutritionToUpdate = originalAiFoodItem.nutrition;
                } else {
                  scaledNutritionToUpdate = originalAiFoodItem.nutrition;
                }
              } else {
                scaledNutritionToUpdate =
                  originalAiFoodItem?.nutrition || food.nutrition;
              }
              return {
                ...food,
                estimatedPortion: finalPortionStrToStore,
                nutrition: scaledNutritionToUpdate,
              };
            }
            return food;
          });

          const newTotalNutrition = calculateTotalNutrition(newFoods);

          return {
            ...prev,
            foods: newFoods,
            nutritionPerServing: newTotalNutrition,
          };
        });
      },
      [result]
    );
    const updateFoodItemName = useCallback((index: number, newName: string) => {
      setEditedResult((prev) => {
        if (!prev) return prev;
        const newFoods = prev.foods.map((food, i) =>
          i === index ? { ...food, name: newName } : food
        );
        // Note: Changing name does not affect total nutrition unless other logic is added.
        return {
          ...prev,
          foods: newFoods,
        };
      });
    }, []);

    const handleDeleteFoodItem = useCallback((indexToDelete: number) => {
      setEditedResult((prev) => {
        if (!prev) return prev;

        const updatedFoods = prev.foods.filter(
          (_, index) => index !== indexToDelete
        );
        const newTotalNutrition = calculateTotalNutrition(updatedFoods);

        return {
          ...prev,
          foods: updatedFoods,
          nutritionPerServing: newTotalNutrition,
        };
      });
    }, []);

    const handleAddNewFoodItem = useCallback(() => {
      setEditedResult((prev) => {
        if (!prev) return prev;

        const defaultNutrition: NutritionData = {
          calories: 0,
          fat: 0,
          protein: 0,
          carbs: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        };

        const initialPortion = "1 serving";
        // Ensure splitPortionForEditing is imported and available in this scope
        const { descriptionTemplate, gramValue, unit } =
          splitPortionForEditing(initialPortion);

        const newFoodItem: EditableFoodItem = {
          // foodId: `manual-${Date.now()}`, // Removed: Not part of EditableFoodItem
          name: "New Food Item",
          ingredients: [], // Add empty ingredients array
          estimatedPortion: initialPortion,
          nutrition: defaultNutrition,
          confidence: 1.0, // Max confidence as it's manually added
          // Editable fields
          portionTemplate: descriptionTemplate,
          gramValueStr: gramValue,
          unit: unit,
          isManuallyAdded: true, // Mark as manually added
          // Consider adding an 'isManuallyAdded: true' flag if further differentiation is needed
        };

        const updatedFoods = [...prev.foods, newFoodItem];
        const newTotalNutrition = calculateTotalNutrition(updatedFoods);

        return {
          ...prev,
          foods: updatedFoods,
          nutritionPerServing: newTotalNutrition,
        };
      });
    }, []);

    // Function to handle nutrition value changes for manually added items
    const handleNutritionValueChange = useCallback(
      (index: number, field: keyof NutritionData, value: string) => {
        setEditedResult((prev) => {
          if (!prev) return prev;

          const foodItem = prev.foods[index];
          if (!foodItem?.isManuallyAdded) return prev; // Only allow editing for manually added items

          const numericValue = parseFloat(value) || 0;

          const updatedFoods = prev.foods.map((food, i) => {
            if (i === index && food.nutrition) {
              const updatedNutrition = {
                ...food.nutrition,
                [field]: numericValue,
              };

              // Auto-calculate calories if macronutrients are changed
              if (field === "fat" || field === "protein" || field === "carbs") {
                updatedNutrition.calories =
                  updatedNutrition.fat * 9 +
                  updatedNutrition.protein * 4 +
                  updatedNutrition.carbs * 4;
              }

              return { ...food, nutrition: updatedNutrition };
            }
            return food;
          });

          const newTotalNutrition = calculateTotalNutrition(updatedFoods);

          return {
            ...prev,
            foods: updatedFoods,
            nutritionPerServing: newTotalNutrition,
          };
        });
      },
      []
    );

    const displayResult = isEditing
      ? editedResult
      : processResultForEditing(result); // Ensure displayResult is always processed

    if (!displayResult) {
      // Handle case where result might be null or undefined initially
      return (
        <View style={styles.container}>
          <Text>Loading nutrition data...</Text>
        </View>
      );
    }

    // Helper function to get color based on confidence level
    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 0.8) return "#4CAF50"; // Green for high confidence (80%+)
      if (confidence >= 0.6) return "#FFC107"; // Amber for medium confidence (60-79%)
      return "#F44336"; // Red for low confidence (<60%)
    };

    // Helper function to get an icon based on confidence level
    const getConfidenceIcon = (
      confidence: number
    ): keyof typeof Ionicons.glyphMap => {
      if (confidence >= 0.8) return "checkmark-circle";
      if (confidence >= 0.6) return "alert-circle";
      return "close-circle";
    };

    // Define MacroNutrientVisualizerProps and MacroNutrientVisualizer component here
    /**
     * @ignore
     */
    interface MacroNutrientVisualizerProps {
      label: string;
      grams: number;
      caloriesFromMacro: number;
      totalCalories: number;
      color: string;
    }

    const MacroNutrientVisualizer: React.FC<MacroNutrientVisualizerProps> = ({
      label,
      grams,
      caloriesFromMacro,
      totalCalories,
      color,
    }) => {
      const percentage =
        totalCalories > 0 ? (caloriesFromMacro / totalCalories) * 100 : 0;
      // Cap display percentage at 100% for the bar width, but show actual rounded %
      const displayBarPercentage = Math.min(percentage, 100);

      return (
        <View style={styles.macroNutrientRow}>
          <View style={styles.macroNutrientInfo}>
            <Text style={styles.macroNutrientLabel}>{label}</Text>
            <Text style={styles.macroNutrientGrams}>{grams.toFixed(1)}g</Text>
          </View>
          <View style={styles.macroProgressBarContainer}>
            <View
              style={[
                styles.macroProgressBarFill,
                { width: `${displayBarPercentage}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.macroNutrientPercent}>
            {Math.round(percentage)}%
          </Text>
        </View>
      );
    };

    const renderNutritionRow = (label: string, value: number, unit: string) => (
      <View style={styles.nutritionRow}>
        <Text style={styles.nutritionLabel}>{label}</Text>
        <View style={styles.nutritionValueContainer}>
          <Text style={styles.nutritionValue}>{value.toFixed(1)}</Text>
          <Text style={styles.nutritionUnit}>{unit}</Text>
        </View>
      </View>
    );

    return (
      <View style={styles.container}>
        {/* Unified Header */}
        <View style={styles.unifiedHeader}>
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
                  size={28}
                  color="#333333"
                />
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 15 }}>
                <Ionicons name="settings-outline" size={28} color="#333333" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerBottomRow}>
            <TouchableOpacity
              style={styles.headerBackAction}
              onPress={onRetake}
            >
              <Ionicons name="arrow-back" size={28} color="#333333" />
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>Nutrition Analysis</Text>
            <TouchableOpacity
              style={styles.headerActionIcon} 
              onPress={isEditing ? handleSaveEdits : handleStartEditing}
            >
              <Ionicons
                name={isEditing ? "checkmark-sharp" : "pencil-sharp"}
                size={28}
                color="#333333"
              />
            </TouchableOpacity>
          </View>
        </View>

        {imageDataUri && (
          <View style={styles.imageDisplayContainer}>
            <Image
              source={{ uri: imageDataUri }}
              style={styles.displayedImage}
            />
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* --- Confidence Section --- */}
          <View style={styles.confidenceSectionCard}>
            <Text style={styles.confidenceSectionTitle}>Analysis Quality</Text>

            {/* Overall Recognition Confidence */}
            <View style={styles.confidenceItemRow}>
              <Ionicons
                name="ribbon-outline"
                size={20}
                color="#4A4A4A"
                style={styles.confidenceIcon}
              />
              <Text style={styles.confidenceItemLabel}>Overall Confidence</Text>
              <View style={styles.confidenceBarContainer}>
                <View
                  style={[
                    styles.confidenceBar,
                    {
                      width: `${displayResult.recognitionConfidence * 100}%`,
                      backgroundColor: getConfidenceColor(
                        displayResult.recognitionConfidence
                      ),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.confidenceItemValue,
                  {
                    color: getConfidenceColor(
                      displayResult.recognitionConfidence
                    ),
                  },
                ]}
              >
                {Math.round(displayResult.recognitionConfidence * 100)}%
              </Text>
            </View>

            {/* Image Quality */}
            <View style={styles.confidenceItemRow}>
              <Ionicons
                name="image-outline"
                size={20}
                color="#4A4A4A"
                style={styles.confidenceIcon}
              />
              <Text style={styles.confidenceItemLabel}>Image Quality</Text>
              <View style={styles.confidenceBarContainer}>
                <View
                  style={[
                    styles.confidenceBar,
                    {
                      width: `${displayResult.imageQuality.overall * 100}%`,
                      backgroundColor: getConfidenceColor(
                        displayResult.imageQuality.overall
                      ),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.confidenceItemValue,
                  {
                    color: getConfidenceColor(
                      displayResult.imageQuality.overall
                    ),
                  },
                ]}
              >
                {Math.round(displayResult.imageQuality.overall * 100)}%
              </Text>
            </View>
            <Text style={styles.imageQualityDetailText}>
              (Clarity: {Math.round(displayResult.imageQuality.clarity * 100)}%
              • Lighting:{" "}
              {Math.round(displayResult.imageQuality.lighting * 100)}%)
            </Text>

            {/* Detailed Confidence Metrics */}
            <View style={styles.detailedMetricsContainer}>
              <View style={styles.metricPill}>
                <Ionicons
                  name={getConfidenceIcon(
                    displayResult.confidenceMetrics.foodIdentification
                  )}
                  size={16}
                  color={getConfidenceColor(
                    displayResult.confidenceMetrics.foodIdentification
                  )}
                />
                <Text style={styles.metricPillText}>
                  Food ID:{" "}
                  {Math.round(
                    displayResult.confidenceMetrics.foodIdentification * 100
                  )}
                  %
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Ionicons
                  name={getConfidenceIcon(
                    displayResult.confidenceMetrics.ingredientAccuracy
                  )}
                  size={16}
                  color={getConfidenceColor(
                    displayResult.confidenceMetrics.ingredientAccuracy
                  )}
                />
                <Text style={styles.metricPillText}>
                  Ingredients:{" "}
                  {Math.round(
                    displayResult.confidenceMetrics.ingredientAccuracy * 100
                  )}
                  %
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Ionicons
                  name={getConfidenceIcon(
                    displayResult.confidenceMetrics.portionEstimation
                  )}
                  size={16}
                  color={getConfidenceColor(
                    displayResult.confidenceMetrics.portionEstimation
                  )}
                />
                <Text style={styles.metricPillText}>
                  Portion:{" "}
                  {Math.round(
                    displayResult.confidenceMetrics.portionEstimation * 100
                  )}
                  %
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Ionicons
                  name={getConfidenceIcon(
                    displayResult.confidenceMetrics.nutritionCalculation
                  )}
                  size={16}
                  color={getConfidenceColor(
                    displayResult.confidenceMetrics.nutritionCalculation
                  )}
                />
                <Text style={styles.metricPillText}>
                  Nutrition:{" "}
                  {Math.round(
                    displayResult.confidenceMetrics.nutritionCalculation * 100
                  )}
                  %
                </Text>
              </View>
            </View>
          </View>

          {/* --- Detected Foods Section --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Foods</Text>
            {displayResult.foods.map((food, index) => {
              const currentFood = food as EditableFoodItem;
              const foodConfidenceColor = getConfidenceColor(
                currentFood.confidence
              );

              let portionDisplayText = currentFood.estimatedPortion;
              if (
                !isEditing &&
                currentFood.name &&
                currentFood.estimatedPortion
              ) {
                // Prepare a regex to remove the food name from the beginning of the portion string, case-insensitively.
                // This handles cases where estimatedPortion might be like "Food Name, actual portion details..."
                // It escapes special characters in currentFood.name to ensure it's treated as a literal string in the regex.
                const escapedName = currentFood.name.replace(
                  /[.*+?^${}()|[\]\\\\]/g,
                  "\\\\$&"
                );
                const namePattern = new RegExp(
                  `^${escapedName}[,\\\\s-]*`,
                  "i"
                );
                portionDisplayText = currentFood.estimatedPortion.replace(
                  namePattern,
                  ""
                );
              }

              return (
                <View key={index} style={styles.foodItem}>
                  <View style={styles.foodItemHeader}>
                    {isEditing ? (
                      <TextInput
                        style={styles.foodInputName}
                        value={currentFood.name}
                        onChangeText={(text) => updateFoodItemName(index, text)}
                        placeholder="Food name"
                      />
                    ) : (
                      <Text style={styles.foodName}>{currentFood.name}</Text>
                    )}
                    {!isEditing && (
                      <View style={styles.foodItemConfidenceBadge}>
                        <Ionicons
                          name={getConfidenceIcon(currentFood.confidence)}
                          size={16}
                          color={foodConfidenceColor}
                        />
                        <Text
                          style={[
                            styles.foodItemConfidenceText,
                            { color: foodConfidenceColor },
                          ]}
                        >
                          {Math.round(currentFood.confidence * 100)}%
                        </Text>
                      </View>
                    )}
                    {isEditing && (
                      <TouchableOpacity
                        onPress={() => handleDeleteFoodItem(index)}
                        style={styles.deleteItemButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={22}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {isEditing ? (
                    <>
                      {/* Portion Editing UI */}
                      <View style={styles.portionEditContainer}>
                        <Text style={styles.portionDescriptionText}>
                          {currentFood.portionTemplate?.split("%%VALUE%%")[0]}
                        </Text>
                        <TextInput
                          style={styles.foodInputGrams} 
                          value={currentFood.gramValueStr || ""}
                          onChangeText={(text) => {
                            setEditedResult((prev) => ({
                              ...prev!,
                              foods: prev!.foods.map((f, i) =>
                                i === index ? { ...f, gramValueStr: text } : f
                              ),
                            }));
                            if (
                              currentFood.portionTemplate &&
                              currentFood.unit
                            ) {
                              const reconstructedPortion =
                                currentFood.portionTemplate.replace(
                                  "%%VALUE%%",
                                  text
                                );
                              handlePortionChange(index, reconstructedPortion);
                            }
                          }}
                          placeholder={currentFood.unit || "value"} 
                          keyboardType="numeric"
                          selectTextOnFocus
                        />
                        <Text style={styles.portionDescriptionText}>
                          {currentFood.portionTemplate?.split("%%VALUE%%")[1]}
                        </Text>
                      </View>

                      {/* Manual Nutrition Editing for Manually Added Items */}
                      {currentFood.isManuallyAdded && (
                        <View style={styles.manualNutritionEditContainer}>
                          <Text style={styles.manualNutritionLabel}>
                            Nutrition per serving:
                          </Text>

                          <View style={styles.manualNutritionInputRow}>
                            <Text style={styles.manualNutritionLabel}>
                              Calories:
                            </Text>
                            <TextInput
                              style={styles.manualNutritionInput}
                              value={
                                currentFood.nutrition?.calories?.toString() ||
                                "0"
                              }
                              onChangeText={(text) =>
                                handleNutritionValueChange(
                                  index,
                                  "calories",
                                  text
                                )
                              }
                              placeholder="0"
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                          </View>

                          <View style={styles.manualNutritionInputRow}>
                            <Text style={styles.manualNutritionLabel}>
                              Fat (g):
                            </Text>
                            <TextInput
                              style={styles.manualNutritionInput}
                              value={
                                currentFood.nutrition?.fat?.toString() || "0"
                              }
                              onChangeText={(text) =>
                                handleNutritionValueChange(index, "fat", text)
                              }
                              placeholder="0"
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                          </View>

                          <View style={styles.manualNutritionInputRow}>
                            <Text style={styles.manualNutritionLabel}>
                              Protein (g):
                            </Text>
                            <TextInput
                              style={styles.manualNutritionInput}
                              value={
                                currentFood.nutrition?.protein?.toString() ||
                                "0"
                              }
                              onChangeText={(text) =>
                                handleNutritionValueChange(
                                  index,
                                  "protein",
                                  text
                                )
                              }
                              placeholder="0"
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                          </View>

                          <View style={styles.manualNutritionInputRow}>
                            <Text style={styles.manualNutritionLabel}>
                              Carbs (g):
                            </Text>
                            <TextInput
                              style={styles.manualNutritionInput}
                              value={
                                currentFood.nutrition?.carbs?.toString() || "0"
                              }
                              onChangeText={(text) =>
                                handleNutritionValueChange(index, "carbs", text)
                              }
                              placeholder="0"
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={styles.foodPortion}>
                        {(() => {
                          let portionDisplayText = currentFood.estimatedPortion;
                          if (
                            currentFood.estimatedPortion &&
                            currentFood.name &&
                            currentFood.estimatedPortion
                              .toLowerCase()
                              .startsWith(currentFood.name.toLowerCase() + " ")
                          ) {
                            portionDisplayText =
                              currentFood.estimatedPortion.substring(
                                currentFood.name.length + 1 // +1 for the space
                              );
                          } else if (
                            currentFood.estimatedPortion &&
                            currentFood.name &&
                            currentFood.estimatedPortion
                              .toLowerCase()
                              .startsWith(currentFood.name.toLowerCase()) &&
                            !currentFood.estimatedPortion
                              .substring(currentFood.name.length)
                              .trim()
                              .startsWith("(") // Avoid stripping if it's like "Apple(slice)"
                          ) {
                            // Check if the character immediately after the name is not a letter,
                            // to avoid cases like "Apple" and "Apple Pie" if "Apple" is the name.
                            const charAfterName =
                              currentFood.estimatedPortion.charAt(
                                currentFood.name.length
                              );
                            if (
                              charAfterName === "" ||
                              !charAfterName.match(/[a-z]/i)
                            ) {
                              portionDisplayText = currentFood.estimatedPortion
                                .substring(currentFood.name.length)
                                .trim();
                            }
                          }
                          // Capitalize the first letter of the cleaned portion text
                          return (
                            portionDisplayText.charAt(0).toUpperCase() +
                            portionDisplayText.slice(1)
                          );
                        })()}
                      </Text>
                    </>
                  )}
                  {currentFood.nutrition && (
                    <Text style={styles.foodItemNutritionText}>
                      {`(${currentFood.nutrition.calories.toFixed(
                        0
                      )} cal, ${currentFood.nutrition.fat.toFixed(
                        1
                      )}g F, ${currentFood.nutrition.protein.toFixed(
                        1
                      )}g P, ${currentFood.nutrition.carbs.toFixed(1)}g C)`}
                    </Text>
                  )}
                </View>
              );
            })}
            {isEditing && (
              <TouchableOpacity
                style={styles.addIngredientButton}
                onPress={handleAddNewFoodItem}
              >
                <Ionicons name="add-circle-outline" size={22} color="#007AFF" />
                <Text style={styles.addIngredientButtonText}>
                  Add Ingredient
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Nutrition Facts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total Nutrition per Serving</Text>
            <View style={styles.nutritionContainer}>
              {/* Prominent Calories */}
              <View style={styles.totalCaloriesSection}>
                <Text style={styles.totalCaloriesLabel}>Calories</Text>
                <Text style={styles.totalCaloriesValue}>
                  {displayResult.nutritionPerServing.calories.toFixed(0)}
                </Text>
              </View>

              {/* Macronutrient Visualizers */}
              <MacroNutrientVisualizer
                label="Fat"
                grams={displayResult.nutritionPerServing.fat}
                caloriesFromMacro={displayResult.nutritionPerServing.fat * 9}
                totalCalories={displayResult.nutritionPerServing.calories}
                color="#FF6384" // Fat color
              />
              <MacroNutrientVisualizer
                label="Protein"
                grams={displayResult.nutritionPerServing.protein}
                caloriesFromMacro={
                  displayResult.nutritionPerServing.protein * 4
                }
                totalCalories={displayResult.nutritionPerServing.calories}
                color="#36A2EB" // Protein color
              />
              <MacroNutrientVisualizer
                label="Carbs"
                grams={displayResult.nutritionPerServing.carbs}
                caloriesFromMacro={displayResult.nutritionPerServing.carbs * 4}
                totalCalories={displayResult.nutritionPerServing.calories}
                color="#FFCE56" // Carbs color
              />

              {/* Other Nutrients (unchanged rendering) */}
              <View style={styles.otherNutrientsDivider} />
              {renderNutritionRow(
                "Fiber",
                displayResult.nutritionPerServing.fiber,
                "g"
              )}
              {renderNutritionRow(
                "Sugar",
                displayResult.nutritionPerServing.sugar,
                "g"
              )}
              {renderNutritionRow(
                "Sodium",
                displayResult.nutritionPerServing.sodium,
                "mg"
              )}
            </View>
          </View>
          {/* Notes */}
          {displayResult.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notes}>{displayResult.notes}</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {isEditing ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdits}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdits}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={onSave}>
              <Ionicons name="add" size={20} color="#FCCF94" />
              <Text style={styles.addButtonText}>Add </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4E4C3", 
  },
  // Unified Header Styles 
  unifiedHeader: {
    backgroundColor: "#88A76C", 
    paddingTop: 30, 
    paddingBottom: 10,
    paddingHorizontal: 15,
    // borderBottomLeftRadius: 20,
    // borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10, 
  },
  headerLogo: {
    width: 60, 
    height: 60, 
    resizeMode: "contain",
  },
  headerAppName: {
    fontSize: 40, 
    fontWeight: "bold",
    color: "#000", 
    fontFamily: "System", 
  },
  headerIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
  },
  headerBackAction: {
    // Container for back arrow and potentially text
    flexDirection: "row",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000", 
    textAlign: "center",
    flex: 1,
    marginLeft: 10, 
  },
  headerActionIcon: {
    // Style for icons on the right in the bottom row (like edit/save)
    padding: 5, 
  },
  // End of Unified Header Styles

  imageDisplayContainer: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#FCCF94", 
    borderRadius: 15,
    padding: 10,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 3,
  },
  displayedImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  confidenceSectionCard: {
    backgroundColor: "#FCCF94", // Lemon Chiffon (light yellow/orange)
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confidenceSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E4A31", 
    marginBottom: 10,
  },
  confidenceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  confidenceIcon: {
    marginRight: 10,
  },
  confidenceItemLabel: {
    fontSize: 15,
    color: "#2E4A31", //
    flex: 1,
  },
  confidenceBarContainer: {
    height: 10,
    width: 80,
    backgroundColor: "#F0FFF0", 
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  confidenceBar: {
    height: "100%",
    borderRadius: 5,
  },
  confidenceItemValue: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  imageQualityDetailText: {
    fontSize: 13,
    color: "#2E4A31", 
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
  },
  detailedMetricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 5,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF0", 
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    margin: 4,
  },
  metricPillText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#2E4A31", 
  },
  section: {
    backgroundColor: "#FCCF94", 
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E4A31", 
    marginBottom: 12,
  },
  
  foodItem: {
    backgroundColor: "#FFFACD", 
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3.0,
    elevation: 4,
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  foodInputName: {
    
    flex: 1,
    backgroundColor: "#FFFAF0", 
    borderWidth: 1,
    borderColor: "#BDB76B", 
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: "#2E4A31", 
    marginRight: 10, 
    fontWeight: "500",
  },
  foodName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2E4A31", 
    flex: 1, 
  },
  foodItemConfidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F0FFF0", 
    marginLeft: 10,
  },
  foodItemConfidenceText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  deleteItemButton: {
    padding: 5,
  },
  portionEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  portionDescriptionText: {
    fontSize: 14,
    color: "#2E4A31", 
  },
  foodInputGrams: {
    
    backgroundColor: "#FFFAF0", 
    borderWidth: 1,
    borderColor: "#BDB76B", 
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: "#2E4A31", 
    marginHorizontal: 5,
    minWidth: 50,
    textAlign: "center",
  },
  manualNutritionEditContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE8AA", 
  },
  manualNutritionLabel: {
    fontSize: 14,
    color: "#2E4A31", 
    marginBottom: 3,
  },
  manualNutritionInput: {
    
    backgroundColor: "#FFFAF0", 
    borderWidth: 1,
    borderColor: "#BDB76B", 
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#2E4A31", 
    flex: 0.5, 
  },
  foodPortion: {
    fontSize: 14,
    color: "#2E4A31", 
    marginTop: 4,
  },
  foodItemNutritionText: {
    fontSize: 13,
    color: "#2E4A31", 
    marginTop: 4,
    fontStyle: "italic",
  },
  addIngredientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: "#F0FFF0", 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6B8E23", 
  },
  addIngredientButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#2E4A31", 
  },
  nutritionContainer: {
    
  },
  totalCaloriesSection: {
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFACD", 
    marginBottom: 15,
  },
  totalCaloriesLabel: {
    fontSize: 16,
    color: "#2E4A31", 
  },
  totalCaloriesValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2E4A31", 
    marginTop: 5,
  },
  macroNutrientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  macroNutrientInfo: {
    width: 90,
    flexDirection: "row",
    justifyContent: "space-between",
    marginRight: 10,
  },
  macroNutrientLabel: {
    fontSize: 14,
    color: "#2E4A31", 
  },
  macroNutrientGrams: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2E4A31", 
  },
  macroProgressBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: "#E8F5E9", 
    borderRadius: 5,
    overflow: "hidden",
  },
  macroProgressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  macroNutrientPercent: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2E4A31", 
    marginLeft: 10,
    width: 35,
    textAlign: "right",
  },
  otherNutrientsDivider: {
    height: 1,
    backgroundColor: "#EEE8AA", 
    marginVertical: 15,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E68C", 
  },
  nutritionLabel: {
    fontSize: 15,
    color: "#2E4A31", 
  },
  nutritionValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#2E4A31", 
  },
  nutritionUnit: {
    fontSize: 13,
    color: "#2E4A31", 
    marginLeft: 3,
  },
  notes: {
    fontSize: 15,
    color: "#2E4A31", 
    lineHeight: 22,
    fontStyle: "italic",
  },
  footer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#88A76C", 
    borderTopWidth: 1,
    borderTopColor: "#88A76C",
    paddingBottom: 20, 
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addButton: {
    backgroundColor: "#2E4A31",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  addButtonText: {
    color: "#FCCF94", //
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: "#2E4A31", 
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    marginRight: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  saveButtonText: {
    color: "#FCCF94",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#FCCF94", 
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#FCCF94", 
  },
  cancelButtonText: {
    color: "#2E4A31", 
    fontSize: 16,
    fontWeight: "bold",
  },
  editingFoodItemCard: {
    backgroundColor: "#FFFACD", 
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#6B8E23", 
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#2E4A31", 
    marginBottom: 3,
    marginTop: 8,
  },
  textInput: {
    
    backgroundColor: "#FFFAF0", 
    borderWidth: 1,
    borderColor: "#BDB76B", 
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#2E4A31", 
    marginBottom: 8,
  },
  portionInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  portionValueInput: {
    
    flex: 1,
    marginRight: 8,
    backgroundColor: "#FFFAF0",
    borderWidth: 1,
    borderColor: "#BDB76B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#2E4A31",
  },
  portionUnitText: {
    fontSize: 15,
    color: "#2E4A31", 
  },
  deleteIconContainer: {
    padding: 8,
  },
  nutritionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  nutritionInputLabel: {
    fontSize: 15,
    color: "#2E4A31", 
    flex: 0.4,
  },
  nutritionInputField: {
    
    flex: 0.6,
    backgroundColor: "#FFFAF0",
    borderWidth: 1,
    borderColor: "#BDB76B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#2E4A31",
  },
  manualNutritionInputRow: {
    
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    marginBottom: 8,
  },
});
