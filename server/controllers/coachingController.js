// controllers/coachingController.js
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin; // Needed for FieldValue
const db = firebaseInstances.db;       // Firestore instance
const FieldValue = admin.firestore.FieldValue; // Import FieldValue
const { sendCoachRequestAcceptedNotification } = require('./notificationController');
const { sendInvitationSentNotification, sendInvitationReceivedNotification, sendInvitationAcceptedNotification, sendInvitationDeclinedNotification, sendCoachSelectedNotification } = require('../services/notificationService');

// Helper: Check Firebase DB readiness
function checkFirebaseReady(res, action = "perform action") {
    if (!db) {
        console.error(`Firebase DB service not initialized when trying to ${action}.`);
        res.status(500).json({ error: `Server configuration error (${action}).` });
        return false;
    }
    return true;
}

// Helper: Get LIMITED, public details for one nutritionist
const getNutritionistPublicDetails = async (nutritionistId) => {
    if (!nutritionistId || !db) return null;
    console.log(`fetching nutritionist details ${nutritionistId}`);
    try {
        const docRef = db.collection('nutritionists').doc(nutritionistId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            console.log(`nutritionist found  ${nutritionistId}`);
            const data = docSnap.data();
            return {
                id: docSnap.id,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                specialization: data.specialization || '',
                profileImageUrl: data.profileImage || data.profileImageUrl || null,
                yearsOfExperience: data.yearsOfExperience || '0',
                workplace: data.workplace || '',
                shortBio: data.shortBio || '',
                ratings: data.ratings || 0,
                rating: data.rating|| 0,
                userType: data.userType || 'Professional'
            };
        } else { console.warn(`nutritionist not found ${nutritionistId}`); return null; }
    } catch (error) { console.error(`error fetching the nutritionist ${nutritionistId}:`, error); return null; }
};

const getMultipleNutritionistPublicDetails = async (nutritionistIds) => {
    if (!db || !nutritionistIds || nutritionistIds.length === 0) {
        console.log("missing db or ids couldn't get data ");
        return {};
    }
    const uniqueIds = [...new Set(nutritionistIds.filter(id => !!id))];
    if (uniqueIds.length === 0) {
        console.log("no ids");
        return {};
    }
    console.log(`fetching details for  ${uniqueIds.join(', ')}`);
    const refs = uniqueIds.map(id => db.collection('nutritionists').doc(id));
    try {
        const docSnaps = await db.getAll(...refs);
        console.log(`CTRL Helper: getMultipleNutritionistDetails - db.getAll() returned ${docSnaps.length} snapshots.`);
        const detailsMap = {};
        docSnaps.forEach(docSnap => {
            if (docSnap.exists) {
                const data = docSnap.data();
                detailsMap[docSnap.id] = {
                    id: docSnap.id,
                    firstName: data.firstName || '', lastName: data.lastName || '', specialization: data.specialization || '',
                    profileImageUrl: data.profileImage || data.profileImageUrl || null, // Use actual field name
                    yearsOfExperience: data.yearsOfExperience || '0', // Keep string
                    workplace: data.workplace || '', shortBio: data.shortBio || '',
                    averageRating: data.averageRating || 0, ratingCount: data.ratingCount || 0,
                    userType: data.userType || 'Professional'
                };
            }
        });
        console.log(`Map ${Object.keys(detailsMap).length} nutritionists.`);
        return detailsMap;
    } catch (error) {
        console.error("Error in getMultipleNutritionistPublicDetails", error);
        return {};
    }
};


const getMultipleUserPublicDetails = async (userIds) => {
    if (!db || !userIds || userIds.length === 0) {
        console.log(" no IDs or DB");
        return {};
    }
    const uniqueIds = [...new Set(userIds.filter(id => !!id))];
    if (uniqueIds.length === 0) {
        console.log(" no  valid IDs.");
        return {};
    }
    console.log(`Fetching details for User IDs: ${uniqueIds.join(', ')}`);
    const refs = uniqueIds.map(id => db.collection('users').doc(id));
    try {
        const docSnaps = await db.getAll(...refs);
        console.log(`db.getAll() returned ${docSnaps.length} snapshots.`);
        const detailsMap = {};
        docSnaps.forEach(docSnap => {
            if (docSnap.exists) {
                const data = docSnap.data();
                detailsMap[docSnap.id] = {
                    id: docSnap.id,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    profileImageUrl: data.profileImage || data.profileImageUrl || null,
                    goal: data.goal  || 'Goal not specified',
                    userType: data.userType || 'Personal'

                };
            } else {
                console.warn(`user doc not found ${docSnap.id}`);
            }
        });
        console.log(`Mapp ${Object.keys(detailsMap).length} users.`);
        return detailsMap;
    } catch (error) {
        console.error(" Error in getMultipleUserPublicDetails", error);
        return {};
    }
};

