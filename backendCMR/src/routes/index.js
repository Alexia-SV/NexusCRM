const { Router } = require('express')
const healthRoutes = require('./health.routes')
const authRoutes = require('./auth.routes')
const employeeRoutes = require('./employee.routes')
const payrollRoutes = require('./payroll.routes')
const providerRoutes = require('./provider.routes')
const supplyRoutes = require('./supply.routes')
const projectRoutes = require('./project.routes')

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/employees', employeeRoutes)
router.use('/payroll', payrollRoutes)
router.use('/providers', providerRoutes)
router.use('/supplies', supplyRoutes)
router.use('/projects', projectRoutes)

module.exports = router
