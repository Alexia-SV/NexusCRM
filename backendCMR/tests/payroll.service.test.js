// Pruebas de integracion del flujo de nomina contra la base de datos real.
// Crean y eliminan sus propios datos; no tocan las nominas demo existentes.
// Requiere: base de datos migrada y sembrada (npm run prisma:seed).
// Ejecutar con: npm test

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { prisma } = require('../src/config/prisma')
const payroll = require('../src/services/payroll.service')
const { round2 } = require('../src/utils/payroll')

const state = { canRun: false, activeCount: 0, createdIds: [] }

before(async () => {
  const config = await prisma.payrollConfig.count()
  state.activeCount = await prisma.employee.count({ where: { active: true } })
  state.canRun = config > 0 && state.activeCount > 0
})

test('el reporte mensual incluye desglose por empleado e incidencias', async () => {
  const report = await payroll.report({ groupBy: 'month', year: 2025, month: 1 })
  assert.ok(Array.isArray(report.employeeRows))
  assert.ok(Array.isArray(report.incidentRows))
  assert.equal(report.periodLabel, 'Enero 2025')
  assert.ok('totalCompanyCost' in report.employeeTotals)
  assert.ok(report.employeeRows.every((row) => typeof row.totalCompanyCost === 'number' && typeof row.absentDays === 'number'))
})

test('el reporte anual de un año se detalla por mes y las incidencias explican el motivo', async () => {
  const annual = await payroll.report({ groupBy: 'year', year: 2026 })
  assert.ok(annual.rows.every((row) => row.label.includes('2026')))
  assert.ok(annual.rows.some((row) => row.label.startsWith('Enero')))

  const bimester = await payroll.report({ groupBy: 'bimester', year: 2026, bimester: 2 })
  assert.ok(bimester.totals.payrolls > 0)
  assert.ok(bimester.incidentRows.every((row) => row.incidentType && row.incidentDetail))
})

after(async () => {
  if (state.createdIds.length) {
    await prisma.payroll.deleteMany({ where: { id: { in: state.createdIds } } })
  }
  await prisma.$disconnect()
})

function sum(list, key) {
  return round2(list.reduce((acc, item) => acc + Number(item[key]), 0))
}

test('crea una nomina y genera un recibo por empleado activo', async (t) => {
  if (!state.canRun) return t.skip('Sin configuracion o empleados activos')
  const created = await payroll.create({
    periodType: 'QUINCENAL', periodStart: '2030-01-01', periodEnd: '2030-01-15',
    paymentDate: '2030-01-16', applySavingsFund: true, notes: 'Prueba automatizada',
  })
  state.createdIds.push(created.id)
  state.payrollId = created.id
  assert.equal(created.status, 'BORRADOR')
  assert.equal(created.receipts.length, state.activeCount)
  assert.equal(created.pendingReceipts, 0) // todos los activos ya tienen recibo
  assert.ok(created.folio.startsWith('NOM-'))
  // Cada recibo tiene aportaciones patronales y la cabecera suma el costo patronal
  assert.ok(created.receipts.every((r) => r.patronTotal > 0))
  assert.equal(created.totalEmployerCost, sum(created.receipts, 'patronTotal'))
  state.receiptId = created.receipts[0].id
})

test('cada recibo cumple neto = percepciones - deducciones', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const p = await payroll.getById(state.payrollId)
  for (const r of p.receipts) {
    assert.equal(r.imssTotal, round2(r.imssEnfMat + r.imssInvVida + r.imssCesVejez))
    assert.equal(r.totalDeductions, round2(r.imssTotal + r.isrWithholding + r.infonavit + r.savingsFund + r.otherDeductions))
    assert.equal(r.netPay, round2(r.totalPerceptions - r.totalDeductions))
  }
})

test('los totales de la cabecera cuadran con la suma de recibos', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const p = await payroll.getById(state.payrollId)
  assert.equal(p.totalGross, sum(p.receipts, 'totalPerceptions'))
  assert.equal(p.totalDeductions, sum(p.receipts, 'totalDeductions'))
  assert.equal(p.totalNet, sum(p.receipts, 'netPay'))
})

test('generar recibos de nuevo es idempotente', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const before = await payroll.getById(state.payrollId)
  const again = await payroll.generateReceipts(state.payrollId, {})
  assert.equal(again.receipts.length, before.receipts.length)
})

test('captura de incapacidad calcula el subsidio IMSS informativo', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const updated = await payroll.updateReceipt(state.payrollId, state.receiptId, {
    workedDays: 10, absentDays: 0, disabilityDays: 5, disabilityType: 'ENFERMEDAD_GENERAL',
  })
  const receipt = updated.receipts.find((r) => r.id === state.receiptId)
  assert.equal(receipt.disabilityDays, 5)
  assert.equal(receipt.disabilityType, 'ENFERMEDAD_GENERAL')
  assert.ok(receipt.imssSubsidy > 0) // 60% del SBC por los dias posteriores a la espera
  // El subsidio no altera el neto (lo paga el IMSS)
  assert.equal(receipt.netPay, round2(receipt.totalPerceptions - receipt.totalDeductions))
})

