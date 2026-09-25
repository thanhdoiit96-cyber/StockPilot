module.exports = (sequelize, DataTypes) => {
  const Portfolio = sequelize.define('Portfolio', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Danh mục chính' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolios', underscored: true, timestamps: false });
  Portfolio.associate = models => { Portfolio.belongsTo(models.User, { foreignKey: 'user_id' }); Portfolio.hasMany(models.PortfolioTransaction, { foreignKey: 'portfolio_id', as: 'transactions' }); };
  return Portfolio;
};
