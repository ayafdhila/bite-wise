// setAdminClaim.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // More explicit path
const admin = require('firebase-admin');

// --- CONFIGURATION ---
// !! Replace with the UID of the user you want to make an admin !!
const uidToMakeAdmin = '9hvIFiBGaXhTjDDGjjD2q7aERKk1'; // <-- REPLACE THIS
// -------------------

// Debug: Check if environment variables are loaded
console.log("Debug - Environment variables check:");
console.log("  - FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "NOT SET");
console.log("  - FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "SET" : "NOT SET");
console.log("  - FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "SET (length: " + process.env.FIREBASE_PRIVATE_KEY.length + ")" : "NOT SET");

try {
    // Process the private key - handle different formats
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is required in .env file");
    }
    
    // Replace literal \n with actual newlines and remove extra quotes
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"/, '').replace(/"$/, '');

    // Create service account object from environment variables
    const serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com"
    };

    // Validate required environment variables
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error("Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL");
    }

    console.log("Initializing Firebase Admin SDK with environment variables...");
    console.log("Project ID:", serviceAccount.project_id);

    // Initialize the Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log(`Setting admin claim for user: ${uidToMakeAdmin}`);

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