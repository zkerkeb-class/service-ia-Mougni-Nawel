const express = require('express');
const helmet = require('helmet');
const timeout = require('express-timeout-handler');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.dev') });
const { initializeMetrics, metricsRouter, metricsMiddleware } = require('./utils/metrics');


const logger = require('./utils/logger.js');
const router = require('./routes/index.js');
const { connectAndLoadModels } = require('./models/index.js');

const app = express();
const port = 8001;

// Set up the HTTP server explicitly
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔧 INITIALISATION DES MÉTRIQUES (OBLIGATOIRE)
initializeMetrics('authentification');

// 📊 MIDDLEWARE MÉTRIQUES (avant les autres middlewares)
app.use(metricsMiddleware);

// 🛣️ ROUTES MÉTRIQUES
app.use(metricsRouter);

// Gestion d'erreur globale avec métriques
app.use((err, req, res, next) => {
  const { recordError } = require('./utils/metrics');
  recordError('unhandled_error', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Token CSRF invalide ou manquant.' });
  }
  next(err);
});

// Routes
app.use('/api', router);

// Global error handler
app.use((err, req, res, next) => {
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({ error: 'Timeout serveur, veuillez réessayer plus tard.' });
  }
  logger.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Database retry connection
async function connectWithRetry() {
  const pRetry = (await import('p-retry')).default;
  return pRetry(
    () =>
      mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    {
      retries: 3,
      onFailedAttempt: (error) => {
        logger.info(`Tentative ${error.attemptNumber} échouée. Erreur: ${error.message}`);
      },
    }
  );
}

// Initialize application
// const initializeApp = async () => {
//   try {
//     await connectAndLoadModels();
//     mongoose.set('debug', true);
//     logger.info('Application initialisée avec succès');
//   } catch (error) {
//     logger.error('Initialization failed:', error);
//     process.exit(1);
//   }
// };
const initializeApp = async () => {
  try {
    mongoose.set('strictQuery', false); // Prepare for Mongoose 7
    
    const db = await connectAndLoadModels();
    app.locals.db = db;
    
    // Verify connection
    await mongoose.connection.db.admin().ping();
    logger.info('MongoDB ping successful');
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Initialization failed:', error);
    
    // Detailed error logging
    if (error.name === 'MongoServerSelectionError') {
      logger.error('Cannot connect to MongoDB server. Check:');
      logger.error('- Is MongoDB running?');
      logger.error('- Is the connection string correct?');
      logger.error('- Are network/firewall settings blocking the connection?');
    }
    
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeApp();

  server.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
