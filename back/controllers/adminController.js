// controllers/adminController.js
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin; // Admin SDK instance
const db = firebaseInstances.db;       // Firestore instance
const FieldValue = admin.firestore.FieldValue; // Firestore FieldValue

// Helper: Check Firebase Init
function checkFirebaseReady(res, action = "perform action") {
    if (!admin || !db) { // Check Admin SDK (includes Auth) and DB
        const missing = [!admin && "Admin SDK", !db && "DB"].filter(Boolean).join(', ');
        console.error(`FATAL (AdminController): Firebase service(s) not initialized for ${action}: ${missing}`);
        if (!res.headersSent) {
             res.status(500).json({ error: "Server configuration error." });
        }
        return false;
    }
    return true;
}

// Helper: Get LIMITED, public details for one nutritionist
const getNutritionistPublicDetails = async (nutritionistId) => {
    if (!nutritionistId || !db) return null;
    console.log(`CTRL Helper: getNutritionistPublicDetails - Fetching single: ${nutritionistId}`);
    try {
        const docRef = db.collection('nutritionists').doc(nutritionistId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            console.log(`CTRL Helper: getNutritionistPublicDetails - Found: ${nutritionistId}`);
            const data = docSnap.data();
            const yearsExpNum = parseInt(data.yearsOfExperience, 10);
            return {
                id: docSnap.id, firstName: data.firstName || '', lastName: data.lastName || '', specialization: data.specialization || '',
                profileImageUrl: data.profileImage || data.profileImageUrl || null,
                yearsOfExperience: !isNaN(yearsExpNum) ? yearsExpNum : (data.yearsOfExperience || 0),
                workplace: data.workplace || '', shortBio: data.shortBio || '',
                averageRating: data.averageRating || 0, ratingCount: data.ratingCount || 0
            };
        } else { console.warn(`CTRL Helper: getNutritionistPublicDetails - Not Found: ${nutritionistId}`); return null; }
    } catch (error) { console.error(`CTRL Helper: Error fetching nutri ${nutritionistId}:`, error); return null; }
};

