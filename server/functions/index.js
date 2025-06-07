// functions/index.js
/* eslint-disable max-len */ // Keep disabled temporarily
/* eslint-disable indent */ // Keep disabled temporarily

const functions = require("firebase-functions/v1"); // Use v1 for logger if v2 logger causes issues, or configure v2 logger separately. Or use console.log.
const admin = require("firebase-admin");

// v2 Trigger Imports
const {
  onDocumentCreated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");

// Initialize Admin SDK ONLY ONCE
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Get Firestore instance and FieldValue
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue; // Use FieldValue from initialized admin instance

/**
 * ===================================================================
 * Helper function to increment monthly user/coach growth counters
 * ===================================================================
 * Updates /aggregates/userGrowth_Monthly/months/{YYYY-MM} document.
 * @param {string} userType 'Personal' or 'Professional'.
 * @param {admin.firestore.Timestamp} eventTimestamp Firestore Timestamp of the event.
 */
async function incrementUserGrowthCounter(userType, eventTimestamp) {
  const date = eventTimestamp ? eventTimestamp.toDate() : new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthString = month.toString().padStart(2, "0");
  const yearMonthId = `${year}-${monthString}`;

  functions.logger.log( // Using v1 logger for simplicity now
    `Incrementing user growth counter for type: ${userType}, ` +
    `month: ${yearMonthId}`,
  );

  const aggregateDocRef = db.collection("aggregates")
      .doc("userGrowth_Monthly")
      .collection("months")
      .doc(yearMonthId);

  const incrementField = userType === "Personal" ?
                         "newSubscribers" : "newCoaches";

  const dataToUpdate = {
    year: year,
    month: month,
    [incrementField]: FieldValue.increment(1), // Use defined FieldValue
  };

  try {
    functions.logger.log(
      `Updating aggregate doc: ${aggregateDocRef.path} ` +
      `with field: ${incrementField}`,
    );
    await aggregateDocRef.set(dataToUpdate, {merge: true});
    functions.logger.log(
      `Success: Incremented ${incrementField} for ${yearMonthId}.`,
    );
  } catch (error) {
    functions.logger.error( // Use logger.error
      `Error updating aggregate counter for ${yearMonthId}:`, error,
    );
  }
}

/**
 * ===================================================================
 * Cloud Function: Increment Subscriber Count (v2 Syntax)
 * ===================================================================
 */
exports.onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const creationTime = event.data?.createTime; // Use optional chaining
  functions.logger.log(`Trigger v2: New 'users' document created: ${userId}`);
  if (!creationTime) {
    functions.logger.warn("Creation time missing from event, using server time.");
  }
  // Use FieldValue from admin instance
  await incrementUserGrowthCounter("Personal",
                                   creationTime || FieldValue.serverTimestamp());
  return null;
});

/**
 * ===================================================================
 * Cloud Function: Increment Coach Count (v2 Syntax)
 * ===================================================================
 */
exports.onNutritionistCreate = onDocumentCreated("nutritionists/{nutritionistId}",
  async (event) => {
    const nutritionistId = event.params.nutritionistId;
    const creationTime = event.data?.createTime;
    functions.logger.log( // Corrected long line
      "Trigger v2: New 'nutritionists' document created: " +
      `${nutritionistId}`,
    );
    if (!creationTime) {
      functions.logger.warn("Creation time missing, using server time.");
    }
    await incrementUserGrowthCounter("Professional",
                                     creationTime || FieldValue.serverTimestamp());
    return null;
  });

/**
 * ===================================================================
 * Cloud Function: Increment Total Plans Created (v2 Syntax)
 * ===================================================================
 */
