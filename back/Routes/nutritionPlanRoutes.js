// routes/nutritionPlanRoutes.js
const express = require('express');
const router = express.Router();
const {
  saveNutritionPlan,
  getNutritionPlan
} = require('../controllers/nutritionPlanController');

// PUT /api/nutrition-plan/:uid - Save/update nutrition plan
router.put('/:uid', saveNutritionPlan);

// GET /api/nutrition-plan/:uid - Get nutrition plan
router.get('/:uid', getNutritionPlan);

module.exports = router;