const { Router } = require('express')
const controller = require('../controllers/employee.controller')
const { authRequired, requireRole } = require('../middlewares/auth')
const { validate } = require('../middlewares/validate')
const { asyncHandler } = require('../utils/asyncHandler')
const { listEmployeesSchema, employeeIdSchema, createEmployeeSchema, updateEmployeeSchema } = require('../validators/employee.validators')

const router = Router()
router.use(authRequired)
router.get('/', requireRole('ADMIN', 'LIDER'), validate(listEmployeesSchema), asyncHandler(controller.list))
router.get('/:id', requireRole('ADMIN', 'LIDER'), validate(employeeIdSchema), asyncHandler(controller.get))
router.post('/', requireRole('ADMIN'), validate(createEmployeeSchema), asyncHandler(controller.create))
router.put('/:id', requireRole('ADMIN'), validate(updateEmployeeSchema), asyncHandler(controller.update))
router.patch('/:id/deactivate', requireRole('ADMIN'), validate(employeeIdSchema), asyncHandler(controller.deactivate))
router.delete('/:id', requireRole('ADMIN'), validate(employeeIdSchema), asyncHandler(controller.remove))

module.exports = router
