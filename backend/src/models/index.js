const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const dbConfig = require('../config/config.js');
const env = process.env.NODE_ENV || 'development';
const cfg = dbConfig[env];

const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
  host: cfg.host,
  port: cfg.port,
  dialect: cfg.dialect,
  logging: false
});

const models = {};

// Load model files in this directory (except index.js)
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const modelDef = require(path.join(__dirname, file));
    const model = modelDef(sequelize, DataTypes);
    models[model.name] = model;
  });

// Setup associations
Object.keys(models).forEach(name => {
  if (models[name].associate) {
    models[name].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
