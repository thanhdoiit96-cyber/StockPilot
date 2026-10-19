const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const dbConfig = require('../config/config.js');
const env = process.env.NODE_ENV || 'development';
const cfg = dbConfig[env];
const resolvedDb = dbConfig.resolveDatabaseConnectionConfig({
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
  host: cfg.host,
  dbHost: cfg.host,
  dbName: cfg.database,
  dbUser: cfg.username,
  dbPassword: cfg.password
});

const sequelizeConnection = dbConfig.buildSequelizeConnection({
  databaseUrl: resolvedDb.databaseUrl,
  host: resolvedDb.host,
  dbHost: resolvedDb.host,
  dbName: resolvedDb.database,
  dbUser: resolvedDb.username,
  dbPassword: resolvedDb.password
});

const sequelize = new Sequelize(...sequelizeConnection.args);

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
