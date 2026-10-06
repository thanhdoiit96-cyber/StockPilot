module.exports = (sequelize, DataTypes) => {
  const PortfolioEvent = sequelize.define('PortfolioEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    portfolio_id: { type: DataTypes.UUID, allowNull: false }, stock_id: { type: DataTypes.UUID, allowNull: false },
    event_type: { type: DataTypes.STRING(24), allowNull: false }, status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'PENDING' },
    schema_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    record_date: { type: DataTypes.DATEONLY, allowNull: false }, effective_date: { type: DataTypes.DATEONLY, allowNull: true }, payment_date: { type: DataTypes.DATEONLY, allowNull: true },
    entitlement_quantity: { type: DataTypes.DECIMAL(20, 6), allowNull: false }, payload: { type: DataTypes.JSONB, allowNull: false },
    source_type: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'MANUAL' }, source_name: DataTypes.STRING(120), source_url: DataTypes.TEXT, source_reference: DataTypes.STRING(200),
    announced_at: DataTypes.DATE, fetched_at: DataTypes.DATE,
    verification_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'UNVERIFIED' }, supersedes_event_id: DataTypes.UUID,
    note: DataTypes.STRING(240), created_by: { type: DataTypes.STRING(80), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolio_events', underscored: true, timestamps: false });
  PortfolioEvent.associate = models => {
    PortfolioEvent.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' });
    PortfolioEvent.belongsTo(models.Stock, { foreignKey: 'stock_id' });
    PortfolioEvent.belongsTo(models.PortfolioEvent, { foreignKey: 'supersedes_event_id', as: 'supersededEvent' });
  };
  return PortfolioEvent;
};
