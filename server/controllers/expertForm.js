const { firebaseInstances } = require('../config/firebase.js'); 
const multer = require('multer'); 
const { admin, db, auth, storage, _initializationError } = firebaseInstances;
const FieldValue = admin.firestore.FieldValue; 

const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024 
    },
    storage: multer.memoryStorage() // Store files in memory (as buffers) for processing
});

// --- Helper: Check Firebase Initialization ---
function checkFirebaseReady(res, action = "perform action") {
    if (_initializationError || !admin || !db || !auth || !storage) {
        const missing = [
            !admin && "Admin SDK", !db && "Firestore",
            !auth && "Auth", !storage && "Storage"
        ].filter(Boolean).join(', ');
        const baseMessage = `Firebase Check Failed during "${action}"`;
        const errorMessage = _initializationError
            ? `${baseMessage}: Init Error: ${_initializationError.message}`
            : `${baseMessage}: Missing Services: ${missing || 'Unknown'}`;
        console.error(errorMessage);
        // Check if headers sent to prevent double response
        if (!res.headersSent) {
             res.status(500).json({ error: `Server configuration error (${action}). Please try again later.` });
        }
        return false;
    }
    return true;
}



//Get Coach Profile
exports.getCoachProfile = async (req, res) => {
    //Check Firebase Readiness
    if (!checkFirebaseReady(res, "get coach profile")) return;
    console.log('[Get Coach Profile] Request received for UID:', req.params.uid);
    try {
        const coachUid = req.params.uid; 
        if (!coachUid) {
            console.log('[Get Coach Profile] Bad Request: Missing UID parameter.');
            return res.status(400).json({ error: "Missing coach UID in request." });
        }
        // 2. Récupérer les données depuis Firestore
        console.log(`[Get Coach Profile] Fetching Firestore document: nutritionists/${coachUid}`);
        const coachDocRef = db.collection('nutritionists').doc(coachUid);
        const coachDoc = await coachDocRef.get();
        // 3. Vérifier si le document existe
        if (!coachDoc.exists) {
            console.log(`[Get Coach Profile] Not Found: No document found for UID: ${coachUid}`);
            return res.status(404).json({ error: "Coach profile not found." });
        }
        // 4. Extraire les données et préparer la réponse
        const coachData = coachDoc.data();
        console.log(`[Get Coach Profile] Found data for UID: ${coachUid}`);
        const profileDataToSend = {
            firstName: coachData.firstName || '',
            lastName: coachData.lastName || '',
             phoneCountryCode: coachData.phoneCountryCode || '', 
             phoneNumber: coachData.phoneNumber || '',
             yearsExperience: coachData.yearsOfExperience || null, 
             specialization: coachData.specialization || null,
             workplace: coachData.workplace || '',
             shortBio: coachData.shortBio || '',
             profileImageUrl: coachData.profileImage || null, 
             professionalCertificateUrl: coachData.professionalCertificate || null, 
             onboardingComplete: coachData.onboardingComplete ?? false, 
        };

        // 5. Renvoyer les données en JSON
        console.log(`[Get Coach Profile] Sending profile data for UID: ${coachUid}`);
        res.status(200).json(profileDataToSend);

    } catch (error) {
        console.error(`[Get Coach Profile Error] Failed to retrieve profile for UID: ${req.params.uid}`, error);
        if (!res.headersSent) {
             res.status(500).json({ error: "An internal server error occurred while fetching the profile.", details: error.message });
        }
    }
};


