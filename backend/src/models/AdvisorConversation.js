'use strict';
module.exports = (sequelize, DataTypes) => {
  const AdvisorConversation = sequelize.define('AdvisorConversation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    context: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'symbol' },
    messages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'advisor_conversations', underscored: true, timestamps: false });
  AdvisorConversation.associate = models => { if (models.User) AdvisorConversation.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' }); };
  return AdvisorConversation;
};
