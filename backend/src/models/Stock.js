module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    industry: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    exchange: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    listing_status: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    listing_checked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    market_cap: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'stocks',
    underscored: true,
    timestamps: false
  });

  Stock.associate = function(models) {
    Stock.hasMany(models.StockPrice, { foreignKey: 'stock_id', as: 'prices' });
    if (models.WatchlistItem) Stock.hasMany(models.WatchlistItem, { foreignKey: 'stock_id', as: 'watchlistItems' });
    if (models.PortfolioTransaction) Stock.hasMany(models.PortfolioTransaction, { foreignKey: 'stock_id', as: 'portfolioTransactions' });
  };

  return Stock;
};
