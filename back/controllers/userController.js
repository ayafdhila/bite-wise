// controllers/userController.js

const { firebaseInstances } = require('../config/firebase');
const admin = firebaseInstances.admin; // Admin SDK instance
const db = firebaseInstances.db;       // Firestore instance
const FieldValue = admin.firestore.FieldValue; // Firestore FieldValue

// Check Firebase Initialization
function checkUserFirebaseInitialized(res, action = "perform action") {
    if (!admin || !db) { // Check Admin SDK and DB
        const missing = [!admin && "Admin SDK", !db && "DB"].filter(Boolean).join(', ');
        const baseMessage = `Firebase Check Failed during "${action}"`;
        const errorMessage = firebaseInstances._initializationError ? // Assuming _initializationError is on firebaseInstances
                             `${baseMessage}: Init Error: ${firebaseInstances._initializationError.message}` :
                             `${baseMessage}: Missing Services: ${missing || 'Unknown'}`;
        console.error("!!! Firebase Check FAILED (userController) !!!", errorMessage);
        if (res && !res.headersSent) {
           res.status(500).json({ error: `Server configuration error (${action}). Please contact support.` });
        }
        return false;
    }
    return true;
}

// --- Logout (Your Existing Logic) ---
exports.logout = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "userId est requis for logging" });
        console.log(`Logging logout for user: ${userId}`);
        if(db) { // Check if db is available
            await db.collection("logoutlogs").add({ userId, loggedOutAt: FieldValue.serverTimestamp() });
        } else {
             console.warn("Logout controller: db not available for logging logout event.");
        }
        res.status(200).json({ message: "Logout processed successfully on server." });
    } catch (error) {
        console.error("Logout processing error:", error);
        res.status(500).json({ error: "Internal server error during logout processing." });
    }
};

exports.updateProfile = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update profile")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, firstName, lastName } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Authentication required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden: Cannot update another user's profile." });
        if (!uid || !firstName || !lastName ) return res.status(400).json({ error: "Required fields missing (uid, firstName, lastName)." });
        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: "User profile not found." });
        await userRef.update({ firstName: String(firstName).trim(), lastName: String(lastName).trim(), updatedAt: FieldValue.serverTimestamp() });
        console.log(`[Update Profile] Success for user: ${uid}`);
        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) { console.error(`[Update Profile Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); res.status(500).json({ error: "Failed to update profile.", details: error.message }); }
};

// --- Update Goal (Your Existing Logic) ---
exports.updateGoal = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update goal")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, goal } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Authentication required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden" });
        if (!uid || !goal) return res.status(400).json({ error: "User ID and goal are required" });
        const validGoals = ["Losing Weight", "Maintaining Weight", "Gaining Weight"]; // Match case with frontend
        if (!validGoals.includes(goal)) return res.status(400).json({ error: "Invalid goal selection" });
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ goal: goal, updatedAt: FieldValue.serverTimestamp() });
        console.log(`[Update Goal] User ${uid} goal updated to: ${goal}`);
        res.status(200).json({ message: "Goal updated" });
    } catch (error) { console.error(`[Update Goal Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); if (error.code === 5) return res.status(404).json({ error: "User not found." }); res.status(500).json({ error: "Server error updating goal." }); }
};

// --- Update Profile Details (gender, age, height, etc.) (Your Existing Logic) ---
exports.updateProfileDetails = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update profile details")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, gender, age, height, weight, targetWeight, isKg } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Authentication required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden" });
        if (!uid || !gender || age === undefined || height === undefined || weight === undefined || targetWeight === undefined || isKg === undefined) { return res.status(400).json({ error: "All profile detail fields are required." }); }
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            gender: String(gender),
            age: Number.isFinite(parseInt(age, 10)) ? parseInt(age, 10) : FieldValue.delete(),
            height: Number.isFinite(parseFloat(height)) ? parseFloat(height) : FieldValue.delete(),
            weight: Number.isFinite(parseFloat(weight)) ? parseFloat(weight) : FieldValue.delete(),
            targetWeight: Number.isFinite(parseFloat(targetWeight)) ? parseFloat(targetWeight) : FieldValue.delete(),
            isKg: Boolean(isKg),
            updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[Update Details] User ${uid} details updated.`);
        res.status(200).json({ message: "Details updated" });
    } catch (error) { console.error(`[Update Details Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); if (error.code === 5) return res.status(404).json({ error: "User not found." }); res.status(500).json({ error: "Server error updating details." }); }
};

