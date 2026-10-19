/**
 * Database Migration: Create system_cache Table
 * 
 * When to use: First time setup
 * 
 * Usage:
 * npm run migrate:create -- --name 001_create_system_cache
 * 
 * Then copy this SQL into the migration file generated
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    // Create system_cache table for PostgreSQL-based caching
    await queryInterface.createTable('system_cache', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      cache_key: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false,
        comment: 'Unique cache key identifier'
      },
      cache_value: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Cached value as JSON'
      },
      cache_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Category of cached data (e.g., stock, analysis, user)'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
        comment: 'When cache entry was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
        comment: 'When cache entry was last updated'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When cache entry expires and should be deleted'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description of cached data'
      }
    }, {
      // Table options
      tableName: 'system_cache',
      timestamps: false, // We manage timestamps ourselves
      underscored: true, // Use snake_case for column names
      comment: 'PostgreSQL-based cache table (replaces Redis)'
    });

    // Create indexes for fast queries
    await queryInterface.addIndex('system_cache', ['cache_key'], {
      name: 'idx_system_cache_key',
      unique: true
    });

    await queryInterface.addIndex('system_cache', ['expires_at'], {
      name: 'idx_system_cache_expires_at',
      comment: 'For fast cleanup of expired entries'
    });

    await queryInterface.addIndex('system_cache', ['cache_type'], {
      name: 'idx_system_cache_type',
      comment: 'For type-based cache queries'
    });

    await queryInterface.addIndex('system_cache', ['updated_at'], {
      name: 'idx_system_cache_updated_at',
      comment: 'For finding recently updated cache'
    });

    // Create composite index for cleanup queries
    await queryInterface.addIndex('system_cache', ['cache_type', 'expires_at'], {
      name: 'idx_system_cache_type_expires',
      comment: 'For efficient type-based cleanup'
    });
  },

  async down(queryInterface, _Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    // Drop all indexes
    await queryInterface.removeIndex('system_cache', 'idx_system_cache_key');
    await queryInterface.removeIndex('system_cache', 'idx_system_cache_expires_at');
    await queryInterface.removeIndex('system_cache', 'idx_system_cache_type');
    await queryInterface.removeIndex('system_cache', 'idx_system_cache_updated_at');
    await queryInterface.removeIndex('system_cache', 'idx_system_cache_type_expires');

    // Drop table
    await queryInterface.dropTable('system_cache');
  }
};
