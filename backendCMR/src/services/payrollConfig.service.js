const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

const NUMERIC = [
  'umaDaily', 'imssEnfMatRate', 'imssInvVidaRate', 'imssCesVejezRate',
  'infonavitEmployerRate', 'primaVacacionalRate', 'fondoAhorroRate', 'integrationFactor',
]

function serializeConfig(config) {
  if (!config) return null
  const data = { ...config }
  for (const field of NUMERIC) if (data[field] != null) data[field] = Number(data[field])
  return data
}

function serializeBracket(bracket) {
  return { ...bracket, lowerLimit: Number(bracket.lowerLimit), fixedFee: Number(bracket.fixedFee), rate: Number(bracket.rate) }
}

async function getConfigRow() {
  const config = await prisma.payrollConfig.findFirst()
  if (!config) throw new AppError('Payroll configuration is missing. Run the database seed.', 500, 'PAYROLL_CONFIG_MISSING')
  return config
}

async function getConfig() {
  const [config, brackets] = await Promise.all([
    getConfigRow(),
    prisma.isrBracket.findMany({ orderBy: [{ period: 'asc' }, { sortOrder: 'asc' }] }),
  ])
  return { config: serializeConfig(config), isrBrackets: brackets.map(serializeBracket) }
}

async function updateConfig(input) {
  const current = await getConfigRow()
  const updated = await prisma.payrollConfig.update({ where: { id: current.id }, data: input })
  return serializeConfig(updated)
}

async function getBracketsByPeriod(period) {
  return prisma.isrBracket.findMany({ where: { period }, orderBy: { sortOrder: 'asc' } })
}

module.exports = { getConfig, getConfigRow, updateConfig, getBracketsByPeriod, serializeConfig }
