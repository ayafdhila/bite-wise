require("dotenv").config();
const express = require("express");
const cors = require("cors");

// --- Initialize Express App FIRST ---
const app = express();

// --- Log Environment Variable Check ---
// Keep this near the top after dotenv, but it doesn't depend on 'app'
console.log("ENV Check - Service Account Path from .env:", process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

// --- Firebase Initialization and Check ---
// This needs to run before routes that might depend on Firebase
const { firebaseInstances } = require("./config/firebase"); // Adjust path if needed
if (firebaseInstances._initializationError || !firebaseInstances.db || !firebaseInstances.auth || !firebaseInstances.admin) {
   console.error("CRITICAL: Server cannot start due to Firebase initialization failure.");
   process.exit(1); // Exit if Firebase failed to initialize
}
console.log("Firebase initialization check passed in server.js.");

// Add this after Firebase initialization
const { initializeNotificationService } = require('./services/notificationService');

// After Firebase is ready
if (firebaseInstances.db && firebaseInstances.admin) {
    console.log('🔥 Firebase initialized successfully');
    
    // Initialize notification service
    const notificationServiceReady = initializeNotificationService();
    if (notificationServiceReady) {
        console.log('📱 Notification service initialized');
    } else {
        console.error('❌ Failed to initialize notification service');
    }
} else {
    console.error('❌ Firebase initialization failed');
}

// --- Global Middleware ---
// Apply these AFTER initializing 'app' and BEFORE mounting routes

// 1. CORS: Allow requests from different origins
app.use(cors());
console.log("[Server Setup] CORS middleware enabled.");

// 2. JSON Body Parser: Parse incoming JSON request bodies
app.use(express.json()); // Apply globally ONCE
console.log("[Server Setup] express.json middleware enabled.");

// 3. URL-Encoded Body Parser: Parse bodies like form submissions
app.use(express.urlencoded({ extended: true }));
console.log("[Server Setup] express.urlencoded middleware enabled.");


// --- Import Routes ---
// Import route handlers AFTER middleware setup
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");
const expertRoutes = require("./Routes/expertRoutes");
const nutritionPlanRoutes = require("./Routes/nutritionPlanRoutes");
const recipesRoutes = require('./Routes/recipesRoutes');
const logMealRoutes = require('./Routes/logMealRoutes');
const profileRoutes = require('./Routes/profileRoutes');
const coachingRoutes = require('./Routes/coachingRoutes');
const analyseRoutes = require('./Routes/analyseFoodRoutes'); // Assuming prefix /api
const chatbotRoutes = require('./Routes/chatbotRoutes');   // Assuming prefix /api
const messageRoutes = require('./Routes/messageRoutes');
const nutritionalProgramRoutes = require("./Routes/nutritionalProgramRoutes");
const adminRoutes = require("./Routes/adminRoutes"); // Assuming prefix /admin
const { requireAdminAuth } = require("./middleware/adminAuthMiddleware"); // Import SPECIFIC admin auth middleware
let notificationRoutes;
try {
  notificationRoutes = require('./Routes/notificationRoutes');
} catch (error) {
  console.warn("Notification routes not loaded:", error.message);
}
const notificationScheduler = require('./services/NotificationScheduler');
const coachNotificationRoutes = require('./Routes/coachNotificationRoutes');

// --- Mount Routes ---
// Mount the imported route handlers

// Basic test route
app.get("/", (req, res) => {
  res.send("Bienvenue sur BiteWise!");
});

// API Routes
app.use("/auth", authRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /auth");

app.use("/user", userRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /user");

app.use("/expert", expertRoutes); // Assuming this handles its own parsing if needed, otherwise it benefits from global parsing
console.log("[Routes] Mounted /expert");

app.use("/nutritionPlan", nutritionPlanRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /nutritionPlan");

app.use('/recipes', recipesRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /recipes");

app.use('/logMeal', logMealRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /logMeal");

app.use('/profile', profileRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /profile");

app.use('/coaching', coachingRoutes); // No need for express.json() here anymore
console.log("[Routes] Mounted /coaching");

// Routes mounted under /api
app.use('/api', analyseRoutes); // These routes were already under /api
console.log("[Routes] Mounted /api/analyseFood (via analyseRoutes)");

app.use('/chatbot', chatbotRoutes); // These routes were already under /api
console.log("[Routes] Mounted /api/chatbot (via chatbotRoutes)");

app.use('/messages', messageRoutes); // These routes were already under /api
console.log("[Routes] Mounted /messages ");
app.use("/nutrition-programs", nutritionalProgramRoutes);
console.log("[Routes] Mounted /nutrition-programs ");
app.use("/admin", adminRoutes);
app.use('/api/coach', coachNotificationRoutes);

// Add notification routes if available
if (notificationRoutes) {
  app.use('/api', notificationRoutes);
  console.log("[Routes] Mounted /api/notifications");
}

// --- Global Error Handling Middleware ---
// This should usually be the LAST middleware added
app.use((err, req, res, next) => {
  console.error("!!! Unhandled Route Error Caught !!!");
  console.error(err.stack); // Log the full error stack trace
  res.status(500).json({ error: "Une erreur interne inattendue est survenue sur le serveur." });
});


// --- Start Server ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all available network interfaces

app.listen(PORT, HOST, () => {
  console.log(` Serveur BiteWise démarré sur http://${HOST}:${PORT}`);
  console.log(` Accessible depuis toutes les interfaces réseau.`);
  console.log(` Firebase connection verified.`);

  // Initialiser et démarrer le planificateur de notifications
  const schedulerInitialized = notificationScheduler.initialize();
  if (schedulerInitialized) {
    notificationScheduler.startScheduledNotifications();
    console.log("📅 Notification scheduler initialized and started!");
    console.log("⏰ Motivational notifications will be sent 2 times per day (9:00 and 18:00 UTC)");
  } else {
    console.error("❌ Failed to start notification scheduler");
  }
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('🛑 Shutting down notification scheduler...');
    notificationScheduler.stopScheduler();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down notification scheduler...');
    notificationScheduler.stopScheduler();
    process.exit(0);
});