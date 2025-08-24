const AnalysisService = require("../../src/services/contract.service");
const axios = require("axios");
const { interagirAvecAssistant } = require("../../src/utils/ia");

jest.mock("axios");
jest.mock("../../src/utils/ia", () => ({
  interagirAvecAssistant: jest.fn(),
}));

describe("AnalysisService", () => {
  let service;

  beforeAll(() => {
    expect(process.env.AUTH_SERVICE_URL).toBeDefined();
    expect(process.env.BDD_SERVICE_URL).toBeDefined();
  });

  beforeEach(() => {
    service = new AnalysisService();
    jest.clearAllMocks();
  });

  describe("verifyUser", () => {
    it("devrait vérifier un utilisateur avec succès", async () => {
      const token = "Bearer token123";
      const mockResponse = {
        data: {
          success: true,
          data: { _id: "user123", typeAbonnement: "premium" },
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await service.verifyUser(token);

      expect(axios.get).toHaveBeenCalledWith(
        `${process.env.AUTH_SERVICE_URL}/api/auth/me`,
        { headers: { Authorization: token } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("devrait propager l'erreur en cas d'échec de vérification", async () => {
      const token = "Bearer invalid_token";
      const error = new Error("Unauthorized");
      axios.get.mockRejectedValue(error);

      await expect(service.verifyUser(token)).rejects.toThrow("Unauthorized");
    });
  });

  describe("getContractInfo", () => {
    it("devrait récupérer les informations du contrat", async () => {
      const contractId = "contract123";
      const mockResponse = {
        data: {
          success: true,
          data: { content: "Contenu du contrat" },
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await service.getContractInfo(contractId);

      expect(axios.get).toHaveBeenCalledWith(
        `${process.env.BDD_SERVICE_URL}/api/contract/${contractId}/info`
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("saveAnalysis", () => {
    it("devrait sauvegarder l'analyse", async () => {
      const contractId = "contract123";
      const analysisData = { overview: "Test analysis" };
      const token = "Bearer token123";

      axios.post.mockResolvedValue({});

      await service.saveAnalysis(contractId, analysisData, token);

      expect(axios.post).toHaveBeenCalledWith(
        `${process.env.BDD_SERVICE_URL}/api/contract/analyze/${contractId}`,
        { analysisData },
        { headers: { Authorization: token } }
      );
    });
  });

  describe("incrementUserAnalysisCount", () => {
    it("devrait incrémenter le compteur d'analyses", async () => {
      const userId = "user123";
      const token = "Bearer token123";

      axios.patch.mockResolvedValue({});

      await service.incrementUserAnalysisCount(userId, token);

      expect(axios.patch).toHaveBeenCalledWith(
        `${process.env.BDD_SERVICE_URL}/api/user/${userId}/incrementAnalysisCount`,
        {},
        { headers: { Authorization: token } }
      );
    });
  });

  describe("analyzeContract", () => {
    it("devrait analyser un contrat avec succès", async () => {
      const contractId = "contract123";
      const token = "Bearer token123";

      const mockUser = {
        success: true,
        data: { _id: "user123", typeAbonnement: "premium" },
      };

      const mockContract = {
        success: true,
        content: "Contenu du contrat",
      };

      const mockAnalysisResult = {
        overview: "Analyse complète",
        clauses_abusives: [],
        risks: [],
        recommendations: [],
      };

      service.verifyUser = jest.fn().mockResolvedValue(mockUser);
      service.checkFreeUserLimit = jest.fn();
      service.getContractInfo = jest.fn().mockResolvedValue(mockContract);
      service.performAIAnalysis = jest.fn().mockResolvedValue(mockAnalysisResult);
      service.saveAnalysis = jest.fn().mockResolvedValue();
      service.incrementUserAnalysisCount = jest.fn().mockResolvedValue();

      const result = await service.analyzeContract(contractId, token);

      expect(service.verifyUser).toHaveBeenCalledWith(token);
      expect(service.checkFreeUserLimit).toHaveBeenCalledWith(mockUser);
      expect(service.getContractInfo).toHaveBeenCalledWith(contractId);
      expect(service.performAIAnalysis).toHaveBeenCalledWith(mockContract.content);
      expect(service.saveAnalysis).toHaveBeenCalledWith(
        contractId,
        mockAnalysisResult,
        token
      );
      expect(service.incrementUserAnalysisCount).toHaveBeenCalledWith(
        mockUser.data._id,
        token
      );
      expect(result).toEqual(mockAnalysisResult);
    });

    it("devrait lancer une erreur si le contrat est introuvable", async () => {
      const contractId = "contract123";
      const token = "Bearer token123";

      const mockUser = {
        success: true,
        data: { _id: "user123", typeAbonnement: "premium" },
      };

      service.verifyUser = jest.fn().mockResolvedValue(mockUser);
      service.checkFreeUserLimit = jest.fn();
      service.getContractInfo = jest.fn().mockResolvedValue(null);

      await expect(service.analyzeContract(contractId, token)).rejects.toEqual({
        status: 404,
        message: "Contrat non trouvé ou vide",
      });
    });

    it("devrait lancer une erreur si le contrat n'a pas de contenu", async () => {
      const contractId = "contract123";
      const token = "Bearer token123";

      const mockUser = {
        success: true,
        data: { _id: "user123", typeAbonnement: "premium" },
      };

      const mockContract = {
        success: true,
        content: "",
      };

      service.verifyUser = jest.fn().mockResolvedValue(mockUser);
      service.checkFreeUserLimit = jest.fn();
      service.getContractInfo = jest.fn().mockResolvedValue(mockContract);

      await expect(service.analyzeContract(contractId, token)).rejects.toEqual({
        status: 404,
        message: "Contrat non trouvé ou vide",
      });
    });
  });

  describe("performAIAnalysis", () => {
    it("devrait effectuer une analyse IA et retourner un format cohérent", async () => {
      const content = "Contenu du contrat à analyser";
      const mockIAResponse = {
        overview: "Analyse du contrat",
        clauses_abusives: ["Clause abusive 1"],
        risks: ["Risque 1"],
        recommendations: ["Recommandation 1"],
      };

      interagirAvecAssistant.mockResolvedValue(mockIAResponse);

      const result = await service.performAIAnalysis(content);

      expect(interagirAvecAssistant).toHaveBeenCalledWith(content);
      expect(result).toEqual({
        overview: "Analyse du contrat",
        clauses_abusives: ["Clause abusive 1"],
        risks: ["Risque 1"],
        recommendations: ["Recommandation 1"],
      });
    });

    it("devrait parser une réponse IA sous forme de string JSON", async () => {
      const content = "Contenu du contrat";
      const mockIAResponseString = JSON.stringify({
        overview: "Analyse du contrat",
        clauses_abusives: [],
        risks: [],
        recommendations: [],
      });

      interagirAvecAssistant.mockResolvedValue(mockIAResponseString);

      const result = await service.performAIAnalysis(content);

      expect(result).toEqual({
        overview: "Analyse du contrat",
        clauses_abusives: [],
        risks: [],
        recommendations: [],
      });
    });

    it("devrait extraire analysis_summary si elle existe", async () => {
      const content = "Contenu du contrat";
      const mockIAResponse = {
        analysis_summary: {
          overview: "Analyse extraite",
          clauses_abusives: ["Clause 1"],
          risks: ["Risque 1"],
          recommendations: ["Recommandation 1"],
        },
      };

      interagirAvecAssistant.mockResolvedValue(mockIAResponse);

      const result = await service.performAIAnalysis(content);

      expect(result).toEqual({
        overview: "Analyse extraite",
        clauses_abusives: ["Clause 1"],
        risks: ["Risque 1"],
        recommendations: ["Recommandation 1"],
      });
    });

    it("devrait utiliser des valeurs par défaut si les champs sont manquants", async () => {
      const content = "Contenu du contrat";
      const mockIAResponse = {};

      interagirAvecAssistant.mockResolvedValue(mockIAResponse);

      const result = await service.performAIAnalysis(content);

      expect(result).toEqual({
        overview: "Analyse du contrat effectuée avec succès.",
        clauses_abusives: [],
        risks: [],
        recommendations: [],
      });
    });
  });

  describe("checkFreeUserLimit", () => {
    it("ne devrait rien faire pour un utilisateur premium", () => {
      const user = {
        typeAbonnement: "premium",
        analysisCount: 10,
      };

      expect(() => service.checkFreeUserLimit(user)).not.toThrow();
    });

    it("ne devrait rien faire pour un utilisateur gratuit sous la limite", () => {
      const user = {
        typeAbonnement: "free",
        analysisCount: 2,
      };

      expect(() => service.checkFreeUserLimit(user)).not.toThrow();
    });

    it("devrait lancer une erreur pour un utilisateur gratuit ayant atteint la limite", () => {
      const user = {
        typeAbonnement: "free",
        analysisCount: 3,
      };

      expect(() => service.checkFreeUserLimit(user)).toThrow({
        status: 402,
        message: "Limite d'analyses atteinte. Passez à Premium.",
        upgradeUrl: "/subscription",
      });
    });

    it("devrait lancer une erreur pour un utilisateur gratuit ayant dépassé la limite", () => {
      const user = {
        typeAbonnement: "free",
        analysisCount: 5,
      };

      expect(() => service.checkFreeUserLimit(user)).toThrow({
        status: 402,
        message: "Limite d'analyses atteinte. Passez à Premium.",
        upgradeUrl: "/subscription",
      });
    });
  });
});