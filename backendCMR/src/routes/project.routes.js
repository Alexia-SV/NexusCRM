const { Router } = require('express')
const controller = require('../controllers/project.controller')
const { authRequired, requireRole } = require('../middlewares/auth')
const { validate } = require('../middlewares/validate')
const { asyncHandler } = require('../utils/asyncHandler')
const { listProjectsSchema, projectIdSchema, createProjectSchema, updateProjectSchema } = require('../validators/project.validators')

const router = Router()
router.use(authRequired)
router.get('/', requireRole('ADMIN', 'LIDER', 'OPERATIVO'), validate(listProjectsSchema), asyncHandler(controller.list))
router.get('/:id', requireRole('ADMIN', 'LIDER', 'OPERATIVO'), validate(projectIdSchema), asyncHandler(controller.get))
router.post('/', requireRole('ADMIN', 'LIDER'), validate(createProjectSchema), asyncHandler(controller.create))
router.put('/:id', requireRole('ADMIN', 'LIDER'), validate(updateProjectSchema), asyncHandler(controller.update))
router.delete('/:id', requireRole('ADMIN'), validate(projectIdSchema), asyncHandler(controller.remove))

module.exports = router