// Helper: Get details for MULTIPLE users/nutritionists with Auth status
const getMultipleUserDetailsWithAuthStatus = async (userIds) => {
     if (!db || !admin || !userIds || userIds.length === 0) return {};
     const uniqueIds = [...new Set(userIds.filter(id => !!id))]; if (uniqueIds.length === 0) return {};
     console.log(`ADMIN Helper: getMultiUserDetailsWithAuth - Fetching details for ${uniqueIds.length} UIDs...`);
     const userRefs = uniqueIds.map(id => db.collection('users').doc(id));
     const nutriRefs = uniqueIds.map(id => db.collection('nutritionists').doc(id));
     const adminRefs = uniqueIds.map(id => db.collection('admin').doc(id)); // Check admin too
     try {
         const [userSnaps, nutriSnaps, adminSnaps] = await Promise.all([
             db.getAll(...userRefs), db.getAll(...nutriRefs), db.getAll(...adminRefs)
         ]);
         console.log(`ADMIN Helper: Fetched Firestore docs. Users: ${userSnaps.length}, Nutri: ${nutriSnaps.length}, Admin: ${adminSnaps.length}`);

         // Fetch auth records (handle potential missing auth records)
         console.log(`ADMIN Helper: Fetching Auth records...`);
         const authRecordsPromises = uniqueIds.map(uid => admin.auth().getUser(uid).catch(err => null));
         const authRecordsArray = await Promise.all(authRecordsPromises);
         const authRecordsMap = authRecordsArray.reduce((acc, record) => { if (record) acc[record.uid] = record; return acc; }, {});
         console.log(`ADMIN Helper: Fetched ${Object.keys(authRecordsMap).length} Auth records.`);

         // Combine data
         const combinedDetails = {};
         const processSnapshot = (docSnap, defaultUserType) => {
             if (docSnap.exists) {
                 const uid = docSnap.id;
                 if (combinedDetails[uid]) return; // Already processed (e.g., was admin)
                 const data = docSnap.data(); const authRecord = authRecordsMap[uid];
                 const isAdmin = authRecord?.customClaims?.admin === true || defaultUserType === 'Admin'; // Check claim or collection
                 combinedDetails[uid] = {
                     id: uid, uid: uid, firstName: data.firstName || '', lastName: data.lastName || '',
                     email: authRecord?.email || data.email || '', // Prioritize Auth email
                     userType: data.userType || defaultUserType,
                     createdAt: data.createdAt || authRecord?.metadata?.creationTime || null,
                     onboardingComplete: data.onboardingComplete === true, // Explicit boolean check
                     authDisabled: authRecord?.disabled || false,
                     isAdmin: isAdmin, // Store admin status
                     // Add specific fields conditionally
                     ...(defaultUserType === 'Professional' && { isVerified: data.isVerified === true }),
                 }; } };
         // Process in order of potential precedence (Admin > Nutritionist > User)
         adminSnaps.forEach(snap => processSnapshot(snap, 'Admin'));
         nutriSnaps.forEach(snap => processSnapshot(snap, 'Professional'));
         userSnaps.forEach(snap => processSnapshot(snap, 'Personal'));

         // Add minimal entries for users found only in Auth
          uniqueIds.forEach(uid => {
              if (!combinedDetails[uid] && authRecordsMap[uid]) {
                  console.warn(`ADMIN Helper: User ${uid} found in Auth but missing from expected Firestore collections.`);
                  const authRecord = authRecordsMap[uid];
                  combinedDetails[uid] = {
                      id: uid, uid: uid, firstName: '', lastName: '', email: authRecord.email,
                      userType: 'Unknown', createdAt: authRecord.metadata.creationTime || null,
                      onboardingComplete: false, authDisabled: authRecord.disabled, isAdmin: false,
                  };
              }
          });


         console.log(`ADMIN Helper: Combined details for ${Object.keys(combinedDetails).length} users.`);
         return combinedDetails;
     } catch (error) { console.error("ADMIN Helper: Error in getMultipleUserDetailsWithAuth:", error); return {}; }
 };

 exports.verifyCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "verify coach")) return;
    const adminId = req.user.uid;
    // --- V V V --- GET coachId FROM req.params --- V V V ---
    const { coachId } = req.params; // Matches ':coachId' in your route
    // --- ^ ^ ^ --- END GET FROM PARAMS --- ^ ^ ^ ---
    // --- V V V --- GET 'verify' FROM req.body --- V V V ---
    const { verify } = req.body; // 'verify' status comes from the body
    // --- ^ ^ ^ --- END GET FROM BODY --- ^ ^ ^ ---

    // Renamed nutritionistId to coachId internally for consistency with param
    if (!coachId || typeof verify !== 'boolean') {
        return res.status(400).json({ error: 'Coach ID (from URL) and verify status (true/false in body) are required.' });
    }
    console.log(`CTRL: Admin ${adminId} attempting to set verification status of coach ${coachId} to ${verify}.`);

    try {
        const coachRef = db.collection('nutritionists').doc(coachId); // Use coachId from params

        await db.runTransaction(async (transaction) => {
            const coachSnap = await transaction.get(coachRef);
            if (!coachSnap.exists) {
                throw new Error('Nutritionist document not found.');
            }
            transaction.update(coachRef, {
                isVerified: verify,
                verifiedAt: verify ? FieldValue.serverTimestamp() : FieldValue.delete(),
                verifiedBy: verify ? adminId : FieldValue.delete()
            });
        });

         try {
             await admin.auth().getUser(coachId); // Check if Auth user exists
             await admin.auth().setCustomUserClaims(coachId, { verifiedCoach: verify });
             console.log(`CTRL: Custom claim 'verifiedCoach: ${verify}' set for ${coachId}`);
         } catch(claimError) {
              console.error(`CTRL Admin Warning: Failed to set custom claim for ${coachId}:`, claimError);
         }

        const action = verify ? "verified" : "unverified";
        console.log(`CTRL: Coach ${coachId} ${action} successfully by admin ${adminId}.`);
        res.status(200).json({ message: `Coach ${action} successfully.` });

    } catch (error) {
        console.error(`CTRL Admin Error: verifying coach ${coachId}:`, error);
         if (error.message === 'Nutritionist document not found.') {
             return res.status(404).json({ error: 'Nutritionist not found.' });
         }
        res.status(500).json({ error: `Failed to ${verify ? 'verify' : 'unverify'} coach.` });
    }
};