// Mettre à jour du profil ( dans settings)
exports.updateCoachProfile = async (req, res) => {
    // 1. Vérifier Firebase
    if (!checkFirebaseReady(res, "update coach profile")) return;
    console.log('[Update Coach Profile] Request received for UID:', req.params.uid);

    // 2. Vérifier l'authentification (Token)
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token.' });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];

    try {
        // Vérifier le token et obtenir l'UID authentifié
        const decodedToken = await auth.verifyIdToken(idToken);
        const authenticatedUserId = decodedToken.uid;
        const targetCoachUid = req.params.uid; // UID du coach à mettre à jour (depuis l'URL)

        // Sécurité : L'utilisateur authentifié ne peut mettre à jour que son propre profil
        if (authenticatedUserId !== targetCoachUid) {
            console.log(`[Update Coach Profile] Forbidden: User ${authenticatedUserId} tried to update profile of ${targetCoachUid}.`);
            return res.status(403).json({ error: 'Forbidden: You can only update your own profile.' });
        }
        console.log(`[Update Coach Profile] Auth OK for UID: ${authenticatedUserId}`);

        // 3. Récupérer et Valider les Données du Corps (req.body)
        const updatedData = req.body;
        console.log('[Update Coach Profile] Received data:', JSON.stringify(updatedData));

        // --- Validation Côté Serveur (Optionnelle mais recommandée) ---
        // Ajoutez des validations ici si nécessaire pour les champs reçus
        // Exemple : vérifier que firstName n'est pas vide, que yearsOfExperience est un nombre, etc.
        if (!updatedData.firstName || !updatedData.lastName) {
             return res.status(400).json({ error: 'First name and last name are required.' });
        }
        if (!updatedData.specialization) {
             return res.status(400).json({ error: 'Specialization is required.' });
        }
        // ... autres validations ...
        // --- Fin Validation ---


        // 4. Préparer les données pour Firestore
        // Crée un objet avec seulement les champs que vous autorisez à mettre à jour
        const dataToUpdate = {};
        const allowedFields = [
            'firstName', 'lastName', 'phoneCountryCode', 'phoneNumber',
            'yearsOfExperience', 'specialization', 'workplace', 'shortBio',
            'profileImage', 'professionalCertificate' // Inclure les URLs des fichiers
        ];

        for (const field of allowedFields) {
            // Ajoute le champ à dataToUpdate seulement s'il est présent dans req.body
            // Vous pourriez vouloir gérer les cas où un champ doit être supprimé (ex: mettre à null)
            if (updatedData.hasOwnProperty(field)) {
                 // Convertir yearsOfExperience en nombre si reçu comme string
                 if (field === 'yearsOfExperience' && typeof updatedData[field] === 'string') {
                     const years = parseInt(updatedData[field], 10);
                     dataToUpdate[field] = isNaN(years) ? null : years; // Met à null si pas un nombre valide
                 } else {
                     dataToUpdate[field] = updatedData[field];
                 }
            }
        }

        // Ajoute un timestamp de mise à jour
        dataToUpdate.updatedAt = FieldValue.serverTimestamp();

        console.log('[Update Coach Profile] Data prepared for Firestore:', JSON.stringify(dataToUpdate));

        // 5. Mettre à jour le document dans Firestore
        const coachDocRef = db.collection('nutritionists').doc(targetCoachUid);

        // Vérifie d'abord si le document existe
        const docSnapshot = await coachDocRef.get();
        if (!docSnapshot.exists) {
             console.log(`[Update Coach Profile] Not Found: No document found for UID: ${targetCoachUid}`);
             return res.status(404).json({ error: "Coach profile not found." });
        }

        // Effectue la mise à jour avec merge: true pour ne pas écraser les champs non inclus
        await coachDocRef.set(dataToUpdate, { merge: true });
        console.log(`[Update Coach Profile] Firestore document updated successfully for UID: ${targetCoachUid}`);

        // 6. Répondre au client avec succès
        res.status(200).json({ message: 'Profile updated successfully!' });

    } catch (error) {
        console.error(`[Update Coach Profile Error] Failed for UID: ${req.params.uid}`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
           if (!res.headersSent) return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'An internal server error occurred while updating the profile.', details: error.message });
        }
    }
};

// --- FIN DE L'AJOUT ---




// --- Sauvegarder les Reminders du COACH (AJOUTÉ ICI) ---
exports.saveCoachReminders = async (req, res) => {
    console.log("--- ENTERING saveCoachReminders ---");
    if (!checkFirebaseReady(res, "save coach reminders")) return;

    const loggedInUserId = req.user?.uid; // Via requireAuth
    const targetCoachId = req.params.coachId; // Depuis l'URL : /expert/:coachId/reminders

    console.log(`[Save Coach Reminders] Request for coach ${targetCoachId} by user ${loggedInUserId}`);

    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetCoachId) { return res.status(403).json({ error: "Forbidden: Cannot save reminders for another coach." }); }

    const { reminders } = req.body;
    if (!Array.isArray(reminders)) { return res.status(400).json({ error: "Invalid data format: 'reminders' should be an array." }); }

    try {
        console.log(`[Save Coach Reminders] Preparing to save ${reminders.length} reminders for coach ${targetCoachId}`);
        const remindersColRef = db.collection('nutritionists').doc(targetCoachId).collection('reminders');

        // Supprimer les anciens rappels
        console.log(`[Save Coach Reminders] Deleting existing reminders for coach ${targetCoachId}...`);
        const oldRemindersSnapshot = await remindersColRef.get();
        if (!oldRemindersSnapshot.empty) {
             const batchDelete = db.batch();
             oldRemindersSnapshot.forEach(doc => { batchDelete.delete(doc.ref); });
             await batchDelete.commit();
             console.log(`[Save Coach Reminders] Deleted ${oldRemindersSnapshot.size} old reminders.`);
        } else { console.log(`[Save Coach Reminders] No existing reminders found to delete.`); }

        // Ajouter les nouveaux rappels
        if (reminders.length > 0) {
            const batchAdd = db.batch();
            let addedCount = 0;
            console.log(`[Save Coach Reminders] Preparing to add ${reminders.length} new/updated reminders...`);
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
                } else { console.warn(`[Save Coach Reminders] Skipping reminder "${reminder.name}" due to invalid time.`); }
            });
            if (addedCount > 0) { await batchAdd.commit(); console.log(`[Save Coach Reminders] Added ${addedCount} new reminders.`); }
             else { console.log(`[Save Coach Reminders] No valid reminders provided.`); }
        } else { console.log(`[Save Coach Reminders] Received empty reminder list.`); }

        res.status(200).json({ message: "Coach reminders saved successfully." });

    } catch (error) {
        console.error(`[Save Coach Reminders] Error for coach ${targetCoachId}:`, error);
        if (!res.headersSent) { res.status(500).json({ error: "Internal server error while saving coach reminders.", details: error.message }); }
    } finally {
        console.log("--- EXITING saveCoachReminders ---");
    }
};