// --- Update Transformation Goals (Your Existing Logic) ---
exports.updateTransformation = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update transformation")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, transformationGoals } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Auth required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden." });
        if (!uid || !Array.isArray(transformationGoals)) return res.status(400).json({ error: "UID and transformationGoals (array) required" });
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ transformationGoals: transformationGoals, updatedAt: FieldValue.serverTimestamp() });
        console.log(`[Update Transformation] User ${uid} updated.`);
        res.status(200).json({ message: "Transformation goals updated" });
    } catch (error) { console.error(`[Update Transformation Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); if (error.code === 5) return res.status(404).json({ error: "User not found." }); res.status(500).json({ error: "Server error updating transformation goals." }); }
};

// --- Update Dietary Preferences (Your Existing Logic) ---
exports.updateDietaryPreferences = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update dietary")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, dietaryPreferences } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Auth required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden." });
        if (!uid || !Array.isArray(dietaryPreferences)) return res.status(400).json({ error: "UID and dietaryPreferences (array) required" });
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ dietaryPreferences: dietaryPreferences, updatedAt: FieldValue.serverTimestamp() });
         console.log(`[Update Dietary] User ${uid} updated.`);
        res.status(200).json({ message: "Dietary preferences updated" });
    } catch (error) { console.error(`[Update Dietary Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); if (error.code === 5) return res.status(404).json({ error: "User not found." }); res.status(500).json({ error: "Server error updating dietary preferences." }); }
};

// --- Update Activity Level (Your Existing Logic) ---
exports.updateActivityLevel = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update activity")) return;
    const loggedInUserId = req.user?.uid;
    try {
        const { uid, activityLevel } = req.body;
        if (!loggedInUserId) return res.status(401).json({ error: "Auth required." });
        if (loggedInUserId !== uid) return res.status(403).json({ error: "Forbidden." });
        if (!uid || !activityLevel) return res.status(400).json({ error: "UID and activityLevel required" });
        // Ensure this list matches your frontend options exactly
        const validLevels = ["Mostly Sitting 🪑", "Lightly Active 🚶", "Moderately Active 🏃‍♂️", "Active Lifestyle 🚴", "Highly Active 💪"];
        if (!validLevels.includes(activityLevel)) return res.status(400).json({ error: "Invalid activity level selection" });
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ activityLevel, updatedAt: FieldValue.serverTimestamp() });
         console.log(`[Update Activity] User ${uid} updated to ${activityLevel}.`);
        res.status(200).json({ message: "Activity level updated" });
    } catch (error) { console.error(`[Update Activity Error] User: ${loggedInUserId}, Target: ${req.body?.uid}`, error); if (error.code === 5) return res.status(404).json({ error: "User not found." }); res.status(500).json({ error: "Server error updating activity level." }); }
};

// --- Get User by ID (Your Existing Logic) ---
exports.getUserById = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "get user by id")) return;
    const loggedInUserId = req.user?.uid; const targetUserId = req.params.uid;
    if (!loggedInUserId) return res.status(401).json({ error: "Auth required." });
    if (!targetUserId) return res.status(400).json({ error: 'UID parameter required.' });
    console.log(`[Get User] Request by ${loggedInUserId} for target ${targetUserId}`);
    try {
        const userRef = db.collection('users').doc(targetUserId); const doc = await userRef.get();
        if (!doc.exists) { console.log(`[Get User] Not found: ${targetUserId}`); return res.status(404).json({ error: 'User not found' }); }
        console.log(`[Get User] Found: ${targetUserId}`); res.status(200).json(doc.data());
    } catch (err) { console.error(`[Get User Error] Fetching ${targetUserId}:`, err); res.status(500).json({ error: 'Server error fetching user.' }); }
};

// --- Complete Onboarding (Your Existing Logic) ---
exports.completeOnboarding = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "complete onboarding")) return;
    const loggedInUserId = req.user?.uid; const targetUserId = req.params.userId;
    if (!loggedInUserId) return res.status(401).json({ error: "Authentication required."});
    if (loggedInUserId !== targetUserId) return res.status(403).json({ error: "Forbidden" });
    console.log(`[Onboarding] completeOnboarding requested for ${targetUserId}`);
    try {
        const userDocRef = db.collection('users').doc(targetUserId);
        // Removed nutritionist check here, assuming onboarding is for 'users' collection
        const userSnap = await userDocRef.get();
        if (!userSnap.exists) { throw new Error("User document not found."); }
        await userDocRef.update({ onboardingComplete: true, updatedAt: FieldValue.serverTimestamp() }); // Changed profileLastUpdated for consistency
        console.log(`[Onboarding] Flag set true for ${targetUserId} in users collection.`);
        res.status(200).json({ message: "Onboarding completed." });
    } catch (error) { console.error(`[Onboarding Error] for ${targetUserId}:`, error); if (error.code === 5 || error.message.includes("not found")) { return res.status(404).json({ error: "User not found." }); } res.status(500).json({ error: 'Server error completing onboarding.' }); }
};

