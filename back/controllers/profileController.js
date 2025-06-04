/**
 * profileController.js
 * Handles Profile screen specific actions for the LOGGED-IN user:
 * - Fetching the user's main profile data.
 * - Logging current weight (saving to weightHistory and user doc).
 * - Retrieving historical CALORIE consumption data for the chart (reading from dailyConsumption).
 */

const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin;
const db = firebaseInstances.db;
const FieldValue = admin.firestore.FieldValue; // For serverTimestamp

// Basic Firebase service check helper function
function checkFirebaseReady(res, action = "perform action") {
    if (!admin || !db) {
        const missing = [!admin && "Admin", !db && "DB"].filter(Boolean).join(', ');
        console.error(`Firebase service(s) not initialized when trying to ${action}: ${missing}`);
        res.status(500).json({ error: `Server configuration error (${action}). Please try again later.` });
        return false;
    }
    return true;
}

// --- Get Profile Data for the Logged-In User ---
const getUserProfile = async (req, res) => {
     if (!checkFirebaseReady(res, "get user profile")) return;
     const uid = req.user?.uid; // <<<--- GET UID FROM AUTH MIDDLEWARE
     if (!uid) return res.status(401).json({ error: "Authentication required." });
     console.log(`CTRL: getUserProfile invoked for UID: ${uid}`);

     try {
         // Determine collection based on potential role - assuming 'user' object might have userType
         // For simplicity now, just check 'users'. Extend if coaches access their profile via this route.
         let userRef = db.collection('users').doc(uid);
         let docSnap = await userRef.get();
         let userType = 'Personal'; // Default assumption

         // Basic check if not found in users, maybe it's a coach accessing own profile
         if (!docSnap.exists) {
            console.log(`CTRL: getUserProfile - Not found in 'users', checking 'nutritionists' for UID: ${uid}`);
            userRef = db.collection('nutritionists').doc(uid);
            docSnap = await userRef.get();
            if (docSnap.exists) {
                userType = 'Professional'; // Found in nutritionists
            } else {
                 console.log(`CTRL: getUserProfile - Profile not found in users or nutritionists for UID: ${uid}`);
                  return res.status(404).json({ error: 'User profile not found.' });
            }
         }

         // Return relevant profile data
         const userData = docSnap.data();
         console.log(`CTRL: getUserProfile - Found ${userType} profile data for UID: ${uid}`);
         res.status(200).json({
             // Select fields to return
             uid: uid,
             email: userData.email || '',
             firstName: userData.firstName || '',
             lastName: userData.lastName || '',
             startWeight: userData.startWeight || 0,
             weight: userData.weight || 0,
             height: userData.height || 0, // Ensure height is stored correctly (e.g., meters)
             startWeight: userData.startWeight || userData.weight || 0,
             targetWeight: userData.targetWeight || 0,
             goal: userData.goal || '',
             activityLevel: userData.activityLevel || '',
             dietaryPreferences: userData.dietaryPreferences || [],
             userType: userData.userType || userType, 
             onboardingComplete: userData.onboardingComplete || false,
             // Add nutritionist specific fields if needed and userType is Professional
             specialization: userType === 'Professional' ? userData.specialization : undefined,
             workplace: userType === 'Professional' ? userData.workplace : undefined,
             yearsOfExperience: userType === 'Professional' ? userData.yearsOfExperience : undefined,
             // etc...
         });
     } catch (error) {
        console.error(`CTRL Error: fetching profile for ${uid}:`, error);
        res.status(500).json({ message: "Error fetching profile data", error: error.message });
     }
};


