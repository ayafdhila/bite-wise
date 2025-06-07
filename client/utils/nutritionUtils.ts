import type { FoodItem, NutritionData } from "@/types/domain";

/**
 * Parses a portion string to extract a quantity in grams.
 * Supports:
 * - "NUMBERg" (e.g., "100g")
 * - "NUMBER g" (e.g., "150 g")
 * - Values in parentheses like "TEXT (NUMBERg)" (e.g., "1 apple (180g)")
 * Uses a regex that prioritizes grams in parentheses if present.
 * @param portionString The string describing the portion.
 * @returns The quantity in grams, or null if not parsable to a valid number of grams.
 */
export const parsePortionToGrams = (portionString: string): number | null => {
  if (!portionString) return null;

  // Regex to find number followed by 'g' or 'ml', possibly in parentheses.
  // Prioritizes match in parentheses.
  // If parenthesized part matches:
  //   match[1] = value_and_unit_inside_parens (e.g., "50ml")
  //   match[2] = numeric_value_inside_parens (e.g., "50")
  //   match[3] = unit_inside_parens (e.g., "ml")
  // If non-parenthesized part matches:
  //   match[4] = value_and_unit_outside_parens (e.g., "100g")
  //   match[5] = numeric_value_outside_parens (e.g., "100")
  //   match[6] = unit_outside_parens (e.g., "g")
  const regex =
    /(?:\((?:[^)]*?)?((\d+(?:\.\d+)?)\s*(g|ml))\))|(?:(?:^|[^\w])((\d+(?:\.\d+)?)\s*(g|ml))(?:$|\W))/i;
  const match = portionString.match(regex);

  if (match) {
    // Corrected group indexing:
    // valueStr should be from group 2 (parenthesized) or group 5 (non-parenthesized)
    // unit should be from group 3 (parenthesized) or group 6 (non-parenthesized)
    const valueStr = match[2] || match[5]; // Numeric part
    const unit = match[3] || match[6]; // Unit (g or ml)

    if (valueStr && unit) {
      const value = parseFloat(valueStr);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
  }
  return null;
};

/**
 * Recalculates the nutrition data for a food item based on a new portion size.
 * @param originalItemNutrition The original nutrition data for the item.
 * @param originalPortionGrams The original portion in grams (must be > 0).
 * @param newPortionGrams The new portion in grams (must be >= 0).
 * @returns Recalculated NutritionData. Returns a zeroed nutrition profile if inputs are invalid for scaling (e.g., originalPortionGrams <= 0, newPortionGrams < 0).
 */