exports.getPendingCoaches = async (req, res) => {
    if (!checkFirebaseReady(res, "get pending coaches")) return;
    console.log(`CTRL: Admin ${req.user.uid} fetching pending coaches.`);
    try {
        const pendingQuery = db.collection('nutritionists')
                               .where('isVerified', '!=', true) // Find coaches not explicitly verified true
                               .orderBy('createdAt', 'desc');    // Optional ordering

        // Potential Index needed: nutritionists(isVerified ASC, createdAt DESC) or just (isVerified ASC)
        const snapshot = await pendingQuery.get();

        if (snapshot.empty) {
            console.log("CTRL: No pending coaches found.");
            return res.status(200).json({ pendingCoaches: [] });
        }

        // --- V V V --- MODIFIED MAPPING --- V V V ---
        // Map data, including the fields needed by the frontend renderItem
        const pendingCoaches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                 id: doc.id,
                 firstName: data.firstName || '',
                 lastName: data.lastName || '',
                 email: data.email || '',
                 createdAt: data.createdAt || null,
                 // --- ADDED THESE FIELDS ---
                 profileImageUrl: data.profileImage || data.profileImageUrl || null, // Get profile image URL
                 professionalCertificateUrl: data.professionalCertificateUrl || data.professionalCertificate || null // Get certificate URL
                 // --- END ADDED FIELDS ---
            };
        });
        // --- ^ ^ ^ --- END MODIFIED MAPPING --- ^ ^ ^ ---


        console.log(`CTRL: Found ${pendingCoaches.length} pending coaches.`);
        res.status(200).json({ pendingCoaches });

    } catch (error) {
        console.error(`CTRL Admin Error: fetching pending coaches:`, error);
         const isIndexError = error.message?.includes("requires an index");
         if (isIndexError) { console.error("!!! Firestore index likely missing for getPendingCoaches query (isVerified, createdAt) !!!"); return res.status(500).json({ message: "DB index error.", error: "Missing index." }); }
        res.status(500).json({ error: 'Failed to fetch pending coaches.' });
    }
};