exports.getCoachingStatus = async (req, res) => {
    console.log("get coaching status ");
    if (!checkFirebaseReady(res, "get coaching status")) return;
    const userId = req.user?.uid; if (!userId) return res.status(401).json({ error: "User auth missing." });
    console.log(`Processing for user: ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();
        const userData = userDocSnap.exists ? userDocSnap.data() : {};
        const activeCoachId = userData?.activeCoachId;
        console.log(`Active coach ID: ${activeCoachId || 'null'}`);

        if (activeCoachId) {
            console.log(`Fetching details for active coach: ${activeCoachId}`);
            const activeCoachDetails = await getNutritionistPublicDetails(activeCoachId);
            if (activeCoachDetails) {
                console.log("Sending response for ACTIVE state.");
                return res.status(200).json({ activeCoachId, activeCoachDetails, pendingRequests: [], acceptedRequests: [] });
            } else {
                console.warn(`Active coach details missing for ${activeCoachId}. Treating as no active coach.`);
                return res.status(200).json({ activeCoachId: null, pendingRequests: [], acceptedRequests: [] });
            }
        } else {
            console.log(`fetching requests subcollection: users/${userId}/coachRequests`);
            const requestsCollectionRef = userDocRef.collection('coachRequests');
            // !!! Requires index on 'status' field for 'coachRequests' collection !!!
            const requestsQuery = requestsCollectionRef.where("status", "in", ["pending", "accepted"]);
            const querySnapshot = await requestsQuery.get();
            console.log(`Request  executed. Found ${querySnapshot.size} requests.`);

            const pending = [], accepted = [], nutritionistIdsToFetch = [];
            querySnapshot.forEach(docSnap => {
                const request = { id: docSnap.id, ...docSnap.data() };
                if (request.nutritionistId) {
                    nutritionistIdsToFetch.push(request.nutritionistId);
                    if (request.status === 'pending') pending.push(request);
                    else if (request.status === 'accepted') accepted.push(request);
                } else { console.warn(`getCoachingStatus Request ${docSnap.id} missing nutritionistId!`); }
            });
            console.log(`Need details for ${nutritionistIdsToFetch.length} unique nutritionists.`);

            const nutritionistDetailsMap = await getMultipleNutritionistPublicDetails(nutritionistIdsToFetch);
            console.log(`Fetched details map size: ${Object.keys(nutritionistDetailsMap).length}`);

            const mapRequests = (reqList) => reqList.map(req => ({
                ...req, details: nutritionistDetailsMap[req.nutritionistId] || null
            })).filter(req => req.details !== null); // Filter out if coach details missing

            const mappedAccepted = mapRequests(accepted);
            const mappedPending = mapRequests(pending);
            console.log(`Accepted: ${mappedAccepted.length}, Pending: ${mappedPending.length}`);

            console.log("Sending response for PENDING/ACCEPTED state.");
            return res.status(200).json({ activeCoachId: null, acceptedRequests: mappedAccepted, pendingRequests: mappedPending });
        }
    } catch (error) {
        console.error(`getCoachingStatus FAILED for user ${userId}:`, error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) {
            console.error("Firebase index missing ");
            return res.status(500).json({ message: "Database config error.", error: "Missing DB index." });
        }
        res.status(500).json({ message: "Server error fetching coaching info", error: error.message });
    }
    console.error(`getCoachingStatus reached end without returning for user ${userId}!`);
    if (!res.headersSent) { res.status(500).json({ error: "Unknown server error in getCoachingStatus." }); }
};

exports.selectCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "select coach")) return;
    const userId = req.user?.uid;
    const { requestId, nutritionistId } = req.body; // Nutritionist ID is the coachId here
    if (!userId || !requestId || !nutritionistId) return res.status(400).json({ error: "User ID, Request ID and Nutritionist ID required." });
    console.log(`CTRL: selectCoach user: ${userId}, coach: ${nutritionistId}, req: ${requestId}`);
    try {
        const requestDocRef = db.collection('users').doc(userId).collection('coachRequests').doc(requestId);
        const userDocRef = db.collection('users').doc(userId);
        const coachDocRef = db.collection('nutritionists').doc(nutritionistId);

        await db.runTransaction(async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            const userDoc = await transaction.get(userDocRef);
            const coachDoc = await transaction.get(coachDocRef); // Read coach doc

            if (!requestDoc.exists) throw new Error(`Request ${requestId} not found.`);
            if (!coachDoc.exists) throw new Error(`Selected coach ${nutritionistId} not found.`);
            const requestData = requestDoc.data();
            if (requestData.nutritionistId !== nutritionistId) throw new Error(`Request nutritionist mismatch.`);
            if (requestData.status !== 'accepted') throw new Error(`Request not in 'accepted' state.`);
            if (userDoc.exists && userDoc.data()?.activeCoachId) throw new Error(`User already has an active coach.`);

            console.log(`CTRL Transaction: Selecting coach ${nutritionistId} for user ${userId}.`);
            transaction.set(userDocRef, { activeCoachId: nutritionistId }, { merge: true });
            transaction.update(requestDocRef, { status: 'selected' });
            transaction.update(coachDocRef, { clientIds: FieldValue.arrayUnion(userId) }); // Add user to coach's list
        });
        
        // ✅ SEND SELECTION NOTIFICATION TO COACH
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const userName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'New Client';
            
            await sendCoachSelectedNotification(nutritionistId, userName);
            console.log(`[CoachingController] Coach selected notification sent to coach ${nutritionistId}`);
        } catch (notificationError) {
            console.error('[CoachingController] Error sending selection notification:', notificationError);
        }

        console.log(`CTRL: Coach ${nutritionistId} selected by ${userId}.`);
        res.status(200).json({ message: "Coach selected successfully." });
    } catch (error) {
        console.error(`CTRL Error: selecting coach for user ${userId}:`, error);
        const isConflict = error.message?.includes("already has an active coach");
        res.status(isConflict ? 409 : 500).json({ message: "Failed to select coach", error: error.message });
    }
};

// User sends a request TO a coach
exports.sendCoachRequest = async (req, res) => {
    if (!checkFirebaseReady(res, "send coach request")) return;
    const userId = req.user?.uid; const { nutritionistId } = req.body;
    if (!userId || !nutritionistId) return res.status(400).json({ error: "User ID and Nutritionist ID required." });
    console.log(`CTRL: sendCoachRequest from user: ${userId} to nutritionist: ${nutritionistId}`);
    try {
        // Pre-checks
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();
        if (userDocSnap.exists && userDocSnap.data()?.activeCoachId) { return res.status(409).json({ error: "You already have an active coach." }); }

        const requestsCollectionRef = userDocRef.collection('coachRequests');
        // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
        const existingQuery = requestsCollectionRef.where("nutritionistId", "==", nutritionistId).where("status", "in", ["pending", "accepted", "selected"]);
        const existingSnapshot = await existingQuery.get();
        if (!existingSnapshot.empty) { return res.status(409).json({ error: "A request to this coach already exists or is active." }); }

        const nutritionistDocRef = db.collection('nutritionists').doc(nutritionistId);
        const nutritionistDocSnap = await nutritionistDocRef.get();
        if (!nutritionistDocSnap.exists) { return res.status(404).json({ error: "Selected nutritionist not found." }); }

        // Create request
        const newRequestData = { nutritionistId, status: 'pending', requestTimestamp: FieldValue.serverTimestamp() };
        const docRef = await requestsCollectionRef.add(newRequestData);
        console.log(`CTRL: Coach request created: ${docRef.id} under user ${userId}`);
        
        // ✅ SEND INVITATION NOTIFICATION TO COACH
        try {
            const userName = `${userDocSnap.data()?.firstName || ''} ${userDocSnap.data()?.lastName || ''}`.trim() || 'New User';
            
            await sendInvitationSentNotification(nutritionistId, userName);
            console.log(`[CoachingController] Invitation sent notification sent to coach ${nutritionistId}`);
        } catch (notificationError) {
            console.error('[CoachingController] Error sending invitation notification:', notificationError);
        }
        
        res.status(201).json({ message: "Request sent successfully.", requestId: docRef.id });
    } catch (error) {
        console.error(`CTRL Error: sending coach request from ${userId} to ${nutritionistId}:`, error);
        res.status(500).json({ message: "Server error sending request", error: "An internal error occurred." });
    }
};

// Get status of request between user and ONE specific nutritionist
exports.getSpecificRequestStatus = async (req, res) => {
    if (!checkFirebaseReady(res, "get specific request status")) return;
    const userId = req.user?.uid; const { nutritionistId } = req.params;
    if (!userId || !nutritionistId) return res.status(400).json({ error: "User ID and Nutritionist ID required." });
    console.log(`CTRL: getSpecificRequestStatus for user: ${userId}, target nutritionist: ${nutritionistId}`);
    try {
        const requestsCollectionRef = db.collection('users').doc(userId).collection('coachRequests');
        // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
        const q = requestsCollectionRef.where("nutritionistId", "==", nutritionistId).where("status", "in", ["pending", "accepted", "selected"]).limit(1);
        const querySnapshot = await q.get();
        console.log(`CTRL: getSpecificRequestStatus - Query found ${querySnapshot.size} requests.`);
        if (!querySnapshot.empty) {
            res.status(200).json({ status: querySnapshot.docs[0].data().status });
        } else {
            res.status(200).json({ status: 'none' });
        }
    } catch (error) {
        console.error(`CTRL Error: getting specific request status for ${userId} to ${nutritionistId}:`, error);
        const isIndexError = error.message?.includes("requires an index");
        if (isIndexError) { console.error("!!! FIRESTORE INDEX LIKELY MISSING for users/{userId}/coachRequests query on (nutritionistId, status) fields !!!"); return res.status(500).json({ message: "Database config error.", error: "Missing DB index." }); }
        res.status(500).json({ message: "Server error checking request status", error: "An internal error occurred." });
    }
};

// User ends active relationship
exports.endRelationship = async (req, res) => {
    if (!checkFirebaseReady(res, "end relationship")) return;
    const userId = req.user?.uid; if (!userId) return res.status(401).json({ error: "User authentication missing." });
    console.log(`CTRL: endRelationship request for user: ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        let coachIdToEnd = null;

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) throw new Error("User not found.");
            const userData = userDoc.data();
            coachIdToEnd = userData.activeCoachId;
            if (!coachIdToEnd) { console.log(`CTRL: User ${userId} has no active coach to end.`); return; }

            const requestsCollectionRef = userDocRef.collection('coachRequests');
            // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
            const q = requestsCollectionRef.where("nutritionistId", "==", coachIdToEnd).where("status", "==", "selected").limit(1);
            const requestSnap = await transaction.get(q);

            console.log(`CTRL Transaction: User ${userId} ending relationship with coach ${coachIdToEnd}`);
            transaction.update(userDocRef, { activeCoachId: FieldValue.delete() });
            if (!requestSnap.empty) {
                const requestRefToUpdate = requestSnap.docs[0].ref;
                transaction.update(requestRefToUpdate, { status: 'ended_by_user', endedTimestamp: FieldValue.serverTimestamp() });
            } else { console.warn(`CTRL: Could not find 'selected' request to update for user ${userId} and coach ${coachIdToEnd}.`); }

            if (coachIdToEnd) {
                const coachDocRef = db.collection('nutritionists').doc(coachIdToEnd);
                transaction.update(coachDocRef, { clientIds: FieldValue.arrayRemove(userId) }); // Remove from coach's list
                console.log(`CTRL Transaction: Removed user ${userId} from coach ${coachIdToEnd}'s clientIds.`);
            }
        });
        console.log(`CTRL: Relationship ended successfully for user ${userId}.`);
        res.status(200).json({ message: "Coaching relationship ended." });
    } catch (error) {
        console.error(`CTRL Error: ending relationship for user ${userId}:`, error);
        res.status(500).json({ message: "Server error ending relationship", error: error.message });
    }
};

