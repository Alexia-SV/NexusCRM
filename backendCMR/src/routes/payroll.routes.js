const { Router } = require('express')
const controller = require('../controllers/payroll.controller')
const { authRequired, requireRole } = require('../middlewares/auth')
const { validate } = require('../middlewares/validate')
const { asyncHandler } = require('../utils/asyncHandler')
const {
  listPayrollSchema,
  payrollIdSchema,
  createPayrollSchema,
  updatePayrollSchema,
  changeStatusSchema,
  generateReceiptsSchema,
  receiptParamsSchema,
  updateReceiptSchema,
  receiptIdSchema,
  configUpdateSchema,
  reportSchema,
} = require('../validators/payroll.validators')

const router = Router()
router.use(authRequired)

const READ = ['ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR']
const WRITE = ['ADMIN', 'CONTADOR']

// Configuracion (lectura: escritores; escritura: admin)
router.get('/config', requireRole(...WRITE), asyncHandler(controller.getConfig))
router.put('/config', requireRole('ADMIN'), validate(configUpdateSchema), asyncHandler(controller.updateConfig))

// Reportes (mensual / anual / bimestral)
router.get('/report', requireRole(...READ), validate(reportSchema), asyncHandler(controller.report))

// Recibo individual
router.get('/receipts/:receiptId', requireRole(...READ), validate(receiptIdSchema), asyncHandler(controller.getReceipt))

// Cabeceras de nomina
router.get('/', requireRole(...READ), validate(listPayrollSchema), asyncHandler(controller.list))
router.get('/:id', requireRole(...READ), validate(payrollIdSchema), asyncHandler(controller.get))
router.post('/', requireRole(...WRITE), validate(createPayrollSchema), asyncHandler(controller.create))
router.put('/:id', requireRole(...WRITE), validate(updatePayrollSchema), asyncHandler(controller.update))
router.patch('/:id/status', requireRole(...WRITE), validate(changeStatusSchema), asyncHandler(controller.changeStatus))
router.delete('/:id', requireRole('ADMIN'), validate(payrollIdSchema), asyncHandler(controller.remove))

// Recibos dentro de una nomina
router.post('/:id/receipts/generate', requireRole(...WRITE), validate(generateReceiptsSchema), asyncHandler(controller.generate))
router.put('/:id/receipts/:receiptId', requireRole(...WRITE), validate(updateReceiptSchema), asyncHandler(controller.updateReceipt))
router.delete('/:id/receipts/:receiptId', requireRole(...WRITE), validate(receiptParamsSchema), asyncHandler(controller.removeReceipt))

module.exports = router
