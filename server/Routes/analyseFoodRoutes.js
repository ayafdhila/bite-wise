const express = require('express');
const router = express.Router();

const analyseFoodController = require('../controllers/analyseFood');

router.get('/food/:barcode', analyseFoodController.getFoodByBarcode);

module.exports = router;