// User blocks a coach
exports.blockCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "block coach")) return;
    const userId = req.user?.uid; const { nutritionistId } = req.body;
    if (!userId || !nutritionistId) return res.status(400).json({ error: "User ID and Nutritionist ID required." });
    console.log(`CTRL: blockCoach request from user: ${userId} for nutritionist: ${nutritionistId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        const blockDocRef = userDocRef.collection('blockedCoaches').doc(nutritionistId);
        const requestsCollectionRef = userDocRef.collection('coachRequests');

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            const userData = userDoc.exists ? userDoc.data() : {};
            const activeCoachId = userData.activeCoachId;
            let requestDocToUpdate = null;

            if (activeCoachId && activeCoachId === nutritionistId) {
                console.log(`CTRL Transaction: Ending relationship with ${activeCoachId} due to block.`);
                // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
                const q = requestsCollectionRef.where("nutritionistId", "==", activeCoachId).where("status", "==", "selected").limit(1);
                const requestSnap = await transaction.get(q);
                if (!requestSnap.empty) { requestDocToUpdate = requestSnap.docs[0].ref; }

                transaction.update(userDocRef, { activeCoachId: FieldValue.delete() });
                if (requestDocToUpdate) { transaction.update(requestDocToUpdate, { status: 'blocked_by_user', endedTimestamp: FieldValue.serverTimestamp() }); }

                const coachDocRef = db.collection('nutritionists').doc(activeCoachId);
                transaction.update(coachDocRef, { clientIds: FieldValue.arrayRemove(userId) }); // Remove from coach's list
                console.log(`CTRL Transaction: Removed user ${userId} from coach ${activeCoachId}'s clientIds due to block.`);
            }
            console.log(`CTRL Transaction: Setting block document for coach ${nutritionistId}`);
            transaction.set(blockDocRef, { blockedAt: FieldValue.serverTimestamp() });
        });
        console.log(`CTRL: Nutritionist ${nutritionistId} blocked by user ${userId}.`);
        res.status(200).json({ message: "Coach blocked and relationship ended if active." });
    } catch (error) { console.error(`CTRL Error: blocking coach ${nutritionistId} for ${userId}:`, error); res.status(500).json({ message: "Server error blocking coach", error: error.message }); }
};

