module.exports = (sequelize, DataTypes) => sequelize.define('PositionExitWorkerLeaseEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  lease_key: { type: DataTypes.STRING(180), allowNull: false }, owner_id: { type: DataTypes.STRING(160), allowNull: false }, fencing_token: { type: DataTypes.BIGINT, allowNull: false },
  event_type: { type: DataTypes.STRING(40), allowNull: false }, details: { type: DataTypes.JSONB, allowNull: false }, recorded_at: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'position_exit_worker_lease_events', underscored: true, timestamps: false });
