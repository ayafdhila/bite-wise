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
    // --- Service Account Path ---
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
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log("[Firebase Init] Service account loaded successfully for project:", serviceAccount.project_id);

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