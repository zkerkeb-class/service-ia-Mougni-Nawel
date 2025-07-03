const analysis = require('../models/analysis');
const { interagirAvecAssistant } = require('../utils/ia');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const contract = require('../models/contract')(mongoose);

const analyzeService = async (idContract) => {
  try {
    logger.info(`Looking for contract with ID: ${idContract}`);
    
    if (!idContract) {
      throw new Error('Contract ID is required');
    }
    
    const contractFound = await contract.findById(idContract);

    if (!contractFound) {
      logger.info(`Contract ${idContract} not found in db.`);
      throw new Error(`Contract ${idContract} not found in db.`);
    }

    // const responseIA = await interagirAvecAssistant(contractFound.content);
    const responseIA = {
      data: {
        analysis_summary: {
          overview: "Ce contrat de travail à durée indéterminée (CDI) est conclu entre ALPHANET SOLUTIONS SARL, représentée par Mme Claire DUMONT, et le salarié XXXXXXXXX MARTINEZ. Le contrat précise la fonction, la date d'entrée, le lieu de travail, la durée de travail de 35 heures par semaine, la rémunération brute mensuelle de 3 400 €, les avantages, la période d'essai, les congés, la clause de confidentialité, et les conditions de rupture. Cependant, certaines clauses peuvent être considérées comme abusives et déséquilibrées.",
    
          clauses_abusives: [
            {
              clause: "Une période d’essai de 3 mois, renouvelable une fois, est prévue.",
              explanation: "La prolongation de la période d'essai peut créer un désavantage pour le salarié, le maintenant dans une situation précaire pendant une période prolongée. L'article L1221-19 du Code du travail stipule que la durée maximale de la période d'essai pour un cadre est de 4 mois, mais le renouvellement ne devrait pas être automatique sans accord explicite du salarié.",
              suggested_change: "Spécifier que le renouvellement de la période d'essai doit être discuté avec le salarié et consigné par écrit avant la fin de la première période."
            }
          ],
    
          risks: [
            {
              risk: "Risque d'absence de mentions légales sur les obligations fiscales.",
              explanation: "Le contrat ne détaille pas les obligations fiscales des parties, ce qui peut poser des problèmes en cas de litige ou de contrôle fiscal. Selon l'article 6 du Code général des impôts, chaque partie doit être responsable de ses propres obligations fiscales.",
              suggested_solution: "Ajouter une clause précisant les responsabilités fiscales de chaque partie pour éviter tout malentendu."
            },
            {
              risk: "Risque de non-respect des obligations de protection des données personnelles.",
              explanation: "La clause de confidentialité ne précise pas les obligations en matière de données personnelles, ce qui peut entraîner des violations du Règlement Général sur la Protection des Données (RGPD) par manque de clarté sur le traitement des données personnelles.",
              suggested_solution: "Ajouter une clause sur la conformité au RGPD, stipulant les obligations relatives à la protection des données personnelles."
            }
          ],
    
          recommendations: [
            {
              recommendation: "Clarifier les conditions de rupture du contrat.",
              justification: "Préciser les modalités de rupture favorisant un équilibre entre les droits du salarié et ceux de l'employeur. Référence : articles L1232-2 et L1232-3 du Code du travail.",
              suggested_change: "Élargir la clause de rupture pour inclure des motifs de licenciement avec les droits associés en cas de licenciement abusif."
            },
            {
              recommendation: "Incorporer des mentions sur la formation professionnelle.",
              justification: "Cela garantira que le salarié a la possibilité de se former au cours de son emploi dans l'entreprise, conformément à l'article L6321-1 du Code du travail.",
              suggested_change: "Ajouter une clause précisant que l'employeur s'engage à soutenir la formation continue du salarié."
            }
          ]
        }
      }
    };
    
    console.log('mpm');
    const analysisSaved = await saveAnalysis(idContract, responseIA.data);
    
    return analysisSaved;
  } catch (error) {
    logger.error(`Error in analyzeService: ${error.message}`);
    throw error;
  }
};

async function saveAnalysis(contractId, analysisData) {
  try {
    // Parse the JSON data if it's a string
    let parsedData;
    try {
      parsedData = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
    } catch (e) {
      console.error('Error parsing analysis data:', e);
      throw new Error('Invalid JSON format');
    }
    
    // Extract the analysis summary from the parsed data
    const analysisContent = parsedData.analysis_summary;
    
    // Calculate risk level based on number of risks
    let riskLevel = 'low';
    if (analysisContent.risks && analysisContent.risks.length > 0) {
      if (analysisContent.risks.length >= 3) {
        riskLevel = 'high';
      } else if (analysisContent.risks.length >= 1) {
        riskLevel = 'medium';
      }
    }
    
    // Process abusive clauses correctly - ensure they are strings
    let abusiveClauses = [];
    if (analysisContent.clauses_abusives && Array.isArray(analysisContent.clauses_abusives)) {
      abusiveClauses = analysisContent.clauses_abusives.map(clause => {
        // If the clause is an object with a 'clause' property, extract that
        if (clause && typeof clause === 'object' && clause.clause) {
          return String(clause.clause);
        }
        // Otherwise convert it to a string directly
        return String(clause);
      });
    }
    
    // Get the Analysis model
    const Analysis = mongoose.model('Analysis');
    
    // Create the analysis document
    const analysisSaved = await Analysis.create({
      contract: contractId,
      result: JSON.stringify(parsedData),
      abusiveClauses: abusiveClauses,
      riskLevel: riskLevel,
      analysisDate: new Date()
    });
    
    // recuperer le contract a partir de l'ia pour ajouter l'id de l'analyse
    const Contract = mongoose.model('Contract');
    const contractFound = await Contract.findByIdAndUpdate(
      contractId,
      {analysis: analysisSaved.id}
    );
  
    

    console.log('pppp : ', analysisSaved);
    return analysisSaved;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}
module.exports = {
  analyzeService
};