// --- Update Full User Profile (MODIFIED to handle profileImageUrl null/delete) ---
exports.updateFullUserProfile = async (req, res) => {
    if (!checkUserFirebaseInitialized(res, "update full profile")) return;
    const loggedInUserId = req.user?.uid;
    const targetUserId = req.params.uid; // Assuming UID comes from route param as per userRoutes
    if (!loggedInUserId) return res.status(401).json({ error: "Authentication required." });
    if (loggedInUserId !== targetUserId) return res.status(403).json({ error: "Forbidden: Cannot update another user's profile." });

    try {
        const {
            firstName, lastName, goal, gender, age, height, weight, targetWeight,
            transformationGoals, dietaryPreferences, activityLevel,
            otherGenderText, otherTransformationGoalText, otherDietaryPrefText,
            profileImageUrl // This is the key field from frontend
        } = req.body;

        // Basic validation for essential fields
        const requiredFields = { firstName, lastName, goal, gender, activityLevel };
        for (const field in requiredFields) { if (!requiredFields[field]) return res.status(400).json({ error: `Missing required field: ${field}` }); }
        if (age === undefined || height === undefined || weight === undefined || targetWeight === undefined || !Array.isArray(transformationGoals) || !Array.isArray(dietaryPreferences)) {
            return res.status(400).json({ error: "Required profile fields (age, height, weight, etc.) missing or invalid format." });
        }

        const updateData = {
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            goal: String(goal),
            gender: String(gender),
            age: (age !== null && age !== '' && !isNaN(parseInt(age, 10))) ? parseInt(age, 10) : FieldValue.delete(),
            height: (height !== null && height !== '' && !isNaN(parseFloat(height))) ? parseFloat(height) : FieldValue.delete(),
            weight: (weight !== null && weight !== '' && !isNaN(parseFloat(weight))) ? parseFloat(weight) : FieldValue.delete(),
            targetWeight: (targetWeight !== null && targetWeight !== '' && !isNaN(parseFloat(targetWeight))) ? parseFloat(targetWeight) : FieldValue.delete(),
            transformationGoals,
            dietaryPreferences,
            activityLevel: String(activityLevel),
            otherGenderText: otherGenderText !== undefined && String(otherGenderText).trim() !== '' ? String(otherGenderText).trim() : FieldValue.delete(),
            otherTransformationGoalText: otherTransformationGoalText !== undefined && String(otherTransformationGoalText).trim() !== '' ? String(otherTransformationGoalText).trim() : FieldValue.delete(),
            otherDietaryPrefText: otherDietaryPrefText !== undefined && String(otherDietaryPrefText).trim() !== '' ? String(otherDietaryPrefText).trim() : FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // --- V V V --- LOGIC TO HANDLE profileImageUrl --- V V V ---
        if (profileImageUrl === null) {
            // Frontend explicitly sent null, meaning "remove profile image"
            updateData.profileImage = FieldValue.delete(); // Use 'profileImage' to match your Firestore
            console.log(`[Update Full Profile] User ${targetUserId}: 'profileImage' will be DELETED from Firestore.`);
        } else if (profileImageUrl && typeof profileImageUrl === 'string' && profileImageUrl.startsWith('http')) {
            // Frontend sent a new valid URL (already uploaded to Storage)
            updateData.profileImage = profileImageUrl; // Use 'profileImage' to match your Firestore
            console.log(`[Update Full Profile] User ${targetUserId}: 'profileImage' will be UPDATED to ${profileImageUrl}.`);
        }
        // If profileImageUrl is undefined or an empty string in req.body,
        // the 'profileImage' field in Firestore will not be touched by this update operation.
        // --- ^ ^ ^ --- END LOGIC TO HANDLE profileImageUrl --- ^ ^ ^ ---

        const userRef = db.collection("users").doc(targetUserId);
        console.log(`[Update Full Profile] Updating profile ${targetUserId} with data:`, updateData);
        await userRef.update(updateData); // Use .update() to only modify specified fields
        console.log(`[Update Full Profile] User ${targetUserId} profile updated.`);

        // Fetch the updated user document to return the latest state
        const updatedUserDoc = await userRef.get();
        const updatedUserData = updatedUserDoc.data();

        res.status(200).json({ message: "Profile updated successfully", user: updatedUserData });

    } catch (error) {
        console.error(`[Update Full Profile Error] User: ${loggedInUserId}, Target: ${targetUserId}`, error);
        // Firestore error code 5 is NOT_FOUND
        if (error.code === 5) return res.status(404).json({ error: "User not found." });
        res.status(500).json({ error: "Server error updating profile.", details: error.message });
    }
};
exports.deleteUserData = async (req, res) => {
    // Note: This only deletes the Firestore document. Complete deletion is handled by DeleteController
    if (!checkUserFirebaseInitialized(res, "delete user data")) return;
    const loggedInUserId = req.user?.uid;
    const targetUserId = req.params.uid;
    console.log(`[Delete User Data] Request for user: ${targetUserId} by user: ${loggedInUserId}`);
    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetUserId) { return res.status(403).json({ error: "Forbidden: You can only delete your own data." }); }
    try {
        const userRef = db.collection('users').doc(targetUserId);
        await userRef.delete();
        console.log(`[Delete User Data] Firestore document users/${targetUserId} deleted.`);
        res.status(200).json({ message: "User Firestore data deleted. Auth/Storage deletion handled elsewhere." });
    } catch (error) { console.error(`[Delete User Data] Error for user ${targetUserId}:`, error); if (error.code === 5) return res.status(404).json({ message: "User data not found." }); res.status(500).json({ error: "Internal server error deleting user data."}); }
};

