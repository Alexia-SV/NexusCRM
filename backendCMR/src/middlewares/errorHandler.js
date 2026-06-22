const { env } = require('../config/env')

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  })
}

module.exports = { errorHandler }
