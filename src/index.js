const express = require("express")
const helmet = require("helmet")
const timeout = require("express-timeout-handler")
const cors = require("cors")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") })

// Import des dépendances internes
const routes = require("./routes")
const { initializeMetrics, metricsRouter, metricsMiddleware } = require("./utils/metrics")
const logger = require("./utils/logger")

// Configuration initiale
const app = express()
const SERVICE_NAME = "ia-service"
const PORT = process.env.PORT

// 1. Middlewares de sécurité
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
)

// 2. Middlewares de base
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// 3. Métriques
initializeMetrics()
app.use(metricsMiddleware)
app.use(metricsRouter)

// 4. Routes principales
app.use("/api", routes)

// 5. Health Check et Ready Check
app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  })
})

app.get("/ready", (req, res) => {
  // Ajouter ici des vérifications spécifiques au service IA
  // (ex: connexion aux modèles, GPU disponible, etc.)
  res.status(200).json({ ready: true })
})

// 6. Gestion des timeouts (augmenté pour les opérations IA)
app.use(
  timeout.handler({
    timeout: 30000, // Timeout plus long pour les requêtes IA
    onTimeout: (res) => {
      res.status(503).json({ 
        error: "Traitement IA trop long",
        suggestion: "Réessayez avec moins de données ou contactez le support"
      })
    },
    disable: ["write", "setHeaders"],
  })
)

// 7. Gestion des erreurs standardisée
app.use((err, req, res, next) => {
  const { recordError } = require("./utils/metrics")
  recordError("unhandled_error", err)
  
  logger.error(`[${SERVICE_NAME}] Error:`, {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  })

  // Format standard pour les erreurs
  const errorResponse = {
    error: {
      type: err.name || "InternalServerError",
      message: err.message || "Internal Server Error",
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    }
  }

  // Ajouter des détails supplémentaires pour les erreurs spécifiques
  if (err.type === 'API_ERROR') {
    errorResponse.error.details = err.details
  }

  res.status(err.status || 500).json(errorResponse)
})

// 8. Démarrage du serveur
const server = app.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} démarré sur le port ${PORT}`)
  logger.info(`📊 Métriques disponibles sur /metrics`)
  logger.info(`🩺 Health check sur /health`)
})

// 9. Graceful shutdown amélioré
const shutdown = async (signal) => {
  logger.info(`Reçu ${signal}, fermeture du serveur...`)
  
  try {
    server.close(() => {
      logger.info("Serveur HTTP fermé")
      process.exit(0)
    })

    // Fermer les connexions spécifiques au service IA si nécessaire
    // (ex: connexions aux APIs de modèles IA)

    setTimeout(() => {
      logger.error("Forçant la fermeture après timeout")
      process.exit(1)
    }, 10000)

  } catch (error) {
    logger.error("Erreur lors de l'arrêt:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

module.exports = app