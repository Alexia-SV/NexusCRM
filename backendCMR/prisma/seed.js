require('dotenv/config')

const bcrypt = require('bcryptjs')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient, Role } = require('@prisma/client')

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
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
