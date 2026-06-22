const { Router } = require('express')
const healthRoutes = require('./health.routes')
const authRoutes = require('./auth.routes')
const employeeRoutes = require('./employee.routes')

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/employees', employeeRoutes)

module.exports = router
