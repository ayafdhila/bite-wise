const { firebaseInstances } = require('../config/firebase');
const admin = firebaseInstances.admin;
const db = firebaseInstances.db;
const FieldValue = admin.firestore.FieldValue; // Make sure FieldValue is properly available

function checkFirebaseReady(res) {
    if (!admin || !db) {
        const missing = [!admin && "Admin", !db && "DB"].filter(Boolean).join(', ');
        console.error(`Firebase service(s) not initialized when trying to access logMeal routes: ${missing}`);
        if (!res.headersSent) { // Add check to prevent multiple responses
            res.status(500).json({ error: "Server configuration error (Log Meal). Please try again later." });
        }
        return false;
    }
    return true;
}
const logMeal = async (req, res) => {
    if (!checkFirebaseReady(res)) return;

    try {
        const {
            uid, source, date, mealType, recipeId,
            title, calories, protein, carbs, fat, fiber, imageUrl
        } = req.body;

        // --- Validation (Your existing validation) ---
        let errors = [];
        if (!uid) errors.push("User ID (uid) is required.");
        if (!mealType) errors.push("Meal Type is required.");
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push("Valid Date (YYYY-MM-DD) is required.");
        if (!title) errors.push("Title is required.");
        // Check for valid numbers for nutrients
        if (calories === undefined || isNaN(Number(calories))) errors.push("Calories must be a number.");
        if (protein === undefined || isNaN(Number(protein))) errors.push("Protein must be a number.");
        if (carbs === undefined || isNaN(Number(carbs))) errors.push("Carbs must be a number.");
        if (fat === undefined || isNaN(Number(fat))) errors.push("Fat must be a number.");
        if (fiber === undefined || isNaN(Number(fiber))) errors.push("Fiber must be a number.");

        const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        if (mealType && !validMealTypes.includes(mealType.toLowerCase())) {
            errors.push(`Invalid meal type. Must be one of: ${validMealTypes.join(', ')}.`);
        }
        if (errors.length > 0) {
            console.warn("Log Meal Validation Failed:", errors);
            return res.status(400).json({ error: "Validation failed", details: errors });
        }
        // --- End Validation ---

        const mealTypeLower = mealType.toLowerCase();
        const numCalories = Number(calories) || 0;
        const numProtein = Number(protein) || 0;
        const numCarbs = Number(carbs) || 0;
        const numFat = Number(fat) || 0;
        const numFiber = Number(fiber) || 0;

        // --- Use new Date() for logTimestamp in arrayUnion ---
        const mealDataToAdd = {
            logTimestamp: new Date(), // <<<--- Use standard JS Date for array elements
            source: source,
            recipeId: recipeId || null,
            title: String(title),
            calories: numCalories,
            protein: numProtein,
            carbs: numCarbs,
            fat: numFat,
            fiber: numFiber,
            imageUrl: imageUrl || null
        };

        const userRef = db.collection('users').doc(uid); // User document reference
        const dailyLogRef = userRef.collection('dailyConsumption').doc(date);

        // --- V V V --- ADDED: First Meal Ever Check --- V V V ---
        let isFirstMealEver = false;
        // Get the user document *before* the transaction to check the flag
        const userDocSnap = await userRef.get();
        if (userDocSnap.exists) {
            if (!userDocSnap.data().firstMealLoggedAt) { // If the flag field doesn't exist
                isFirstMealEver = true;
            }
        } else {
            // If the user document doesn't exist yet (e.g., if signup doesn't create it)
            // then this is definitely the first meal interaction.
            console.warn(`LogMeal: User document for ${uid} not found, assuming first meal.`);
            isFirstMealEver = true;
        }
        if(isFirstMealEver) console.log(`LogMeal: User ${uid} is determined to be logging their first meal ever.`);
        // --- ^ ^ ^ --- END ADDED CHECK --- ^ ^ ^ ---

        // --- Your existing transaction logic ---
        await db.runTransaction(async (transaction) => {
            const dailyLogDoc = await transaction.get(dailyLogRef); // Get daily log WITHIN transaction

            if (!dailyLogDoc.exists) {
                console.log(`Creating new daily log for ${uid} on ${date}`);
                transaction.set(dailyLogRef, {
                    dateString: date,
                    // Initialize totals WITH the current meal's values
                    totals: {
                        consumedCalories: numCalories,
                        consumedProtein: numProtein,
                        consumedCarbs: numCarbs,
                        consumedFat: numFat,
                        consumedFiber: numFiber
                    },
                    // Initialize meal arrays, adding the current meal to the correct type
                    breakfast: mealTypeLower === 'breakfast' ? [mealDataToAdd] : [],
                    lunch: mealTypeLower === 'lunch' ? [mealDataToAdd] : [],
                    dinner: mealTypeLower === 'dinner' ? [mealDataToAdd] : [],
                    snack: mealTypeLower === 'snack' ? [mealDataToAdd] : []
                });
            } else {
                console.log(`Updating existing daily log for ${uid} on ${date}`);
                transaction.update(dailyLogRef, {
                    // Update totals
                    [`totals.consumedCalories`]: FieldValue.increment(numCalories),
                    [`totals.consumedProtein`]: FieldValue.increment(numProtein),
                    [`totals.consumedCarbs`]: FieldValue.increment(numCarbs),
                    [`totals.consumedFat`]: FieldValue.increment(numFat),
                    [`totals.consumedFiber`]: FieldValue.increment(numFiber),
                    // Add meal to array
                    [mealTypeLower]: FieldValue.arrayUnion(mealDataToAdd)
                });
            }

            // --- V V V --- ADDED: Update user doc if it was the first meal --- V V V ---
            if (isFirstMealEver) {
                console.log(`LogMeal Transaction: Setting firstMealLoggedAt for user ${uid}.`);
                // Use set with merge:true to create the user doc if it doesn't exist
                // or add/update the field without overwriting other user data.
                transaction.set(userRef, {
                    firstMealLoggedAt: FieldValue.serverTimestamp() // Use server timestamp for this flag
                }, { merge: true });
            }
            // --- ^ ^ ^ --- END ADDED UPDATE --- ^ ^ ^ ---
        }); // End Transaction

        console.log(`Meal "${title}" logged successfully for user ${uid} on ${date} as ${mealTypeLower}`);
        // --- V V V --- ADDED: Return isFirstMealEver in response --- V V V ---
        res.status(200).json({
            message: "Meal logged successfully",
            isFirstMeal: isFirstMealEver // Send the flag back to the client
        });
        // --- ^ ^ ^ --- END ADDED --- ^ ^ ^ ---

    } catch (error) {
        console.error(`Error logging meal for user ${req.body?.uid} on date ${req.body?.date}:`, error);
        res.status(500).json({
             message: "Error logging meal to Firestore",
             error: error.message,
             // details: error.stack // Avoid sending full stack trace in production
            });
    }
};

