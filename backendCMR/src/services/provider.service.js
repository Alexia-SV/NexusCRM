const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

const moneyFields = ['authorizedCredit', 'totalHistoricalPurchases']

function serialize(provider) {
  const data = { ...provider }
  for (const field of moneyFields) if (data[field] != null) data[field] = Number(data[field])
  return data
}

function toDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined
}

function data(input, user) {
  return {
    ...input,
    lastPurchaseAt: toDate(input.lastPurchaseAt),
    createdById: user?.id,
  }
}

function throwKnown(error) {
  if (error.code === 'P2002') throw new AppError('RFC, email or CLABE already exists', 409, 'DUPLICATE_PROVIDER')
  throw error
}

async function list(filters) {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.category && { category: filters.category }),
    ...(filters.search && { OR: [
      { businessName: { contains: filters.search, mode: 'insensitive' } },
      { rfc: { contains: filters.search, mode: 'insensitive' } },
      { contactName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { cityState: { contains: filters.search, mode: 'insensitive' } },
    ] }),
  }
  const providers = await prisma.provider.findMany({ where, orderBy: [{ status: 'asc' }, { businessName: 'asc' }] })
  return providers.map(serialize)
}

async function getById(id) {
  const provider = await prisma.provider.findUnique({ where: { id } })
  if (!provider) throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND')
  return serialize(provider)
}

async function create(input, user) {
  try {
    return serialize(await prisma.provider.create({ data: data(input, user) }))
  } catch (error) { throwKnown(error) }
}

async function update(id, input) {
  try {
    await getById(id)
    return serialize(await prisma.provider.update({ where: { id }, data: data(input) }))
  } catch (error) { throwKnown(error) }
}

async function deactivate(id) {
  await getById(id)
  return serialize(await prisma.provider.update({ where: { id }, data: { status: 'INACTIVO' } }))
}

async function remove(id) {
  await getById(id)
  try {
    await prisma.provider.delete({ where: { id } })
  } catch (error) {
    if (error.code === 'P2003') throw new AppError('Cannot delete: provider has related supplies. Deactivate it instead.', 409, 'PROVIDER_HAS_HISTORY')
    throw error
  }
}

module.exports = { list, getById, create, update, deactivate, remove }