const logWeight = async (req, res) => {
    if (!checkFirebaseReady(res, "log weight")) return;
    const uid = req.user?.uid; // Get UID from auth middleware
    console.log("Executing logWeight in profileController for UID:", uid);
    try {
        const { weight, date } = req.body; // Expecting date: "YYYY-MM-DD"

        // --- Validation ---
        if (!uid) return res.status(401).json({ error: "Authentication required." });
        let errors = [];
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push("Valid Date (YYYY-MM-DD) required.");
        const numWeight = Number(weight);
        if (isNaN(numWeight) || numWeight <= 0 || numWeight > 500) { errors.push("Valid positive weight required (0-500)."); }
        if (errors.length > 0) { return res.status(400).json({ error: "Validation failed", details: errors }); }
        // -----------------

        const userRef = db.collection('users').doc(uid);
        const weightEntryRef = userRef.collection('weightHistory').doc(date); // Date as doc ID for easy overwrite/query
        const weightDataForHistory = { weight: numWeight, logTimestamp: FieldValue.serverTimestamp() };

        // --- Transaction to ensure atomicity ---
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            let currentStartWeight = null;

            if (userDoc.exists) {
                currentStartWeight = userDoc.data().startWeight;
            } else {
                // If user document doesn't exist yet (e.g., very first action),
                // this log can be considered the start weight.
                // The userRef will be created in the transaction if needed.
                console.log(`LogWeight Transaction: User doc ${uid} doesn't exist. This log will set startWeight.`);
            }

            // Set/Overwrite weight history entry for the specific date
            transaction.set(weightEntryRef, weightDataForHistory);
            console.log(`LogWeight Transaction: Set weight history for ${date}.`);

            // Update the main weight field and conditionally set startWeight on the user document
            const userUpdateData = { weight: numWeight };
            if (!currentStartWeight || Number(currentStartWeight) === 0) { // Set startWeight only if not already set or is 0
                console.log(`LogWeight Transaction: Setting startWeight for ${uid} to ${numWeight}.`);
                userUpdateData.startWeight = numWeight;
            } else {
                 console.log(`LogWeight Transaction: StartWeight already set for ${uid} (${currentStartWeight}). Not changing it.`);
            }
            // Use set with merge to create user doc if it doesn't exist
            transaction.set(userRef, userUpdateData, { merge: true });
            console.log(`LogWeight Transaction: Updated user document with new weight ${numWeight}.`);
        }); // End Transaction

        console.log(`Weight ${numWeight}kg logged for ${uid} on ${date}`);
        res.status(200).json({ message: "Weight logged successfully" });

    } catch (error) {
        console.error(`profileController: Error logging weight for UID ${uid} on date ${req.body?.date}:`, error);
        res.status(500).json({ message: "Error logging weight", error: error.message });
    }
};


