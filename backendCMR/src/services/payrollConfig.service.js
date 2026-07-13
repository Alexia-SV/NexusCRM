const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

const NUMERIC = [
  'umaDaily', 'imssEnfMatRate', 'imssInvVidaRate', 'imssCesVejezRate',
  'infonavitEmployerRate', 'primaVacacionalRate', 'fondoAhorroRate', 'integrationFactor',
  'infonavitMaxDiscountRate', 'sbcCapUma', 'excedenteUmaThreshold',
  'imssEnfMatFixedRate', 'imssEnfMatExcedentePatronRate', 'imssPrestDineroPatronRate',
  'imssGastosMedPatronRate', 'imssInvVidaPatronRate', 'imssGuarderiasPatronRate',
  'imssRiesgoTrabajoRate', 'retiroPatronRate',
  'disabilityGeneralRate', 'disabilityRiskRate', 'disabilityMaternityRate',
]

function serializeConfig(config) {
  if (!config) return null
  const data = { ...config }
  for (const field of NUMERIC) if (data[field] != null) data[field] = Number(data[field])
  return data
}

function serializeIsrBracket(bracket) {
  return { ...bracket, lowerLimit: Number(bracket.lowerLimit), fixedFee: Number(bracket.fixedFee), rate: Number(bracket.rate) }
}

function serializeCesantiaBracket(bracket) {
  return { ...bracket, lowerUma: Number(bracket.lowerUma), rate: Number(bracket.rate) }
}

async function getConfigRow() {
  const config = await prisma.payrollConfig.findFirst()
  if (!config) throw new AppError('Payroll configuration is missing. Run the database seed.', 500, 'PAYROLL_CONFIG_MISSING')
  return config
}

async function getConfig() {
  const [config, isrBrackets, cesantiaBrackets] = await Promise.all([
    getConfigRow(),
    prisma.isrBracket.findMany({ orderBy: [{ period: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.cesantiaVejezPatronBracket.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  return {
    config: serializeConfig(config),
    isrBrackets: isrBrackets.map(serializeIsrBracket),
    cesantiaBrackets: cesantiaBrackets.map(serializeCesantiaBracket),
  }
}

async function updateConfig(input) {
  const current = await getConfigRow()
  const updated = await prisma.payrollConfig.update({ where: { id: current.id }, data: input })
  return serializeConfig(updated)
}

async function getBracketsByPeriod(period) {
  return prisma.isrBracket.findMany({ where: { period }, orderBy: { sortOrder: 'asc' } })
}

async function getCesantiaBrackets() {
  return prisma.cesantiaVejezPatronBracket.findMany({ orderBy: { sortOrder: 'asc' } })
}

module.exports = { getConfig, getConfigRow, updateConfig, getBracketsByPeriod, getCesantiaBrackets, serializeConfig }
