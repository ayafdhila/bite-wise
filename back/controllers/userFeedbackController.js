// --- START OF FILE controllers/userFeedbackController.js ---

const { firebaseInstances } = require('../config/firebase.js');
const { admin, db, auth, _initializationError } = firebaseInstances; // Assurez-vous que toutes les instances sont importées
const FieldValue = admin.firestore.FieldValue;

// --- Helper: Check Firebase Initialization ---
function checkFirebaseReady(res, action = "perform action") {
    // Vérifie si les instances nécessaires (db, auth, admin) sont définies et s'il n'y a pas eu d'erreur d'initialisation
    if (_initializationError || !admin || !db || !auth) {
        const missing = [!admin && "Admin SDK", !db && "Firestore", !auth && "Auth"].filter(Boolean).join(', ');
        const baseMessage = `Firebase Check Failed during "${action}"`;
        const errorMessage = _initializationError ? `${baseMessage}: Init Error: ${_initializationError.message}` : `${baseMessage}: Missing Services: ${missing || 'Unknown'}`;
        console.error("!!! Firebase Check FAILED !!!", errorMessage); // Log d'erreur critique
        // Empêche d'envoyer une réponse si une a déjà été envoyée (évite crash)
        if (res && !res.headersSent) {
             res.status(500).json({ error: `Server configuration error (${action}). Please contact support.` });
        }
        return false; // Indique que Firebase n'est pas prêt
    }
    // console.log(`[Firebase Check] OK for action: "${action}"`); // Log si succès (optionnel)
    return true; // Indique que Firebase est prêt
}

