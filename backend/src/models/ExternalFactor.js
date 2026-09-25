'use strict';
module.exports = (sequelize, DataTypes) => sequelize.define('ExternalFactor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, type: DataTypes.STRING(30), symbol: DataTypes.STRING(30), title: DataTypes.STRING(500), summary: DataTypes.TEXT,
  source: { type: DataTypes.STRING(160), allowNull: false }, source_url: DataTypes.TEXT, published_at: DataTypes.DATE, fetched_at: DataTypes.DATE,
  status: DataTypes.STRING(20), impact: DataTypes.STRING(30), provider_license: DataTypes.STRING(255), raw_payload: DataTypes.JSONB, source_hash: DataTypes.STRING(64)
}, { tableName: 'external_factors', underscored: true, timestamps: true });
