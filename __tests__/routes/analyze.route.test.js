const request = require('supertest');
const express = require('express');
const analyzeRouter = require('../../src/routes/analyze.route');
const analyzeController = require('../../src/controllers/analyze.controller');

jest.mock('../../src/controllers/analyze.controller');

describe('Analyze Router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', analyzeRouter);
  });

  beforeEach(() => {
    analyzeController.analyzeContract.mockClear();
  });

  describe('GET /test', () => {
    it('devrait retourner le statut du service', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'IA Service fonctionne!'
      });
    });
  });

  describe('GET /analyzeContract/:contractId', () => {
    it('devrait appeler le contrôleur', async () => {
      analyzeController.analyzeContract.mockImplementation((req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/analyzeContract/123')
        .expect(200);

      expect(analyzeController.analyzeContract).toHaveBeenCalled();
    });
  });
});