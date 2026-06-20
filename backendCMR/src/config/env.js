const dotenv = require('dotenv')

dotenv.config()

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
}

module.exports = { env }
