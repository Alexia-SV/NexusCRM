// Datos de prueba de nomina que concuerdan con los empleados ya registrados.
// Genera varias corridas (los 4 estados, quincenal y mensual) usando la logica
// real del servicio, por lo que los montos quedan consistentes.
//
// Uso:
//   node scripts/seed-payroll-demo.js          -> crea si no hay nominas
//   RESET=1 node scripts/seed-payroll-demo.js  -> borra las nominas y recrea

require('dotenv/config')

const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const payroll = require('../src/services/payroll.service')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// AFORE por empleado (se asigna si esta vacio) para completar el expediente.
const AFORES = {
  'Ana López Pérez': 'XXI Banorte',
  'José Hernández Cruz': 'Profuturo',
  'María Ramírez García': 'Citibanamex Afore',
  'Sofía Gómez Martínez': 'SURA',
}

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function receiptFor(payrollData, name) {
  return payrollData.receipts.find((receipt) => receipt.employeeName === name)
}

async function main() {
  const count = await prisma.payroll.count()
  if (count > 0) {
    if (process.env.RESET !== '1') {
      console.log(`Ya existen ${count} nomina(s). Ejecuta con RESET=1 para borrarlas y recrear los datos demo.`)
      return
    }
    await prisma.payroll.deleteMany({})
    console.log(`Eliminadas ${count} nomina(s) previas.`)
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const user = admin ? { id: admin.id, fullName: admin.fullName } : undefined

  // Asigna AFORE a los empleados que no lo tengan.
  const employees = await prisma.employee.findMany()
  for (const employee of employees) {
    const afore = AFORES[fullName(employee)]
    if (afore && !employee.afore) {
      await prisma.employee.update({ where: { id: employee.id }, data: { afore } })
    }
  }
  console.log('AFORE asignado a los empleados.')

  const activos = employees.filter((employee) => employee.active).length
  console.log(`Empleados activos: ${activos}`)

  // 1) Quincenal pagada (primera quincena de junio)
  const p1 = await payroll.create({ periodType: 'QUINCENAL', periodStart: '2026-06-01', periodEnd: '2026-06-15', paymentDate: '2026-06-16', applySavingsFund: true, notes: 'Primera quincena de junio.' }, user)
  await payroll.changeStatus(p1.id, 'EN_PROCESO')
  await payroll.changeStatus(p1.id, 'PAGADA')
  console.log(`1) ${p1.folio} QUINCENAL PAGADA -> ${p1.receipts.length} recibos, neto ${p1.totalNet}`)

  // 2) Quincenal pagada (segunda quincena de junio) con variaciones
  let p2 = await payroll.create({ periodType: 'QUINCENAL', periodStart: '2026-06-16', periodEnd: '2026-06-30', paymentDate: '2026-07-01', applySavingsFund: true, notes: 'Segunda quincena de junio.' }, user)
  const jose = receiptFor(p2, 'José Hernández Cruz')
  if (jose) await payroll.updateReceipt(p2.id, jose.id, { workedDays: 13, absentDays: 2, extraPerceptions: 0, infonavit: 0, otherDeductions: 300 })
  const ana = receiptFor(p2, 'Ana López Pérez')
  if (ana) await payroll.updateReceipt(p2.id, ana.id, { workedDays: 15, absentDays: 0, extraPerceptions: 2500, infonavit: 0, otherDeductions: 0 })
  await payroll.changeStatus(p2.id, 'EN_PROCESO')
  p2 = await payroll.changeStatus(p2.id, 'PAGADA')
  console.log(`2) ${p2.folio} QUINCENAL PAGADA (con faltas/bono) -> neto ${p2.totalNet}`)

  // 3) Quincenal en proceso (primera quincena de julio, en revision)
  let p3 = await payroll.create({ periodType: 'QUINCENAL', periodStart: '2026-07-01', periodEnd: '2026-07-15', paymentDate: '2026-07-16', applySavingsFund: true, notes: 'Primera quincena de julio, en revision.' }, user)
  const maria = receiptFor(p3, 'María Ramírez García')
  if (maria) await payroll.updateReceipt(p3.id, maria.id, { workedDays: 15, absentDays: 0, extraPerceptions: 1800, infonavit: 900, otherDeductions: 0 })
  p3 = await payroll.changeStatus(p3.id, 'EN_PROCESO')
  console.log(`3) ${p3.folio} QUINCENAL EN_PROCESO -> neto ${p3.totalNet}`)

  // 4) Quincenal en borrador (segunda quincena de julio, proxima)
  const p4 = await payroll.create({ periodType: 'QUINCENAL', periodStart: '2026-07-16', periodEnd: '2026-07-31', paymentDate: '2026-08-01', applySavingsFund: true, notes: 'Segunda quincena de julio, en captura.' }, user)
  console.log(`4) ${p4.folio} QUINCENAL BORRADOR -> neto ${p4.totalNet}`)

  // 5) Mensual cancelada (corrida de mayo anulada por error)
  const p5 = await payroll.create({ periodType: 'MENSUAL', periodStart: '2026-05-01', periodEnd: '2026-05-31', paymentDate: '2026-06-01', applySavingsFund: false, notes: 'Corrida mensual anulada por error de captura.' }, user)
  await payroll.changeStatus(p5.id, 'CANCELADA')
  console.log(`5) ${p5.folio} MENSUAL CANCELADA -> neto ${p5.totalNet}`)

  const total = await prisma.payroll.count()
  const receipts = await prisma.payrollReceipt.count()
  console.log(`\nListo: ${total} nominas y ${receipts} recibos de prueba creados.`)
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