// User unblocks a coach
exports.unblockCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "unblock coach")) return;
    const userId = req.user?.uid; const { nutritionistId } = req.body;
    if (!userId || !nutritionistId) return res.status(400).json({ error: "User ID and Nutritionist ID required." });
    console.log(`CTRL: unblockCoach request from user: ${userId} for nutritionist: ${nutritionistId}`);
    try {
        const blockDocRef = db.collection('users').doc(userId).collection('blockedCoaches').doc(nutritionistId);
        await blockDocRef.delete(); // Simply delete the block doc
        console.log(`CTRL: Nutritionist ${nutritionistId} unblocked by user ${userId}.`);
        res.status(200).json({ message: "Coach unblocked successfully." });
    } catch (error) { console.error(`CTRL Error: unblocking coach ${nutritionistId} for user ${userId}:`, error); res.status(500).json({ message: "Server error unblocking coach", error: error.message }); }
};

// User rates a coach
exports.rateCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "rate coach")) return;
    const userId = req.user?.uid; const { nutritionistId, rating } = req.body;
    if (!userId || !nutritionistId || rating === undefined) return res.status(400).json({ error: "User ID, Nutritionist ID, and Rating required." });
    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    console.log(`CTRL: rateCoach request from user: ${userId} for nutritionist: ${nutritionistId} with rating: ${rating}`);
    try {
        await db.runTransaction(async (transaction) => {
            const nutritionistDocRef = db.collection('nutritionists').doc(nutritionistId);
            const ratingDocRef = nutritionistDocRef.collection('ratings').doc(userId);
            const userRequestsRef = db.collection('users').doc(userId).collection('coachRequests');
            // Reads
            const nutritionistDoc = await transaction.get(nutritionistDocRef);
            const previousRatingDoc = await transaction.get(ratingDocRef);
            // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
            const requestQuery = userRequestsRef.where("nutritionistId", "==", nutritionistId).where("status", "in", ["selected", "ended_by_user", "ended_by_coach"]).limit(1);
            const requestSnap = await transaction.get(requestQuery);
            // Validations
            if (!nutritionistDoc.exists) throw new Error("Nutritionist not found.");
            // Calculations
            const nutritionistData = nutritionistDoc.data(); const previousRatingData = previousRatingDoc.exists ? previousRatingDoc.data() : null;
            const currentAvg = nutritionistData.averageRating || 0; const currentCount = nutritionistData.ratingCount || 0;
            let newCount = currentCount; let newSum = currentAvg * currentCount;
            if (previousRatingData) { newSum -= previousRatingData.rating; } else { newCount += 1; }
            newSum += rating;
            const newAverage = newCount > 0 ? newSum / newCount : 0; const newAverageRounded = Math.round(newAverage * 10) / 10;
            // Writes
            transaction.set(ratingDocRef, { rating: rating, ratedAt: FieldValue.serverTimestamp() });
            transaction.update(nutritionistDocRef, { averageRating: newAverageRounded, ratingCount: newCount });
            if (!requestSnap.empty) { transaction.update(requestSnap.docs[0].ref, { status: 'rated', ratingGiven: rating }); }
        });
        console.log(`CTRL: Nutritionist ${nutritionistId} rated ${rating} by user ${userId}.`);
        res.status(200).json({ message: "Rating submitted successfully." });
    } catch (error) { console.error(`CTRL Error: rating coach ${nutritionistId} for ${userId}:`, error); res.status(error.message === "Nutritionist not found." ? 404 : 500).json({ message: "Server error submitting rating", error: error.message }); }
};


// --- COACH-FOCUSED Endpoints ---

