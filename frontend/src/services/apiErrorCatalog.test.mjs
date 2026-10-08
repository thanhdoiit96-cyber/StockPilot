import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorCatalog, localizeApiError } from './apiErrorCatalog.mjs'

test('error catalog keeps parity for every supported code', () => {
  assert.deepEqual(Object.keys(apiErrorCatalog('vi')).sort(), Object.keys(apiErrorCatalog('en')).sort())
})

test('catalog covers the migrated backend error-code contract', () => {
  const migrated = [
    'auth_register_invalid_input', 'auth_email_already_registered', 'auth_invalid_credentials', 'auth_user_missing', 'AUTH_USER_MISSING',
    'auth_profile_invalid_input', 'auth_password_rate_limited', 'auth_password_invalid_input', 'auth_password_current_invalid',
    'recommendation_saved_list_failed', 'recommendation_saved_create_failed', 'recommendation_saved_not_found', 'recommendation_saved_delete_failed', 'recommendation_readiness_failed', 'recommendation_personalized_failed', 'recommendation_latest_failed', 'recommendation_history_failed', 'recommendation_history_not_found',
    'portfolio_load_failed', 'portfolio_performance_failed', 'portfolio_events_failed', 'portfolio_event_not_found', 'portfolio_event_create_failed', 'portfolio_event_confirm_failed', 'portfolio_event_cancel_failed', 'portfolio_cashflow_create_failed', 'portfolio_cashflow_update_failed', 'portfolio_cashflow_delete_failed', 'portfolio_transaction_context_invalid', 'portfolio_transaction_invalid', 'portfolio_stock_not_found', 'portfolio_transaction_sell_exceeds_position', 'portfolio_transaction_not_found', 'portfolio_transaction_update_failed', 'portfolio_transaction_delete_failed', 'portfolio_transaction_import_failed',
    'market_quality_failed', 'market_breadth_history_failed', 'market_export_failed', 'market_list_failed', 'market_stock_not_found', 'market_analysis_failed', 'quote_realtime_disabled', 'quote_unavailable', 'quote_provider_unavailable', 'market_quote_symbols_required', 'market_quote_health_failed', 'market_external_factors_failed', 'market_detail_failed', 'market_price_history_failed', 'market_cache_stats_failed', 'market_cache_clear_failed'
  ]
  const catalog = apiErrorCatalog('en')
  assert.deepEqual(migrated.filter(code => !catalog[code]), [])
})

test('known codes localize and unknown codes fall back to server message', () => {
  assert.equal(localizeApiError({ code: 'market_stock_not_found', message: 'Stock not found' }, 'en'), 'Stock symbol not found.')
  assert.equal(localizeApiError({ code: 'unknown_code', message: 'Provider detail' }, 'vi'), 'Provider detail')
})
