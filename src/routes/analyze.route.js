const express = require('express');
const router = express.Router();
const { analyzeContract } = require('../controllers/analyze.controller');

// Debug middleware specific to analyze routes
router.use((req, res, next) => {
  console.log('Analyze Router Hit:', req.method, req.path, req.params);
  next();
});

// Simple test route
router.get('/test', (req, res) => {
  return res.status(200).json({ message: 'Test route working!' });
});

// Original contract analysis route
router.get('/analyzeContract/:contractId', analyzeContract);
// router.get('/analyzeContract/:contractId', analyzeContract);

module.exports = router;