// Routes/nutritionalProgramRoutes.js --- CODE CORRIGÉ ---

const express = require('express');
const router = express.Router();
const nutritionalProgramController = require('../controllers/nutritionalProgramController');
const { requireAuth } = require('../middleware/authMiddleware');


console.log("--- ROUTES nutritionalProgram: Defining routes...");

// GET /api/nutrition-programs/:clientId/summary - Récupère résumé (infos générales + jours définis) POUR CLIENT
router.get(
    '/:clientId/summary',
    requireAuth,
    nutritionalProgramController.getPlanSummary // Nouvelle fonction contrôleur
);


router.get(
    '/:clientId/day/:dayName',
    requireAuth,
    nutritionalProgramController.getClientDailyPlanView // Fonction existante
);

// GET /api/nutrition-programs/:clientId - Récupère le plan complet POUR COACH (PlanEditor)
router.get(
    '/:clientId',
    requireAuth,
    nutritionalProgramController.getNutritionPlan // Fonction existante (lente, ok pour coach)
);

// POST /api/nutrition-programs/:clientId - Sauvegarde le plan (général + jour sélectionné)
router.post(
    '/:clientId',
    requireAuth,
    nutritionalProgramController.saveNutritionPlan
);

// PATCH /api/nutrition-programs/:clientId/completion - Met à jour le statut de complétion d'un jour
router.patch(
    '/:clientId/completion',
    requireAuth,
    nutritionalProgramController.updateDayCompletionStatus
);

console.log("--- ROUTES nutritionalProgram: Routes defined.");

module.exports = router;