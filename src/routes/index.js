const express = require("express")
const router = express.Router()
const analyzeRoutes = require("./analyze.route")

router.use("/analyze", analyzeRoutes)

module.exports = router