export const scaleNutritionData = (
  originalItemNutrition: NutritionData,
  originalPortionGrams: number,
  newPortionGrams: number
): NutritionData => {
  const zeroNutrition: NutritionData = {
    calories: 0,
    fat: 0,
    protein: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  if (!originalItemNutrition) return zeroNutrition;
  if (originalPortionGrams <= 0 || newPortionGrams < 0) {
    return zeroNutrition; // Cannot scale if original portion is not positive or new portion is negative
  }
  if (newPortionGrams === 0) {
    return zeroNutrition; // If new portion is zero, all nutrients are zero
  }

  const scaleFactor = newPortionGrams / originalPortionGrams;

  const scaledNutrition: NutritionData = {} as NutritionData;
  for (const key in originalItemNutrition) {
    const K = key as keyof NutritionData;
    scaledNutrition[K] = (originalItemNutrition[K] || 0) * scaleFactor;
  }
  return scaledNutrition;
};

/**
 * Calculates the total nutrition from a list of food items.
 * @param foodItems Array of FoodItem.
 * @returns Total NutritionData.
 */
export const calculateTotalNutrition = (
  foodItems: FoodItem[]
): NutritionData => {
  const total: NutritionData = {
    calories: 0,
    fat: 0,
    protein: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };
  foodItems.forEach((item) => {
    if (item.nutrition) {
      total.calories += item.nutrition.calories || 0;
      total.fat += item.nutrition.fat || 0;
      total.protein += item.nutrition.protein || 0;
      total.carbs += item.nutrition.carbs || 0;
      total.fiber += item.nutrition.fiber || 0;
      total.sugar += item.nutrition.sugar || 0;
      total.sodium += item.nutrition.sodium || 0;
    }
  });
  return total;
};

/**
 * Splits a portion string into a description template and a gram value for editing.
 * Example: "1 apple (approx. 180g)" -> { descriptionTemplate: "1 apple (approx. %%GRAMS%%g)", gramValue: "180" }
 * Example: "150g" -> { descriptionTemplate: "%%GRAMS%%g", gramValue: "150" }
 * Example: "Banana" -> { descriptionTemplate: "Banana", gramValue: "" } (user can add grams)
 * @param portionString The portion string.
 * @returns An object with descriptionTemplate and gramValue.
 */
export const splitPortionForEditing = (
  portionString: string
): { descriptionTemplate: string; gramValue: string; unit: string } => {
  const defaultUnit = "g";
  if (!portionString || portionString.trim() === "") {
    return {
      descriptionTemplate: `%%VALUE%%${defaultUnit}`,
      gramValue: "",
      unit: defaultUnit,
    };
  }

  // Regex to find a number followed by 'g' or 'ml', prioritizing parenthesized versions.
  // Captures:
  // 1. Full match within parens, including surrounding text like "approx. 180g"
  // 2. The value with unit from inside parens (e.g., "180g" or "50ml")
  // 3. The numeric value from inside parens (e.g., "180" or "50")
  // 4. The unit from inside parens (e.g., "g" or "ml")
  // 5. Full match outside parens (e.g., "150g" or "100ml")
  // 6. The numeric value from outside parens (e.g., "150" or "100")
  // 7. The unit from outside parens (e.g., "g" or "ml")
  const valueAndUnitRegex =
    /(?:\(([^)]*?((\d+(?:\.\d+)?)\s*(g|ml))[^)]*?)\))|(?:(?:^|[^\w])((\d+(?:\.\d+)?)\s*(g|ml))(?:$|\W))/i;
  const match = portionString.match(valueAndUnitRegex);

  if (match) {
    const numericValue = match[3] || match[6] || "";
    const unit = match[4] || match[7] || defaultUnit;
    const expressionToReplace = match[2] || match[5]; // e.g., "180g" or "50ml"

    if (expressionToReplace) {
      const template = portionString.replace(
        expressionToReplace,
        `%%VALUE%%${unit}`
      );
      return { descriptionTemplate: template, gramValue: numericValue, unit };
    }
  }

  // Fallback if no g/ml unit was found with a number, but %%VALUE%% might exist from a previous edit
  if (portionString.includes("%%VALUE%%")) {
    // Try to determine unit if it trails %%VALUE%%
    const placeholderMatch = portionString.match(/%%VALUE%%(g|ml)/i);
    const existingUnit = placeholderMatch ? placeholderMatch[1] : defaultUnit;
    return {
      descriptionTemplate: portionString,
      gramValue: "",
      unit: existingUnit,
    };
  }

  // Fallback: if string ends with a parenthesis, insert placeholder before it.
  const lastParenCloseIndex = portionString.lastIndexOf(")");
  if (
    lastParenCloseIndex > -1 &&
    portionString.lastIndexOf("(") < lastParenCloseIndex
  ) {
    return {
      descriptionTemplate: `${portionString.substring(
        0,
        lastParenCloseIndex
      )} %%VALUE%%${defaultUnit})${portionString.substring(
        lastParenCloseIndex + 1
      )}`,
      gramValue: "",
      unit: defaultUnit,
    };
  }

  // Default fallback: append placeholder and default unit in parentheses
  return {
    descriptionTemplate: `${portionString} (%%VALUE%%${defaultUnit})`,
    gramValue: "",
    unit: defaultUnit,
  };
};
