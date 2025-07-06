'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const basename = path.basename(__filename);
const env = 'development';  // You can modify this based on your environment variable setup
const config = require(__dirname + '/../config/config.js')[env];

const db = {};
const mongoURI = config.uri;

// const connectAndLoadModels = async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect(mongoURI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     logger.info(`MongoDB connected successfully to ${mongoURI}`);

//     // Read model files from the current directory
//     const modelFiles = fs.readdirSync(__dirname).filter((file) => {
//       return (
//         file.indexOf('.') !== 0 &&
//         file !== basename &&
//         file.slice(-3) === '.js' &&
//         file.indexOf('.test.js') === -1
//       );
//     });

//     // Dynamically load each model file
//     modelFiles.forEach((file) => {
//       try {
//         const modelPath = path.join(__dirname, file);
//         const model = require(modelPath)(mongoose);  // Load the model and pass mongoose

//         logger.info(`Model loaded: ${file}`);  // Confirm model loaded

//         // Store the model in the db object
//         db[model.modelName] = model;
//       } catch (err) {
//         logger.error(`Error loading model from file: ${file}`, err);
//       }
//     });

//     // Initialize collections for each model to ensure they're created
//     for (const modelName in db) {
//       if (modelName !== 'mongoose') {
//         await db[modelName].init();  // Ensures indexes and collection
//         logger.info(`Collection ensured for model: ${modelName}`);
//       }
//     }

//     db.mongoose = mongoose;
//     return db;
//   } catch (err) {
//     logger.error('MongoDB connection error:', err);
//     process.exit(1);
//   }
// };

// module.exports = { connectAndLoadModels, db };