exports.getAllUsers = async (req, res) => {
    if (!checkFirebaseReady(res, "get all users")) return;
    console.log(`CTRL: Admin ${req.user.uid} fetching all users.`);
    try {
        // Method 1: List Auth users (more robust if Firestore docs might be missing)
        console.log("CTRL: Listing all Firebase Auth users...");
        let allAuthUsers = []; let nextPageToken;
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            allAuthUsers = allAuthUsers.concat(listUsersResult.users);
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        console.log(`CTRL: Found ${allAuthUsers.length} total users in Firebase Auth.`);

        const allUserIds = allAuthUsers.map(u => u.uid);

        // Fetch corresponding Firestore details AND auth status using the helper
        const combinedDetailsMap = await getMultipleUserDetailsWithAuthStatus(allUserIds);

        // Convert map back to array for response
        const finalUserList = Object.values(combinedDetailsMap);

        // TODO: Add server-side sorting/filtering/pagination based on req.query if needed
        console.log(`CTRL: Returning combined list of ${finalUserList.length} users.`);
        res.status(200).json({ users: finalUserList });

    } catch (error) {
        console.error(`CTRL Admin Error: fetching all users:`, error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    if (!checkFirebaseReady(res, "toggle user status")) return; // Checks Admin, DB
    const adminId = req.user.uid;
    const { userId, disable } = req.body; // User ID to toggle, disable = true/false

    if (!userId || typeof disable !== 'boolean') {
        return res.status(400).json({ error: 'User ID and disable status (true/false) are required.' });
    }
    console.log(`CTRL: Admin ${adminId} attempting to set disabled status of ${userId} to ${disable}.`);

    try {
        // 1. Check if target user exists in Auth
        console.log(`CTRL: Checking Auth user ${userId}...`);
        await admin.auth().getUser(userId); // Throws error if not found
        console.log(`CTRL: Auth user ${userId} found.`);

        // 2. Update Firebase Authentication status
        console.log(`CTRL: Updating Auth disabled status for ${userId} to ${disable}...`);
        await admin.auth().updateUser(userId, {
            disabled: disable
        });
        console.log(`CTRL: Auth status updated for ${userId}.`);

        // 3. Update Firestore status field(s)
        console.log(`CTRL: Attempting to update Firestore status for ${userId}...`);
        const userRef = db.collection('users').doc(userId);
        const nutriRef = db.collection('nutritionists').doc(userId);
        const adminRef = db.collection('admin').doc(userId); // Check if user is also admin

        const updatePayload = {
            authDisabled: disable,
            statusLastUpdatedBy: adminId,
            statusLastUpdatedAt: FieldValue.serverTimestamp()
        };

        // Use batch write for Firestore updates
        const batch = db.batch();
        let updatedInFirestore = false;

        // Check existence and add update to batch if doc exists
        const userSnap = await userRef.get();
        if(userSnap.exists) { batch.update(userRef, updatePayload); updatedInFirestore = true; console.log(`CTRL: Will update 'users' doc.`); }

        const nutriSnap = await nutriRef.get();
        if(nutriSnap.exists) { batch.update(nutriRef, updatePayload); updatedInFirestore = true; console.log(`CTRL: Will update 'nutritionists' doc.`); }

        const adminSnap = await adminRef.get();
        if(adminSnap.exists) { batch.update(adminRef, updatePayload); updatedInFirestore = true; console.log(`CTRL: Will update 'admin' doc.`); }

        if (updatedInFirestore) {
             console.log(`CTRL: Committing Firestore status updates for ${userId}...`);
             await batch.commit();
             console.log(`CTRL: Firestore status updated for ${userId}.`);
        } else {
            console.warn(`CTRL: User ${userId} not found in users, nutritionists, or admin collections in Firestore. Only Auth status updated.`);
        }

        const action = disable ? "disabled" : "enabled";
        console.log(`CTRL: User ${userId} account ${action} successfully by admin ${adminId}.`);
        res.status(200).json({ message: `User account ${action} successfully.` });

    } catch (error) {
        console.error(`CTRL Admin Error: toggling status for user ${userId}:`, error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found in Firebase Authentication.' });
        }
        // Handle other potential errors (e.g., permission denied if admin SDK lacks permissions)
        res.status(500).json({ error: `Failed to ${disable ? 'disable' : 'enable'} user account.` });
    }
};
exports.deleteUserAccount = async (req, res) => {
    if (!checkFirebaseReady(res, "delete user account")) return;
    const adminId = req.user.uid;
    const { userId } = req.params; // Get user ID from URL parameter, e.g., DELETE /admin/users/:userId

    if (!userId) { return res.status(400).json({ error: 'User ID parameter is required.' }); }
    if (userId === adminId) return res.status(403).json({ error: "Admins cannot delete their own account via API." });

    console.log(`CTRL: Admin ${adminId} attempting to HARD DELETE user ${userId}.`);

    try {
        // --- Delete Firestore Data ---
        // Use a batch for top-level docs
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        const nutriRef = db.collection('nutritionists').doc(userId);
        const adminRef = db.collection('admin').doc(userId); // If admins have separate docs

        console.log(`CTRL Delete: Adding main Firestore docs for ${userId} to delete batch...`);
        batch.delete(userRef); // Delete even if it doesn't exist (no error)
        batch.delete(nutriRef);
        batch.delete(adminRef);

        // Add other top-level related docs if necessary (e.g., /userProfiles/{userId})

        console.log(`CTRL Delete: Committing main Firestore doc delete batch for ${userId}...`);
        await batch.commit();
        console.log(`CTRL Delete: Main Firestore docs deleted (or marked for deletion) for ${userId}.`);

        // --- Delete Subcollections (Requires separate handling - potentially recursive Cloud Function) ---
        // WARNING: Directly deleting subcollections is complex. This code DOES NOT delete them.
        // You would typically need a Cloud Function triggered by the document deletion or a script.
        console.warn(`CTRL Delete: Subcollections for user ${userId} (e.g., coachRequests, ratings) were NOT automatically deleted. Manual cleanup or a dedicated function is required.`);
        // Example: Manually trigger a function or log for cleanup
        // await triggerSubcollectionDelete(userId);

        // --- Delete Firebase Authentication User ---
        console.log(`CTRL Delete: Deleting Firebase Auth user ${userId}...`);
        await admin.auth().deleteUser(userId);
        console.log(`CTRL Delete: Firebase Auth user ${userId} deleted successfully by admin ${adminId}.`);

        res.status(200).json({ message: `User ${userId} deleted successfully (Auth deleted, main Firestore docs deleted, subcollections require separate cleanup).` });

    } catch (error) {
        console.error(`CTRL Admin Error: deleting user ${userId}:`, error);
        if (error.code === 'auth/user-not-found') {
             console.warn(`CTRL Admin Warning: Auth user ${userId} not found during deletion, possibly already deleted.`);
             // Still return success as the goal is to ensure user is gone
             return res.status(200).json({ message: `User ${userId} (Auth) not found, cleanup attempted.` });
        }
        // Handle other errors (e.g., permissions)
        res.status(500).json({ error: `Failed to completely delete user ${userId}. Manual check may be required.` });
    }
};
// --- Get Admin Dashboard Summary ---
exports.getAdminDashboardSummary = async (req, res) => {
    if (!checkFirebaseReady(res, "get admin dashboard summary")) return;
    const adminId = req.user?.uid;
    console.log(`CTRL: getAdminDashboardSummary invoked by admin: ${adminId}`);
    try {
        // Fetch Counts
        console.log("CTRL: Fetching counts for admin dashboard...");
        const usersCountQuery = db.collection('users').count();
        const verifiedCoachesCountQuery = db.collection('nutritionists').where('isVerified', '==', true).count();
        const pendingCoachesCountQuery = db.collection('nutritionists').where('isVerified', '==', false).count();

        // Fetch User Growth Aggregates
        console.log("CTRL: Fetching monthly user growth aggregates...");
        const growthCollectionRef = db.collection('aggregates').doc('userGrowth_Monthly').collection('months');
        const numberOfMonths = 6;
        const growthQuery = growthCollectionRef.orderBy('year', 'desc').orderBy('month', 'desc').limit(numberOfMonths);
        const growthPromise = growthQuery.get(); // <<<--- CHECK INDEX HERE (year DESC, month DESC on months Collection Group)

        // Fetch Global/Daily Aggregates
        console.log("CTRL: Fetching global/daily aggregates...");
        const globalCountsRef = db.collection('aggregates').doc('globalCounts');
        const globalCountsPromise = globalCountsRef.get();
        const today = new Date(); const year = today.getFullYear(); const month = today.getMonth() + 1; const day = today.getDate();
        const todayString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dailyStatsRef = db.collection('aggregates').doc('dailyStats').collection('days').doc(todayString);
        const dailyStatsPromise = dailyStatsRef.get();

        // Fetch Recent Activity Example
        const recentActivityPromise = db.collection('nutritionists').where('isVerified', '==', false).orderBy('createdAt', 'desc').limit(5).get(); // <<<--- CHECK INDEX HERE (isVerified ASC, createdAt DESC on nutritionists)

        // Execute Fetches
        console.log("CTRL: Executing all parallel fetches...");
        const [ usersCountSnap, verifiedCoachesCountSnap, pendingCoachesCountSnap, growthSnap, globalCountsSnap, dailyStatsSnap, recentPendingSnap ] = await Promise.all([
            usersCountQuery.get(), verifiedCoachesCountQuery.get(), pendingCoachesCountQuery.get(),
            growthPromise, globalCountsPromise, dailyStatsPromise, recentActivityPromise
        ]);
        console.log("CTRL: All fetches complete.");

        // Process Data
        const summaryData = {
            totalSubscribers: usersCountSnap.data().count, totalCoaches: verifiedCoachesCountSnap.data().count,
            pendingCoaches: pendingCoachesCountSnap.data().count,
            mealsToday: dailyStatsSnap.exists ? (dailyStatsSnap.data().mealsLogged || 0) : 0,
            plansCreated: globalCountsSnap.exists ? (globalCountsSnap.data().totalPlansCreated || 0) : 0,
            userGrowthData: { labels: [], datasets: [ { data: [] }, { data: [] } ] }, recentActivity: []
        };
        // Process Growth Data
        if (!growthSnap.empty) {
             const monthlyData = []; growthSnap.docs.forEach(doc => { monthlyData.push({ id: doc.id, ...doc.data() }); }); monthlyData.reverse();
             const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
             const labels = monthlyData.map(d => monthNames[d.month - 1]);
             const subscriberData = monthlyData.map(d => d.newSubscribers || 0);
             const coachData = monthlyData.map(d => d.newCoaches || 0);
             summaryData.userGrowthData = { labels: labels, datasets: [ /* ... datasets using PALETTE refs ... */ ], legend: ["Subscribers", "Coaches"] };
             console.log("CTRL: Processed user growth data.");
        } else { console.log("CTRL: No monthly growth data found."); }
        // Process Recent Activity
        recentPendingSnap.forEach(doc => { const data = doc.data(); summaryData.recentActivity.push({ id: doc.id, text: `New coach pending: ${data.firstName || ''} ${data.lastName || ''}`, type: 'pending' }); });
        console.log(`CTRL: Sending final admin summary.`);
        res.status(200).json(summaryData);
    } catch (error) {
        console.error(`CTRL Admin Error: fetching dashboard summary:`, error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) { console.error("!!! Firestore index likely missing for dashboard summary query !!! Check Error Details:", error.details || error.message ); return res.status(500).json({ message: "DB index error.", error: "Missing DB index." }); }
        res.status(500).json({ error: 'Failed to fetch dashboard summary.' });
    }
};

exports.getFeedbacks = async (req, res) => {
    if (!checkFirebaseReady(res, "get feedbacks")) return;
    console.log(`CTRL: Admin ${req.user.uid} fetching feedbacks.`);
    try {
        const statusFilter = req.query.status; // Optional status filter from query param
        let feedbackQuery = db.collection('Feedbacks') // <<<--- Match your collection name "Feedbacks"
                              .orderBy('createdAt', 'desc'); // <<<--- Order by your 'createdAt' field

        // Apply status filter if provided and not 'All'
        if (statusFilter && statusFilter !== 'All') {
            console.log(`CTRL: Applying feedback status filter: ${statusFilter}`);
            feedbackQuery = feedbackQuery.where('status', '==', statusFilter); // <<<--- CHECK INDEX (status ASC, createdAt DESC) or (status ASC)
        }

        const snapshot = await feedbackQuery.limit(100).get(); // Limit results

        if (snapshot.empty) {
            console.log(`CTRL: No feedbacks found with filter: ${statusFilter || 'All'}.`);
            return res.status(200).json({ feedbacks: [] });
        }

        // Map data, including potentially useful sender info
        const feedbacks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                message: data.message || '',
                status: data.status || 'Unknown',
                createdAt: data.createdAt || null, // Pass the timestamp object
                lastUpdatedAt: data.lastUpdatedAt || null,
                lastUpdatedBy: data.lastUpdatedBy || null, // Admin who last touched it
                senderEmail: data.senderEmail || 'anonymous', // Your field name
                userId: data.userId || null, // Your field name
                userType: data.userType || 'Unknown', // Your field name
                // Include sender name if you fetch it based on userId (more complex)
            };
        });
        console.log(`CTRL: Fetched ${feedbacks.length} feedback documents (Filter: ${statusFilter || 'All'}).`);
        res.status(200).json({ feedbacks });

    } catch(error) {
        console.error(`CTRL Admin Error: fetching feedbacks:`, error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) { console.error("!!! Firestore index likely missing for getFeedbacks query (status, createdAt) !!!"); return res.status(500).json({ message: "DB index error.", error: "Missing index." }); }
        res.status(500).json({ error: 'Failed to fetch feedback.' });
    }
};

