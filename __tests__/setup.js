const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../.env.dev')
});

process.env.NODE_ENV = 'test';
process.env.IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://ia:8020';
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://authentification:8010';
process.env.BDD_SERVICE_URL = process.env.BDD_SERVICE_URL || 'http://bdd:8000';

jest.setTimeout(10000);