const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

const moneyFields = ['referenceUnitPrice']
const decimalFields = ['currentStock', 'minimumStock', 'maximumStock']

function resolveStatus({ active, currentStock, minimumStock }) {
  if (!active) return 'INACTIVO'
  const stock = Number(currentStock)
  if (stock <= 0) return 'AGOTADO'
  if (stock <= Number(minimumStock || 0)) return 'STOCK_BAJO'
  return 'DISPONIBLE'
}

function serialize(supply) {
  const data = { ...supply }
  for (const field of [...moneyFields, ...decimalFields]) if (data[field] != null) data[field] = Number(data[field])
  if (data.movements) data.movements = data.movements.map(serializeMovement)
  return data
}

function serializeMovement(movement) {
  const data = { ...movement }
  for (const field of ['quantity', 'realUnitPrice', 'totalCost', 'resultingStock']) if (data[field] != null) data[field] = Number(data[field])
  return data
}

function supplyData(input) {
  const data = { ...input }
  data.status = resolveStatus(data)
  return data
}

function throwKnown(error) {
  if (error.code === 'P2002') throw new AppError('SKU already exists', 409, 'DUPLICATE_SUPPLY')
  throw error
}

async function list(filters) {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.category && { category: filters.category }),
    ...(filters.search && { OR: [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ] }),
  }
  const supplies = await prisma.supply.findMany({ where, include: { preferredProvider: true }, orderBy: [{ status: 'asc' }, { name: 'asc' }] })
  return supplies.map(serialize)
}

async function getById(id) {
  const supply = await prisma.supply.findUnique({
    where: { id },
    include: { preferredProvider: true, movements: { orderBy: { occurredAt: 'desc' }, take: 20, include: { project: true } } },
  })
  if (!supply) throw new AppError('Supply not found', 404, 'SUPPLY_NOT_FOUND')
  return serialize(supply)
}

async function create(input) {
  try {
    return serialize(await prisma.supply.create({ data: supplyData(input), include: { preferredProvider: true } }))
  } catch (error) { throwKnown(error) }
}

async function update(id, input) {
  try {
    await getById(id)
    return serialize(await prisma.supply.update({ where: { id }, data: supplyData(input), include: { preferredProvider: true } }))
  } catch (error) { throwKnown(error) }
}

async function createMovement(supplyId, input, user) {
  const supply = await prisma.supply.findUnique({ where: { id: supplyId } })
  if (!supply) throw new AppError('Supply not found', 404, 'SUPPLY_NOT_FOUND')
  const current = Number(supply.currentStock)
  const quantity = Number(input.quantity)
  const nextStock = input.type === 'ENTRADA' ? current + quantity : input.type === 'SALIDA' ? current - quantity : quantity
  if (nextStock < 0) throw new AppError('Stock cannot be negative', 409, 'NEGATIVE_STOCK')
  const totalCost = Number(input.realUnitPrice || 0) * quantity
  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({ data: {
      supplyId,
      type: input.type,
      quantity,
      realUnitPrice: input.realUnitPrice,
      totalCost,
      reason: input.reason,
      projectId: input.projectId,
      registeredById: user?.id,
      resultingStock: nextStock,
    } })
    await tx.supply.update({ where: { id: supplyId }, data: { currentStock: nextStock, status: resolveStatus({ active: supply.active, currentStock: nextStock, minimumStock: supply.minimumStock }) } })
  })
  return getById(supplyId)
}

async function deactivate(id) {
  const supply = await getById(id)
  return serialize(await prisma.supply.update({ where: { id }, data: { active: false, status: 'INACTIVO' }, include: { preferredProvider: true } }))
}

async function remove(id) {
  await getById(id)
  try {
    await prisma.supply.delete({ where: { id } })
  } catch (error) {
    if (error.code === 'P2003') throw new AppError('Cannot delete: supply has inventory history. Deactivate it instead.', 409, 'SUPPLY_HAS_HISTORY')
    throw error
  }
}

module.exports = { list, getById, create, update, createMovement, deactivate, remove }