// COACH SIDE: Get list of incoming PENDING requests
exports.getCoachRequests = async (req, res) => {
    if (!checkFirebaseReady(res, "get coach requests")) return;
    const coachId = req.user?.uid;
    if (!coachId) return res.status(401).json({ error: "Coach authentication missing." });
    console.log(`CTRL: getCoachRequests invoked for coach: ${coachId}`);

    try {
        console.log("CTRL: getCoachRequests - Using Collection Group Query for 'coachRequests'");
        // !!! REQUIRES A FIRESTORE INDEX: Collection='coachRequests', Fields: nutritionistId (Asc), status (Asc), Scope: Collection group !!!
        const requestsQuery = db.collectionGroup('coachRequests')
            .where('nutritionistId', '==', coachId)
            .where('status', '==', 'pending');

        const querySnapshot = await requestsQuery.get();
        console.log(`CTRL: getCoachRequests - Query found ${querySnapshot.size} pending requests.`);

        const pendingRequestsData = [];
        const userIdsToFetch = [];

        querySnapshot.forEach(docSnap => {
            const requestData = docSnap.data();
            const userId = docSnap.ref.parent.parent.id; // Get User ID from path
            if (userId) {
                pendingRequestsData.push({
                    requestId: docSnap.id, userId: userId, ...requestData
                });
                userIdsToFetch.push(userId);
            } else { console.warn(`CTRL: getCoachRequests - Could not extract userId for request ${docSnap.id}`); }
        });

        const userDetailsMap = await getMultipleUserPublicDetails(userIdsToFetch); // Fetch details for users

        const results = pendingRequestsData.map(req => ({
            ...req,
            userDetails: userDetailsMap[req.userId] || null // Add user details
        })).filter(req => req.userDetails !== null); // Filter out if user details failed

        console.log(`CTRL: getCoachRequests - Returning ${results.length} requests with details.`);
        res.status(200).json({ pendingRequests: results });

    } catch (error) {
        console.error(`CTRL Error: getting requests for coach ${coachId}:`, error);
        const isIndexError = error.message?.includes("requires an index") || error.message?.includes("needs an index");
        if (isIndexError) {
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            console.error(`!!! FIRESTORE INDEX MISSING for Collection Group 'coachRequests' !!!`);
            console.error(`!!! Go to Firebase Console -> Firestore -> Indexes -> Composite.`);
            console.error(`!!! Create an index for Collection ID='coachRequests', Fields: nutritionistId (Asc), status (Asc). Scope: Collection Group !!!`);
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            return res.status(500).json({ message: "Database configuration error.", error: "Missing required database index." });
        }
        res.status(500).json({ message: "Server error fetching coach requests", error: error.message });
    }
};

// COACH SIDE: Accept a request
exports.acceptRequest = async (req, res) => {
    if (!checkFirebaseReady(res, "accept request")) return;
    const coachId = req.user?.uid; // Coach's ID
    const { userId, requestId } = req.body; // User who sent request, ID of the request doc
    if (!coachId || !userId || !requestId) return res.status(400).json({ error: "Coach ID, User ID and Request ID are required." });
    console.log(`CTRL: acceptRequest by coach: ${coachId} for user: ${userId}, request: ${requestId}`);

    try {
        const requestDocRef = db.collection('users').doc(userId).collection('coachRequests').doc(requestId);

        // Optional safety checks (Read before write)
        const requestSnap = await requestDocRef.get();
        if (!requestSnap.exists) throw new Error("Request not found.");
        const requestData = requestSnap.data();
        if (requestData.status !== 'pending') throw new Error("Request is no longer pending.");
        if (requestData.nutritionistId !== coachId) throw new Error("Request not directed at this coach.");

        // Update status to 'accepted'
        await requestDocRef.update({
            status: 'accepted',
            acceptedTimestamp: FieldValue.serverTimestamp()
        });

        // ✅ SEND ACCEPTANCE NOTIFICATION TO USER
        try {
            const coachDoc = await db.collection('nutritionists').doc(coachId).get();
            const coachData = coachDoc.data();
            const coachName = `${coachData?.firstName || ''} ${coachData?.lastName || ''}`.trim() || 'Your Coach';
            
            await sendInvitationAcceptedNotification(userId, coachName);
            console.log(`[CoachingController] Invitation accepted notification sent to user ${userId}`);
        } catch (notificationError) {
            console.error('[CoachingController] Error sending acceptance notification:', notificationError);
        }
        
        res.status(200).json({ message: "Request accepted successfully." });
    } catch (error) {
        console.error(`CTRL Error: accepting request ${requestId} for user ${userId} by coach ${coachId}:`, error);
        if (error.code === 5 || error.message?.includes("not found")) return res.status(404).json({ message: "Request not found.", error: error.message });
        if (error.message?.includes("not directed at this coach")) return res.status(403).json({ message: "Forbidden.", error: error.message });
        if (error.message?.includes("no longer pending")) return res.status(409).json({ message: "Conflict.", error: error.message });
        res.status(500).json({ message: "Server error accepting request", error: error.message });
    }
};

