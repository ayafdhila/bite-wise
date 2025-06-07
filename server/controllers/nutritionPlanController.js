const { firebaseInstances } = require('../config/firebase');

const admin = firebaseInstances.admin;
const db = firebaseInstances.db;

function checkNutritionPlanFirebaseInitialized(res) {
    if (!admin || !db) {
        console.error("FATAL: Firebase Admin/DB not initialized when trying to access nutrition plan routes.");
        res.status(500).json({ error: "Server configuration error (Nutrition Plan). Please try again later." });
        return false;
    }
    return true;
}

// 🔍 New: Fiber calculator based on age and gender
function calculerFibresRecommandees(age, sexe) {
  if (age >= 50) {
    return sexe === 'Female'
      ? { min: 21, max: 25, recommended: 22 }
      : { min: 28, max: 30, recommended: 28 };
  } else {
    return sexe === 'Female'
      ? { min: 21, max: 25, recommended: 25 }
      : { min: 30, max: 38, recommended: 32 };
  }
}

const calculateNutritionPlan = (userData) => {
  if (
    !userData || typeof userData.weight !== 'number' || typeof userData.height !== 'number' ||
    typeof userData.age !== 'number' || !userData.gender || !userData.activityLevel || !userData.goal
  ) {
    console.error("Cannot calculate nutrition plan: Missing or invalid user data fields.", {
      weight: userData?.weight, height: userData?.height, age: userData?.age,
      gender: userData?.gender, activityLevel: userData?.activityLevel, goal: userData?.goal
    });
    return null;
  }

  const heightCm = userData.height;
  const bmr = userData.gender.toLowerCase() === 'male'
    ? (10 * userData.weight) + (6.25 * heightCm) - (5 * userData.age) + 5
    : (10 * userData.weight) + (6.25 * heightCm) - (5 * userData.age) - 161;

  const activityMap = {
    "Mostly Sitting 🪑": 1.2,
    "Lightly Active 🚶": 1.375,
    "Active Lifestyle 🚴": 1.725,
    "Highly Active 💪": 1.9
  };
  const activityFactor = activityMap[userData.activityLevel] || 1.375;
  const tdee = bmr * activityFactor;

  let calories;
  switch (userData.goal) {
    case "Losing Weight":
      calories = tdee - 500;
      break;
    case "Gaining Weight":
      calories = tdee + 300;
      break;
    default:
      calories = tdee;
  }

  calories = Math.max(calories, 1200);
  const proteinGramsPerKg = userData.goal === "Gaining Weight" ? 1.8 : 1.6;
  const proteinGoal = Math.round(userData.weight * proteinGramsPerKg);
  const proteinCalories = proteinGoal * 4;
  const fatCalories = calories * 0.3;
  const fatGoal = Math.round(fatCalories / 9);
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbsGoal = Math.round(carbCalories / 4);

  // 🆕 Fiber logic
  const fiber = calculerFibresRecommandees(userData.age, userData.gender);

  return {
    calories: Math.round(calories),
    protein: proteinGoal,
    carbs: carbsGoal,
    fat: fatGoal,
    fiber
  };
};

const saveNutritionPlan = async (req, res) => {
  if (!checkNutritionPlanFirebaseInitialized(res)) return;

  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required in the URL path." });

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const userData = userDoc.data();
    const nutritionPlan = calculateNutritionPlan(userData);
    if (!nutritionPlan) return res.status(400).json({ error: "Cannot calculate plan, user profile data is incomplete." });

    const planToSave = {
      ...nutritionPlan,
      fiberGoal: `${nutritionPlan.fiber.min}-${nutritionPlan.fiber.max}g`
    };

    await userRef.update({
      nutritionPlan: planToSave,
      nutritionPlanLastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      message: "Nutrition plan saved successfully",
      nutritionPlan: planToSave
    });

  } catch (error) {
    console.error(`Error saving nutrition plan for user ${req.params.uid}:`, error);
    res.status(500).json({ error: "Internal server error while saving nutrition plan", details: error.message });
  }
};

const getNutritionPlan = async (req, res) => {
  if (!checkNutritionPlanFirebaseInitialized(res)) return;

  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required in the URL path." });

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const userData = userDoc.data();
    if (!userData.nutritionPlan) return res.status(404).json({ error: "Nutrition plan not yet calculated." });

    res.status(200).json({
      success: true,
      nutritionPlan: userData.nutritionPlan
    });

  } catch (error) {
    console.error(`Error fetching nutrition plan for user ${req.params.uid}:`, error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

module.exports = {
  saveNutritionPlan,
  getNutritionPlan,
  calculateNutritionPlan
};
