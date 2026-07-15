const { z } = require('zod')

const uuid = z.string().uuid()
const emptyToUndefined = (value) => value === '' || value == null ? undefined : value
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional())
const optionalDecimal = z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional())

const supplyBody = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
  description: optionalText(2000),
  category: z.enum(['MATERIAL', 'HERRAMIENTA', 'CONSUMIBLE', 'EQUIPO']),
  unit: z.string().trim().min(1).max(40),
  referenceUnitPrice: optionalDecimal,
  currentStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  maximumStock: optionalDecimal,
  preferredProviderId: z.preprocess(emptyToUndefined, uuid.optional()),
  active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.maximumStock != null && data.maximumStock < data.minimumStock) ctx.addIssue({ code: 'custom', path: ['maximumStock'], message: 'Maximum stock must be greater than minimum stock' })
})

const movementBody = z.object({
  type: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  quantity: z.coerce.number().positive(),
  realUnitPrice: optionalDecimal,
  reason: optionalText(180),
  projectId: z.preprocess(emptyToUndefined, uuid.optional()),
})

module.exports = {
  listSuppliesSchema: z.object({ query: z.object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['DISPONIBLE', 'STOCK_BAJO', 'AGOTADO', 'INACTIVO']).optional(),
    category: z.enum(['MATERIAL', 'HERRAMIENTA', 'CONSUMIBLE', 'EQUIPO']).optional(),
  }) }),
  supplyIdSchema: z.object({ params: z.object({ id: uuid }) }),
  createSupplySchema: z.object({ body: supplyBody }),
  updateSupplySchema: z.object({ params: z.object({ id: uuid }), body: supplyBody }),
  createMovementSchema: z.object({ params: z.object({ id: uuid }), body: movementBody }),
}