const getCombinedDailyData = async (req, res) => {
    if (!checkFirebaseReady(res, "get combined daily data")) return;

    try {
        // UID should come from the authenticated user (req.user.uid)
        // But if your route passes it as a param AND you have middleware, it could be req.params.uid
        // Let's assume for now it's purely from req.params as per your provided snippet.
        // If your route is /logMeal/daily-data/:date and middleware adds req.user.uid, then use:
        // const uid = req.user?.uid;
        const { uid, date } = req.params; // Date is the specific day to fetch consumption for

        if (!uid || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: "Valid User ID and Date (YYYY-MM-DD) parameters are required." });
        }

        console.log(`CTRL: getCombinedDailyData for user ${uid}, date ${date}`);

        const userRef = db.collection('users').doc(uid);
        const todayLogRef = userRef.collection('dailyConsumption').doc(date);

        // Fetch user document (for nutritionPlan and streak) and today's consumption document
        // No need to fetch yesterdayDoc for streak calculation here anymore
        const [userDoc, todayDoc] = await Promise.all([
            userRef.get(),
            todayLogRef.get()
        ]);

        if (!userDoc.exists) {
            console.log(`CTRL: User not found: ${uid}`);
            return res.status(404).json({ error: "User not found" });
        }

        const userData = userDoc.data();
        // Provide defaults for nutritionPlan if not fully set or parts are missing
        const defaultPlanValues = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: { recommended: 0, min: 0, max: 0 }, fiberGoal: "0-0g", goal: '' };
        const nutritionPlan = { ...defaultPlanValues, ...(userData.nutritionPlan || {}) };
        // Ensure nested fiber object exists with defaults if not present in userData.nutritionPlan
        nutritionPlan.fiber = { ...defaultPlanValues.fiber, ...(nutritionPlan.fiber || {}) };


        let consumedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

        if (todayDoc.exists) {
            const todayData = todayDoc.data();
            // Provide defaults for consumed totals if any are missing
            consumedTotals = {
                calories: todayData.totals?.consumedCalories || 0,
                protein: todayData.totals?.consumedProtein || 0,
                carbs: todayData.totals?.consumedCarbs || 0,
                fat: todayData.totals?.consumedFat || 0,
                fiber: todayData.totals?.consumedFiber || 0
            };
            console.log(`CTRL: Found daily log for ${date}. Consumed:`, consumedTotals);
        } else {
            console.log(`CTRL: No daily log found for ${uid} on ${date}. Consumed totals will be 0.`);
        }

        // --- Get streak directly from the user document ---
        const streak = userData.currentStreak || 0; // Default to 0 if not present
        // --- End Get streak ---
        console.log(`CTRL: Streak for user ${uid} read from user document: ${streak}`);

        res.status(200).json({
            success: true,
            nutritionPlan,
            consumedTotals,
            streak: streak // Return the pre-calculated streak
        });

    } catch (error) {
        console.error(`Error fetching combined daily data for user ${req.params?.uid} on date ${req.params?.date}:`, error);
        res.status(500).json({ error: "Internal server error fetching combined daily data", details: error.message });
    }
};
const updateUserStreak = async (req, res) => {
    if (!checkFirebaseReady(res, "update user streak")) return;

    const { uid, dateOfMealLog } = req.body; // This is the correct variable name from req.body

    if (!uid || !dateOfMealLog || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfMealLog)) {
        return res.status(400).json({ error: "User ID and valid meal log date (YYYY-MM-DD) are required." });
    }

    console.log(`CTRL Streak: Updating streak for user ${uid} based on meal log for ${dateOfMealLog}`);

    try {
        const userRef = db.collection('users').doc(uid);
        let justAchieved7DayStreak = false;
        let currentStreakForResponse = 0;

        await db.runTransaction(async (transaction) => {
            const userDocSnap = await transaction.get(userRef);
            let userData = {};

            if (userDocSnap.exists) {
                userData = userDocSnap.data();
            } else {
                console.warn(`Streak CTRL: User document ${uid} not found, initializing streak.`);
                userData = { currentStreak: 0, longestStreak: 0, lastStreakDayLogged: null, achievedStreak7: false };
            }

            let currentStreak = userData.currentStreak || 0;
            const longestStreak = userData.longestStreak || 0;
            const lastStreakDayLogged = userData.lastStreakDayLogged;
            const achievedStreak7Previously = userData.achievedStreak7 === true;

            // --- V V V --- CORRECTION IS HERE --- V V V ---
            const mealDate = new Date(dateOfMealLog + 'T00:00:00.000Z'); // Use dateOfMealLog
            // --- ^ ^ ^ --- END CORRECTION --- ^ ^ ^ ---
            let lastLogDate = null;

            if (lastStreakDayLogged) {
                if (lastStreakDayLogged.toDate) {
                    lastLogDate = new Date(lastStreakDayLogged.toDate().setUTCHours(0,0,0,0));
                } else if (typeof lastStreakDayLogged === 'string') {
                    lastLogDate = new Date(lastStreakDayLogged + 'T00:00:00.000Z');
                }
            }

            console.log(`Streak Update: Meal Date: ${mealDate}, Last Log: ${lastLogDate}, Current DB Streak: ${currentStreak}`);

            if (lastLogDate) {
                const diffTime = mealDate.getTime() - lastLogDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak += 1;
                } else if (diffDays === 0) {
                    currentStreak = Math.max(1, currentStreak);
                } else if (diffDays > 1) {
                    currentStreak = 1;
                } else { // Log for past date not directly adjacent
                    console.warn(`Streak Update: Logged for a past date (${dateOfMealLog}) relative to last streak day (${lastStreakDayLogged}). Resetting streak to 1 for this log day.`);
                    currentStreak = 1; // Current streak is 1 for this log day
                }
            } else {
                currentStreak = 1;
            }

            const updatedUserData = {
                currentStreak: currentStreak,
                lastStreakDayLogged: dateOfMealLog, // Store the date for which the meal was logged
                longestStreak: Math.max(longestStreak, currentStreak)
            };

            if (currentStreak >= 7 && !achievedStreak7Previously) { // Check >= 7
                justAchieved7DayStreak = true;
                updatedUserData.achievedStreak7 = true;
                console.log(`Streak CTRL: User ${uid} achieved 7-day streak! New current streak: ${currentStreak}`);
            }
             // Add similar logic for other streaks if needed:
             // if (currentStreak >= 30 && !userData.achievedStreak30) { ... }

            currentStreakForResponse = currentStreak;
            transaction.set(userRef, updatedUserData, { merge: true });
        }); // End Transaction

        console.log(`Streak CTRL: Streak updated for user ${uid}. New current streak: ${currentStreakForResponse}`);
        res.status(200).json({
            message: "Streak updated successfully.",
            currentStreak: currentStreakForResponse,
            achieved7DayStreak: justAchieved7DayStreak // Send the flag for the 7-day streak
        });

    } catch (error) {
        console.error(`Streak CTRL: Error updating streak for user ${uid}:`, error);
        res.status(500).json({ error: "Failed to update streak." });
    }
};

module.exports = {
    logMeal,
    getCombinedDailyData, 
    updateUserStreak,
};