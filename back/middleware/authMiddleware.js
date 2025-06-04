const { firebaseInstances } = require('../config/firebase');
const admin = firebaseInstances.admin;

exports.requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("Auth Middleware: Failed - No Bearer token provided.");
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        if (!admin || !firebaseInstances.auth) {
             console.error("Auth Middleware Error: Firebase Admin/Auth SDK not initialized! Check server start logs.");
             return res.status(500).json({ error: "Server configuration error (Auth Init)." });
        }
        const decodedToken = await firebaseInstances.auth.verifyIdToken(idToken);
        req.user = decodedToken; 
        console.log(`Auth Middleware: Token verified for UID ${req.user.uid}`);
        next();
    } catch (error) {
        console.error('Auth Middleware Error: verifying token:', error.code, error.message);
        const message = error.code === 'auth/id-token-expired' ? 'Unauthorized: Token expired.' : 'Unauthorized: Invalid token.';
        return res.status(401).json({ error: message });
    }
};