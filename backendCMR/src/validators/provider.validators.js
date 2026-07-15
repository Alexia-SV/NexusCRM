const { z } = require('zod')

const uuid = z.string().uuid('Invalid provider id')
const emptyToUndefined = (value) => value === '' || value == null ? undefined : value
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional())
const optionalMoney = z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional())
const optionalDate = z.preprocess(emptyToUndefined, z.string().date().optional())

const providerBody = z.object({
  businessName: z.string().trim().min(1).max(180),
  rfc: z.string().trim().toUpperCase().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Invalid RFC format'),
  personType: z.enum(['FISICA', 'MORAL']),
  taxRegime: z.string().trim().min(1).max(160),
  curp: z.preprocess(emptyToUndefined, z.string().trim().toUpperCase().regex(/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, 'Invalid CURP format').optional()),
  category: z.enum(['MATERIALES', 'SERVICIOS', 'EQUIPO', 'OTRO']),
  status: z.enum(['EVALUACION', 'ACTIVO', 'INACTIVO', 'BLOQUEADO']).default('EVALUACION'),
  contactName: z.string().trim().min(1).max(150),
  contactPosition: optionalText(120),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  website: z.preprocess(emptyToUndefined, z.string().trim().url().max(300).optional()),
  address: optionalText(1000),
  postalCode: optionalText(10),
  cityState: optionalText(160),
  bankName: optionalText(120),
  clabe: z.preprocess(emptyToUndefined, z.string().regex(/^\d{18}$/, 'CLABE must contain 18 digits').optional()),
  accountNumber: optionalText(40),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  paymentTerms: optionalText(120),
  authorizedCredit: optionalMoney,
  lastPurchaseAt: optionalDate,
  totalHistoricalPurchases: z.coerce.number().min(0).default(0),
  rating: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(5).optional()),
  internalNotes: optionalText(3000),
}).superRefine((data, ctx) => {
  if (data.personType === 'FISICA' && !data.curp) ctx.addIssue({ code: 'custom', path: ['curp'], message: 'CURP is required for physical person providers' })
})

const listProvidersSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['EVALUACION', 'ACTIVO', 'INACTIVO', 'BLOQUEADO']).optional(),
    category: z.enum(['MATERIALES', 'SERVICIOS', 'EQUIPO', 'OTRO']).optional(),
  }),
})

module.exports = {
  listProvidersSchema,
  providerIdSchema: z.object({ params: z.object({ id: uuid }) }),
  createProviderSchema: z.object({ body: providerBody }),
  updateProviderSchema: z.object({ params: z.object({ id: uuid }), body: providerBody }),
}
