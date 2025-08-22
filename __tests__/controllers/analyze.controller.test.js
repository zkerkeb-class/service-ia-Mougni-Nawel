const mockAnalysisService = {
  verifyUser: jest.fn(),
  checkFreeUserLimit: jest.fn(),
  getContractInfo: jest.fn(),
  performAIAnalysis: jest.fn(),
  saveAnalysis: jest.fn(),
  incrementUserAnalysisCount: jest.fn(),
};

jest.mock("../../src/services/contract.service", () => {
  return jest.fn().mockImplementation(() => mockAnalysisService);
});

const { analyzeContract } = require("../../src/controllers/analyze.controller");

describe("Analyze Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { contractId: "contract123" },
      headers: { authorization: "Bearer token123" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe("analyzeContract", () => {
    it("devrait analyser un contrat avec succès pour un utilisateur premium", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 5,
      };

      const mockContract = {
        content: "Contenu du contrat...",
      };

      const mockAnalysis = {
        overview: "Analyse complète",
        clauses_abusives: ["Clause 1"],
        risks: ["Risque 1"],
        recommendations: ["Recommandation 1"],
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAnalysisService.getContractInfo.mockResolvedValue({
        success: true,
        data: mockContract,
      });

      mockAnalysisService.performAIAnalysis.mockResolvedValue(mockAnalysis);
      mockAnalysisService.saveAnalysis.mockResolvedValue({ success: true });
      mockAnalysisService.incrementUserAnalysisCount.mockResolvedValue({ success: true });

      await analyzeContract(req, res);

      expect(mockAnalysisService.verifyUser).toHaveBeenCalledWith("Bearer token123");
      expect(mockAnalysisService.checkFreeUserLimit).toHaveBeenCalledWith(mockUser);
      expect(mockAnalysisService.getContractInfo).toHaveBeenCalledWith("contract123");
      expect(mockAnalysisService.performAIAnalysis).toHaveBeenCalledWith(mockContract.content);
      expect(mockAnalysisService.saveAnalysis).toHaveBeenCalledWith(
        "contract123",
        mockAnalysis,
        "Bearer token123"
      );
      expect(mockAnalysisService.incrementUserAnalysisCount).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          contractId: "contract123",
          analysis: mockAnalysis,
          remaining: "unlimited",
        },
      });
    });

    it("devrait analyser un contrat avec succès pour un utilisateur gratuit", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "free",
        analysisCount: 1,
      };

      const mockContract = {
        content: "Contenu du contrat...",
      };

      const mockAnalysis = {
        overview: "Analyse complète",
        clauses_abusives: [],
        risks: [],
        recommendations: [],
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAnalysisService.getContractInfo.mockResolvedValue({
        success: true,
        data: mockContract,
      });

      mockAnalysisService.performAIAnalysis.mockResolvedValue(mockAnalysis);
      mockAnalysisService.saveAnalysis.mockResolvedValue({ success: true });
      mockAnalysisService.incrementUserAnalysisCount.mockResolvedValue({ success: true });

      await analyzeContract(req, res);

      expect(mockAnalysisService.incrementUserAnalysisCount).toHaveBeenCalledWith(
        "user123",
        "Bearer token123"
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          contractId: "contract123",
          analysis: mockAnalysis,
          remaining: 1,
        },
      });
    });

    it("devrait retourner 401 si aucun token n'est fourni", async () => {
      req.headers.authorization = undefined;

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Token requis",
      });
    });

    it("devrait retourner 400 si l'ID du contrat est manquant", async () => {
      req.params.contractId = undefined;

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "ID contrat requis",
      });
    });

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      mockAnalysisService.verifyUser.mockResolvedValue({
        success: false,
      });

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Utilisateur non authentifié",
      });
    });

    it("devrait retourner 402 si l'utilisateur gratuit a atteint sa limite", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "free",
        analysisCount: 3,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAnalysisService.checkFreeUserLimit.mockImplementation(() => {
        throw {
          status: 402,
          message: "Limite d'analyses atteinte. Passez à Premium.",
          upgradeUrl: "/subscription",
        };
      });

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Limite d'analyses atteinte. Passez à Premium.",
        upgradeUrl: "/subscription",
      });
    });

    it("devrait retourner 404 si le contrat n'est pas trouvé", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 0,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAnalysisService.getContractInfo.mockResolvedValue({
        success: false,
      });

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Contrat non trouvé",
      });
    });

    it("devrait gérer les erreurs de service externe", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 0,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const serviceError = {
        response: {
          status: 503,
          data: { message: "Service indisponible" },
        },
      };

      mockAnalysisService.getContractInfo.mockRejectedValue(serviceError);

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service indisponible",
      });
    });

    it("devrait gérer les erreurs générales", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 0,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAnalysisService.getContractInfo.mockRejectedValue(
        new Error("Erreur inattendue")
      );

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Erreur inattendue",
      });
    });

    it("devrait gérer les erreurs avec message personnalisé", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 0,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const customError = new Error("Erreur spécifique");
      customError.response = {
        status: 400,
        data: { message: "Message d'erreur personnalisé" },
      };

      mockAnalysisService.getContractInfo.mockRejectedValue(customError);

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Message d'erreur personnalisé",
      });
    });

    it("devrait gérer les erreurs sans réponse détaillée", async () => {
      const mockUser = {
        _id: "user123",
        typeAbonnement: "premium",
        analysisCount: 0,
      };

      mockAnalysisService.verifyUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const networkError = new Error("Network Error");

      mockAnalysisService.getContractInfo.mockRejectedValue(networkError);

      await analyzeContract(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Network Error",
      });
    });
  });
});