const analysisService = require("../services/contract.service")

const analyzeContract = async (req, res) => {
  try {
    const { contractId } = req.params
    const token = req.headers.authorization

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token requis",
      })
    }

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "ID contrat requis",
      })
    }

    // Vérifier l'utilisateur
    const authData = await analysisService.verifyUser(token)
    if (!authData.success) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié",
      })
    }

    const user = authData.data

    // Vérifier les limites pour les utilisateurs gratuits
    try {
      analysisService.checkFreeUserLimit(user)
    } catch (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        upgradeUrl: error.upgradeUrl,
      })
    }

    // Récupérer le contrat
    const contractResponse = await analysisService.getContractInfo(contractId)
    if (!contractResponse.success) {
      return res.status(404).json({
        success: false,
        message: "Contrat non trouvé",
      })
    }

    const contract = contractResponse.data

    // Analyser le contrat avec l'IA
    const analysisResult = await analysisService.performAIAnalysis(contract.content)

    // Sauvegarder l'analyse
    await analysisService.saveAnalysis(contractId, analysisResult, token)

    // Incrémenter le compteur pour les utilisateurs gratuits
    if (user.typeAbonnement === "free") {
      await analysisService.incrementUserAnalysisCount(user._id, token)
    }

    res.json({
      success: true,
      data: {
        contractId,
        analysis: analysisResult,
        remaining: user.typeAbonnement === "free" ? Math.max(0, 3 - (user.analysisCount + 1)) : "unlimited",
      },
    })
  } catch (error) {
    console.error("Erreur analyse:", error)

    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        message: (error.response.data && error.response.data.message) || "Erreur service",
      })
    }

    res.status(500).json({
      success: false,
      message: error.message || "Erreur interne serveur",
    })
  }
}

module.exports = {
  analyzeContract,
}