// --- Update Feedback Status ---
exports.updateFeedbackStatus = async (req, res) => {
     if (!checkFirebaseReady(res, "update feedback status")) return;
     const adminId = req.user.uid;
     const { feedbackId } = req.params; // Get ID from route parameter (e.g., PUT /admin/feedbacks/:feedbackId/status)
     const { status } = req.body; // Get new status from request body

     // Use statuses relevant to your workflow
     const validStatuses = ['New', 'Read', 'Archived']; // Add your actual statuses
     if (!feedbackId || !status || !validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Feedback ID and a valid status required.' });
     }
     console.log(`CTRL: Admin ${adminId} updating feedback ${feedbackId} status to ${status}.`);

     try {
         const feedbackRef = db.collection('Feedbacks').doc(feedbackId); // <<<--- Match collection name "Feedbacks"

         // Optional: Check if feedback exists before updating
         // const feedbackSnap = await feedbackRef.get();
         // if (!feedbackSnap.exists) {
         //      return res.status(404).json({ error: 'Feedback not found.' });
         // }

         // Update the status and tracking fields
         await feedbackRef.update({
              status: status,
              lastUpdatedAt: FieldValue.serverTimestamp(), // Your field name
              lastUpdatedBy: adminId // Your field name
         });

         console.log(`CTRL: Feedback ${feedbackId} status updated to ${status}.`);
         res.status(200).json({ message: 'Feedback status updated successfully.' });

     } catch(error) {
         console.error(`CTRL Admin Error: updating feedback ${feedbackId}:`, error);
         // Handle "not found" error specifically if needed (e.g., error.code === 5)
         if (error.code === 5 || error.message?.includes("NOT_FOUND")) {
              return res.status(404).json({ error: 'Feedback not found.' });
         }
         res.status(500).json({ error: 'Failed to update feedback status.' });
     }
 };

