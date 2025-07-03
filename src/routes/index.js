const express = require('express');
const router = express.Router();
const analyzeRoute = require('./analyze.route');

// Debug middleware to log every request that hits this router
router.use((req, res, next) => {
  console.log('Index Router Hit:', req.method, req.originalUrl);
  next();
});

// Mount the analyze routes
router.use('/analyze', analyzeRoute);

module.exports = router;