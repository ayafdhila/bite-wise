// setAdminClaim.js
const admin = require('firebase-admin');

// --- CONFIGURATION ---
// !! Replace with the actual path to your service account key file !!
const serviceAccount = require('./bitewise-4d93e-firebase-adminsdk-fbsvc-3ad383a638.json'); // <-- ADJUST FILENAME
// !! Replace with the UID of the user you want to make an admin !!
const uidToMakeAdmin = '9hvIFiBGaXhTjDDGjjD2q7aERKk1'; // <-- REPLACE THIS
// -------------------

try {
    // Initialize the Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    // Set the custom claim { admin: true } for the specified user
    admin.auth().setCustomUserClaims(uidToMakeAdmin, { admin: true })
        .then(() => {
            console.log(`Successfully set 'admin: true' claim for user: ${uidToMakeAdmin}`);
            // Optional: Verify the claim immediately
            return admin.auth().getUser(uidToMakeAdmin);
        })
        .then((userRecord) => {
             console.log('Verification - User claims:', userRecord.customClaims);
             process.exit(0); // Exit successfully
        })
        .catch(error => {
            console.error('Error setting or verifying custom claim:', error);
            process.exit(1); // Exit with error
        });

} catch (error) {
     console.error("Error initializing Firebase Admin SDK:", error);
     process.exit(1);
}