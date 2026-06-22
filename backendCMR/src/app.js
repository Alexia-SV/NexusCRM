const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const { env } = require('./config/env')
const routes = require('./routes')
const { notFoundHandler } = require('./middlewares/notFoundHandler')
const { errorHandler } = require('./middlewares/errorHandler')

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
