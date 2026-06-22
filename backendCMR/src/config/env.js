const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config()

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(60),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Nexus CRM <no-reply@nexuscrm.local>'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration')
}

const values = parsed.data

const env = {
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  databaseUrl: values.DATABASE_URL,
  jwtAccessSecret: values.JWT_ACCESS_SECRET,
  jwtRefreshSecret: values.JWT_REFRESH_SECRET,
  accessTokenExpiresIn: values.ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiresIn: values.REFRESH_TOKEN_EXPIRES_IN,
  frontendUrl: values.FRONTEND_URL,
  cookieSecure: values.COOKIE_SECURE === 'true',
  passwordResetExpiresMinutes: values.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
  smtp: {
    host: values.SMTP_HOST,
    port: values.SMTP_PORT,
    secure: values.SMTP_SECURE === 'true',
    user: values.SMTP_USER,
    pass: values.SMTP_PASS,
    from: values.SMTP_FROM,
  },
}

module.exports = { env }
