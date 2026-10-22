module.exports = (sequelize, DataTypes) => {
  const IndexMembershipConstituent = sequelize.define('IndexMembershipConstituent', { id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, snapshot_id: { type: DataTypes.UUID, allowNull: false }, symbol: { type: DataTypes.STRING(12), allowNull: false }, rank: DataTypes.INTEGER, source_identifier: { type: DataTypes.STRING(160), allowNull: false }, created_at: DataTypes.DATE }, { tableName: 'index_membership_constituents', underscored: true, timestamps: false });
  IndexMembershipConstituent.associate = models => { IndexMembershipConstituent.belongsTo(models.IndexMembershipSnapshot, { foreignKey: 'snapshot_id', as: 'snapshot' }); };
  return IndexMembershipConstituent;
};
