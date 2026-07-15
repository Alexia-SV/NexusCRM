const { Router } = require('express')
const controller = require('../controllers/provider.controller')
const { authRequired, requireRole } = require('../middlewares/auth')
const { validate } = require('../middlewares/validate')
const { asyncHandler } = require('../utils/asyncHandler')
const { listProvidersSchema, providerIdSchema, createProviderSchema, updateProviderSchema } = require('../validators/provider.validators')

const router = Router()
router.use(authRequired)
router.get('/', requireRole('ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR'), validate(listProvidersSchema), asyncHandler(controller.list))
router.get('/:id', requireRole('ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR'), validate(providerIdSchema), asyncHandler(controller.get))
router.post('/', requireRole('ADMIN', 'LIDER'), validate(createProviderSchema), asyncHandler(controller.create))
router.put('/:id', requireRole('ADMIN', 'LIDER'), validate(updateProviderSchema), asyncHandler(controller.update))
router.patch('/:id/deactivate', requireRole('ADMIN', 'LIDER'), validate(providerIdSchema), asyncHandler(controller.deactivate))
router.delete('/:id', requireRole('ADMIN'), validate(providerIdSchema), asyncHandler(controller.remove))

module.exports = router
