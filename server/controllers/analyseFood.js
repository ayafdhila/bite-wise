// controllers/analyseFoodController.js

const axios = require('axios'); // For making HTTP requests
const { firebaseInstances } = require('../config/firebase'); // Firebase Admin SDK instances
const NodeCache = require("node-cache"); // In-memory cache library

// Destructure needed Firebase services
const db = firebaseInstances.db;
const admin = firebaseInstances.admin;

// --- Cache Configuration ---
// In-memory cache: Stores results for 1 day (86400 seconds) by default.
// Checks for expired items every 3 hours (10800 seconds). Adjust TTL as needed.
const productCache = new NodeCache({ stdTTL: 86400, checkperiod: 10800 });

// --- Helper Function: Query OpenFoodFacts API ---
const getProductFromOpenFoodFacts = async (barcode) => {
    // Construct the API URL for OpenFoodFacts v0 API
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    console.log(`[OFF API v0] Attempting fetch for barcode: ${barcode} via URL: ${url}`);

    try {
        // Make the GET request using axios with a timeout
        const response = await axios.get(url, {
            timeout: 15000 // 15-second timeout for the external API call
        });

        // Log basic response info
        console.log(`[OFF API v0] Raw response received for ${barcode}: Status Code: ${response.status}`);
        // Log only the beginning of the data to avoid huge logs
        console.log(`[OFF API v0] Response data (start) for ${barcode}:`, JSON.stringify(response.data)?.substring(0, 500) + '...');

        // --- Validate OpenFoodFacts Response ---
        // Check if data exists, status is 1 (found), and the 'product' key exists
        if (response.data && response.data.status === 1 && response.data.product) {
            console.log(`[OFF API v0] Product found and structure valid for ${barcode}.`);
            // Return the nested 'product' object containing details
            return response.data.product;
        } else {
            // Log if the product wasn't found according to OFF criteria
            console.log(`[OFF API v0] Product ${barcode} not found or invalid structure in OFF response (status: ${response.data?.status}, product key exists: ${!!response.data?.product}).`);
            // Return null to indicate not found or invalid structure
            return null;
        }

    } catch (error) {
        // --- Handle Errors During API Call ---
        console.error(`[OFF API v0] !!! Axios request error for ${barcode}. Message: ${error.message}`);
        if (error.response) {
            // The request was made and the server responded with a status code outside the 2xx range
            console.error(`[OFF API v0] OFF Error Status Code: ${error.response.status}`);
            console.error(`[OFF API v0] OFF Error Response Data:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // The request was made but no response was received (e.g., timeout, network issue)
            console.error('[OFF API v0] No response received from OFF (Timeout or Network Issue).');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('[OFF API v0] Axios request setup error:', error.message);
        }
        // Return null in any error case
        return null;
    }
};

// --- Main Controller Function ---
const getFoodByBarcode = async (req, res) => {
    // Extract barcode from URL parameters
    const { barcode } = req.params;

    // --- Input Validation ---
    if (!barcode || !/^\d+$/.test(barcode) || barcode.length < 8) { // Basic numeric check + common length check
        console.warn(`[Controller] Invalid barcode received: ${barcode}`);
        return res.status(400).json({ error: 'Invalid barcode format provided.' });
    }
    console.log(`[Controller] Request received for barcode: ${barcode}`);

    try {
        // --- Step 1: Check In-Memory Cache ---
        const cachedProduct = productCache.get(barcode);
        if (cachedProduct) {
            // Check if the cached entry explicitly marks the product as "not found"
            if (cachedProduct.found === false) {
                console.log(`[Cache Memory] Barcode ${barcode} found as 'not found'. Returning 404.`);
                // Return 404 immediately if cached as not found
                return res.status(404).json({ error: 'Product not found (checked cache).', found: false });
            } else {
                // Product data found in memory cache
                console.log(`[Cache Memory] Product ${barcode} found.`);
                // Return the cached data directly
                // (Assuming cached data already has defaults applied)
                return res.status(200).json(cachedProduct);
            }
        }
        console.log(`[Cache Memory] Product ${barcode} not found.`);

        // --- Step 2: Check Firestore Cache ---
        // Create a reference to the document in the 'foods' collection using the barcode as the ID
        const foodRef = db.collection('foods').doc(barcode);
        const doc = await foodRef.get(); // Fetch the document

        if (doc.exists) {
            const data = doc.data();
            // Check if the Firestore document marks the product as "not found"
            if (data.found === false) {
                console.log(`[Firestore Cache] Product ${barcode} found as 'not found'. Caching to memory and returning 404.`);
                // Update memory cache with the "not found" status
                productCache.set(barcode, { found: false });
                // Return 404
                return res.status(404).json({ error: 'Product not found (checked database).', found: false });
            } else {
                // Product data found in Firestore
                console.log(`[Firestore Cache] Product ${barcode} found.`);
                // Apply defaults just in case they were missing when originally saved
                data.fat_per_100g = Number(data.fat_per_100g) || 0;
                data.protein_per_100g = Number(data.protein_per_100g) || 0;
                data.carbs_per_100g = Number(data.carbs_per_100g) || 0;
                data.fiber_per_100g = Number(data.fiber_per_100g) || 0;
                data.calories_only_per_100g = Number(data.calories_only_per_100g) || 0;
                // Update memory cache with the data from Firestore
                productCache.set(barcode, data);
                // Return the data from Firestore
                return res.status(200).json(data);
            }
        }
        console.log(`[Firestore Cache] Product ${barcode} not found.`);

        // --- Step 3: Query OpenFoodFacts API ---
        // Call the helper function to get data from the external API
        const productDataFromOFF = await getProductFromOpenFoodFacts(barcode);

        // --- Handle "Not Found" from OpenFoodFacts ---
        if (!productDataFromOFF) {
            console.log(`[Controller] OpenFoodFacts returned null for ${barcode}. Saving 'not found' marker.`);
            // Prepare data to mark as not found in caches
            const notFoundData = { found: false, checkedAt: admin.firestore.Timestamp.now() };
            // Save "not found" marker to Firestore (don't wait for this)
            foodRef.set(notFoundData, { merge: true }).catch(err => console.error(`[Controller] Error saving 'not found' marker to Firestore for ${barcode}:`, err));
            // Save "not found" marker to memory cache
            productCache.set(barcode, notFoundData);
            // Return 404 Not Found to the client
            return res.status(404).json({ error: 'Product not found in OpenFoodFacts database.', found: false });
        }

        // --- Step 4: Structure Data Found from OpenFoodFacts ---
        console.log(`[Controller] Structuring data for ${barcode} from OpenFoodFacts.`);
        // Use empty object fallback for nutriments
        const nutriments = productDataFromOFF.nutriments || {};

        // Get ingredients text, preferring French if available
        const ingredientsText = productDataFromOFF.ingredients_text_fr || productDataFromOFF.ingredients_text || 'Ingredients not available.';

        // Get calorie value, default to 0 if missing or invalid
        const caloriesValue = Number(nutriments['energy-kcal_100g']) || 0;

        // Create combined description including ingredients and calories
        let combinedDescription = ingredientsText;
        // Append calorie info clearly
        combinedDescription += ` (Nutritional values per 100g - Calories: ${caloriesValue} kcal)`;

        // Define the final structure to send to the client and save to cache/DB
        // Use Number() || 0 pattern to ensure numeric fields default to 0
        const structuredFoodData = {
            product_name: productDataFromOFF.product_name || productDataFromOFF.product_name_fr || 'Unnamed Product',
            ingredients_description_with_calories: combinedDescription, // Combined description
            // Specific nutrients per 100g, defaulting to 0
            fat_per_100g: Number(nutriments.fat_100g) || 0,
            protein_per_100g: Number(nutriments.proteins_100g) || 0,
            carbs_per_100g: Number(nutriments.carbohydrates_100g) || 0,
            fiber_per_100g: Number(nutriments.fiber_100g) || 0,
            brand: productDataFromOFF.brands || 'Brand not specified',
            // Technical/Reference Fields
            barcode: barcode,
            found: true, // Mark as successfully found this time
            source: 'openfoodfacts-v0', // Indicate data source
            image_url: productDataFromOFF.image_url || productDataFromOFF.image_front_url || null, // Provide image URL
            calories_only_per_100g: caloriesValue, // Store numeric calorie value separately
            // Timestamps for caching/tracking
            addedAt: admin.firestore.Timestamp.now(), // When first added to *our* DB
            lastCheckedAt: admin.firestore.Timestamp.now() // When last checked against OFF
        };

        // --- Step 5: Send Response to Client ---
        console.log(`[Controller] Sending structured data for ${barcode}.`);
        // Send 200 OK with the structured data
        res.status(200).json(structuredFoodData);

        // --- Step 6: Save to Cache/DB Asynchronously (After Responding) ---
        // Use setImmediate or just let the promise run after response is sent
        setImmediate(async () => {
            try {
                console.log(`[Controller] Post-response: Saving structured data for ${barcode} to Firestore and cache.`);
                // Save the exact structured data to Firestore (overwrites if exists)
                await foodRef.set(structuredFoodData);
                // Update the memory cache with the structured data
                productCache.set(barcode, structuredFoodData);
                console.log(`[Controller] Post-response save complete for ${barcode}.`);
            } catch (saveError) {
                // Log errors during background save, but don't crash the server or affect client
                console.error(`[Controller] !!! Post-response save FAILED for ${barcode}:`, saveError);
            }
        });

    // --- Catch Unexpected Errors in Main Controller Logic ---
    } catch (error) {
        console.error(`[Controller] !!! Unexpected Internal Server Error for ${barcode}:`, error);
        // Avoid leaking internal details in production
        res.status(500).json({
             error: "Internal Server Error processing request.",
             details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; // End getFoodByBarcode

// Export the controller function to be used in routes
module.exports = {
    getFoodByBarcode
};