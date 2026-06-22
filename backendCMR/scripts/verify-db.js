require('dotenv/config')

const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
    },
    orderBy: { email: 'asc' },
  })

  const employeeCount = await prisma.employee.count()

  console.log(JSON.stringify({ users, employeeCount }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
