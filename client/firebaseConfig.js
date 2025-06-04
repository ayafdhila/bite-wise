import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage"; 


// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDXtJYV_D9NWboBjLIsLmKdUs8E4MV7IsQ",
  authDomain: "bitewise-4d93e.firebaseapp.com",
  projectId: "bitewise-4d93e",
  messagingSenderId: "770007658347",
  appId: "1:770007658347:web:6eb277a31983b0f2a9e62e",
  measurementId: "G-D67TZBLB7E",
  storageBucket: "bitewise-4d93e.firebasestorage.app",
};

// Initialize Firebase only once (avoid reinitialization)
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistence (this only needs to be done once)
const auth = getAuth(firebaseApp); // Get Auth instance for the already initialized app

// Initialize Firestore
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
// Export Auth and Firestore for use in other components
export { auth, db, storage };  
export default firebaseApp;  // Export the Firebase app instance (optional)