// COACH SIDE: Decline a request
exports.declineRequest = async (req, res) => {
    if (!checkFirebaseReady(res, "decline request")) return;
    const coachId = req.user?.uid; // Coach's ID
    const { userId, requestId } = req.body; // User who sent request, ID of the request doc
    if (!coachId || !userId || !requestId) return res.status(400).json({ error: "Coach ID, User ID and Request ID are required." });
    console.log(`CTRL: declineRequest by coach: ${coachId} for user: ${userId}, request: ${requestId}`);

    try {
        const requestDocRef = db.collection('users').doc(userId).collection('coachRequests').doc(requestId);

        // Optional safety checks (Read before write)
        const requestSnap = await requestDocRef.get();
        if (!requestSnap.exists) throw new Error("Request not found.");
        const requestData = requestSnap.data();
        if (requestData.status !== 'pending') throw new Error("Request is no longer pending.");
        if (requestData.nutritionistId !== coachId) throw new Error("Request not directed at this coach.");

        // Update status to 'declined'
        await requestDocRef.update({
            status: 'declined',
            declinedTimestamp: FieldValue.serverTimestamp()
        });

        // ✅ SEND DECLINE NOTIFICATION TO USER
        try {
            const coachDoc = await db.collection('nutritionists').doc(coachId).get();
            const coachData = coachDoc.data();
            const coachName = `${coachData?.firstName || ''} ${coachData?.lastName || ''}`.trim() || 'Coach';
            
            await sendInvitationDeclinedNotification(userId, coachName);
            console.log(`[CoachingController] Invitation declined notification sent to user ${userId}`);
        } catch (notificationError) {
            console.error('[CoachingController] Error sending decline notification:', notificationError);
        }

        res.status(200).json({ message: "Request declined successfully." });
    } catch (error) {
        console.error(`CTRL Error: declining request ${requestId} for user ${userId} by coach ${coachId}:`, error);
        if (error.code === 5 || error.message?.includes("not found")) return res.status(404).json({ message: "Request not found.", error: error.message });
        if (error.message?.includes("not directed at this coach")) return res.status(403).json({ message: "Forbidden.", error: error.message });
        if (error.message?.includes("no longer pending")) return res.status(409).json({ message: "Conflict.", error: error.message });
        res.status(500).json({ message: "Server error declining request", error: error.message });
    }
};

// COACH SIDE: End relationship with a client
exports.coachEndRelationship = async (req, res) => {
    if (!checkFirebaseReady(res, "coach end relationship")) return;
    const coachId = req.user?.uid; // Coach's ID
    const { clientId } = req.body; // User/Client's ID
    if (!coachId || !clientId) return res.status(400).json({ error: "Coach ID and Client ID are required." });
    console.log(`CTRL: coachEndRelationship by coach: ${coachId} for client: ${clientId}`);
    try {
        const clientDocRef = db.collection('users').doc(clientId);
        const coachDocRef = db.collection('nutritionists').doc(coachId);

        await db.runTransaction(async (transaction) => {
            // Reads
            const clientDoc = await transaction.get(clientDocRef);
            if (!clientDoc.exists) throw new Error("Client user not found.");
            const clientData = clientDoc.data();
            const activeCoachId = clientData.activeCoachId;
            if (activeCoachId !== coachId) throw new Error("You are not the active coach for this client.");

            const requestsCollectionRef = clientDocRef.collection('coachRequests');
            // !!! Requires index on (nutritionistId, status) for coachRequests collection !!!
            const q = requestsCollectionRef.where("nutritionistId", "==", coachId).where("status", "==", "selected").limit(1);
            const requestSnap = await transaction.get(q);

            // Writes
            console.log(`CTRL Transaction: Coach ${coachId} ending relationship with client ${clientId}.`);
            transaction.update(clientDocRef, { activeCoachId: FieldValue.delete() }); // Remove from user
            if (!requestSnap.empty) {
                const requestRefToUpdate = requestSnap.docs[0].ref;
                transaction.update(requestRefToUpdate, { status: 'ended_by_coach', endedTimestamp: FieldValue.serverTimestamp() });
            } else { console.warn(`CTRL: Could not find 'selected' request to update for client ${clientId} when ended by coach ${coachId}.`); }
            transaction.update(coachDocRef, { clientIds: FieldValue.arrayRemove(clientId) }); // Remove from coach's list
            console.log(`CTRL Transaction: Removed client ${clientId} from coach ${coachId}'s clientIds.`);
        });
        console.log(`CTRL: Relationship ended successfully by coach ${coachId} for client ${clientId}.`);
        res.status(200).json({ message: "Coaching relationship ended successfully." });
        // TODO: Send notification to the user.

    } catch (error) {
        console.error(`CTRL Error: ending relationship for client ${clientId} by coach ${coachId}:`, error);
        if (error.message.includes("not the active coach")) return res.status(403).json({ message: "Forbidden: Not active coach.", error: error.message });
        if (error.message.includes("Client user not found")) return res.status(404).json({ message: "Client not found", error: error.message });
        res.status(500).json({ message: "Server error ending relationship", error: error.message });
    }
};

// COACH SIDE: Get list of active clients
exports.getCoachClients = async (req, res) => {
    if (!checkFirebaseReady(res, "get coach clients")) return;
    const coachId = req.user?.uid;
    if (!coachId) return res.status(401).json({ error: "Coach authentication missing." });
    console.log(`CTRL: getCoachClients invoked for coach: ${coachId}`);

    try {
        const coachDocRef = db.collection('nutritionists').doc(coachId);
        const coachDocSnap = await coachDocRef.get();
        if (!coachDocSnap.exists) { return res.status(404).json({ error: "Coach profile not found." }); }

        const coachData = coachDocSnap.data();
        const clientIds = coachData.clientIds || [];

        if (clientIds.length === 0) { return res.status(200).json({ clients: [] }); }

        console.log(`CTRL: getCoachClients - Fetching details for ${clientIds.length} clients.`);
        const clientDetailsMap = await getMultipleUserPublicDetails(clientIds);
        const clientList = Object.values(clientDetailsMap);

        console.log(`CTRL: getCoachClients - Returning ${clientList.length} client details.`);
        res.status(200).json({ clients: clientList });

    } catch (error) {
        console.error(`CTRL Error: getting clients for coach ${coachId}:`, error);
        res.status(500).json({ message: "Server error fetching clients", error: error.message });
    }
};


