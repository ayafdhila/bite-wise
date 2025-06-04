// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// --- Import Controller and Middleware ---
// Adjust path based on your file structure
const adminController = require('../controllers/adminController');
// Import your specific admin authentication middleware
const { requireAdminAuth } = require('../middleware/adminAuthMiddleware');
const { requireAuth } = require('../middleware/authMiddleware'); // Add this line

// --- Define Admin Routes ---
// All routes defined here will be automatically prefixed with '/admin'
// (or whatever prefix you use in server.js when mounting this router, e.g., app.use('/admin', adminRoutes))
// All routes use 'requireAdminAuth' to ensure only authenticated admins can access.

// --- Dashboard ---
// GET /admin/dashboard-summary - Get counts and data for the admin dashboard
router.get(
    '/dashboard-summary',
    requireAdminAuth,
    adminController.getAdminDashboardSummary // Use the correct function name
);

// --- Coach Management ---
// GET /admin/pending-coaches - Get list of coaches awaiting verification
router.get(
    '/pending-coaches',
    requireAdminAuth,
    adminController.getPendingCoaches
);

// PATCH /admin/verify-coach/:coachId - Approve or reject a coach
// Body: { verificationStatus: boolean }
router.patch(
    '/verify-coach/:coachId',
    requireAdminAuth,
    adminController.verifyCoach
);

// --- User Management ---
// GET /admin/users - Get a list of all users (Personal & Professional)
// Add query params later for filtering/pagination (e.g., /users?type=Personal&page=1)
router.get(
    '/users',
    requireAdminAuth,
    adminController.getAllUsers
);

// PATCH /admin/users/:userId/toggle-status - Disable/Enable a user's Firebase Auth account
// Body: { disabled: boolean }
router.patch(
    '/users/:userId/toggle-status',
    requireAdminAuth,
    adminController.toggleUserStatus
);

// DELETE /admin/users/:userId - Permanently delete a user (Auth & Firestore base doc)
// !! Use with caution !!
router.delete(
    '/users/:userId',
    requireAdminAuth,
    adminController.deleteUserAccount
);

// --- Feedback Management ---
// GET /admin/feedbacks - Get feedback list, optionally filter by status (?status=New)
router.get(
    '/feedbacks',
    requireAdminAuth,
    adminController.getFeedbacks
);

// PATCH /admin/feedbacks/:feedbackId/status - Update feedback status
// Body: { status: string }
router.patch(
    '/feedbacks/:feedbackId/status',
    requireAdminAuth,
    adminController.updateFeedbackStatus
);

// DELETE /admin/feedbacks/:feedbackId - Delete a feedback item
router.delete(
    '/feedbacks/:feedbackId',
    requireAdminAuth,
    adminController.deleteFeedback
);

router.get('/nutritionists/:nutritionistId', requireAdminAuth, adminController.getNutritionistDetailsById);
// --- Export the admin router ---
module.exports = router;