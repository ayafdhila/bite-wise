const express = require('express');
const router = express.Router();
const expertForm = require('../controllers/expertForm'); 
const { requireAuth } = require('../middleware/authMiddleware');
const CoachFeedbackController = require('../controllers/CoachFeedbackController');
const DeleteController = require('../controllers/DeleteController');
router.post(
    '/register',
    expertForm.uploadMiddleware, 
    expertForm.registerNutritionist
);
router.get(
    '/profile/:uid', 
    expertForm.getCoachProfile 
);

//Mettre à jour coachProfile
router.put(
    '/profile/:uid', 
    requireAuth,
    expertForm.updateCoachProfile );
module.exports = router;

//envoyer feedback
router.post(
    '/feedback', 
    requireAuth, 
    CoachFeedbackController.submitCoachFeedback);

//Ajouter des reminders 
router.put(
    '/:coachId/reminders',
    requireAuth,
    expertForm.saveCoachReminders );

// Supprimer compte
router.delete(
    '/:uid', 
    requireAuth, 
    DeleteController.deleteAccountCompletely 
    );
module.exports = router;