exports.getClientDetailsForCoach = async (req, res) => {
    if (!checkFirebaseReady(res, "get client details")) return;
    const coachId = req.user?.uid;
    const { clientId } = req.params; // From URL path: /coach/client/:clientId/details
    if (!coachId || !clientId) return res.status(400).json({ error: "Coach ID and Client ID parameter required." });
    console.log(`CTRL: getClientDetailsForCoach invoked by coach: ${coachId} for client: ${clientId}`);

    try {
        const clientDocRef = db.collection('users').doc(clientId);
        const clientDocSnap = await clientDocRef.get();
        if (!clientDocSnap.exists) { return res.status(404).json({ error: "Client not found." }); }

        // Security Check: Verify coach is linked
        const clientData = clientDocSnap.data();
        if (clientData.activeCoachId !== coachId) {
            console.warn(`CTRL: getClientDetailsForCoach - FORBIDDEN by ${coachId} for client ${clientId}`);
            return res.status(403).json({ error: "You are not authorized to view this client's details." });
        }

        console.log(`CTRL: getClientDetailsForCoach - Access granted for client ${clientId}.`);
        res.status(200).json({ client: { id: clientDocSnap.id, ...clientData } }); // Return full client data

    } catch (error) {
        console.error(`CTRL Error: getting details for client ${clientId} by coach ${coachId}:`, error);
        res.status(500).json({ message: "Server error fetching client details", error: error.message });
    }
};

// COACH SIDE: Get private notes for a specific client
exports.getClientNotes = async (req, res) => {
    if (!checkFirebaseReady(res, "get client notes")) return;
    const coachId = req.user?.uid;
    const { clientId } = req.params; // From URL path
    if (!coachId || !clientId) return res.status(400).json({ error: "Coach ID and Client ID parameter required." });
    console.log(`CTRL: getClientNotes invoked by coach: ${coachId} for client: ${clientId}`);

    try {
        // Path: /nutritionists/{coachId}/clientNotes/{clientId}
        const noteDocRef = db.collection('nutritionists').doc(coachId).collection('clientNotes').doc(clientId);
        const noteDocSnap = await noteDocRef.get();
        const notes = noteDocSnap.exists ? (noteDocSnap.data()?.notes || "") : ""; // Get notes or default ""
        console.log(`CTRL: getClientNotes - Notes ${noteDocSnap.exists ? 'found' : 'not found'} for client ${clientId}.`);
        res.status(200).json({ notes: notes });

    } catch (error) {
        console.error(`CTRL Error: getting notes for client ${clientId} by coach ${coachId}:`, error);
        res.status(500).json({ message: "Server error fetching client notes", error: error.message });
    }
};

