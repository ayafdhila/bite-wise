const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const { requireAuth } = require('../middleware/authMiddleware'); // Your auth middleware

// --- USER-FOCUSED ROUTES ---
router.get('/status', requireAuth, coachingController.getCoachingStatus);
router.post('/select', requireAuth, coachingController.selectCoach);
router.post('/request', requireAuth, coachingController.sendCoachRequest);
router.get('/request-status/:nutritionistId', requireAuth, coachingController.getSpecificRequestStatus);
router.post('/end-relationship', requireAuth, coachingController.endRelationship);
router.post('/block', requireAuth, coachingController.blockCoach);
router.post('/unblock', requireAuth, coachingController.unblockCoach);
router.post('/rate', requireAuth, coachingController.rateCoach);


// --- COACH-FOCUSED ROUTES ---

// GET /coaching/coach/requests - Coach gets their list of PENDING incoming requests
router.get('/coach/requests', requireAuth, coachingController.getCoachRequests);

// POST /coaching/coach/requests/accept - Coach accepts a specific request
router.post('/coach/requests/accept', requireAuth, coachingController.acceptRequest);

// POST /coaching/coach/requests/decline - Coach declines a specific request
router.post('/coach/requests/decline', requireAuth, coachingController.declineRequest);

// POST /coaching/coach/end-relationship - Coach ends relationship with a specific client
router.post('/coach/end-relationship', requireAuth, coachingController.coachEndRelationship);

// *** NEW ROUTES for Coach Client List & Details ***

// GET /coaching/coach/clients - Coach gets list of their active clients
router.get('/coach/clients', requireAuth, coachingController.getCoachClients);

// GET /coaching/coach/client/:clientId/details - Coach gets full details for ONE specific active client
router.get('/coach/client/:clientId/details', requireAuth, coachingController.getClientDetailsForCoach);

// GET /coaching/coach/client/:clientId/notes - Coach gets their private notes for a specific client
router.get('/coach/client/:clientId/notes', requireAuth, coachingController.getClientNotes);

// POST /coaching/coach/client/:clientId/notes - Coach saves/updates their private notes for a specific client
router.post('/coach/client/:clientId/notes', requireAuth, coachingController.saveClientNotes);
router.get('/coach/dashboard-summary', requireAuth, coachingController.getCoachDashboardSummary);

// --- Export the router ---
module.exports = router;