// File: controllers/chatbotController.js

// --- Core Dependencies ---
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // Load .env variables

// --- Required Modules ---
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// --- Firebase Admin Setup (using your pattern) ---
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin;
const db = firebaseInstances.db;
const FieldValue = admin?.firestore?.FieldValue; // Use optional chaining for safety

// --- Environment Variables & Constants ---
const API_KEY = process.env.GEMINI_API_KEY;
const isDevelopment = process.env.NODE_ENV === 'development';
const FIRESTORE_COLLECTION = 'conversations'; // Firestore collection for chat history
const MAX_HISTORY_FOR_API = 20; // Max turns (user + bot) to send to Gemini API
const MAX_MESSAGES_IN_DB = 100; // Max total messages to store per user in Firestore DB

// --- Helper: Check Firebase Init ---
function checkChatbotFirebaseInitialized() {
  let missing = [];
  if (!admin) missing.push("Admin SDK");
  if (!db) missing.push("Firestore DB");
  if (!FieldValue) missing.push("Firestore FieldValue");
  if (missing.length > 0) {
    console.error(`[Chatbot Controller] FATAL: Firebase service(s) not initialized: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

// --- CSV Dataset Loading ---
// Assumes 'chatbotDataset.csv' is directly in the 'back/' folder (one level above 'controllers')
const datasetPath = path.join(__dirname, '..', 'chatbotDataset.csv'); // <--- Path should be correct now if file saved properly
let chatbotDataset = [];
console.log(`[Data Loader] Attempting to load dataset from: ${datasetPath}`);

if (fs.existsSync(datasetPath)) {
    fs.createReadStream(datasetPath)
      .pipe(csv()) // This reads CSV, not XLSX
      .on('data', (row) => {
        // Clean up data: trim keys/values, ensure essential columns have data
        const cleanedRow = {};
        let hasEssentialData = true;
        for (const key in row) {
            const trimmedKey = key.trim();
            const trimmedValue = row[key] ? row[key].trim() : '';
            cleanedRow[trimmedKey] = trimmedValue;
        }
        // Check if essential columns are present AND non-empty
        if (!cleanedRow.Intent || !cleanedRow.User_message || !cleanedRow.Bot_Response) {
            hasEssentialData = false;
        }

        if (hasEssentialData) {
            chatbotDataset.push(cleanedRow);
        } else {
            if (isDevelopment) {
                console.warn(`[Data Loader] Skipping row due to missing essential data: ${JSON.stringify(row)}`);
            }
        }
      })
      .on('end', () => {
        console.log(`[Data Loader] CSV file successfully processed. ${chatbotDataset.length} valid rows loaded.`);
        if (chatbotDataset.length === 0) {
            console.warn("[Data Loader] Warning: Chatbot dataset is empty or has no valid rows. Check CSV format/content.");
        }
      })
      .on('error', (error) => {
          console.error("[Data Loader] !!! Error loading or parsing CSV dataset:", error); // Check for parsing errors too
      });
} else {
    console.error(`[Data Loader] !!! Error: CSV file not found at path: ${datasetPath}`); // This error should disappear now
    console.error("[Data Loader] Chatbot will operate without CSV dataset context.");
}
// --- End CSV Dataset Loading ---


// --- Initial Check for API Key ---
if (!API_KEY) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! CRITICAL STARTUP ERROR: GEMINI_API_KEY is not defined !!!");
    // ... (rest of error message)
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

// --- Initialize Google AI Client ---
let genAI;
let model;
if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("[Chatbot Controller] GoogleGenerativeAI client initialized successfully with model gemini-1.5-pro.");
    } catch (initError) {
        console.error("[Chatbot Controller] !!! FAILED to initialize GoogleGenerativeAI client:", initError.message);
        genAI = null;
    }
} else {
    console.warn("[Chatbot Controller] Google AI Client NOT initialized because GEMINI_API_KEY is missing.");
    genAI = null;
}
// --- End AI Client Init ---


// --- Helper Function to Find Relevant Rows from CSV ---
function findRelevantRows(userMessage, dataset) {
    if (!userMessage || dataset.length === 0) {
        return [];
    }
    const lowerUserMessage = userMessage.toLowerCase().trim();

    // Priority 1: Exact Match
    const exactMatch = dataset.find(row => row.User_message.toLowerCase() === lowerUserMessage);
    if (exactMatch) {
        console.log(`[Matcher] Found exact match for: "${userMessage}"`);
        return [exactMatch];
    }

    // Priority 2: Keyword/Intent Matching
    let potentialMatches = dataset.filter(row =>
        lowerUserMessage.includes(row.Intent.toLowerCase()) ||
        lowerUserMessage.split(' ').some(word => word.length > 2 && row.User_message.toLowerCase().includes(word))
    );

    potentialMatches.sort((a, b) => {
        const wordsA = a.User_message.toLowerCase().split(' ').filter(w => lowerUserMessage.includes(w)).length;
        const wordsB = b.User_message.toLowerCase().split(' ').filter(w => lowerUserMessage.includes(w)).length;
        return wordsB - wordsA;
    });

    const limitedMatches = potentialMatches.slice(0, 3);
    if (limitedMatches.length > 0) {
         console.log(`[Matcher] Found ${limitedMatches.length} potential matches for: "${userMessage}"`);
    }
    return limitedMatches;
}
// --- End Helper Function ---


// --- Main Controller Function ---
const handleChatMessage = async (req, res) => {
    console.log("-------------------- New Chatbot Request ----");

    // --- Verify Firebase Initialization ---
    if (!checkChatbotFirebaseInitialized()) {
         if (!res.headersSent) {
             res.status(500).json({ error: "Server configuration error (Chatbot Init)." });
         }
         return;
    }

    // --- Get Authenticated User ID ---
    const userId = req.user?.uid;
    if (!userId) {
        console.error("[Chatbot Controller] !!! CRITICAL: User ID missing after auth middleware.");
        return res.status(401).json({ error: "Unauthorized: User identifier missing." });
    }

   
    if (!API_KEY || !genAI || !model) {
         console.error(`[Chatbot Controller] !!! Error for UID ${userId}: API Key or AI Client not available.`);
         return res.status(500).json({ error: "Server configuration error (AI Service)." });
    }


    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
        console.warn(`[Chatbot Controller] Invalid message from UID ${userId}: "${message}"`);
        return res.status(400).json({ error: "Message cannot be empty." });
    }
    const trimmedMessage = message.trim();

    console.log(`[Chatbot Controller] Processing request - UID: ${userId}, Message: "${trimmedMessage}"`);

    // --- Firestore Document Reference ---
    const conversationDocRef = db.collection(FIRESTORE_COLLECTION).doc(userId);

    try {
        // --- 1. Retrieve Chat History from Firestore ---
        let userHistory = [];
        let fullDbMessages = [];
        const docSnap = await conversationDocRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            fullDbMessages = data.messages || [];
            userHistory = fullDbMessages
                .map(msg => ({
                    role: msg.role === 'bot' ? 'model' : msg.role, // Ensure 'model' role
                    parts: Array.isArray(msg.parts) ? msg.parts.map(part => ({ text: part.text || '' })) : [{ text: msg.text || '' }]
                }))
                .filter(msg => msg.parts.every(part => part.text))
                .slice(-MAX_HISTORY_FOR_API);
            console.log(`[Chatbot Controller] Retrieved Firestore history for UID ${userId}. Full: ${fullDbMessages.length}, API: ${userHistory.length}`);
        } else {
            console.log(`[Chatbot Controller] No existing Firestore conversation for UID ${userId}.`);
        }

        // --- 2. Find Relevant CSV Data ---
        const relevantRows = findRelevantRows(trimmedMessage, chatbotDataset);
        let csvContextInstructions = "";
        if (relevantRows.length > 0) {
            csvContextInstructions = "Use these examples from our knowledge base if relevant:\n";
            relevantRows.forEach((row, index) => {
                csvContextInstructions += `Example ${index + 1}: User: "${row.User_message}" (Intent: ${row.Intent}) -> Bot: "${row.Bot_Response}"\n`;
            });
            csvContextInstructions += "---\n";
        } else {
             console.log(`[Chatbot Controller] No relevant CSV examples found for: "${trimmedMessage}"`);
        }

        // --- 3. Prepare for Gemini Chat API ---
        console.log(`[Chatbot Controller] Starting Gemini chat for UID ${userId} with ${userHistory.length} history messages.`);
        const chat = model.startChat({ history: userHistory });

        // Inject context + user message
        const messageToSend = `${csvContextInstructions}User asks: ${trimmedMessage}\n\nYour friendly and helpful response as BiteWise assistant:`;
        console.log(`[Chatbot Controller] Sending message to Gemini chat for UID ${userId}.`);
        if (isDevelopment) {
             console.log(`[Chatbot Controller] Prompt Start: ${messageToSend.substring(0,400)}...`);
        }

        // --- 4. Call Gemini Chat API ---
        const result = await chat.sendMessage(messageToSend);
        const response = result.response;
        if (!response || typeof response.text !== 'function') {
            console.error("[Chatbot Controller] !!! Invalid response structure from Gemini API.");
            throw new Error("Invalid response structure from AI service.");
        }
        const botReply = response.text().trim();
        console.log(`[Chatbot Controller] Gemini chat successful for UID ${userId}. Reply starts:`, botReply.substring(0, 100) + '...');

        // --- 5. Update Chat History in Firestore (with CORRECTED Timestamp handling) ---
        const now = new Date(); // Use standard JS Date

        const newUserTurn = {
            role: "user",
            parts: [{ text: trimmedMessage }],
            timestamp: now // Use JS Date
        };
        const newBotTurn = {
            role: "model",
            parts: [{ text: botReply }],
            timestamp: now // Use JS Date
        };

        let updatedMessages = [...fullDbMessages, newUserTurn, newBotTurn];
        if (updatedMessages.length > MAX_MESSAGES_IN_DB) {
            console.log(`[Chatbot Controller] Truncating DB messages for UID ${userId} from ${updatedMessages.length} to ${MAX_MESSAGES_IN_DB}`);
            updatedMessages = updatedMessages.slice(-MAX_MESSAGES_IN_DB);
        }

        // Save to Firestore
        await conversationDocRef.set({
            userId: userId,
            messages: updatedMessages, // Array contains JS Dates now
            lastUpdatedAt: FieldValue.serverTimestamp() // OK for top-level field
        }, { merge: true });

        console.log(`[Chatbot Controller] Saved updated history to Firestore for UID ${userId}. DB count: ${updatedMessages.length}`);

        // --- 6. Send Response to Client ---
        res.status(200).json({ reply: botReply });

    } catch (error) {
        console.error(`[Chatbot Controller] !!! Error during Firestore operation or Gemini call for UID ${userId}:`);
        console.error(`[Chatbot Controller] Error Message: ${error.message}`);
         if (isDevelopment && error.stack) {
            console.error('[Chatbot Controller] Error Stack:', error.stack);
        }

        // --- Detailed Error Mapping ---
        let errorMessage = "Erreur lors de la communication avec le chatbot.";
         if (error.code && (error.code === 5 || error.code === 7 || error.code === 'permission-denied')) {
             errorMessage = "Erreur d'autorisation d'accès à l'historique.";
         } else if (error.message.includes('API key not valid') || error.message.includes('permission denied')) {
              errorMessage = "Clé API AI invalide ou non autorisée.";
         } else if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
              errorMessage = "Limite d'utilisation atteinte (AI ou DB). Réessayez plus tard.";
         } else if (error.message.includes('timed out') || error.message.includes('network error') || error.code === 'UNAVAILABLE') {
              errorMessage = "La connexion au service AI ou à la base de données a échoué.";
         } else if (error.message.includes('Invalid response structure')) {
             errorMessage = "Réponse inattendue du service AI.";
         }
         // Check for the specific Firestore timestamp error again just in case
         else if (error.message.includes('FieldValue.serverTimestamp() cannot be used inside of an array')) {
             errorMessage = "Erreur interne lors de la sauvegarde de l'historique."; // User-friendly message
             console.error("[Chatbot Controller] Firestore timestamp array error detected - This should have been fixed!");
         }


        console.error(`[Chatbot Controller] Sending 500 error to client (UID ${userId}) with message: "${errorMessage}"`);
        res.status(500).json({
            error: errorMessage,
            details: isDevelopment ? `${error.name}: ${error.message}` : undefined
        });
    } finally {
        console.log(`[Chatbot Controller] handleChatMessage function finished for UID ${userId}.`);
        console.log("-----------------------------------------------------------\n");
    }
};

module.exports = {
    handleChatMessage
};