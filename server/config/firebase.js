// config/firebase.js
require("dotenv").config(); // Load .env variables AT THE TOP
const admin = require("firebase-admin");

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
    console.log("[Firebase Init] Loading service account from environment variables...");
    
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
    
    console.log("[Firebase Init] Service account loaded for project:", serviceAccount.project_id);
    
    // Get storage bucket
    const storageBucketUrl = process.env.FIREBASE_STORAGE_BUCKET;
    if (!storageBucketUrl) {
      throw new Error("FIREBASE_STORAGE_BUCKET is required in .env file");
    }

    // Initialize Firebase Admin SDK
    console.log("[Firebase Init] Initializing Firebase Admin SDK...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucketUrl
    });

    // Assign instances
    firebaseInstances.admin = admin;
    firebaseInstances.db = admin.firestore();
    firebaseInstances.auth = admin.auth();
    firebaseInstances.storage = admin.storage();

    console.log("[Firebase Init] SDK initialized successfully.");
  }

} catch (error) {
  console.error("[Firebase Init] CRITICAL INITIALIZATION FAILED:");
  console.error("Error:", error.message);
  console.error("Please check your .env file for required Firebase environment variables.");
  firebaseInstances._initializationError = error;
}

module.exports = {
    firebaseInstances
};