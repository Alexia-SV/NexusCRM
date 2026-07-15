const { Router } = require('express')
const controller = require('../controllers/supply.controller')
const { authRequired, requireRole } = require('../middlewares/auth')
const { validate } = require('../middlewares/validate')
const { asyncHandler } = require('../utils/asyncHandler')
const { listSuppliesSchema, supplyIdSchema, createSupplySchema, updateSupplySchema, createMovementSchema } = require('../validators/supply.validators')

const router = Router()
router.use(authRequired)
router.get('/', requireRole('ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR'), validate(listSuppliesSchema), asyncHandler(controller.list))
router.get('/:id', requireRole('ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR'), validate(supplyIdSchema), asyncHandler(controller.get))
router.post('/', requireRole('ADMIN', 'LIDER', 'OPERATIVO'), validate(createSupplySchema), asyncHandler(controller.create))
router.put('/:id', requireRole('ADMIN', 'LIDER', 'OPERATIVO'), validate(updateSupplySchema), asyncHandler(controller.update))
router.post('/:id/movements', requireRole('ADMIN', 'LIDER', 'OPERATIVO'), validate(createMovementSchema), asyncHandler(controller.movement))
router.patch('/:id/deactivate', requireRole('ADMIN', 'LIDER'), validate(supplyIdSchema), asyncHandler(controller.deactivate))
router.delete('/:id', requireRole('ADMIN'), validate(supplyIdSchema), asyncHandler(controller.remove))

module.exports = router
