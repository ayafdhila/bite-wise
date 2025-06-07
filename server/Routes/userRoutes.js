const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); 
const DeleteController = require('../controllers/DeleteController');
const userFeedbackController = require('../controllers/userFeedbackController');
const { requireAuth } = require('../middleware/authMiddleware'); 


router.post('/logout', userController.logout);
router.get('/profile/:uid', requireAuth, userController.getUserById);
router.patch('/profile', requireAuth, userController.updateProfile);
router.patch('/goal', requireAuth, userController.updateGoal);
router.patch('/profile-details', requireAuth, userController.updateProfileDetails);
router.patch('/transformation', requireAuth, userController.updateTransformation);
router.patch('/dietary-preferences', requireAuth, userController.updateDietaryPreferences);
router.patch('/activity-level', requireAuth, userController.updateActivityLevel);
router.patch('/:userId/complete-onboarding', requireAuth, userController.completeOnboarding);
router.put('/profile/:uid', requireAuth, userController.updateFullUserProfile);
router.delete('/:uid',requireAuth, DeleteController.deleteAccountCompletely);
router.post('/feedback',requireAuth, userFeedbackController.submitUserFeedback);
router.get('/:uid/reminders', requireAuth, userController.getUserReminders);
router.put('/:uid/reminders', requireAuth, userController.saveUserReminders);

module.exports = router;