// --- Get CALORIE History for Logged-In User's Profile Chart ---
const getCalorieHistory = async (req, res) => {
    if (!checkFirebaseReady(res, "get calorie history")) return;
    const uid = req.user?.uid; // <<<--- GET UID FROM AUTH MIDDLEWARE
    console.log("Executing getCalorieHistory for UID:", uid);
    try {
        const { period } = req.query; // 'Week', 'Month', 'Year'

        // --- Validation ---
        if (!uid) return res.status(401).json({ error: "Authentication required." });
        const validPeriods = ['Week', 'Month', 'Year'];
        if (!period || !validPeriods.includes(period)) {
            return res.status(400).json({ error: `Query 'period' (${validPeriods.join('/')}) required.` });
        }
        // -----------------

        // --- Calculate Date Range ---
        const endDate = new Date();
        let startDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today
        startDate.setHours(0, 0, 0, 0);    // Start of the day

        switch (period) {
             case 'Week': startDate.setDate(endDate.getDate() - 6); break; // Last 7 days
             case 'Month': startDate.setDate(endDate.getDate() - 29); break; // Last 30 days
             case 'Year': startDate.setFullYear(endDate.getFullYear() - 1); break; // Last 12 months start approx
             default: startDate.setDate(endDate.getDate() - 6);
        }
        const formatDate = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);
        // --------------------------
        console.log(`Fetching CALORIE history for ${uid} (${period}): ${startDateStr} to ${endDateStr}`);

        // --- Firestore Query (Target user's 'dailyConsumption') ---
        const dailyConsumptionRef = db.collection('users').doc(uid).collection('dailyConsumption');
        const query = dailyConsumptionRef
            .where(admin.firestore.FieldPath.documentId(), '>=', startDateStr)
            .where(admin.firestore.FieldPath.documentId(), '<=', endDateStr)
            .orderBy(admin.firestore.FieldPath.documentId(), 'asc');

        const snapshot = await query.get();
        // ---------------------

        // --- Process Results (Format for Chart Kit) ---
        let resultChartData = { labels: [], datasets: [{ data: [] }] };
        const dailyTotals = new Map(); // Use Map for easy date lookup

        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const data = doc.data();
                dailyTotals.set(doc.id, data.totals?.consumedCalories || 0); // Map: YYYY-MM-DD -> calories
            });
        } else {
            console.log(`No daily consumption data found for ${uid} in period ${period}.`);
        }

        // --- AGGREGATION / FORMATTING for Chart ---
        const labels = [];
        const dataPoints = [];

        if (period === 'Week') {
             for (let i = 6; i >= 0; i--) {
                 const d = new Date();
                 d.setDate(endDate.getDate() - i);
                 const dateStr = formatDate(d);
                 const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }); // 'Sun', 'Mon'...
                 labels.push(dayLabel);
                 dataPoints.push(Math.round(dailyTotals.get(dateStr) || 0)); // Get from map or 0
             }
        } else if (period === 'Month') {
             const daysInMonth = 30; // Approx
             const weekCount = 4; // Fixed 4 weeks for simplicity
             for(let week = weekCount; week >= 1; week--) {
                 labels.unshift(`W${week}`); // Build labels backwards W1, W2, W3, W4
                 let weeklySum = 0;
                 let startDay = daysInMonth - (week * 7);
                 let endDay = startDay + 6;
                 for (let i = startDay; i <= endDay; i++) {
                      if (i < 0) continue;
                      const d = new Date();
                      d.setDate(endDate.getDate() - i);
                      const dateStr = formatDate(d);
                      weeklySum += dailyTotals.get(dateStr) || 0;
                 }
                 dataPoints.unshift(Math.round(weeklySum / 7)); // Average for the week
             }
              // Ensure 4 labels/data points if data is sparse
              while (labels.length < 4) labels.unshift(`W${4-labels.length}`);
              while (dataPoints.length < 4) dataPoints.unshift(0);

        } else { // Year
            const currentYear = endDate.getFullYear();
            const currentMonth = endDate.getMonth(); // 0-11
            const monthlyAverages = new Map();

             // Initialize map for the last 12 months
             for (let i = 0; i < 12; i++) {
                 let monthIndex = currentMonth - i;
                 let year = currentYear;
                 if (monthIndex < 0) { monthIndex += 12; year -= 1; }
                 const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                 const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short' });
                 monthlyAverages.set(monthKey, { sum: 0, count: 0, label: monthLabel, sortKey: year * 100 + monthIndex });
             }

              // Aggregate daily totals into months
             dailyTotals.forEach((calories, dateStr) => {
                 const monthKey = dateStr.substring(0, 7); // YYYY-MM
                 if (monthlyAverages.has(monthKey)) {
                      monthlyAverages.get(monthKey).sum += calories;
                      monthlyAverages.get(monthKey).count += 1;
                 }
             });

              // Sort months chronologically and extract data
             const sortedMonths = Array.from(monthlyAverages.values()).sort((a, b) => a.sortKey - b.sortKey);
             sortedMonths.forEach(monthData => {
                 labels.push(monthData.label);
                 dataPoints.push(monthData.count > 0 ? Math.round(monthData.sum / monthData.count) : 0); // Daily average for the month
             });
        }

        resultChartData = { labels, datasets: [{ data: dataPoints }] };
        // --- END AGGREGATION ---

        console.log(`Sending formatted calorie history for ${uid} (${period}). Labels: ${resultChartData.labels.length}, Data Points: ${resultChartData.datasets[0].data.length}`);
        res.status(200).json(resultChartData);

    } catch (error) {
        console.error(`profileController: Error fetching calorie history for ${req.params?.uid}:`, error);
        res.status(500).json({ message: "Error fetching calorie history", error: error.message });
    }
};

// --- Export functions used by profileRoutes ---
module.exports = {
    getUserProfile,
    logWeight,
    getCalorieHistory
};