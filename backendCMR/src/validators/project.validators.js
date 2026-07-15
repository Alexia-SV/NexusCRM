const { z } = require('zod')

const uuid = z.string().uuid()
const emptyToUndefined = (value) => value === '' || value == null ? undefined : value
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional())
const optionalDate = z.preprocess(emptyToUndefined, z.string().date().optional())

const member = z.object({
  employeeId: uuid,
  role: z.string().trim().min(1).max(100),
  assignedDailySalary: z.coerce.number().min(0),
})

const projectBody = z.object({
  name: z.string().trim().min(1).max(180),
  objective: z.string().trim().min(1).max(2000),
  clientName: optionalText(180),
  leaderId: z.preprocess(emptyToUndefined, uuid.optional()),
  plannedStartDate: z.string().date(),
  plannedEndDate: z.string().date(),
  realStartDate: optionalDate,
  realEndDate: optionalDate,
  status: z.enum(['PLANEACION', 'ACTIVO', 'PAUSADO', 'COMPLETADO', 'CANCELADO']).default('PLANEACION'),
  estimatedBudget: z.coerce.number().min(0).default(0),
  progress: z.coerce.number().min(0).max(100).default(0),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']).default('MEDIA'),
  members: z.array(member).default([]),
}).superRefine((data, ctx) => {
  if (data.plannedEndDate < data.plannedStartDate) ctx.addIssue({ code: 'custom', path: ['plannedEndDate'], message: 'End date must be after start date' })
  const ids = new Set()
  for (const item of data.members) {
    if (ids.has(item.employeeId)) ctx.addIssue({ code: 'custom', path: ['members'], message: 'An employee cannot be assigned twice' })
    ids.add(item.employeeId)
  }
})

module.exports = {
  listProjectsSchema: z.object({ query: z.object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['PLANEACION', 'ACTIVO', 'PAUSADO', 'COMPLETADO', 'CANCELADO']).optional(),
  }) }),
  projectIdSchema: z.object({ params: z.object({ id: uuid }) }),
  createProjectSchema: z.object({ body: projectBody }),
  updateProjectSchema: z.object({ params: z.object({ id: uuid }), body: projectBody }),
}
