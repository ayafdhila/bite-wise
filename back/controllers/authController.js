// controllers/authController.js
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin; // Admin SDK instance
const db = firebaseInstances.db;       // Firestore instance
const FieldValue = admin.firestore.FieldValue; // Firestore FieldValue

// NOTE: Only uncomment these if you actually use them and they exist in your project
// const bcrypt = require("bcrypt");
// const transporter = require("../config/nodemailer");
// const { validateEmail } = require("../utils/validators"); // Assuming validator utils exist

// Helper: Check Firebase Init
function checkFirebaseInitialized(res, checkDb = true) {
  let missing = [];
  if (!admin) missing.push("Admin SDK"); // We need Admin SDK for auth operations
  if (checkDb && !db) missing.push("DB");
  if (missing.length > 0) {
    console.error(`FATAL (AuthController): Firebase service(s) not initialized: ${missing.join(', ')}`);
    if (!res.headersSent) {
        res.status(500).json({ error: "Server configuration error." });
    }
    return false;
  }
  return true;
}

// --- LOGIN Handler ---
const login = async (req, res) => {
  if (!checkFirebaseInitialized(res, true)) return;

  try {
    // 1. Get and Verify Token from Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
         console.log("Login CTRL: Failed - No/Invalid Bearer token in header.");
         return res.status(401).json({ error: 'Token requis (Header)' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
         console.log("Login CTRL: Failed - Empty token after split.");
         return res.status(401).json({ error: "Token requis (Empty)" });
    }

    console.log("Login CTRL: Verifying ID Token with Admin SDK...");
    const decodedToken = await admin.auth().verifyIdToken(idToken); // Use Admin SDK
    const uid = decodedToken.uid;
    const isAdminClaim = decodedToken.admin === true; // Check for admin custom claim from token
    console.log(`Login CTRL: Token verified. UID: ${uid}, IsAdminClaim (from token): ${isAdminClaim}`);

    // 2. --- Find User Data in Firestore ---
    let userSnapshot = null;
    let userData = null;
    let userType = null; // This will be determined from Firestore
    let isVerifiedProfessional = false; // Specific to professionals

    // Check 'admin' collection FIRST if admin claim is present or if user is trying to log in as admin
    if (isAdminClaim) { // If token has admin claim, prioritize admin collection
        console.log(`Login CTRL: Admin claim present. Checking 'admin' collection for ${uid}...`);
        userSnapshot = await db.collection("admin").doc(uid).get();
        if (userSnapshot.exists) {
            userData = userSnapshot.data();
            userType = userData.userType || 'Admin'; // Default to Admin if found here
            console.log(`Login CTRL: Found in 'admin'. UserType set to: ${userType}`);
        } else {
            console.warn(`Login CTRL: Admin claim was true for UID ${uid} but no document found in 'admin' collection. This might be an issue.`);
            // Potentially deny login or fall through carefully
        }
    }

    // Check 'nutritionists' if not found in 'admin' or if not specifically an admin login
    if (!userData) {
        console.log(`Login CTRL: Checking 'nutritionists' collection for ${uid}...`);
        userSnapshot = await db.collection("nutritionists").doc(uid).get();
        if (userSnapshot.exists) {
            userData = userSnapshot.data();
            userType = userData.userType || 'Professional'; // Should be Professional
            isVerifiedProfessional = userData.isVerified === true;
            console.log(`Login CTRL: Found in 'nutritionists'. UserType: ${userType}, IsVerified: ${isVerifiedProfessional}`);
        }
    }

    // Check 'users' (personal) if not found in 'admin' or 'nutritionists'
    if (!userData) {
        console.log(`Login CTRL: Checking 'users' collection for ${uid}...`);
        userSnapshot = await db.collection("users").doc(uid).get();
        if (userSnapshot.exists) {
            userData = userSnapshot.data();
            userType = userData.userType || 'Personal'; // Should be Personal
            console.log(`Login CTRL: Found in 'users'. UserType: ${userType}`);
        }
    }

    // 3. Handle User Not Found in ANY relevant Firestore Collection
    if (!userData) {
        console.error(`Login CTRL: User document for verified UID ${uid} not found in admin, nutritionists, or users collections.`);
        // This could happen if Auth user exists but Firestore doc was deleted or never created properly
        return res.status(404).json({ error: 'User profile data not found. Please complete registration or contact support.' });
    }

    // 4. --- Verification Check for Professionals ---
    if (userType === 'Professional' && !isVerifiedProfessional) {
        console.log(`Login CTRL: Attempt by unverified professional: ${uid}`);
        return res.status(403).json({
            error: "Your account is awaiting verification. Please check back later or contact support.",
            errorCode: 'ACCOUNT_PENDING_VERIFICATION' // Custom code for frontend
        });
    }

    // 5. Construct Final User Object for Frontend Context
    // Ensure isAdmin flag in final user object is based on claim AND potentially a field in admin collection
    const finalIsAdmin = isAdminClaim || (userType === 'Admin' && userData.isAdmin === true);

    const finalUserData = {
        ...userData, // Spread data from Firestore
        uid: uid, // Ensure UID from decoded token is used
        email: decodedToken.email || userData.email, // Prioritize token email
        userType: userType, // Determined from Firestore check
        admin: finalIsAdmin, // Final admin status
        // Ensure onboardingComplete is a boolean
        onboardingComplete: typeof userData.onboardingComplete === 'boolean' ? userData.onboardingComplete : false,
        // activeCoachId is only relevant for 'Personal' users
        activeCoachId: userType === 'Personal' ? (userData.activeCoachId || null) : null
    };
    console.log("Login CTRL: User profile prepared for response:", finalUserData);

    // 6. Return Success Response
    res.status(200).json({ message: "Connexion réussie", user: finalUserData });

  } catch (error) {
    console.error("Login CTRL Error:", error);
    if (error.code === 'auth/id-token-expired') return res.status(401).json({ error: "Token expiré. Veuillez vous reconnecter." });
    if (error.code?.includes('auth/invalid')) return res.status(401).json({ error: "Token invalide." });
    // Catch specific errors if thrown by logic above
    if (error.message?.includes('User profile data not found')) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de la connexion." });
  }
};


// --- Register Handler (For 'Personal' users generally, or initial step for Professionals) ---
const register = async (req, res) => {
  if (!checkFirebaseInitialized(res, true)) return;
  try {
    const { email, password, userType/* any other initial fields */ } = req.body;

    // Basic validation for essential fields
    if (!email || !password || !userType ) {
         return res.status(400).json({ error: "Email, password, names, and userType required." });
    }
    // Example for validating userType
    if (!['Personal', 'Professional', 'Admin'].includes(userType)) { // Add 'Admin' if admins can also register this way
         return res.status(400).json({ error: "Invalid userType. Must be 'Personal', 'Professional', or 'Admin'." });
    }
    // Uncomment if you have validateEmail function:
    // if (!validateEmail(email)) return res.status(400).json({ error: "Invalid email format" });

    // Determine target collection based on userType
    let targetCollectionName;
    if (userType === 'Professional') targetCollectionName = 'nutritionists';
    else if (userType === 'Admin') targetCollectionName = 'admin';
    else targetCollectionName = 'users'; // Default to 'users' for 'Personal'

    console.log(`Register CTRL: Checking email in collection: ${targetCollectionName} for email: ${email}`);
    const existingUserQuery = db.collection(targetCollectionName).where("email", "==", email);
    const existingUserSnapshot = await existingUserQuery.get();
    if (!existingUserSnapshot.empty) {
        return res.status(409).json({ error: `Email already associated with a ${userType} account in ${targetCollectionName}.` });
    }

    // Create Firebase Auth user
    console.log(`Register CTRL: Creating auth user for ${email}`);
    const userRecord = await admin.auth().createUser({
         email,
         password,
        
    });
    console.log(`Register CTRL: Auth user created: ${userRecord.uid}`);

    // If admin type, set custom claim
    if (userType === 'Admin') {
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`Register CTRL: Admin custom claim set for UID: ${userRecord.uid}`);
    }

    // Prepare Firestore document data
    const userDocData = {
        email: email, uid: userRecord.uid, userType: userType,
     
        createdAt: FieldValue.serverTimestamp(),
        onboardingComplete: false, // <<<--- START onboarding as FALSE for ALL new users
        profileImage: null, // Default profile image
        authDisabled: false, // Default
        ...(userType === 'Personal' && { activeCoachId: null }),
        ...(userType === 'Professional' && {
          
        }),
        ...(userType === 'Admin' && { isAdmin: true }), // Explicitly mark admin in Firestore too
    };

    // Create Firestore document
    const userDocRef = db.collection(targetCollectionName).doc(userRecord.uid);
    await userDocRef.set(userDocData);
    console.log(`Register CTRL: Firestore doc created in '${targetCollectionName}' for user ${userRecord.uid}. Onboarding: false.`);

    res.status(201).json({ message: "User sign up successfully. Please complete onboarding.", uid: userRecord.uid });

  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: "Email already registered " });
    if (error.code === 'auth/invalid-password') return res.status(400).json({ error: "Password too weak (min 6 chars)." });
    res.status(500).json({ error: error.message || "Failed to register user." });
  }
};