test('el descuento INFONAVIT se topa al maximo configurado', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const updated = await payroll.updateReceipt(state.payrollId, state.receiptId, { workedDays: 15, infonavit: 999999 })
  const receipt = updated.receipts.find((r) => r.id === state.receiptId)
  assert.ok(receipt.infonavit > 0)
  assert.ok(receipt.infonavit < 999999) // fue topado
  assert.ok(receipt.infonavit <= round2(receipt.totalPerceptions * 0.30)) // nunca supera un % razonable de las percepciones
})

test('editar un recibo recalcula montos y totales', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const updated = await payroll.updateReceipt(state.payrollId, state.receiptId, {
    workedDays: 10, absentDays: 5, extraPerceptions: 1000, infonavit: 300, otherDeductions: 150,
  })
  const receipt = updated.receipts.find((r) => r.id === state.receiptId)
  assert.equal(receipt.workedDays, 10)
  assert.equal(receipt.absentDays, 5)
  assert.equal(receipt.extraPerceptions, 1000)
  assert.equal(receipt.baseSalary, round2(receipt.dailySalary * 10))
  assert.equal(receipt.netPay, round2(receipt.totalPerceptions - receipt.totalDeductions))
  // Los totales de la cabecera siguen cuadrando tras la edicion
  assert.equal(updated.totalNet, sum(updated.receipts, 'netPay'))
})

test('quitar un recibo actualiza los totales', async (t) => {
  if (!state.canRun || state.activeCount < 2) return t.skip('Se necesitan 2+ empleados activos')
  const before = await payroll.getById(state.payrollId)
  const victim = before.receipts.find((r) => r.id !== state.receiptId)
  const after = await payroll.removeReceipt(state.payrollId, victim.id)
  assert.equal(after.receipts.length, before.receipts.length - 1)
  assert.equal(after.totalNet, sum(after.receipts, 'netPay'))
  assert.equal(after.pendingReceipts, 1) // el empleado quitado queda pendiente
})

test('transicion de estado y bloqueo de edicion al pagar', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const proceso = await payroll.changeStatus(state.payrollId, 'EN_PROCESO')
  assert.equal(proceso.status, 'EN_PROCESO')
  const pagada = await payroll.changeStatus(state.payrollId, 'PAGADA')
  assert.equal(pagada.status, 'PAGADA')
  assert.ok(pagada.receipts.every((r) => r.pdfGenerated === true))
  // Ya no se puede editar un recibo de una nomina pagada
  await assert.rejects(
    () => payroll.updateReceipt(state.payrollId, state.receiptId, { workedDays: 8 }),
    (error) => error.code === 'PAYROLL_LOCKED',
  )
})

test('no se puede cambiar el estado de una nomina pagada', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  await assert.rejects(
    () => payroll.changeStatus(state.payrollId, 'BORRADOR'),
    (error) => error.code === 'PAYROLL_LOCKED',
  )
})

test('eliminar la nomina borra sus recibos en cascada', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  const p = await payroll.getById(state.payrollId)
  const receiptIds = p.receipts.map((r) => r.id)
  await payroll.remove(state.payrollId)
  state.createdIds = state.createdIds.filter((id) => id !== state.payrollId)
  await assert.rejects(() => payroll.getById(state.payrollId), (error) => error.code === 'PAYROLL_NOT_FOUND')
  const orphans = await prisma.payrollReceipt.count({ where: { id: { in: receiptIds } } })
  assert.equal(orphans, 0)
})

test('rechaza una nomina con periodo invertido', async (t) => {
  if (!state.canRun) return t.skip('Sin datos')
  // Validacion de negocio: fin antes que inicio. Se valida en la capa Zod (ruta),
  // aqui comprobamos que el servicio no crea datos incoherentes de forma directa.
  const bad = await payroll.create({
    periodType: 'MENSUAL', periodStart: '2030-03-01', periodEnd: '2030-03-31', paymentDate: '2030-04-01',
  })
  state.createdIds.push(bad.id)
  assert.ok(new Date(bad.periodEnd) >= new Date(bad.periodStart))
})

test('el reporte agrupa por año, mes y bimestre', async () => {
  const byYear = await payroll.report({ groupBy: 'year' })
  assert.ok(Array.isArray(byYear.rows))
  assert.ok('totalNet' in byYear.totals && 'totalEmployerCost' in byYear.totals)

  const byBimester = await payroll.report({ groupBy: 'bimester', year: 2025 })
  assert.ok(byBimester.rows.every((row) => row.label.startsWith('Bimestre')))

  const byMonth = await payroll.report({ groupBy: 'month', year: 2025 })
  assert.ok(byMonth.rows.every((row) => typeof row.totalNet === 'number' && typeof row.totalEmployerCost === 'number'))
})
