// --- START OF FILE controllers/deleteController.js ---

const { firebaseInstances } = require('../config/firebase.js');
const { admin, db, auth, storage } = firebaseInstances;
const FieldValue = admin.firestore.FieldValue;

// Helper (copié ou importé si externalisé)
function checkFirebaseReady(res, action = "perform action") {
    if (!admin || !db || !auth || !storage) {
        console.error(`Firebase Check Failed during "${action}"`);
        if (!res.headersSent) {
             res.status(500).json({ error: `Server configuration error (${action}).` });
        }
        return false;
    }
    return true;
}

// Fonction helper pour supprimer une collection (simplifiée)
async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    let deleted = 0;
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) { break; }
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deleted += snapshot.size;
        console.log(`  Deleted ${deleted} docs from ${collectionRef.path}`);
        if (snapshot.size < batchSize) { break; }
    }
    console.log(`[Delete Helper] Finished deleting collection: ${collectionRef.path}`);
}


// Fonction de suppression complète (peut gérer user ou coach avec un paramètre)
exports.deleteAccountCompletely = async (req, res) => {
    // Vérifie que Firebase est prêt
    if (!checkFirebaseReady(res, "delete account completely")) return;

    const loggedInUserId = req.user?.uid; // UID de l'utilisateur authentifié (via middleware)
    const targetUserId = req.params.uid;   // UID de l'utilisateur à supprimer (depuis l'URL)
    // Détermine la collection principale basée sur un type potentiel ou la route appelée
    // Ici on suppose que la route détermine si c'est 'users' ou 'nutritionists'
    // Ou vous pourriez ajouter un paramètre à la requête/route
    const userTypePath = req.baseUrl === '/expert' ? 'nutritionists' : 'users'; // Exemple basé sur le préfixe de route

    console.log(`[Delete Completely] Request for ${userTypePath} user: ${targetUserId} by authenticated user: ${loggedInUserId}`);

    // --- Vérification de Sécurité ---
    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetUserId) { return res.status(403).json({ error: "Forbidden: You can only delete your own account." }); }
    // --- Fin Vérification de Sécurité ---

    try {
        console.log(`[Delete Completely] Starting deletion process for ${userTypePath}/${targetUserId}`);

        // --- Étape 1: Supprimer les données Firestore ---
        const docRef = db.collection(userTypePath).doc(targetUserId);

        console.log(`[Delete Completely] Deleting Firestore subcollections for ${targetUserId}...`);
        // Adaptez les sous-collections selon le type d'utilisateur
        if (userTypePath === 'users') {
            await deleteCollection(docRef.collection('reminders'));
            await deleteCollection(docRef.collection('coachRequests'));
            await deleteCollection(docRef.collection('blockedCoaches'));
            // Ajoutez d'autres sous-collections utilisateur ici
        } else { // C'est un coach ('nutritionists')
             await deleteCollection(docRef.collection('reminders')); // Supposant que les coachs ont aussi des reminders
             await deleteCollection(docRef.collection('clientNotes'));
             await deleteCollection(docRef.collection('ratings'));
             // Ajoutez d'autres sous-collections coach ici
        }

        console.log(`[Delete Completely] Deleting main Firestore document: ${docRef.path}`);
        await docRef.delete();
        console.log(`[Delete Completely] Main Firestore document deleted.`);


        // --- Étape 2: Supprimer les fichiers dans Firebase Storage ---
        const bucket = storage.bucket();
        // Adaptez les préfixes selon le type
        let prefixesToDelete = [];
        if (userTypePath === 'users') {
            prefixesToDelete.push(`user_profile_images/${targetUserId}`);
            // Ajoutez d'autres préfixes pour les utilisateurs (ex: images repas)
        } else {
            prefixesToDelete.push(`coach_profile_images/${targetUserId}`);
            prefixesToDelete.push(`coach_certificates/${targetUserId}`);
        }

        console.log(`[Delete Completely] Deleting Storage files for ${targetUserId} with prefixes: ${prefixesToDelete.join(', ')}`);
        try {
            for (const prefix of prefixesToDelete) {
                 await bucket.deleteFiles({ prefix: prefix });
            }
             console.log(`[Delete Completely] Storage files deleted for prefixes.`);
        } catch (storageError) {
             console.error(`[Delete Completely] Error deleting storage files for ${targetUserId}, continuing deletion...`, storageError);
        }

        // --- Étape 3: Supprimer l'utilisateur de Firebase Authentication ---
        console.log(`[Delete Completely] Deleting Auth user: ${targetUserId}`);
        await auth.deleteUser(targetUserId);
        console.log(`[Delete Completely] Auth user deleted successfully.`);

        // --- Étape 4: Répondre au client ---
        console.log(`[Delete Completely] Process finished successfully for ${targetUserId}.`);
        res.status(200).json({ message: "Account and associated data deleted successfully." });

    } catch (error) {
        console.error(`[Delete Completely] Error during deletion process for UID: ${targetUserId}:`, error);
        // ... (gestion des erreurs comme avant) ...
        if (error.code === 'auth/user-not-found') { return res.status(404).json({ error: "Auth account not found...", code: error.code }); }
        if (error.code === 7 ) { return res.status(500).json({ error: "Server permission error..." }); }
        if (!res.headersSent) { res.status(500).json({ error: "Internal server error...", details: error.message }); }
    }
};


// --- END OF FILE controllers/deleteController.js ---