'use strict';

function requestMetrics(metrics) {
  return (req, res, next) => {
    const started = Date.now();
    res.once('finish', () => metrics.observe({ statusCode: res.statusCode, durationMs: Date.now() - started, path: req.path }));
    next();
  };
}

module.exports = requestMetrics;
