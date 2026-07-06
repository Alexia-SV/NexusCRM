require('dotenv/config')

const bcrypt = require('bcryptjs')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient, Role } = require('@prisma/client')

// Tarifa mensual del ISR (Art. 96 LISR, 2024). Las tablas semanal y quincenal
// se prorratean a partir de esta para mantener coherencia; se guardan en BD para
// que puedan reemplazarse por las oficiales sin tocar codigo.
const ISR_MONTHLY = [
  { lowerLimit: 0.01, fixedFee: 0.0, rate: 1.92 },
  { lowerLimit: 746.05, fixedFee: 14.32, rate: 6.4 },
  { lowerLimit: 6332.06, fixedFee: 371.83, rate: 10.88 },
  { lowerLimit: 11128.02, fixedFee: 893.63, rate: 16.0 },
  { lowerLimit: 12935.83, fixedFee: 1182.88, rate: 17.92 },
  { lowerLimit: 15487.72, fixedFee: 1640.18, rate: 21.36 },
  { lowerLimit: 31236.5, fixedFee: 5004.12, rate: 23.52 },
  { lowerLimit: 49233.01, fixedFee: 9236.89, rate: 30.0 },
  { lowerLimit: 93993.91, fixedFee: 22665.17, rate: 32.0 },
  { lowerLimit: 125325.21, fixedFee: 32691.18, rate: 34.0 },
  { lowerLimit: 375975.62, fixedFee: 117912.32, rate: 35.0 },
]

const PERIOD_FACTORS = { MENSUAL: 1, QUINCENAL: 15 / 30.4, SEMANAL: 7 / 30.4 }

function round2(value) {
  return Math.round(value * 100) / 100
}

const seedPassword = process.env.SEED_USER_PASSWORD

if (!seedPassword || seedPassword === 'change_me_seed_password') {
  throw new Error('Set a secure SEED_USER_PASSWORD in backendCMR/.env before seeding')
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const users = [
  { fullName: 'Administrador Nexus CRM', email: 'admin@nexuscrm.local', role: Role.ADMIN },
  { fullName: 'Lider Nexus CRM', email: 'lider@nexuscrm.local', role: Role.LIDER },
  { fullName: 'Operativo Nexus CRM', email: 'operativo@nexuscrm.local', role: Role.OPERATIVO },
  { fullName: 'Contador Nexus CRM', email: 'contador@nexuscrm.local', role: Role.CONTADOR },
]

async function main() {
  const passwordHash = await bcrypt.hash(seedPassword, 12)

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        active: true,
      },
      create: {
        ...user,
        passwordHash,
        mustChangePassword: true,
      },
    })
  }

  console.log(`Seeded ${users.length} Nexus CRM development users`)

  // Configuracion de nomina (crea solo si no existe, para no pisar ajustes)
  if ((await prisma.payrollConfig.count()) === 0) {
    await prisma.payrollConfig.create({
      data: {
        umaDaily: 108.57,
        imssEnfMatRate: 1.65,
        imssInvVidaRate: 0.625,
        imssCesVejezRate: 1.125,
        infonavitEmployerRate: 5.0,
        aguinaldoDays: 15,
        vacationDays: 12,
        primaVacacionalRate: 25.0,
        fondoAhorroRate: 5.0,
        integrationFactor: 1.0452,
      },
    })
    console.log('Seeded payroll configuration')
  }

  // Tablas ISR por periodo
  if ((await prisma.isrBracket.count()) === 0) {
    const rows = []
    for (const [period, factor] of Object.entries(PERIOD_FACTORS)) {
      ISR_MONTHLY.forEach((bracket, index) => {
        rows.push({
          period,
          lowerLimit: index === 0 ? 0.01 : round2(bracket.lowerLimit * factor),
          fixedFee: round2(bracket.fixedFee * factor),
          rate: bracket.rate,
          sortOrder: index,
        })
      })
    }
    await prisma.isrBracket.createMany({ data: rows })
    console.log(`Seeded ${rows.length} ISR brackets (weekly, biweekly, monthly)`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
