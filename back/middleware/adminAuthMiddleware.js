// middleware/adminAuthMiddleware.js
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin;

// Middleware to verify token AND check for admin custom claim
const requireAdminAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!admin) {
         console.error("AdminAuthMiddleware Error: Firebase Admin SDK not initialized!");
         return res.status(503).json({ error: 'Server configuration error (Admin Auth Init).' });
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        try {
            // Verify the ID token using Firebase Admin SDK.
            // This verifies the signature and checks expiry.
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log('AdminAuthMiddleware: Token verified for UID:', decodedToken.uid);

            // *** CRUCIAL: Check for the custom admin claim ***
            if (decodedToken.admin === true) {
                console.log(`AdminAuthMiddleware: Admin claim verified for UID: ${decodedToken.uid}`);
                // Attach the full decoded token (which includes the UID and the admin claim)
                // to the request object for later use in controllers.
                req.user = decodedToken;
                next(); // User is authenticated AND is an admin, proceed to the next middleware/controller
            } else {
                // User is authenticated, but NOT an admin
                console.warn(`AdminAuthMiddleware: Access FORBIDDEN for non-admin user: ${decodedToken.uid}`);
                return res.status(403).json({ error: 'Forbidden: Admin access required.' });
            }
        } catch (error) {
            // Handle token verification errors (expired, invalid, etc.)
            console.error('AdminAuthMiddleware: Token verification failed:', error.code, error.message);
            let errorMessage = 'Unauthorized: Invalid or expired token.';
            if (error.code === 'auth/id-token-expired') {
                errorMessage = 'Unauthorized: Token expired.';
            }
            return res.status(401).json({ error: errorMessage });
        }
    } else {
        // No token provided
        console.log('AdminAuthMiddleware: No Bearer token found in header.');
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
};

module.exports = { requireAdminAuth };