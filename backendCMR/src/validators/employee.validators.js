const { z } = require('zod')

const uuid = z.string().uuid('Invalid employee id')
const optionalText = (max) => z.preprocess((value) => value === '' ? undefined : value, z.string().trim().max(max).optional())
const optionalEmail = z.preprocess((value) => value === '' ? undefined : value, z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional())
const optionalNumber = z.preprocess((value) => value === '' || value == null ? undefined : Number(value), z.number().positive().optional())
const date = z.string().date('Use YYYY-MM-DD format')

const employeeFields = {
  firstName: z.string().trim().min(1).max(80),
  paternalLastName: z.string().trim().min(1).max(80),
  maternalLastName: optionalText(80),
  curp: z.string().trim().toUpperCase().regex(/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, 'Invalid CURP format'),
  rfc: z.preprocess((value) => value === '' ? undefined : value, z.string().trim().toUpperCase().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Invalid RFC format').optional()),
  nss: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^\d{11}$/, 'NSS must contain 11 digits').optional()),
  birthDate: date,
  sex: z.enum(['MASCULINO', 'FEMENINO', 'OTRO']),
  maritalStatus: z.enum(['SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'OTRO']),
  phone: optionalText(20),
  personalEmail: optionalEmail,
  institutionalEmail: optionalEmail,
  address: optionalText(1000),
  position: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  hireDate: date,
  contractType: z.enum(['BASE', 'TEMPORAL', 'HONORARIOS']),
  dailySalary: z.coerce.number().positive('Daily salary must be greater than zero'),
  integratedImssSalary: optionalNumber,
  bankName: optionalText(100),
  clabe: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^\d{18}$/, 'CLABE must contain 18 digits').optional()),
  afore: optionalText(100),
  active: z.boolean().default(true),
  systemUser: z.object({
    enabled: z.boolean(),
    email: optionalEmail,
    role: z.enum(['ADMIN', 'LIDER', 'OPERATIVO', 'CONTADOR']).optional(),
    passwordMode: z.enum(['auto', 'manual']).optional(),
    password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/).optional(),
  }).optional(),
}

const employeeBody = z.object(employeeFields).superRefine((data, ctx) => {
  if (!data.systemUser?.enabled) return
  if (!data.systemUser.email && !data.institutionalEmail && !data.personalEmail) {
    ctx.addIssue({ code: 'custom', path: ['systemUser', 'email'], message: 'An email is required for system access' })
  }
  if (!data.systemUser.role) ctx.addIssue({ code: 'custom', path: ['systemUser', 'role'], message: 'Role is required for system access' })
  if (data.systemUser.passwordMode === 'manual' && !data.systemUser.password) {
    ctx.addIssue({ code: 'custom', path: ['systemUser', 'password'], message: 'Password is required in manual mode' })
  }
})

const listEmployeesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    active: z.enum(['true', 'false']).optional(),
    department: z.string().trim().max(100).optional(),
    position: z.string().trim().max(100).optional(),
  }),
})

const employeeIdSchema = z.object({ params: z.object({ id: uuid }) })
const createEmployeeSchema = z.object({ body: employeeBody })
const updateEmployeeSchema = z.object({ params: z.object({ id: uuid }), body: employeeBody })

module.exports = { listEmployeesSchema, employeeIdSchema, createEmployeeSchema, updateEmployeeSchema }
