// config/firebase.js
require("dotenv").config(); // Load .env variables AT THE TOP
const admin = require("firebase-admin");
const fs = require("fs");
const path = require('path');

// Object to hold initialized instances
const firebaseInstances = {
  admin: null,
  db: null,
  auth: null,
  storage: null,
  _initializationError: null
};

console.log("[Firebase Init] Starting initialization process...");

try {
  if (admin.apps.length > 0) {
    console.log("[Firebase Init] SDK already initialized.");
    firebaseInstances.admin = admin;
    firebaseInstances.db = admin.firestore();
    firebaseInstances.auth = admin.auth();
    firebaseInstances.storage = admin.storage();
  } else {
    // --- Service Account Configuration ---
    let serviceAccount;
    
    // Check if we should use environment variables or JSON file
    const useEnvVars = process.env.FIREBASE_USE_ENV_VARS === 'true';
    
    if (useEnvVars) {
      console.log("[Firebase Init] Using environment variables for service account...");
      
      // Create service account object from environment variables
      serviceAccount = {
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
      };

      // Validate required environment variables
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error("Missing required Firebase environment variables. Check your .env file for FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.");
      }
      
      console.log("[Firebase Init] Service account loaded from environment variables for project:", serviceAccount.project_id);
      
    } else {
      console.log("[Firebase Init] Using JSON file for service account...");
      
      // Original JSON file logic
      const serviceAccountRelativePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      console.log("[Firebase Init] Service Account Path from .env:", serviceAccountRelativePath);
      if (!serviceAccountRelativePath) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not defined or empty.");
      }
      const serviceAccountAbsolutePath = path.resolve(__dirname, '../', serviceAccountRelativePath);
      console.log("[Firebase Init] Resolved absolute path for service account:", serviceAccountAbsolutePath);
      if (!fs.existsSync(serviceAccountAbsolutePath)) {
        throw new Error(`Service account file NOT FOUND at resolved path: ${serviceAccountAbsolutePath}. Check path in .env and file location.`);
      }
      console.log("[Firebase Init] Service account file found.");
      const serviceAccountJson = fs.readFileSync(serviceAccountAbsolutePath, 'utf8');
      serviceAccount = JSON.parse(serviceAccountJson);
      console.log("[Firebase Init] Service account loaded successfully for project:", serviceAccount.project_id);
    }

    // --- Storage Bucket URL ---
    const storageBucketUrl = process.env.FIREBASE_STORAGE_BUCKET;
    console.log("[Firebase Init] Storage Bucket URL from .env:", storageBucketUrl);

    // **MODIFIED VALIDATION: Remove the .endsWith('.appspot.com') check**
    // Just ensure the variable exists and is a non-empty string.
    if (!storageBucketUrl || typeof storageBucketUrl !== 'string' || storageBucketUrl.trim() === '') {
      console.error("!!! CRITICAL ERROR: FIREBASE_STORAGE_BUCKET is missing or empty in .env file!");
      throw new Error("Missing or empty FIREBASE_STORAGE_BUCKET in .env file.");
    }
    // The actual format doesn't matter as much as it being the *correct* name for *your* bucket.
    console.log("[Firebase Init] Storage Bucket URL check passed (is a non-empty string).");

    // --- Initialize Firebase Admin SDK ---
    console.log("[Firebase Init] Initializing Firebase Admin SDK...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucketUrl // **USE THE VALUE FROM .ENV**
    });

    // --- Assign Instances & Verify ---
    firebaseInstances.admin = admin;
    firebaseInstances.db = admin.firestore();
    firebaseInstances.auth = admin.auth();
    firebaseInstances.storage = admin.storage(); // Attempt to get storage instance

    // **VERIFY STORAGE INSTANCE (Keep this check)**
    if (!firebaseInstances.storage || typeof firebaseInstances.storage.bucket !== 'function') {
      console.error("!!! CRITICAL WARNING: admin.storage() did NOT return a valid Storage instance AFTER initialization.");
      console.error("!!! This usually means the Storage Bucket name provided ('" + storageBucketUrl + "') is incorrect,");
      console.error("!!! or Cloud Storage is not enabled/configured correctly for this project in the Firebase Console,");
      console.error("!!! or the service account doesn't have permissions for Storage.");
      // throw new Error("Failed to obtain a valid Firebase Storage instance."); // Uncomment to make it fatal
    } else {
        console.log("[Firebase Init] Storage instance obtained successfully.");
    }

    console.log("[Firebase Init] SDK Initialized & Instances Assigned.");
  }

} catch (error) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! [Firebase Init] CRITICAL INITIALIZATION FAILED:");
  console.error(`!!! Error Message: ${error.message}`);
  console.error("!!! Check .env variables (FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_STORAGE_BUCKET),");
  console.error("!!! key file path/permissions, and Firebase project settings.");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  firebaseInstances._initializationError = error;
}

module.exports = {
    firebaseInstances
};