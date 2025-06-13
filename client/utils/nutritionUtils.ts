import type { FoodItem, NutritionData } from "@/types/domain";
export const parsePortionToGrams = (portionString: string): number | null => {
  if (!portionString) return null;

  const regex =
    /(?:\((?:[^)]*?)?((\d+(?:\.\d+)?)\s*(g|ml))\))|(?:(?:^|[^\w])((\d+(?:\.\d+)?)\s*(g|ml))(?:$|\W))/i;
  const match = portionString.match(regex);

  if (match) {
    const valueStr = match[2] || match[5]; 
    const unit = match[3] || match[6]; 

    if (valueStr && unit) {
      const value = parseFloat(valueStr);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
  }
  return null;
};
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
    return zeroNutrition;
  }
  if (newPortionGrams === 0) {
    return zeroNutrition; 
  }

  const scaleFactor = newPortionGrams / originalPortionGrams;

  const scaledNutrition: NutritionData = {} as NutritionData;
  for (const key in originalItemNutrition) {
    const K = key as keyof NutritionData;
    scaledNutrition[K] = (originalItemNutrition[K] || 0) * scaleFactor;
  }
  return scaledNutrition;
};
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
  const valueAndUnitRegex =
    /(?:\(([^)]*?((\d+(?:\.\d+)?)\s*(g|ml))[^)]*?)\))|(?:(?:^|[^\w])((\d+(?:\.\d+)?)\s*(g|ml))(?:$|\W))/i;
  const match = portionString.match(valueAndUnitRegex);

  if (match) {
    const numericValue = match[3] || match[6] || "";
    const unit = match[4] || match[7] || defaultUnit;
    const expressionToReplace = match[2] || match[5]; 

    if (expressionToReplace) {
      const template = portionString.replace(
        expressionToReplace,
        `%%VALUE%%${unit}`
      );
      return { descriptionTemplate: template, gramValue: numericValue, unit };
    }
  }


  if (portionString.includes("%%VALUE%%")) {
    const placeholderMatch = portionString.match(/%%VALUE%%(g|ml)/i);
    const existingUnit = placeholderMatch ? placeholderMatch[1] : defaultUnit;
    return {
      descriptionTemplate: portionString,
      gramValue: "",
      unit: existingUnit,
    };
  }

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

  return {
    descriptionTemplate: `${portionString} (%%VALUE%%${defaultUnit})`,
    gramValue: "",
    unit: defaultUnit,
  };
};
