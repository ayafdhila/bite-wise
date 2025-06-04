// getAdminToken.js
// IMPORTANT: Uses CLIENT SDK, not Admin SDK
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, getIdToken } = require("firebase/auth");

// --- IMPORTANT: Get your Firebase Project Config ---
// Go to Firebase Console -> Project Settings -> General -> Your apps -> Web app
// Find the 'firebaseConfig' object and copy its values here.
const firebaseConfig = {
    apiKey: "AIzaSyDXtJYV_D9NWboBjLIsLmKdUs8E4MV7IsQ",
    authDomain: "bitewise-4d93e.firebaseapp.com",
    projectId: "bitewise-4d93e",
    messagingSenderId: "770007658347",
    appId: "1:770007658347:web:6eb277a31983b0f2a9e62e",
    measurementId: "G-D67TZBLB7E",
    storageBucket: "bitewise-4d93e.firebasestorage.app",
  };
// --- Admin User Credentials ---
const adminEmail = "admin@gmail.com"; // <<< REPLACE
const adminPassword = "AdminBiteWise123*";   // <<< REPLACE

// Initialize Firebase Client App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Function to sign in and get token
async function fetchAdminToken() {
    try {
        console.log(`Attempting to sign in as ${adminEmail}...`);
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;
        console.log(`Sign-in successful for UID: ${user.uid}`);

        console.log("Fetching ID Token...");
        // Force refresh? Usually not needed just for testing, but true ensures it's fresh
        const idToken = await getIdToken(user, false);

        if (idToken) {
            console.log("\n--- ADMIN ID TOKEN (Copy this entire token) ---");
            console.log(idToken); // Print the token
            console.log("--- END OF TOKEN ---\n");
            console.log("Token retrieved successfully.");
        } else {
            console.error("Failed to retrieve ID token after sign-in.");
        }

    } catch (error) {
        console.error("Error during sign-in or token fetch:", error.code, error.message);
    }
}

fetchAdminToken();