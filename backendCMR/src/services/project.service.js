const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

function toDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined
}

function serialize(project) {
  const data = { ...project }
  for (const field of ['estimatedBudget', 'realAccumulatedCost', 'progress']) if (data[field] != null) data[field] = Number(data[field])
  if (data.members) data.members = data.members.map((member) => ({ ...member, assignedDailySalary: Number(member.assignedDailySalary) }))
  return data
}

const include = {
  leader: true,
  members: { include: { employee: true }, orderBy: { createdAt: 'asc' } },
  inventoryMovements: { include: { supply: true }, orderBy: { occurredAt: 'desc' }, take: 20 },
}

async function recalcCost(tx, projectId) {
  const movements = await tx.inventoryMovement.findMany({ where: { projectId, type: 'SALIDA' } })
  const materialCost = movements.reduce((acc, item) => acc + Number(item.totalCost), 0)
  await tx.project.update({ where: { id: projectId }, data: { realAccumulatedCost: materialCost } })
}

function projectData(input, user) {
  const { members: _members, ...data } = input
  return {
    ...data,
    plannedStartDate: toDate(data.plannedStartDate),
    plannedEndDate: toDate(data.plannedEndDate),
    realStartDate: toDate(data.realStartDate),
    realEndDate: toDate(data.realEndDate),
    createdById: user?.id,
  }
}

async function list(filters) {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.search && { OR: [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { objective: { contains: filters.search, mode: 'insensitive' } },
      { clientName: { contains: filters.search, mode: 'insensitive' } },
    ] }),
  }
  const projects = await prisma.project.findMany({ where, include: { leader: true, members: true }, orderBy: [{ status: 'asc' }, { plannedEndDate: 'asc' }] })
  return projects.map(serialize)
}

async function getById(id) {
  const project = await prisma.project.findUnique({ where: { id }, include })
  if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND')
  return serialize(project)
}

async function create(input, user) {
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({ data: projectData(input, user) })
    if (input.members.length) await tx.projectMember.createMany({ data: input.members.map((member) => ({ ...member, projectId: created.id })) })
    return tx.project.findUnique({ where: { id: created.id }, include })
  })
  return serialize(project)
}

async function update(id, input) {
  await getById(id)
  const project = await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: projectData(input) })
    await tx.projectMember.deleteMany({ where: { projectId: id } })
    if (input.members.length) await tx.projectMember.createMany({ data: input.members.map((member) => ({ ...member, projectId: id })) })
    await recalcCost(tx, id)
    return tx.project.findUnique({ where: { id }, include })
  })
  return serialize(project)
}

async function remove(id) {
  await getById(id)
  try {
    await prisma.project.delete({ where: { id } })
  } catch (error) {
    if (error.code === 'P2003') throw new AppError('Cannot delete: project has inventory history. Cancel it instead.', 409, 'PROJECT_HAS_HISTORY')
    throw error
  }
}

module.exports = { list, getById, create, update, remove }