// --- Delete Feedback ---
// WARNING: Hard delete. Consider adding an 'isDeleted' flag instead (soft delete).
exports.deleteFeedback = async (req, res) => {
    if (!checkFirebaseReady(res, "delete feedback")) return;
    const adminId = req.user.uid;
    const { feedbackId } = req.params; // Get ID from route parameter (e.g., DELETE /admin/feedbacks/:feedbackId)

    if (!feedbackId) return res.status(400).json({ error: 'Feedback ID required.' });
    console.log(`CTRL: Admin ${adminId} deleting feedback ${feedbackId}.`);

    try {
        const feedbackRef = db.collection('Feedbacks').doc(feedbackId); // <<<--- Match collection name "Feedbacks"

        // Optional: Check existence before delete if you want to return 404
        // const doc = await feedbackRef.get();
        // if (!doc.exists) return res.status(404).json({ error: 'Feedback not found.' });

        await feedbackRef.delete(); // delete() doesn't error if doc doesn't exist

        console.log(`CTRL: Feedback ${feedbackId} deleted by admin ${adminId}.`);
        res.status(200).json({ message: 'Feedback deleted successfully.' });

    } catch(error) {
        console.error(`CTRL Admin Error: deleting feedback ${feedbackId}:`, error);
        res.status(500).json({ error: 'Failed to delete feedback.' });
    }
};
exports.getNutritionistDetailsById = async (req, res) => {
    if (!checkFirebaseReady(res, "get nutritionist details by ID")) return;
    const adminId = req.user.uid;
    const { nutritionistId } = req.params; // Get ID from route parameter

    if (!nutritionistId) {
        return res.status(400).json({ error: 'Nutritionist ID parameter is required.' });
    }
    console.log(`CTRL: Admin ${adminId} fetching full details for nutritionist ${nutritionistId}.`);

    try {
        const coachRef = db.collection('nutritionists').doc(nutritionistId);
        const coachSnap = await coachRef.get();

        if (!coachSnap.exists) {
            console.warn(`CTRL: Nutritionist ${nutritionistId} not found when fetching details.`);
            return res.status(404).json({ error: 'Nutritionist not found.' });
        }

        const coachData = { id: coachSnap.id, ...coachSnap.data() };
        console.log(`CTRL: Found nutritionist ${nutritionistId}. Sending full details.`);
        // Optionally fetch related data like recent ratings or client count here if needed

        res.status(200).json({ nutritionist: coachData });

    } catch (error) {
        console.error(`CTRL Admin Error: fetching details for nutritionist ${nutritionistId}:`, error);
        res.status(500).json({ error: 'Failed to fetch nutritionist details.' });
    }
};


// --- Export ALL functions ---
// Using direct assignment which works correctly
exports.verifyCoach = exports.verifyCoach;
exports.getPendingCoaches = exports.getPendingCoaches;
exports.getAllUsers = exports.getAllUsers;
exports.toggleUserStatus = exports.toggleUserStatus;
exports.deleteUserAccount = exports.deleteUserAccount;
exports.getAdminDashboardSummary = exports.getAdminDashboardSummary;
exports.getFeedbacks = exports.getFeedbacks;
exports.updateFeedbackStatus = exports.updateFeedbackStatus;
exports.deleteFeedback = exports.deleteFeedback;
exports.getNutritionistDetailsById = exports.getNutritionistDetailsById; 
// Remove the redundant module.exports = {} block if it exists