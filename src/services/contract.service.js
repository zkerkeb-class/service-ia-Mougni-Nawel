const axios = require("axios")
const { interagirAvecAssistant } = require("../utils/ia")

class AnalysisService {
  constructor() {
    this.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL
    this.BDD_SERVICE_URL = process.env.BDD_SERVICE_URL
  }

  async verifyUser(token) {
    const authResponse = await axios.get(`${this.AUTH_SERVICE_URL}/api/auth/me`, {
      headers: { Authorization: token },
    })
    return authResponse.data
  }

  async getContractInfo(contractId) {
    const response = await axios.get(`${this.BDD_SERVICE_URL}/api/contract/${contractId}/info`)
    return response.data
  }

  async saveAnalysis(contractId, analysisData, token) {
    await axios.post(
      `${this.BDD_SERVICE_URL}/api/contract/analyze/${contractId}`,
      { analysisData },
      { headers: { Authorization: token } },
    )
  }

  async incrementUserAnalysisCount(userId, token) {
    await axios.patch(
      `${this.BDD_SERVICE_URL}/api/user/${userId}/incrementAnalysisCount`,
      {},
      { headers: { Authorization: token } },
    )
  }

  async analyzeContract(contractId, token) {
    try {
      // Vérification de l'utilisateur
      const user = await this.verifyUser(token);
      this.checkFreeUserLimit(user);

      // Récupération du contrat
      const contractInfo = await this.getContractInfo(contractId);
      if (!contractInfo || !contractInfo.content) {
        throw { status: 404, message: "Contrat non trouvé ou vide" };
      }

      // Réalisation de l'analyse IA
      console.log('pp : ', contractInfo)
      const analysisResult = await this.performAIAnalysis(contractInfo.content);

      // Sauvegarde du résultat
      await this.saveAnalysis(contractId, analysisResult, token);

      // Incrémentation du compteur
      await this.incrementUserAnalysisCount(user.data._id, token);

      return analysisResult;
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      throw error;
    }
  }

  async performAIAnalysis(content) {
    console.log('Début analyse IA du contrat : ', content);
    const responseIA = await interagirAvecAssistant(content);
    console.log('Réponse IA reçue:', responseIA);

    // Si la réponse est une string, tenter de la parser
    let parsedResponse = typeof responseIA === 'string' ?
      JSON.parse(responseIA) :
      responseIA;

    // Extraire la partie analysis_summary si elle existe
    if (parsedResponse.analysis_summary) {
      parsedResponse = parsedResponse.analysis_summary;
    }

    // Formatage cohérent avec le schéma
    return {
      overview: parsedResponse.overview || "Analyse du contrat effectuée avec succès.",
      clauses_abusives: parsedResponse.clauses_abusives || [],
      risks: parsedResponse.risks || [],
      recommendations: parsedResponse.recommendations || []
    };
  }
  checkFreeUserLimit(user) {
    if (user.typeAbonnement === "free" && user.analysisCount >= 3) {
      throw {
        status: 402,
        message: "Limite d'analyses atteinte. Passez à Premium.",
        upgradeUrl: "/subscription",
      }
    }
  }
}

module.exports = new AnalysisService()