// --- Export de la fonction principale ---
exports.submitUserFeedback = async (req, res) => {
    console.log("--- ENTERING submitUserFeedback ---"); // Log d'entrée

    // Étape 0: Vérification de Firebase
    if (!checkFirebaseReady(res, "submit user feedback")) {
         console.log("[Submit User Feedback ABORTED] Firebase services not ready.");
         // checkFirebaseReady envoie déjà une réponse si possible
         return;
    }
    console.log("[Submit User Feedback] Firebase check passed.");

    // Étape 1: Vérification et Extraction du Token
    console.log("[Submit User Feedback] Checking Authorization header...");
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.log('[Submit User Feedback] FAIL: Missing or invalid Authorization header.');
        return res.status(401).json({ error: 'Unauthorized: Missing or improperly formatted token.' });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];
    console.log('[Submit User Feedback] Token found in header.');

    try {
        // Étape 2: Vérification du Token avec Firebase Auth
        console.log('[Submit User Feedback] Verifying ID token with Firebase Auth...');
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (tokenError) {
             console.error('[Submit User Feedback AUTH FAIL] ID Token verification failed:', tokenError);
             // Renvoyer une erreur 401 spécifique si le token est invalide/expiré
             if (tokenError.code === 'auth/id-token-expired' || tokenError.code === 'auth/argument-error' || tokenError.code === 'auth/id-token-revoked') {
                return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
             }
             // Pour d'autres erreurs de vérification, renvoyer une erreur serveur générique
             throw new Error(`Token verification failed: ${tokenError.message}`); // Relance pour le catch global
        }
        const authenticatedUserId = decodedToken.uid;
        console.log(`[Submit User Feedback] Token verified successfully. Authenticated UID: ${authenticatedUserId}`);

        // Étape 3: Extraction des Données du Corps
        console.log('[Submit User Feedback] Extracting data from request body...');
        const { message, userId } = req.body; // Pour userFeedback, userType est implicitement 'User'
        // Log pour voir ce qui est réellement reçu
        console.log('[Submit User Feedback] Received body content:', JSON.stringify(req.body));
        console.log(`[Submit User Feedback] Extracted - message: ${message ? '"' + message.substring(0,50) + '..."' : 'undefined'}, userId: ${userId}`);

        // Étape 4: Validation des Données Reçues
        console.log('[Submit User Feedback] Validating input data...');
        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            console.log('[Submit User Feedback] Validation FAIL: Message invalid.');
            return res.status(400).json({ error: 'Message is required and must be at least 5 characters long.' });
        }
        if (!userId || typeof userId !== 'string') {
            console.log('[Submit User Feedback] Validation FAIL: userId invalid or missing.');
            return res.status(400).json({ error: 'User ID is missing or invalid.' });
        }
        // Validation cruciale: l'utilisateur authentifié ne peut soumettre que pour lui-même
        if (authenticatedUserId !== userId) {
             console.log(`[Submit User Feedback] Validation FAIL (Forbidden): Authenticated UID ${authenticatedUserId} != userId in body ${userId}.`);
             return res.status(403).json({ error: 'Forbidden: You can only submit feedback for yourself.' });
        }
        console.log('[Submit User Feedback] Input validation passed.');

        // Étape 5: Préparation de l'Objet à Sauvegarder
        const feedbackData = {
            message: message.trim(),
            userId: authenticatedUserId, // Toujours utiliser l'UID vérifié du token
            userType: 'User', // Fixé à 'User' pour ce contrôleur spécifique
            senderEmail: decodedToken.email || null, // Email depuis le token (si disponible)
            createdAt: FieldValue.serverTimestamp(), // Timestamp Firestore
            status: 'New', // Statut initial
        };
        const targetCollection = 'Feedbacks'; // Nom exact de la collection
        console.log(`[Submit User Feedback PRE-FIRESTORE] Target Collection: "${targetCollection}"`);
        console.log('[Submit User Feedback PRE-FIRESTORE] Data to be written:', JSON.stringify(feedbackData));
        // Double vérification de l'objet db
        if (!db || typeof db.collection !== 'function') {
            console.error('[Submit User Feedback PRE-FIRESTORE] CRITICAL: Firestore db object is invalid or missing collection method!');
            throw new Error("Firestore database instance is not correctly configured on the server.");
        }
        console.log('[Submit User Feedback PRE-FIRESTORE] db object seems valid.');

        // Étape 6: Écriture dans Firestore
        let feedbackRef = null;
        try {
            console.log(`[Submit User Feedback FIRESTORE ATTEMPT] Attempting db.collection("${targetCollection}").add(...)`);
            feedbackRef = await db.collection(targetCollection).add(feedbackData);

            // Vérification si l'écriture a retourné un ID valide
            if (feedbackRef && feedbackRef.id) {
                console.log(`[Submit User Feedback FIRESTORE SUCCESS] Document created with ID: ${feedbackRef.id} in collection "${targetCollection}"`);
            } else {
                 // Ce cas est très improbable si aucune exception n'est levée, mais sécurité
                 console.error(`[Submit User Feedback FIRESTORE WEIRD] db.collection("${targetCollection}").add() finished without error but returned invalid ref:`, feedbackRef);
                 throw new Error("Firestore add operation finished but did not return a valid document reference.");
            }
        } catch (firestoreError) {
             // Erreur spécifique lors de l'écriture Firestore
             console.error(`[Submit User Feedback FIRESTORE ERROR] Failed to write to collection "${targetCollection}":`, firestoreError);
             // Relancer pour que le catch global gère la réponse HTTP
             throw firestoreError;
        }

        // Étape 7: Réponse de Succès au Client
        console.log('[Submit User Feedback] Sending success (201) response to client.');
        // Vérifie si les en-têtes n'ont pas déjà été envoyés (sécurité)
        if (!res.headersSent) {
            res.status(201).json({ message: 'Feedback submitted successfully!', feedbackId: feedbackRef.id });
        } else {
            console.warn("[Submit User Feedback] Warning: Headers already sent before sending success response.");
        }

    } catch (error) { // Catch global pour les erreurs non attrapées spécifiquement (ex: token verify, db check, firestore error relancée)
        console.error('[Submit User Feedback GLOBAL CATCH ERROR] Final error caught:', error);
        // Ne renvoie une réponse que si une n'a pas déjà été envoyée
        if (!res.headersSent) {
            // Pas besoin de revérifier les erreurs de token ici car elles sont gérées plus haut
            // Renvoie une erreur 500 générique pour les autres cas
             res.status(500).json({ error: 'An internal server error occurred while processing feedback.', details: error.message });
        } else {
             console.error("[Submit User Feedback] Error caught, but headers were already sent.");
        }
    } finally {
        console.log("--- EXITING submitUserFeedback ---"); // Log de sortie
    }
}; // Fin de exports.submitUserFeedback

