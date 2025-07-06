const express = require("express")
const router = express.Router()
const analyzeController = require("../controllers/analyze.controller")

// Route de test
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "IA Service fonctionne!",
  })
})

// Route d'analyse de contrat
router.get("/analyzeContract/:contractId", analyzeController.analyzeContract)

module.exports = router
