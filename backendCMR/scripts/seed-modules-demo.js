require('dotenv/config')

const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function date(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function decimal(value) {
  return Number(value)
}

function statusForStock({ active = true, currentStock, minimumStock }) {
  if (!active) return 'INACTIVO'
  if (Number(currentStock) <= 0) return 'AGOTADO'
  if (Number(currentStock) <= Number(minimumStock || 0)) return 'STOCK_BAJO'
  return 'DISPONIBLE'
}

async function upsertProvider(data) {
  return prisma.provider.upsert({
    where: { rfc: data.rfc },
    update: data,
    create: data,
  })
}

async function upsertSupply(data) {
  const payload = {
    ...data,
    status: statusForStock(data),
  }
  return prisma.supply.upsert({
    where: { sku: payload.sku },
    update: payload,
    create: payload,
  })
}

async function upsertProject(data) {
  const existing = await prisma.project.findFirst({ where: { name: data.name } })
  if (existing) {
    await prisma.projectMember.deleteMany({ where: { projectId: existing.id } })
    const { members, ...projectData } = data
    await prisma.project.update({ where: { id: existing.id }, data: projectData })
    if (members.length) {
      await prisma.projectMember.createMany({ data: members.map((member) => ({ ...member, projectId: existing.id })) })
    }
    return prisma.project.findUnique({ where: { id: existing.id } })
  }

  const { members, ...projectData } = data
  return prisma.project.create({
    data: {
      ...projectData,
      members: { create: members },
    },
  })
}

async function createMovementOnce({ supply, project, type, quantity, realUnitPrice, reason }) {
  const existing = await prisma.inventoryMovement.findFirst({
    where: { supplyId: supply.id, reason },
  })
  if (existing) return existing

  const current = Number(supply.currentStock)
  const nextStock = type === 'ENTRADA' ? current + quantity : type === 'SALIDA' ? current - quantity : quantity
  if (nextStock < 0) throw new Error(`Stock negativo para ${supply.sku}`)

  const movement = await prisma.inventoryMovement.create({
    data: {
      supplyId: supply.id,
      projectId: project?.id,
      type,
      quantity,
      realUnitPrice,
      totalCost: decimal(quantity * Number(realUnitPrice || 0)),
      reason,
      resultingStock: nextStock,
    },
  })

  await prisma.supply.update({
    where: { id: supply.id },
    data: {
      currentStock: nextStock,
      status: statusForStock({ active: supply.active, currentStock: nextStock, minimumStock: supply.minimumStock }),
    },
  })

  return movement
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true } })
  const employees = await prisma.employee.findMany({ where: { active: true }, take: 3, orderBy: { firstName: 'asc' } })

  const [acero, soluciones, equipo] = await Promise.all([
    upsertProvider({
      businessName: 'Aceros y Materiales Puebla SA de CV',
      rfc: 'AMP240115QK8',
      personType: 'MORAL',
      taxRegime: 'General de Ley Personas Morales',
      category: 'MATERIALES',
      status: 'ACTIVO',
      contactName: 'Mariana Torres',
      contactPosition: 'Ejecutiva comercial',
      phone: '2225550148',
      email: 'ventas@acerosmaterialespuebla.test',
      website: 'https://acerosmaterialespuebla.example.com',
      address: 'Av. Industria 421, Parque Industrial 5 de Mayo',
      postalCode: '72220',
      cityState: 'Puebla, Puebla',
      bankName: 'BBVA Mexico',
      clabe: '012180001234567890',
      accountNumber: '0012345678',
      currency: 'MXN',
      paymentTerms: '30 dias',
      authorizedCredit: 150000,
      totalHistoricalPurchases: 68450,
      rating: 5,
      internalNotes: 'Proveedor principal para material estructural. Entrega promedio en 48 horas.',
      createdById: admin?.id,
    }),
    upsertProvider({
      businessName: 'Soluciones Tecnicas Delta',
      rfc: 'STD230904HJ2',
      personType: 'MORAL',
      taxRegime: 'General de Ley Personas Morales',
      category: 'SERVICIOS',
      status: 'EVALUACION',
      contactName: 'Luis Enrique Padilla',
      contactPosition: 'Coordinador de servicios',
      phone: '2225550199',
      email: 'contacto@solucionesdelta.test',
      address: 'Calle 17 Sur 903, Col. Santiago',
      postalCode: '72410',
      cityState: 'Puebla, Puebla',
      bankName: 'Santander Mexico',
      clabe: '014180009876543210',
      currency: 'MXN',
      paymentTerms: '15 dias',
      authorizedCredit: 50000,
      totalHistoricalPurchases: 0,
      rating: 3,
      internalNotes: 'Proveedor nuevo. Requiere aprobacion de lider antes de compras.',
      createdById: admin?.id,
    }),
    upsertProvider({
      businessName: 'Equipos Industriales Norte',
      rfc: 'EIN2207117P4',
      personType: 'MORAL',
      taxRegime: 'General de Ley Personas Morales',
      category: 'EQUIPO',
      status: 'BLOQUEADO',
      contactName: 'Andrea Lopez',
      contactPosition: 'Atencion a cuentas',
      phone: '8185550133',
      email: 'cuentas@equiposnorte.test',
      address: 'Blvd. Universidad 1400',
      postalCode: '66450',
      cityState: 'San Nicolas de los Garza, Nuevo Leon',
      bankName: 'Banorte',
      clabe: '072580001122334455',
      currency: 'MXN',
      paymentTerms: 'Contado',
      authorizedCredit: 0,
      totalHistoricalPurchases: 9200,
      rating: 2,
      internalNotes: 'Bloqueado por entregas incompletas. No generar nuevas cotizaciones.',
      createdById: admin?.id,
    }),
  ])

  const [cemento, cable, guantes, taladro] = await Promise.all([
    upsertSupply({
      name: 'Cemento gris CPC 30R',
      sku: 'MAT-CEM-30R-50KG',
      description: 'Bulto de cemento gris de 50 kg para obra general.',
      category: 'MATERIAL',
      unit: 'bulto',
      referenceUnitPrice: 198,
      currentStock: 42,
      minimumStock: 20,
      maximumStock: 120,
      preferredProviderId: acero.id,
      active: true,
    }),
    upsertSupply({
      name: 'Cable UTP Cat 6',
      sku: 'CON-CAB-UTP6-M',
      description: 'Cable UTP categoria 6 por metro para instalaciones de red.',
      category: 'CONSUMIBLE',
      unit: 'm',
      referenceUnitPrice: 9.5,
      currentStock: 18,
      minimumStock: 25,
      maximumStock: 300,
      preferredProviderId: soluciones.id,
      active: true,
    }),
    upsertSupply({
      name: 'Guantes de seguridad anticorte',
      sku: 'HER-GUA-ANTI-PAR',
      description: 'Par de guantes nivel 5 para manejo de materiales.',
      category: 'HERRAMIENTA',
      unit: 'par',
      referenceUnitPrice: 85,
      currentStock: 0,
      minimumStock: 10,
      maximumStock: 60,
      preferredProviderId: acero.id,
      active: true,
    }),
    upsertSupply({
      name: 'Taladro rotomartillo 1/2',
      sku: 'EQU-TAL-ROTO-12',
      description: 'Equipo electrico para perforacion en concreto y acero ligero.',
      category: 'EQUIPO',
      unit: 'pza',
      referenceUnitPrice: 2450,
      currentStock: 4,
      minimumStock: 2,
      maximumStock: 10,
      preferredProviderId: equipo.id,
      active: true,
    }),
  ])

  const leader = employees[0]
  const members = employees.map((employee, index) => ({
    employeeId: employee.id,
    role: index === 0 ? 'Lider de ejecucion' : index === 1 ? 'Responsable tecnico' : 'Apoyo operativo',
    assignedDailySalary: employee.dailySalary,
  }))

  const [bodega, red] = await Promise.all([
    upsertProject({
      name: 'Adecuacion de bodega central',
      objective: 'Preparar el area de almacen para recibir inventario y mejorar control de materiales.',
      clientName: 'Nexus CRM Demo',
      leaderId: leader?.id,
      plannedStartDate: date('2026-07-10'),
      plannedEndDate: date('2026-08-05'),
      realStartDate: date('2026-07-12'),
      status: 'ACTIVO',
      estimatedBudget: 125000,
      progress: 35,
      priority: 'ALTA',
      createdById: admin?.id,
      members,
    }),
    upsertProject({
      name: 'Instalacion de red administrativa',
      objective: 'Cablear y validar puntos de red para el area administrativa.',
      clientName: 'Oficinas Nexus',
      leaderId: employees[1]?.id || leader?.id,
      plannedStartDate: date('2026-07-20'),
      plannedEndDate: date('2026-08-12'),
      status: 'PLANEACION',
      estimatedBudget: 76000,
      progress: 10,
      priority: 'MEDIA',
      createdById: admin?.id,
      members: members.slice(0, 2),
    }),
  ])

  await createMovementOnce({
    supply: cemento,
    project: bodega,
    type: 'SALIDA',
    quantity: 8,
    realUnitPrice: 198,
    reason: 'Demo: salida para adecuacion de bodega central',
  })
  await createMovementOnce({
    supply: cable,
    project: red,
    type: 'SALIDA',
    quantity: 12,
    realUnitPrice: 9.5,
    reason: 'Demo: salida para instalacion de red administrativa',
  })
  await createMovementOnce({
    supply: taladro,
    project: bodega,
    type: 'SALIDA',
    quantity: 1,
    realUnitPrice: 2450,
    reason: 'Demo: asignacion de equipo a bodega central',
  })

  const [providerCount, supplyCount, projectCount, movementCount] = await Promise.all([
    prisma.provider.count(),
    prisma.supply.count(),
    prisma.project.count(),
    prisma.inventoryMovement.count(),
  ])

  console.log(`Datos demo listos: ${providerCount} proveedores, ${supplyCount} insumos, ${projectCount} proyectos, ${movementCount} movimientos.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
