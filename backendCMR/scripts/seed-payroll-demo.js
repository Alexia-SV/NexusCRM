// Datos de prueba de nomina que concuerdan con los empleados ya registrados.
// Genera un historico 2024-2026 (para reportes mensual/anual/bimestral), con los
// 4 estados, quincenal y mensual, e incluye un escenario de INCAPACIDAD.
// Usa la logica real del servicio, por lo que los montos quedan consistentes.
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

const AFORES = {
  'Ana López Pérez': 'XXI Banorte',
  'José Hernández Cruz': 'Profuturo',
  'María Ramírez García': 'Citibanamex Afore',
  'Sofía Gómez Martínez': 'SURA',
}

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// Crea una nomina y la lleva al estado final indicado, aplicando ediciones por
// recibo (mientras esta en BORRADOR) antes de cambiar el estado.
async function makePayroll({ periodType, start, end, pay, savings = false, notes, finalStatus = 'PAGADA', edits }, user) {
  let result = await payroll.create({ periodType, periodStart: start, periodEnd: end, paymentDate: pay, applySavingsFund: savings, notes }, user)
  if (edits) await edits(result)
  if (finalStatus === 'PAGADA') {
    await payroll.changeStatus(result.id, 'EN_PROCESO')
    result = await payroll.changeStatus(result.id, 'PAGADA')
  } else if (finalStatus === 'EN_PROCESO') {
    result = await payroll.changeStatus(result.id, 'EN_PROCESO')
  } else if (finalStatus === 'CANCELADA') {
    result = await payroll.changeStatus(result.id, 'CANCELADA')
  }
  return result
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

  const employees = await prisma.employee.findMany()
  for (const employee of employees) {
    const afore = AFORES[fullName(employee)]
    if (afore && !employee.afore) await prisma.employee.update({ where: { id: employee.id }, data: { afore } })
  }
  console.log('AFORE asignado a los empleados.')
  console.log(`Empleados activos: ${employees.filter((e) => e.active).length}`)

  // ── Historico mensual 2024 y 2025 (para reportes anual/mensual/bimestral) ──
  let historicos = 0
  for (const year of [2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      await makePayroll({
        periodType: 'MENSUAL',
        start: `${year}-${pad(month)}-01`,
        end: `${year}-${pad(month)}-28`,
        pay: `${year}-${pad(month)}-28`,
        savings: true,
        notes: `Nomina mensual ${pad(month)}/${year}`,
        finalStatus: 'PAGADA',
      }, user)
      historicos++
    }
  }
  console.log(`Sembradas ${historicos} nominas mensuales pagadas (2024-2025).`)

  // ── 2026: quincenales con estados variados + INCAPACIDAD ──
  // 1) Quincenal pagada con escenario de INCAPACIDAD (Jose, enfermedad general 5 dias)
  const inc = await makePayroll({
    periodType: 'QUINCENAL', start: '2026-06-01', end: '2026-06-15', pay: '2026-06-16', savings: true,
    notes: 'Primera quincena de junio. Incluye incapacidad por enfermedad general.',
    finalStatus: 'PAGADA',
    edits: async (p) => {
      const jose = p.receipts.find((r) => r.employeeName === 'José Hernández Cruz')
      if (jose) await payroll.updateReceipt(p.id, jose.id, { workedDays: 10, absentDays: 0, disabilityDays: 5, disabilityType: 'ENFERMEDAD_GENERAL', extraPerceptions: 0, infonavit: 0, otherDeductions: 0 })
    },
  }, user)
  console.log(`Escenario incapacidad -> ${inc.folio} (Jose con 5 dias de incapacidad).`)

  // 2) Quincenal pagada con bono y credito INFONAVIT
  await makePayroll({
    periodType: 'QUINCENAL', start: '2026-06-16', end: '2026-06-30', pay: '2026-07-01', savings: true,
    notes: 'Segunda quincena de junio.', finalStatus: 'PAGADA',
    edits: async (p) => {
      const ana = p.receipts.find((r) => r.employeeName === 'Ana López Pérez')
      if (ana) await payroll.updateReceipt(p.id, ana.id, { workedDays: 15, extraPerceptions: 2500, infonavit: 0, otherDeductions: 0 })
      const maria = p.receipts.find((r) => r.employeeName === 'María Ramírez García')
      if (maria) await payroll.updateReceipt(p.id, maria.id, { workedDays: 15, extraPerceptions: 0, infonavit: 1200, otherDeductions: 0 })
    },
  }, user)

  // 3) Quincenal en proceso
  await makePayroll({ periodType: 'QUINCENAL', start: '2026-07-01', end: '2026-07-15', pay: '2026-07-16', savings: true, notes: 'Primera quincena de julio, en revision.', finalStatus: 'EN_PROCESO' }, user)

  // 4) Quincenal en borrador (proxima)
  await makePayroll({ periodType: 'QUINCENAL', start: '2026-07-16', end: '2026-07-31', pay: '2026-08-01', savings: true, notes: 'Segunda quincena de julio, en captura.', finalStatus: 'BORRADOR' }, user)

  // 5) Mensual cancelada
  await makePayroll({ periodType: 'MENSUAL', start: '2026-05-01', end: '2026-05-31', pay: '2026-06-01', savings: false, notes: 'Corrida mensual anulada por error.', finalStatus: 'CANCELADA' }, user)

  const total = await prisma.payroll.count()
  const receipts = await prisma.payrollReceipt.count()
  console.log(`\nListo: ${total} nominas y ${receipts} recibos de prueba creados (2024-2026).`)
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