// --- Sauvegarder les Reminders de l'UTILISATEUR ---
exports.saveUserReminders = async (req, res) => {
    console.log("--- ENTERING saveUserReminders ---");
    if (!checkUserFirebaseInitialized(res, "save user reminders")) return;
    const loggedInUserId = req.user?.uid;
    const targetUserId = req.params.uid;
    console.log(`[Save User Reminders] Request for user ${targetUserId} by user ${loggedInUserId}`);
    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetUserId) { return res.status(403).json({ error: "Forbidden" }); }
    const { reminders } = req.body;
    if (!Array.isArray(reminders)) { return res.status(400).json({ error: "Invalid data: 'reminders' must be an array." }); }

    try {
        const remindersColRef = db.collection('users').doc(targetUserId).collection('reminders');
        console.log(`[Save User Reminders] Deleting old reminders for ${targetUserId}...`);
        const oldSnapshot = await remindersColRef.get();
        const batchDelete = db.batch();
        oldSnapshot.forEach(doc => batchDelete.delete(doc.ref));
        await batchDelete.commit();
        console.log(`[Save User Reminders] Deleted ${oldSnapshot.size} old reminders.`);

        if (reminders.length > 0) {
            const batchAdd = db.batch();
            let addedCount = 0;
            reminders.forEach((reminder, index) => {
                const reminderData = {
                    name: reminder.name || `Reminder ${index + 1}`,
                    enabled: typeof reminder.enabled === 'boolean' ? reminder.enabled : false,
                    time: typeof reminder.time === 'number' ? admin.firestore.Timestamp.fromMillis(reminder.time) : null,
                };
                if (reminderData.time) {
                    const newDocRef = remindersColRef.doc();
                    batchAdd.set(newDocRef, reminderData);
                    addedCount++;
                } else { console.warn(`[Save User Reminders] Skipping reminder "${reminder.name}" - invalid time.`); }
            }); // Fin forEach
            if (addedCount > 0) { await batchAdd.commit(); console.log(`[Save User Reminders] Added ${addedCount} new reminders.`); }
             else { console.log(`[Save User Reminders] No valid new reminders to add.`); }
        } else { console.log(`[Save User Reminders] Empty reminder list received.`); }
        res.status(200).json({ message: "User reminders saved successfully." });
    } catch (error) { console.error(`[Save User Reminders] Error for ${targetUserId}:`, error); if (!res.headersSent) { res.status(500).json({ error: "Error saving reminders.", details: error.message }); } }
    finally { console.log("--- EXITING saveUserReminders ---"); }
};

// --- Récupérer les Reminders de l'UTILISATEUR ---
exports.getUserReminders = async (req, res) => {
    console.log("--- ENTERING getUserReminders ---");
    if (!checkUserFirebaseInitialized(res, "get user reminders")) return;
    const loggedInUserId = req.user?.uid;
    const targetUserId = req.params.uid;
    console.log(`[Get User Reminders] Request for user ${targetUserId} by user ${loggedInUserId}`);
    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetUserId) { return res.status(403).json({ error: "Forbidden" }); }

    try {
        const remindersColRef = db.collection('users').doc(targetUserId).collection('reminders');
        const q = remindersColRef.orderBy("time", "asc");
        const snapshot = await q.get();
        let remindersData = [];
        if (!snapshot.empty) {
             remindersData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { id: doc.id, name: data.name, enabled: data.enabled ?? false, time: data.time ? data.time.toMillis() : null };
             });
        }
        console.log(`[Get User Reminders] Found ${remindersData.length} reminders for ${targetUserId}`);
        res.status(200).json({ reminders: remindersData }); // Return object with reminders array
    } catch (error) { console.error(`[Get User Reminders] Error for ${targetUserId}:`, error); if (!res.headersSent) { res.status(500).json({ error: "Error fetching reminders.", details: error.message }); } }
    finally { console.log("--- EXITING getUserReminders ---"); }
};




