// controllers/nutritionalProgramController.js
const { Timestamp } = require('firebase-admin/firestore');
const { firebaseInstances } = require('../config/firebase');

// Vérification initiale
let db, admin, FieldValue;
if (!firebaseInstances || !firebaseInstances.db || !firebaseInstances.admin || !firebaseInstances.admin.firestore) {
  console.error("[Nutrition Controller] FATAL: Firebase instances not properly retrieved.");
  db = null; admin = null; FieldValue = null;
} else {
  db = firebaseInstances.db;
  admin = firebaseInstances.admin;
  FieldValue = admin.firestore.FieldValue;
}

function checkNutritionFirebaseInitialized() {
  let missing = [];
  if (!admin) missing.push("Admin SDK");
  if (!db) missing.push("Firestore DB");
  if (!FieldValue || typeof FieldValue.serverTimestamp !== 'function') missing.push("FieldValue");
  if (missing.length > 0) {
    console.error(`[Nutrition Controller] FATAL: Firebase service(s) not initialized: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

// --- Helpers ---
const createInitialDayState = () => {
    const meals = {};
    const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
    MEAL_TIMES.forEach(meal => {
        meals[meal] = { food: '', quantity: '', unit: '', prepNotes: '', timing: '', alternatives: '' };
    });
    return { dailyWorkout: '', meals, completed: false }; // Inclure 'completed' par défaut
};

const createInitialFullPlanState = () => {
    const weeklyPlan = {};
    const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    DAYS_OF_WEEK.forEach(day => { weeklyPlan[day] = createInitialDayState(); });
    return {
        generalNotes: '', waterIntake: '2.5', sleepRecommendation: '7-9 hours',
        weeklyPlan: weeklyPlan, lastUpdatedAt: null, lastUpdatedBy: null,
    };
};

// --- saveNutritionPlan (INCHANGÉ) ---
const saveNutritionPlan = async (req, res) => {
    if (!checkNutritionFirebaseInitialized()) return res.status(500).json({ message: "Server config error." });
    const { clientId } = req.params;
    if (!req.user?.uid) return res.status(401).json({ message: "Authentication required." });
    const coachId = req.user.uid;
    const { generalNotes, waterIntake, sleepRecommendation, weeklyPlan, selectedDay } = req.body;

    // Validation...
    if (!clientId || !selectedDay) return res.status(400).json({ message: 'Client ID and selectedDay required.' });
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!validDays.includes(selectedDay)) return res.status(400).json({ message: `Invalid selected day: ${selectedDay}` });
    if (!weeklyPlan?.[selectedDay] || typeof weeklyPlan[selectedDay] !== 'object') return res.status(400).json({ message: `Data for ${selectedDay} missing/invalid.` });
    if (!FieldValue?.serverTimestamp) return res.status(500).json({ message: "Timestamp service error." });

    const generalPlanData = { /* ... (comme avant) ... */
        generalNotes: generalNotes ?? '', waterIntake: String(waterIntake ?? '2.5'), sleepRecommendation: sleepRecommendation ?? '7-9 hours',
        coachLastUpdatedAt: FieldValue.serverTimestamp(), coachLastUpdatedBy: coachId,
    };
    const receivedDayData = weeklyPlan[selectedDay];
    const defaultDayState = createInitialDayState();
    const dayDataToSave = { /* ... (construction comme avant) ... */
        dailyWorkout: receivedDayData.dailyWorkout ?? defaultDayState.dailyWorkout, meals: {},
        coachLastUpdatedAt: FieldValue.serverTimestamp(), coachLastUpdatedBy: coachId,
    };
    const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
    MEAL_TIMES.forEach(meal => {
        const receivedMeal = receivedDayData.meals?.[meal] || {}; const defaultMeal = defaultDayState.meals[meal];
        dayDataToSave.meals[meal] = {
            food: receivedMeal.food ?? defaultMeal.food, quantity: String(receivedMeal.quantity ?? defaultMeal.quantity),
            unit: receivedMeal.unit ?? defaultMeal.unit, prepNotes: receivedMeal.prepNotes ?? defaultMeal.prepNotes,
            timing: receivedMeal.timing ?? defaultMeal.timing, alternatives: receivedMeal.alternatives ?? defaultMeal.alternatives,
        };
    });

    try {
        const batch = db.batch();
        const baseRef = db.collection('users').doc(clientId).collection('nutritional_program');
        batch.set(baseRef.doc('activePlan'), generalPlanData, { merge: true });
        batch.set(baseRef.doc(selectedDay), dayDataToSave, { merge: true });
        await batch.commit();
        console.log(`[Nutrition Controller] Plan updated: client ${clientId}, day ${selectedDay}, coach ${coachId}.`);
        res.status(200).json({ message: `Plan updated for ${selectedDay}.` });
    } catch (error) {
        console.error(`[Nutrition Controller] Error saving plan for ${clientId}, day ${selectedDay}:`, error);
        res.status(500).json({ message: 'Failed to save plan.' });
    }
};

// --- getNutritionPlan (INCHANGÉ - Pour le Coach/PlanEditor) ---
const getNutritionPlan = async (req, res) => {
     if (!checkNutritionFirebaseInitialized()) return res.status(500).json({ message: "Server config error." });
     const { clientId } = req.params;
     if (!req.user?.uid) return res.status(401).json({ message: "Auth required." });
     const requesterId = req.user.uid;
     if (!clientId) return res.status(400).json({ message: 'Client ID required.' });
     // TODO: Authz check

    try {
        console.log(`[Nutrition Controller] Fetching FULL plan for ${clientId} by ${requesterId}`);
        const programCollectionRef = db.collection('users').doc(clientId).collection('nutritional_program');
        const generalPlanDocSnap = await programCollectionRef.doc('activePlan').get();
        const generalData = generalPlanDocSnap.exists ? generalPlanDocSnap.data() : {};
        const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const dayPromises = DAYS_OF_WEEK.map(day => programCollectionRef.doc(day).get());
        const daySnapshots = await Promise.all(dayPromises);
        const weeklyPlanData = {};
        const fullDefaultStructure = createInitialFullPlanState();
        daySnapshots.forEach((docSnap, index) => { /* ... (construction weeklyPlanData comme avant) ... */
            const dayName = DAYS_OF_WEEK[index]; const defaultDayData = fullDefaultStructure.weeklyPlan[dayName]; let dayDataFromDb = {};
            if (docSnap.exists) { dayDataFromDb = docSnap.data() || {}; }
            weeklyPlanData[dayName] = {
                dailyWorkout: dayDataFromDb.dailyWorkout ?? defaultDayData.dailyWorkout, meals: {}, completed: dayDataFromDb.completed ?? false,
                clientLastUpdatedAt: dayDataFromDb.clientLastUpdatedAt || null, coachLastUpdatedAt: dayDataFromDb.coachLastUpdatedAt || null, coachLastUpdatedBy: dayDataFromDb.coachLastUpdatedBy || null,
            };
            const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
            MEAL_TIMES.forEach(meal => { const dbMeal = dayDataFromDb.meals?.[meal] || {}; const defaultMeal = defaultDayData.meals[meal];
                 weeklyPlanData[dayName].meals[meal] = { food: dbMeal.food ?? defaultMeal.food, quantity: String(dbMeal.quantity ?? defaultMeal.quantity), unit: dbMeal.unit ?? defaultMeal.unit, prepNotes: dbMeal.prepNotes ?? defaultMeal.prepNotes, timing: dbMeal.timing ?? defaultMeal.timing, alternatives: dbMeal.alternatives ?? defaultMeal.alternatives, };
            });
        });
        const fullPlanResponse = { /* ... (construction comme avant) ... */
             generalNotes: generalData.generalNotes ?? fullDefaultStructure.generalNotes, waterIntake: String(generalData.waterIntake ?? fullDefaultStructure.waterIntake),
             sleepRecommendation: generalData.sleepRecommendation ?? fullDefaultStructure.sleepRecommendation, weeklyPlan: weeklyPlanData,
             lastUpdatedAt: generalData.coachLastUpdatedAt || null, lastUpdatedBy: generalData.coachLastUpdatedBy || null,
        };
        console.log(`[Nutrition Controller] Full plan retrieved for ${clientId}`);
        res.status(200).json({ plan: fullPlanResponse });
    } catch (error) {
        console.error(`[Nutrition Controller] Error fetching full plan for ${clientId}:`, error);
        res.status(500).json({ message: 'Failed to fetch plan.' });
    }
};

// --- updateDayCompletionStatus (INCHANGÉ) ---
const updateDayCompletionStatus = async (req, res) => {
    if (!checkNutritionFirebaseInitialized()) return res.status(500).json({ message: "Server config error." });
    const { clientId } = req.params;
    const { day, completed } = req.body;
    if (!req.user?.uid) return res.status(401).json({ message: "Auth required." });
    const clientUidMakingRequest = req.user.uid;
    if (clientUidMakingRequest !== clientId) return res.status(403).json({ message: "Forbidden." });
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!day || !validDays.includes(day) || typeof completed !== 'boolean') return res.status(400).json({ message: "Invalid input." });
    if (!FieldValue?.serverTimestamp) return res.status(500).json({ message: "Timestamp service error." });

    try {
        const dayDocRef = db.collection('users').doc(clientId).collection('nutritional_program').doc(day);
        const docSnap = await dayDocRef.get();
        if (!docSnap.exists) return res.status(404).json({ message: `Plan for ${day} not created yet.` });
        await dayDocRef.update({ completed: completed, clientLastUpdatedAt: FieldValue.serverTimestamp() });
        console.log(`[Nutrition Controller] Completion updated: client ${clientId}, day ${day}, status ${completed}`);
        res.status(200).json({ message: `Completion status for ${day} updated.` });
    } catch (error) {
        console.error(`[Nutrition Controller] Error updating completion for ${clientId}, day ${day}:`, error);
        if (error.code === 5 || error.message.includes("NOT_FOUND")) return res.status(404).json({ message: `Plan for ${day} not found.` });
        res.status(500).json({ message: "Failed to update completion status." });
    }
};

// --- getClientDailyPlanView (INCHANGÉ - Pour Charger les Détails d'un Jour) ---
const getClientDailyPlanView = async (req, res) => {
    if (!checkNutritionFirebaseInitialized()) return res.status(500).json({ message: "Server config error." });
    const { clientId, dayName } = req.params;
    if (!req.user?.uid) return res.status(401).json({ message: "Auth required." });
    const requesterId = req.user.uid;
    if (!clientId || !dayName) return res.status(400).json({ message: 'Client ID and Day Name required.' });
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!validDays.includes(dayName)) return res.status(400).json({ message: `Invalid day name: ${dayName}` });
    // TODO: Authz check

    console.time(`[GetDailyView ${clientId}-${dayName}]`);
    try {
        console.log(`[Nutrition Controller] Fetching daily view: client ${clientId}, day ${dayName}, requester ${requesterId}`);
        const programCollectionRef = db.collection('users').doc(clientId).collection('nutritional_program');
        console.time(`[GetDailyView ${clientId}-${dayName}] Firestore Reads`);
        const [generalPlanDocSnap, dayDocSnap] = await Promise.all([
            programCollectionRef.doc('activePlan').get(),
            programCollectionRef.doc(dayName).get()
        ]);
        console.timeEnd(`[GetDailyView ${clientId}-${dayName}] Firestore Reads`);
        const generalData = generalPlanDocSnap.exists ? generalPlanDocSnap.data() : {};
        const dayDataResult = dayDocSnap.exists ? dayDocSnap.data() : createInitialDayState();
        const defaultFullStructure = createInitialFullPlanState();
        const defaultDayStructure = defaultFullStructure.weeklyPlan[dayName];
        const finalDayData = { /* ... (construction comme avant) ... */
            dailyWorkout: dayDataResult.dailyWorkout ?? defaultDayStructure.dailyWorkout, meals: {}, completed: dayDataResult.completed ?? false,
            clientLastUpdatedAt: dayDataResult.clientLastUpdatedAt || null, coachLastUpdatedAt: dayDataResult.coachLastUpdatedAt || null, coachLastUpdatedBy: dayDataResult.coachLastUpdatedBy || null,
        };
        const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
        MEAL_TIMES.forEach(meal => { const dbMeal = dayDataResult.meals?.[meal] || {}; const defaultMeal = defaultDayStructure.meals[meal];
            finalDayData.meals[meal] = { food: dbMeal.food ?? defaultMeal.food, quantity: String(dbMeal.quantity ?? defaultMeal.quantity), unit: dbMeal.unit ?? defaultMeal.unit, prepNotes: dbMeal.prepNotes ?? defaultMeal.prepNotes, timing: dbMeal.timing ?? defaultMeal.timing, alternatives: dbMeal.alternatives ?? defaultMeal.alternatives, };
        });
        const planViewResponse = { /* ... (construction comme avant) ... */
             generalNotes: generalData.generalNotes ?? defaultFullStructure.generalNotes, waterIntake: String(generalData.waterIntake ?? fullDefaultStructure.waterIntake),
             sleepRecommendation: generalData.sleepRecommendation ?? fullDefaultStructure.sleepRecommendation, dayData: finalDayData, dayName: dayName,
             lastUpdatedAt: generalData.coachLastUpdatedAt || null, lastUpdatedBy: generalData.coachLastUpdatedBy || null,
        };
        console.log(`[Nutrition Controller] Daily view constructed for ${clientId}, ${dayName}`);
        console.timeEnd(`[GetDailyView ${clientId}-${dayName}]`);
        res.status(200).json({ planView: planViewResponse });
    } catch (error) {
        console.error(`[Nutrition Controller] Error fetching daily view for ${clientId}, ${dayName}:`, error);
        console.timeEnd(`[GetDailyView ${clientId}-${dayName}]`);
        res.status(500).json({ message: 'Failed to fetch daily plan view.' });
    }
};


// --- getPlanSummary (AJOUTÉE - Pour le Résumé Client) ---
/**
 * @desc    Récupère les données générales et la liste des jours définis pour un client.
 * @route   GET /api/nutrition-programs/:clientId/summary
 * @access  Private (Client ou Coach)
 */
const getPlanSummary = async (req, res) => {
    console.log("CONTROLLER: getPlanSummary - Function Entered");
    if (!checkNutritionFirebaseInitialized()) {
        return res.status(500).json({ message: "Server configuration error (DB Init)." });
    }
    
    const { clientId } = req.params;
    if (!req.user || !req.user.uid) return res.status(401).json({ message: "Authentication required." });
    const requesterId = req.user.uid;
    if (!clientId) return res.status(400).json({ message: 'Client ID is required.' });
    // TODO: Autorisation

    console.time(`[GetSummary ${clientId}]`);
    try {
        console.log(`[Nutrition Controller] Getting plan summary for ${clientId} by ${requesterId}`);
        const programCollectionRef = db.collection('users').doc(clientId).collection('nutritional_program');
        console.time(`[GetSummary ${clientId}] Firestore Reads`);
        const snapshot = await programCollectionRef.get(); // Lit TOUS les docs de la sous-collection
        console.timeEnd(`[GetSummary ${clientId}] Firestore Reads`);

        let generalData = {};
        const definedDaysList = [];
        const validDaysSet = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

        snapshot.forEach(doc => {
            if (doc.id === 'activePlan') {
                generalData = doc.data() || {};
            } else if (validDaysSet.has(doc.id)) {
                definedDaysList.push(doc.id); // Ajoute le nom du jour si le doc existe
            }
        });

        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        definedDaysList.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)); // Trie les jours

        const fullDefaultStructure = createInitialFullPlanState();
        const summaryResponse = {
            generalNotes: generalData.generalNotes ?? fullDefaultStructure.generalNotes,
            waterIntake: String(generalData.waterIntake ?? fullDefaultStructure.waterIntake),
            sleepRecommendation: generalData.sleepRecommendation ?? fullDefaultStructure.sleepRecommendation,
            definedDays: definedDaysList, // Liste des jours ['Monday', 'Wednesday', ...]
            lastUpdatedAt: generalData.coachLastUpdatedAt || null,
            lastUpdatedBy: generalData.coachLastUpdatedBy || null,
        };
        console.log(`[Nutrition Controller] Summary retrieved for ${clientId}: ${definedDaysList.length} days defined.`);
        console.timeEnd(`[GetSummary ${clientId}]`);
        res.status(200).json({ summary: summaryResponse });
    } catch (error) {
        console.error(`[Nutrition Controller] Error fetching plan summary for ${clientId}:`, error);
        console.timeEnd(`[GetSummary ${clientId}]`);
        res.status(500).json({ message: 'Failed to fetch plan summary.' });
    }
};


// --- Export (Mis à jour) ---
module.exports = {
    saveNutritionPlan,
    getNutritionPlan,           // Gardée pour PlanEditor (coach)
    updateDayCompletionStatus,
    getClientDailyPlanView,     // Gardée pour charger détails jour client
    getPlanSummary,             // Nouvelle fonction pour résumé client
};