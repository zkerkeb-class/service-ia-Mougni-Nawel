'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const basename = path.basename(__filename);
const env = 'development';
const config = require(__dirname + '/../config/config.js')[env];

const db = {};
const mongoURI = config.uri;
