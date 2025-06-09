const express = require('express');
const router = express.Router();

// --- Import Controller and Middleware ---
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuthMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

// --- Dashboard ---
router.get('/dashboard-summary', requireAdminAuth, adminController.getAdminDashboardSummary);

// --- Coach Management ---
router.get('/pending-coaches', requireAdminAuth, adminController.getPendingCoaches);
router.patch('/verify-coach/:coachId', requireAdminAuth, adminController.verifyCoach);

// --- User Management ---
router.get('/users', requireAdminAuth, adminController.getAllUsers);
router.patch('/users/:userId/toggle-status', requireAdminAuth, adminController.toggleUserStatus);
router.delete('/users/:userId', requireAdminAuth, adminController.deleteUserAccount);

// ADD THESE TWO ROUTES (with plural 'users'):
router.get('/users/:userId', requireAdminAuth, adminController.getUserById);      // ✅ Changed from /user/:userId
router.patch('/users/:userId', requireAdminAuth, adminController.updateUserById); // ✅ Changed from /user/:userId

// --- Feedback Management ---
router.get('/feedbacks', requireAdminAuth, adminController.getFeedbacks);
router.patch('/feedbacks/:feedbackId/status', requireAdminAuth, adminController.updateFeedbackStatus);
router.delete('/feedbacks/:feedbackId', requireAdminAuth, adminController.deleteFeedback);

router.get('/nutritionists/:nutritionistId', requireAdminAuth, adminController.getNutritionistDetailsById);

module.exports = router;