// COACH SIDE: Save/Update private notes for a specific client
exports.saveClientNotes = async (req, res) => {
    if (!checkFirebaseReady(res, "save client notes")) return;
    const coachId = req.user?.uid;
    const { clientId } = req.params; // From URL path
    const { notes } = req.body; // Notes content from body
    if (!coachId || !clientId) return res.status(400).json({ error: "Coach ID and Client ID parameter required." });
    if (notes === undefined) return res.status(400).json({ error: "Notes content is required." });
    console.log(`CTRL: saveClientNotes invoked by coach: ${coachId} for client: ${clientId}`);

    try {
        // Path: /nutritionists/{coachId}/clientNotes/{clientId}
        const noteDocRef = db.collection('nutritionists').doc(coachId).collection('clientNotes').doc(clientId);
        // Use set with merge to create/update
        await noteDocRef.set({
            notes: notes,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`CTRL: saveClientNotes - Notes saved for client ${clientId}.`);
        res.status(200).json({ message: "Notes saved successfully." });

    } catch (error) {
        console.error(`CTRL Error: saving notes for client ${clientId} by coach ${coachId}:`, error);
        res.status(500).json({ message: "Server error saving client notes", error: error.message });
    }
};
exports.getCoachDashboardSummary = async (req, res) => {
    if (!checkFirebaseReady(res, "get coach dashboard summary")) return;
    const coachId = req.user?.uid;
    if (!coachId) return res.status(401).json({ error: "Coach authentication missing." });
    console.log(`CTRL: getCoachDashboardSummary invoked for coach: ${coachId}`);

    try {
        // --- Prepare Promises for Parallel Fetching ---
        const coachDocRef = db.collection('nutritionists').doc(coachId);

        // Promise 1: Fetch Coach's own document (for client count)
        const coachDocPromise = coachDocRef.get();

        // Promise 2: Query for Pending Invitation Requests
        // Requires Collection Group Index: coachRequests(nutritionistId ASC, status ASC)
        const pendingInvitationsQuery = db.collectionGroup('coachRequests')
            .where('nutritionistId', '==', coachId)
            .where('status', '==', 'pending')
            .orderBy('requestTimestamp', 'desc') // Get newest first
            .limit(1); // Only need the newest one for preview
        const pendingInvitationsPromise = pendingInvitationsQuery.get();

        // Promise 3: Query for Unread Messages Count & Oldest Unreplied Chat
        // Requires Index: chats(participants ArrayContains, coachUnreadCount Desc) - Maybe adjust for timestamp?
        // Requires Index: chats(participants ArrayContains, lastActivity Desc) - For sorting overall
        const unreadChatsQuery = db.collection('chats')
            .where('participants', 'array-contains', coachId)
            .where('coachUnreadCount', '>', 0)
            .orderBy('coachUnreadCount', 'desc') // Prioritize higher counts? Or orderBy lastActivity?
            .orderBy('lastActivity', 'asc'); // Get oldest unread first for preview
        const unreadChatsPromise = unreadChatsQuery.get();

        // (Optional) Promise 4: Query for Pending Plan Requests (if applicable)
        // This depends heavily on how/where plan requests are stored. Example placeholder:
        // const planRequestsQuery = db.collection('planRequests').where('coachId', '==', coachId).where('status', '==', 'pending');
        // const planRequestsPromise = planRequestsQuery.count().get(); // Use count() if available and only need number

        // --- Execute Promises in Parallel ---
        console.log("CTRL: getCoachDashboardSummary - Executing parallel fetches...");
        const [
            coachDocSnap,
            pendingInvitationsSnapshot,
            unreadChatsSnapshot,
            // planRequestsCountSnap // Optional
        ] = await Promise.all([
            coachDocPromise,
            pendingInvitationsPromise,
            unreadChatsPromise,
            // planRequestsPromise // Optional
        ]);
        console.log("CTRL: getCoachDashboardSummary - Fetches complete.");

        // --- Process Results ---

        // 1. Active Clients Count
        let activeClientCount = 0;
        if (coachDocSnap.exists) {
            activeClientCount = (coachDocSnap.data().clientIds || []).length;
        } else {
            console.warn(`Coach document ${coachId} not found! Cannot get client count.`);
            // Don't fail the whole request, just return 0 clients
        }

        // 2. Invitation Requests Count & Newest Preview
        let invitationRequestCount = 0;
        let newestInvitation = null;
        let newestInvitationUserId = null;
        // Need to query the count separately as limit(1) was used for preview
        const countInvitationsQuery = db.collectionGroup('coachRequests')
            .where('nutritionistId', '==', coachId)
            .where('status', '==', 'pending');
        const countInvitationsSnapshot = await countInvitationsQuery.count().get(); // Use aggregate count
        invitationRequestCount = countInvitationsSnapshot.data().count;

        if (!pendingInvitationsSnapshot.empty) {
             // invitationRequestCount = pendingInvitationsSnapshot.size; // This is now incorrect due to limit(1)
             const newestReqDoc = pendingInvitationsSnapshot.docs[0];
             newestInvitationUserId = newestReqDoc.ref.parent.parent.id; // Get user ID from path
        }

        // 3. Unread Messages Count & Oldest Unreplied Preview
        let messagesNeedingReplyCount = 0;
        let oldestUnrepliedChat = null;
        let oldestUnrepliedUserId = null;

        // Get total unread count across all relevant chats
         if (!unreadChatsSnapshot.empty) {
            // Sum up the coachUnreadCount from all documents found by the query
            messagesNeedingReplyCount = unreadChatsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().coachUnreadCount || 0), 0);

            // Get details for the first one (oldest lastActivity with unread > 0)
            const oldestChatDoc = unreadChatsSnapshot.docs[0]; // Oldest based on orderBy
             oldestUnrepliedChat = {
                 id: oldestChatDoc.id, // chatId
                 lastMessage: oldestChatDoc.data().lastMessage || null,
                 // Need user details for preview
                 userDetails: oldestChatDoc.data().userDetails || null // Use pre-stored details
             };
             // Extract userId if userDetails are present
             if (oldestUnrepliedChat.userDetails) {
                 oldestUnrepliedUserId = oldestUnrepliedChat.userDetails.userId;
             } else {
                 // Fallback: Find user ID from participants if details missing
                 const participants = oldestChatDoc.data().participants || [];
                 oldestUnrepliedUserId = participants.find(id => id !== coachId) || null;
             }
         }


        // (Optional) 4. Plan Requests Count
        // let planRequestCount = planRequestsCountSnap?.data()?.count || 0;

        // --- Fetch Necessary User Details for Previews ---
        const userIdsForPreview = [newestInvitationUserId, oldestUnrepliedUserId].filter(id => !!id); // Filter out nulls
        let userDetailsMap = {};
        if (userIdsForPreview.length > 0) {
            userDetailsMap = await getMultipleUserPublicDetails(userIdsForPreview);
        }

        // Add user details to invitation preview if needed
        if (newestInvitationUserId && userDetailsMap[newestInvitationUserId]) {
            newestInvitation = { userDetails: userDetailsMap[newestInvitationUserId] };
        }
        // Ensure oldest unreplied chat has userDetails (might already be there)
        if (oldestUnrepliedChat && !oldestUnrepliedChat.userDetails && oldestUnrepliedUserId && userDetailsMap[oldestUnrepliedUserId]) {
             oldestUnrepliedChat.userDetails = userDetailsMap[oldestUnrepliedUserId];
        }


        // --- Construct Final Response ---
        const summaryData = {
            activeClientCount,
            invitationRequestCount,
            newestInvitation, // Contains userDetails object or null
            messagesNeedingReplyCount,
            oldestUnrepliedChat, // Contains userDetails and lastMessage or null
            // planRequestCount, // Optional
        };

        console.log(`CTRL: getCoachDashboardSummary - Sending summary for coach ${coachId}:`, summaryData);
        res.status(200).json(summaryData);

    } catch (error) {
        console.error(`CTRL Error: getting dashboard summary for coach ${coachId}:`, error);
         const isIndexError = error.message?.includes("requires an index") || error.message?.includes("needs an index");
         if (isIndexError) {
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             console.error(`!!! FIRESTORE INDEX MISSING for one of the dashboard queries !!!`);
             console.error(`!!! Check index requirements for: `);
             console.error(`!!! 1) Collection Group 'coachRequests' Fields: nutritionistId (Asc), status (Asc), requestTimestamp (Desc). Scope: Collection Group`);
             console.error(`!!! 2) Collection 'chats' Fields: participants (Array Contains), coachUnreadCount (Desc), lastActivity (Asc). Scope: Collection`);
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             return res.status(500).json({ message: "Database configuration error.", error: "Missing required database index." });
         }
        res.status(500).json({ message: "Server error fetching dashboard summary", error: error.message });
    }
};