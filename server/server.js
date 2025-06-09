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
   console.error("CRITICAL: Server cannot start due to Firebase initialization failure. Check ./config/firebase.js and service account path/permissions.");
   process.exit(1); // Exit if Firebase failed to initialize
}
console.log("Firebase initialization check passed in server.js.");


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
const notificationRoutes = require('./Routes/notificationRoutes');
const notificationScheduler = require('./services/NotificationScheduler'); // This starts the scheduler

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

// Add notification routes
app.use('/', notificationRoutes);

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

  console.log("📅 Notification scheduler is running...");
});