// --- Récupérer les Reminders du COACH (AJOUTÉ ICI) ---
exports.getCoachReminders = async (req, res) => {
     console.log("--- ENTERING getCoachReminders ---");
    if (!checkFirebaseReady(res, "get coach reminders")) return;

    const loggedInUserId = req.user?.uid; // Via requireAuth
    const targetCoachId = req.params.coachId; // Depuis l'URL : /expert/:coachId/reminders

    console.log(`[Get Coach Reminders] Request for coach ${targetCoachId} by user ${loggedInUserId}`);

    if (!loggedInUserId) { return res.status(401).json({ error: "Authentication required." }); }
    if (loggedInUserId !== targetCoachId) { return res.status(403).json({ error: "Forbidden: Cannot get reminders for another coach." }); }

    try {
        console.log(`[Get Coach Reminders] Fetching reminders for coach ${targetCoachId}`);
        const remindersColRef = db.collection('nutritionists').doc(targetCoachId).collection('reminders');
        const q = remindersColRef.orderBy("time", "asc"); // Utilise la référence de collection
        const snapshot = await q.get();

        let remindersData = [];
        if (!snapshot.empty) {
             remindersData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { id: doc.id, name: data.name, enabled: data.enabled, time: data.time ? data.time.toMillis() : null };
             });
        }
        console.log(`[Get Coach Reminders] Found ${remindersData.length} reminders`);
        res.status(200).json({ reminders: remindersData });

    } catch (error) {
        console.error(`[Get Coach Reminders] Error fetching reminders for coach ${targetCoachId}:`, error);
         if (!res.headersSent) { res.status(500).json({ error: "Internal server error while fetching coach reminders.", details: error.message }); }
    } finally {
         console.log("--- EXITING getCoachReminders ---");
    }
};

