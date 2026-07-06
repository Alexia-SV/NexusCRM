const { z } = require('zod')

const uuid = z.string().uuid('Invalid id')
const date = z.string().date('Use YYYY-MM-DD format')
const money = z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().min(0).optional())
const periodType = z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL'])
const status = z.enum(['BORRADOR', 'EN_PROCESO', 'PAGADA', 'CANCELADA'])

const payrollFields = {
  periodType,
  periodStart: date,
  periodEnd: date,
  paymentDate: date,
  applySavingsFund: z.boolean().optional().default(false),
  notes: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().max(1000).optional()),
}

const payrollBody = z.object({ ...payrollFields, generateForActive: z.boolean().optional() }).superRefine((data, ctx) => {
  if (new Date(data.periodEnd) < new Date(data.periodStart)) {
    ctx.addIssue({ code: 'custom', path: ['periodEnd'], message: 'The period end cannot be before the start' })
  }
})

const payrollUpdateBody = z.object(payrollFields).superRefine((data, ctx) => {
  if (new Date(data.periodEnd) < new Date(data.periodStart)) {
    ctx.addIssue({ code: 'custom', path: ['periodEnd'], message: 'The period end cannot be before the start' })
  }
})

const receiptBody = z.object({
  workedDays: z.coerce.number().int().min(0).max(31),
  absentDays: z.coerce.number().int().min(0).max(31).optional().default(0),
  extraPerceptions: money,
  infonavit: money,
  otherDeductions: money,
})

const listPayrollSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    status: status.optional(),
    periodType: periodType.optional(),
    from: date.optional(),
    to: date.optional(),
  }),
})

const payrollIdSchema = z.object({ params: z.object({ id: uuid }) })
const createPayrollSchema = z.object({ body: payrollBody })
const updatePayrollSchema = z.object({ params: z.object({ id: uuid }), body: payrollUpdateBody })
const changeStatusSchema = z.object({ params: z.object({ id: uuid }), body: z.object({ status }) })
const generateReceiptsSchema = z.object({ params: z.object({ id: uuid }), body: z.object({ employeeIds: z.array(uuid).optional() }) })
const receiptParamsSchema = z.object({ params: z.object({ id: uuid, receiptId: uuid }) })
const updateReceiptSchema = z.object({ params: z.object({ id: uuid, receiptId: uuid }), body: receiptBody })
const receiptIdSchema = z.object({ params: z.object({ receiptId: uuid }) })

const configUpdateSchema = z.object({
  body: z.object({
    umaDaily: z.coerce.number().positive(),
    imssEnfMatRate: z.coerce.number().min(0).max(100),
    imssInvVidaRate: z.coerce.number().min(0).max(100),
    imssCesVejezRate: z.coerce.number().min(0).max(100),
    infonavitEmployerRate: z.coerce.number().min(0).max(100),
    aguinaldoDays: z.coerce.number().int().min(0).max(365),
    vacationDays: z.coerce.number().int().min(0).max(365),
    primaVacacionalRate: z.coerce.number().min(0).max(100),
    fondoAhorroRate: z.coerce.number().min(0).max(100),
    integrationFactor: z.coerce.number().min(1).max(3),
  }),
})

module.exports = {
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
}
