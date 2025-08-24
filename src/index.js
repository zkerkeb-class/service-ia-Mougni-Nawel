const express = require("express")
const helmet = require("helmet")
const timeout = require("express-timeout-handler")
const cors = require("cors")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") })

const routes = require("./routes")
const { initializeMetrics, metricsRouter, metricsMiddleware } = require("./utils/metrics")
const logger = require("./utils/logger")

const app = express()
const SERVICE_NAME = "ia-service"
const PORT = process.env.PORT

app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

initializeMetrics()
app.use(metricsMiddleware)
app.use(metricsRouter)

app.use("/api", routes)

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
  res.status(200).json({ ready: true })
})

app.use(
  timeout.handler({
    timeout: 30000,
    onTimeout: (res) => {
      res.status(503).json({ 
        error: "Traitement IA trop long",
        suggestion: "Réessayez avec moins de données ou contactez le support"
      })
    },
    disable: ["write", "setHeaders"],
  })
)

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

  const errorResponse = {
    error: {
      type: err.name || "InternalServerError",
      message: err.message || "Internal Server Error",
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    }
  }

  if (err.type === 'API_ERROR') {
    errorResponse.error.details = err.details
  }

  res.status(err.status || 500).json(errorResponse)
})

const server = app.listen(PORT, () => {
  logger.info(`🚀 ${SERVICE_NAME} démarré sur le port ${PORT}`)
  logger.info(`📊 Métriques disponibles sur /metrics`)
  logger.info(`🩺 Health check sur /health`)
})

const shutdown = async (signal) => {
  logger.info(`Reçu ${signal}, fermeture du serveur...`)
  
  try {
    server.close(() => {
      logger.info("Serveur HTTP fermé")
      process.exit(0)
    })

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