exports.registerNutritionist = async (req, res) => {
    if (!checkFirebaseReady(res, "register nutritionist")) return;
    console.log('[ExpertReg CTRL] Request Body:', req.body);
    console.log('[ExpertReg CTRL] Files:', req.files ? { profCert: req.files.professionalCertificate?.[0]?.originalname, profImg: req.files.profileImage?.[0]?.originalname } : 'No files');

    try {
        const {
            firstName, lastName, email, password, confirmPassword, phoneNumber,
            yearsOfExperience, specialization, workplace, shortBio,
            userType // Should be "Professional"
        } = req.body;

        // --- Validation (Keep your comprehensive validation) ---
        // ... (All your existing validation checks for required fields, email, password, phone, years, specialization, bio, files) ...
        // Ensure userType is 'Professional'
        if (userType !== 'Professional') {
            console.error("[ExpertReg CTRL] Validation Error: Invalid userType received:", userType);
            return res.status(400).json({ error: "Invalid user type for professional registration." });
        }
        // (Your existing validation code from the previous version here)
        const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phoneNumber', 'yearsOfExperience', 'specialization', 'workplace', 'shortBio'];
        for (const field of requiredFields) { if (!req.body[field] || String(req.body[field]).trim() === '') { return res.status(400).json({ error: `${field} required.` }); }}
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email." });
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) return res.status(400).json({ error: "Password weak." });
        if (password !== confirmPassword) return res.status(400).json({ error: "Passwords mismatch." });
        // ... other validations ...
        if (!req.files || !req.files.professionalCertificate?.[0]) return res.status(400).json({ error: "Certificate required." });
        if (!req.files || !req.files.profileImage?.[0]) return res.status(400).json({ error: "Profile image required." });
        const certificate = req.files.professionalCertificate[0];
        const profileImage = req.files.profileImage[0];
        // ... file type/size validations ...
        console.log('[ExpertReg CTRL] Validation Passed.');
        // --- End Validation ---

        // 1. Create User in Firebase Authentication
        let userRecord;
        try {
            console.log(`[ExpertReg CTRL] Creating Auth user for: ${email}`);
            // Use admin.auth() from the admin SDK
            userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: `${firstName} ${lastName}`
            });
            console.log(`[ExpertReg CTRL] Auth User created: ${userRecord.uid}`);
        } catch (authError) {
            console.error('[ExpertReg CTRL] Auth Error:', authError.code, authError.message);
            if (authError.code === 'auth/email-already-exists') return res.status(409).json({ error: "Email already registered." });
            // Handle other auth errors
            return res.status(500).json({ error: "Auth creation failed.", details: authError.message });
        }

        // 2. Upload Files to Firebase Storage
        const bucket = admin.storage().bucket(); // Use admin.storage()
        let certificateUrl = '', profileImageUrl = '';
        try {
            console.log(`[ExpertReg CTRL] Uploading files for UID: ${userRecord.uid}`);
            const safeCertName = certificate.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const certFileName = `nutritionist_certificates/${userRecord.uid}/${Date.now()}_${safeCertName}`;
            const certFile = bucket.file(certFileName);
            await certFile.save(certificate.buffer, { metadata: { contentType: certificate.mimetype }, public: true });
            certificateUrl = certFile.publicUrl();

            const safeProfileName = profileImage.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const profileFileName = `nutritionist_profile_images/${userRecord.uid}/${Date.now()}_${safeProfileName}`;
            const profileFile = bucket.file(profileFileName);
            await profileFile.save(profileImage.buffer, { metadata: { contentType: profileImage.mimetype }, public: true });
            profileImageUrl = profileFile.publicUrl();
            console.log(`[ExpertReg CTRL] Files uploaded.`);
        } catch (storageError) {
             console.error(`[ExpertReg CTRL] Storage Error for UID ${userRecord.uid}:`, storageError);
             await admin.auth().deleteUser(userRecord.uid).catch(delErr => console.error("Cleanup Error (Auth User)", delErr));
             return res.status(500).json({ error: "File upload failed.", details: storageError.message });
        }

        // 3. Save Nutritionist Info to Firestore 'nutritionists' collection
        try {
            console.log(`[ExpertReg CTRL] Saving to Firestore for UID: ${userRecord.uid}`);
            const nutritionistData = {
                firstName, lastName, email, phoneNumber,
                professionalCertificateUrl: certificateUrl, // Corrected field name
                profileImageUrl: profileImageUrl,          // Corrected field name
                yearsOfExperience: yearsOfExperience.toString(), // Store as string or number consistently
                specialization, workplace, shortBio,
                userType: "Professional",
                onboardingComplete: true,  // <<<--- SET TO TRUE for professionals post-form
                isVerified: false,         // <<<--- SET isVerified TO FALSE
                createdAt: FieldValue.serverTimestamp(),
                clientIds: [], averageRating: 0, ratingCount: 0,
                authDisabled: false // Initially not disabled
            };
            await db.collection("nutritionists").doc(userRecord.uid).set(nutritionistData);
            console.log(`[ExpertReg CTRL] Firestore doc created for ${userRecord.uid}. isVerified: false, onboardingComplete: true`);

        } catch (firestoreError) {
            console.error(`[ExpertReg CTRL] Firestore Error for UID ${userRecord.uid}:`, firestoreError);
            await admin.auth().deleteUser(userRecord.uid).catch(delErr => console.error("Cleanup Error (Auth User)", delErr));
            // TODO: Delete uploaded files from Storage on Firestore error
            return res.status(500).json({ error: "Failed to save profile details.", details: firestoreError.message });
        }

        // 4. Successful Response
        console.log(`[ExpertReg CTRL] Registration complete for UID: ${userRecord.uid}`);
        res.status(201).json({ message: "Nutritionist registration successful! Your application is under review.", userId: userRecord.uid });

    } catch (error) {
        console.error('[ExpertReg CTRL] Unhandled Error:', error);
        if (!res.headersSent) { res.status(500).json({ error: "Unexpected error.", details: error.message }); }
    }
};

// Export the Multer middleware
exports.uploadMiddleware = upload.fields([
    { name: 'professionalCertificate', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
]);