// --- Social Auth Handler ---
const socialAuth = async (req, res) => {
  if (!checkFirebaseInitialized(res, true)) return;
  try {
    const { idToken } = req.body; // This is the ID Token from client-side Firebase (after Google/FB sign-in)
    if (!idToken) return res.status(400).json({ error: "Firebase ID token is required for social auth." });

    console.log("Social Auth CTRL: Verifying Firebase ID Token from social provider...");
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name;
    const picture = decodedToken.picture;
    const isAdminClaim = decodedToken.admin === true; // Check if social sign-in might have an admin claim (less common)
    console.log(`Social Auth CTRL: Token verified. UID: ${uid}, Email: ${email}`);

    if (!email) return res.status(400).json({ error: "Email not provided in token." });

    // Determine which collection to check/update. Prioritize by specificity.
    let userSnapshot = null; let userData = null; let userType = null; let isVerifiedProfessional = false;
    let userFoundIn = null;

    if (isAdminClaim) { // If token somehow has admin claim from social (unlikely but possible)
        userSnapshot = await db.collection("admin").doc(uid).get();
        if (userSnapshot.exists) { userData = userSnapshot.data(); userType = 'Admin'; userFoundIn = 'admin'; }
    }
    if (!userData) { // Check if existing professional
        userSnapshot = await db.collection("nutritionists").doc(uid).get();
        if (userSnapshot.exists) { userData = userSnapshot.data(); userType = 'Professional'; isVerifiedProfessional = userData.isVerified === true; userFoundIn = 'nutritionists'; }
    }
    if (!userData) { // Check if existing personal user
        userSnapshot = await db.collection("users").doc(uid).get();
        if (userSnapshot.exists) { userData = userSnapshot.data(); userType = 'Personal'; userFoundIn = 'users'; }
    }

    // Handle New Social User
    if (!userData) {
      console.log(`Social Auth CTRL: First time social login UID: ${uid}. Creating 'Personal' profile...`);
     
      userType = 'Personal'; // Default new social sign-ups to Personal for now
      userData = {
        email: email, uid: uid, userType: userType,
        onboardingComplete: false, // Start onboarding as false for new social users too
        createdAt: FieldValue.serverTimestamp(),
 
        activeCoachId: null,
        profileImage: picture || null,
        authDisabled: false,
      };
      await db.collection("users").doc(uid).set(userData); // Create in 'users' collection
      console.log(`Social Auth CTRL: Created Firestore profile in 'users'. Onboarding: false.`);
      userFoundIn = 'users'; // Mark where it was created
    } else {
        // Existing user
        userType = userData.userType || (isAdminClaim ? 'Admin' : (userFoundIn === 'nutritionists' ? 'Professional' : 'Personal'));
        console.log(`Social Auth CTRL: Existing profile found in '${userFoundIn}' for UID: ${uid}. Type: ${userType}`);
        // If professional, check verification status
        if(userType === 'Professional' && !isVerifiedProfessional) {
             console.log(`Social Auth CTRL: Unverified professional social login attempt: ${uid}`);
             return res.status(403).json({ error: "Your account is awaiting verification.", errorCode: 'ACCOUNT_PENDING_VERIFICATION' });
        }
        // Update profile image if missing and available from social provider
        if (!userData.profileImage && picture) {
            await db.collection(userFoundIn).doc(uid).update({ profileImage: picture }); // Update in correct collection
            userData.profileImage = picture;
        }
    }

    // Construct final response
    const finalIsAdmin = isAdminClaim || (userType === 'Admin' && userData.isAdmin === true);
    const finalUserData = {
        ...userData,
        uid: uid, email: email, userType: userType, admin: finalIsAdmin,
        onboardingComplete: typeof userData.onboardingComplete === 'boolean' ? userData.onboardingComplete : false,
        activeCoachId: userType === 'Personal' ? (userData.activeCoachId || null) : null,
    };
    res.status(200).json({ message: "Social login successful", user: finalUserData });

  } catch (error) {
    console.error("Social auth error:", error);
    if (error.code?.includes('auth/invalid-id-token') || error.code === 'auth/argument-error') return res.status(401).json({ error: "Invalid social token." });
    res.status(500).json({ error: error.message || "Social authentication failed." });
  }
};

// --- Export all handlers ---
module.exports = { login, register, socialAuth };