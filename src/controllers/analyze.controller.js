// controllers/analyze.controller.js
const { default: mongoose } = require('mongoose');
const { analyzeService } = require('../services/contract.service');
const logger = require('../utils/logger');
const User = require('../models/user')(mongoose);
const axios = require('axios');

const analyzeContract = async (req, res) => {
  try {
    // Get the authenticated user
    const token = req.headers.authorization;
    console.log('tests 2 : ', token);

    if (!token) {
      return res.status(401).json({ message: "No auth token provided" });
    }

    // ✅ Fetch user info from auth microservice
    const response = await axios.get(`${process.env.API_AUTH}/api/auth/me`, {
      headers: {
        Authorization: token // Forward the same token
      }
    });

    const user = await User.findById(response.data._id);
    console.log('tests 2 : ', user);

    if (!user) {
      logger.warn('User not found during analysis');
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Check free user limits
    if (user.typeAbonnement === 'free') {
      if (user.analysisCount >= 3) {
        logger.warn(`Free user ${user._id} exceeded analysis limit`);
        return res.status(402).json({ 
          message: 'Limite d\'analyses atteinte. Passez à Premium pour continuer.',
          upgradeUrl: '/subscription'
        });
      }
    }

    const { contractId } = req.params;
    if (!contractId) {
      logger.warn('No contract ID found in request');
      return res.status(400).json({ message: 'Aucun id de contract n\'a été trouvé.' });
    }

    const contractAnalyzedByIA = await analyzeService(contractId);

    // Increment analysis count for free users
    if (user.typeAbonnement === 'free') {
      await User.findByIdAndUpdate(user._id, {
        $inc: { analysisCount: 1 }
      });
    }

    logger.info(`Contract ${contractId} analyzed successfully`);
    return res.status(200).json({ 
      message: `Contract ${contractId} analysé avec succès.`, 
      contractAnalyzedByIA,
      remaining: user.typeAbonnement === 'free' ? 3 - (user.analysisCount + 1) : 'unlimited'
    });
  } catch (error) {
    logger.error('Analysis error:', error.stack);
    res.status(500).json({ message: 'Erreur interne serveur' });
  }
};

module.exports = { analyzeContract };