'use strict';

class MarketDataAdapter {
  get provider() { return 'unknown'; }

  async fetchQuotes() { throw new Error('Market data adapter must implement fetchQuotes()'); }
}

module.exports = MarketDataAdapter;