exports.onPlanDayCreate = onDocumentCreated(
  "users/{userId}/nutritional_program/{dayOfWeek}",
  async (event) => {
    const userId = event.params.userId;
    const dayOfWeek = event.params.dayOfWeek;
    functions.logger.log(
      `Trigger v2: New plan day '${dayOfWeek}' user ${userId}. ` +
      `Incrementing total plan count.`,
    );

    const globalCountsRef = db.collection("aggregates").doc("globalCounts");
    try {
      await globalCountsRef.set(
        {totalPlansCreated: FieldValue.increment(1)}, // Use defined FieldValue
        {merge: true},
      );
      functions.logger.log("Success: Incremented totalPlansCreated.");
    } catch (error) {
      functions.logger.error(
        `Error incrementing totalPlansCreated user ${userId}:`, error,
      );
    }
    return null;
  });


/**
 * ===================================================================
 * Cloud Function: Increment Meals Logged Today (Option A - v2 Syntax)
 * ===================================================================
 */
exports.onDailyConsumptionWrite = onDocumentWritten(
  "users/{userId}/dailyConsumption/{date}",
  async (event) => {
    const userId = event.params.userId;
    const dateString = event.params.date;

    if (!event.data.after.exists) {
      functions.logger.log(
        `Daily consumption doc ${dateString} deleted user ${userId}. ` +
        `No count update.`,
      );
      return null;
    }
    const beforeData = event.data.before.data() || {};
    const afterData = event.data.after.data() || {};

    const beforeMealKeys = Object.keys(beforeData.meals || {});
    const afterMealKeys = Object.keys(afterData.meals || {});
    const mealsAddedCount = afterMealKeys
        .filter((key) => !beforeMealKeys.includes(key))
        .length;

    if (mealsAddedCount > 0) {
      functions.logger.log(
        `Detected ${mealsAddedCount} meal(s) added user ${userId} ` +
        `date ${dateString}.`,
      );

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const todayString = `${year}-${month.toString().padStart(2, "0")}` +
                          `-${day.toString().padStart(2, "0")}`;

      const dailyStatsRef = db.collection("aggregates").doc("dailyStats").collection("days").doc(todayString);

      try {
        // Use Timestamp from admin instance
        const dateTimestamp = admin.firestore.Timestamp.fromDate(
          new Date(year, month - 1, day),
        );
        await dailyStatsRef.set(
          {
            mealsLogged: FieldValue.increment(mealsAddedCount),
            date: dateTimestamp,
          },
          {merge: true},
        );
        functions.logger.log(
          `Success: Incremented mealsLogged for ${todayString} ` +
          `by ${mealsAddedCount}.`,
        );
      } catch (error) {
        functions.logger.error(
          `Error incrementing mealsLogged for ${todayString}:`, error,
        );
      }
    } else {
      functions.logger.log(
        `No new meals detected write user ${userId} date ${dateString}.`,
      );
    }
    return null;
  });

/*
// ===================================================================
// Cloud Function: Increment Meals Logged Today (Option B - v2 Syntax)
// ===================================================================
// --- MAKE SURE THIS IS COMMENTED OUT IF USING OPTION A ---
exports.onMealLogCreate = onDocumentCreated(
  "users/{userId}/dailyConsumption/{date}/meals/{mealId}", async (event) => {
    const { userId, date, mealId } = event.params;
    functions.logger.log(
        `Trigger v2: New meal ${mealId} log user ${userId} date ${date}.`);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayString = `${year}-${month.toString().padStart(2, "0")}` +
                        `-${day.toString().padStart(2, "0")}`;

    const dailyStatsRef = db.collection('aggregates').doc('dailyStats')
        .collection('days').doc(todayString);
    // Use Timestamp from admin instance
    const dateTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(year, month - 1, day));

    try {
        await dailyStatsRef.set(
             { mealsLogged: FieldValue.increment(1), date: dateTimestamp },
             { merge: true }
         );
        functions.logger.log(
            `Success: Incremented mealsLogged for ${todayString}.`);
    } catch (error) {
         functions.logger.error(
            `Error incrementing mealsLogged for ${todayString}:`, error);
    }
    return null;
});
*/

// Ensure a blank line at the end for eol-last rule
