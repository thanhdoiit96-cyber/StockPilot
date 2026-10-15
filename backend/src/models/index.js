const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const dbConfig = require('../config/config.js');
const env = process.env.NODE_ENV || 'development';
const cfg = dbConfig[env];

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const isLocalDatabase = databaseUrl ? /@(localhost|127\.0\.0\.1|postgres)(:|\/)/.test(databaseUrl) : true;

const sharedOptions = {
  dialect: 'postgres',
  // Explicit require so Vercel's bundler includes pg (Sequelize loads it dynamically).
  dialectModule: require('pg'),
  logging: false,
  ...(isLocalDatabase ? {} : { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } })
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, sharedOptions)
  : new Sequelize(cfg.database, cfg.username, cfg.password, {
      ...sharedOptions,
      host: cfg.host,
      port: cfg.port,
      dialect: cfg.dialect
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
