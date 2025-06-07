// --- START OF FILE controllers/CoachFeedbackController.js ---

const { firebaseInstances } = require('../config/firebase.js');
const { admin, db, auth, _initializationError } = firebaseInstances;
const FieldValue = admin.firestore.FieldValue;

// Helper: Check Firebase Initialization (peut être externalisé)
function checkFirebaseReady(res, action = "perform action") {
    if (_initializationError || !admin || !db || !auth) {
        const missing = [!admin && "Admin SDK", !db && "Firestore", !auth && "Auth"].filter(Boolean).join(', ');
        const baseMessage = `Firebase Check Failed during "${action}"`;
        const errorMessage = _initializationError ? `${baseMessage}: Init Error: ${_initializationError.message}` : `${baseMessage}: Missing Services: ${missing || 'Unknown'}`;
        console.error("!!! Firebase Check FAILED !!!", errorMessage);
        if (res && !res.headersSent) {
             res.status(500).json({ error: `Server configuration error (${action}). Please contact support.` });
        }
        return false;
    }
    // console.log(`[Firebase Check] OK for action: "${action}"`); // Peut être commenté
    return true;
}

// --- Export de la fonction pour le feedback du COACH ---
// <<< Assurez-vous que le nom ici est bien 'submitCoachFeedback' >>>
exports.submitCoachFeedback = async (req, res) => {
    console.log("--- ENTERING submitCoachFeedback ---"); // Log spécifique

    // Étape 0: Vérification Firebase
    if (!checkFirebaseReady(res, "submit coach feedback")) {
         console.log("[Submit Coach Feedback ABORTED] Firebase services not ready.");
         return;
    }
    console.log("[Submit Coach Feedback] Firebase check passed.");

    // Étape 1: Vérification et Extraction du Token
    console.log("[Submit Coach Feedback] Checking Authorization header...");
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.log('[Submit Coach Feedback] FAIL: Missing or invalid Authorization header.');
        return res.status(401).json({ error: 'Unauthorized: Missing or improperly formatted token.' });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];
    console.log('[Submit Coach Feedback] Token found in header.');

    try {
        // Étape 2: Vérification du Token
        console.log('[Submit Coach Feedback] Verifying ID token with Firebase Auth...');
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (tokenError) {
             console.error('[Submit Coach Feedback AUTH FAIL] ID Token verification failed:', tokenError);
             if (tokenError.code === 'auth/id-token-expired' || tokenError.code === 'auth/argument-error' || tokenError.code === 'auth/id-token-revoked') {
                return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
             }
             throw new Error(`Token verification failed: ${tokenError.message}`);
        }
        const authenticatedUserId = decodedToken.uid; // UID du coach authentifié
        console.log(`[Submit Coach Feedback] Token verified successfully. Authenticated Coach UID: ${authenticatedUserId}`);

        // Étape 3: Extraction des Données du Corps
        console.log('[Submit Coach Feedback] Extracting data from request body...');
        // Doit recevoir 'message', 'userId', et 'userType'
        const { message, userId, userType } = req.body;
        console.log('[Submit Coach Feedback] Received body content:', JSON.stringify(req.body));
        console.log(`[Submit Coach Feedback] Extracted - message: ${message ? '"' + message.substring(0,50) + '..."' : 'undefined'}, userId: ${userId}, userType: ${userType}`);

        // Étape 4: Validation
        console.log('[Submit Coach Feedback] Validating input data...');
        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            console.log('[Submit Coach Feedback] Validation FAIL: Message invalid.');
            return res.status(400).json({ error: 'Message is required and must be at least 5 characters long.' });
        }
        // Valide que les infos nécessaires sont là et que le userType est bien 'Professional'
        if (!userId || !userType || userType !== 'Professional') {
            console.log('[Submit Coach Feedback] Validation FAIL: userId invalid/missing or userType is not Professional.');
            return res.status(400).json({ error: 'Invalid user information for coach feedback.' });
        }
        if (authenticatedUserId !== userId) {
             console.log(`[Submit Coach Feedback] Validation FAIL (Forbidden): Authenticated UID ${authenticatedUserId} != userId in body ${userId}.`);
             return res.status(403).json({ error: 'Forbidden: You can only submit feedback for yourself.' });
        }
        console.log('[Submit Coach Feedback] Input validation passed.');

        // Étape 5: Préparation de l'Objet à Sauvegarder
        const feedbackData = {
            message: message.trim(),
            userId: authenticatedUserId, // UID du coach
            userType: 'Professional', // Spécifie le type
            senderEmail: decodedToken.email || null,
            createdAt: FieldValue.serverTimestamp(),
            status: 'New',
        };
        const targetCollection = 'Feedbacks'; // Toujours la même collection
        console.log(`[Submit Coach Feedback PRE-FIRESTORE] Target Collection: "${targetCollection}"`);
        console.log('[Submit Coach Feedback PRE-FIRESTORE] Data to be written:', JSON.stringify(feedbackData));
        if (!db || typeof db.collection !== 'function') { throw new Error("Firestore db object invalid."); }
        console.log('[Submit Coach Feedback PRE-FIRESTORE] db object seems valid.');

        // Étape 6: Écriture dans Firestore
        let feedbackRef = null;
        try {
            console.log(`[Submit Coach Feedback FIRESTORE ATTEMPT] Attempting db.collection("${targetCollection}").add(...)`);
            feedbackRef = await db.collection(targetCollection).add(feedbackData);
            if (feedbackRef && feedbackRef.id) {
                console.log(`[Submit Coach Feedback FIRESTORE SUCCESS] Document created with ID: ${feedbackRef.id} in collection "${targetCollection}"`);
            } else { throw new Error("Firestore add() returned invalid ref."); }
        } catch (firestoreError) {
             console.error(`[Submit Coach Feedback FIRESTORE ERROR] Failed to write to collection "${targetCollection}":`, firestoreError);
             throw firestoreError;
        }

        // Étape 7: Réponse de Succès
        console.log('[Submit Coach Feedback] Sending success (201) response to client.');
        if (!res.headersSent) {
            res.status(201).json({ message: 'Feedback submitted successfully!', feedbackId: feedbackRef.id });
        } else { console.warn("[Submit Coach Feedback] Warning: Headers already sent."); }

    } catch (error) {
        console.error('[Submit Coach Feedback GLOBAL CATCH ERROR] Final error caught:', error);
        if (!res.headersSent) {
             res.status(500).json({ error: 'An internal server error occurred while processing coach feedback.', details: error.message });
        } else { console.error("[Submit Coach Feedback] Error caught, but headers were already sent."); }
    } finally {
        console.log("--- EXITING submitCoachFeedback ---");
    }
}; // <<< Fin de exports.submitCoachFeedback

// --- END OF FILE controllers/CoachFeedbackController.js ---