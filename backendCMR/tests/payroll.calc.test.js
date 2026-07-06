// Pruebas unitarias del calculo de nomina (funciones puras, sin base de datos).
// Ejecutar con: npm test   (o: node --test tests/)

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { round2, resolveDailySbc, computeIsr, computeReceipt } = require('../src/utils/payroll')

// Configuracion fija de referencia (equivale a la sembrada por el seed).
const CONFIG = {
  umaDaily: 108.57,
  imssEnfMatRate: 1.65,
  imssInvVidaRate: 0.625,
  imssCesVejezRate: 1.125,
  infonavitEmployerRate: 5,
  aguinaldoDays: 15,
  vacationDays: 12,
  primaVacacionalRate: 25,
  fondoAhorroRate: 5,
  integrationFactor: 1.0452,
}

// Tabla ISR simple para pruebas deterministas.
const BRACKETS = [
  { lowerLimit: 0.01, fixedFee: 0, rate: 1.92 },
  { lowerLimit: 100, fixedFee: 1.88, rate: 6.4 },
  { lowerLimit: 1000, fixedFee: 59.5, rate: 10.88 },
]

// ── round2 ────────────────────────────────────────────────
test('round2 redondea a dos decimales', () => {
  assert.equal(round2(103.125), 103.13)
  assert.equal(round2(10), 10)
  assert.equal(round2(0.1 + 0.2), 0.3)
})

// ── resolveDailySbc ───────────────────────────────────────
test('resolveDailySbc usa el salario integrado cuando existe', () => {
  assert.equal(resolveDailySbc({ dailySalary: 1000, integratedImssSalary: 1100 }, CONFIG), 1100)
})

test('resolveDailySbc estima el SBC con el factor cuando no hay integrado', () => {
  assert.equal(resolveDailySbc({ dailySalary: 1000, integratedImssSalary: null }, CONFIG), round2(1000 * 1.0452))
})

// ── computeIsr ────────────────────────────────────────────
test('computeIsr aplica el tramo correcto', () => {
  // base 200 -> tramo [100..1000): 1.88 + (200-100)*6.4% = 8.28
  assert.equal(computeIsr(200, BRACKETS), 8.28)
  // base 1200 -> tramo [1000..): 59.5 + (1200-1000)*10.88% = 81.26
  assert.equal(computeIsr(1200, BRACKETS), 81.26)
})

test('computeIsr es 0 con base cero o sin tramos', () => {
  assert.equal(computeIsr(0, BRACKETS), 0)
  assert.equal(computeIsr(500, []), 0)
})

// ── computeReceipt ────────────────────────────────────────
test('computeReceipt: percepciones de ley y desglose IMSS', () => {
  const r = computeReceipt({
    dailySalary: 1000, sbcDaily: 1100, workedDays: 15, absentDays: 0,
    extraPerceptions: 0, infonavit: 0, otherDeductions: 0, applySavingsFund: false, periodType: 'QUINCENAL',
  }, CONFIG, BRACKETS)

  // Percepciones
  assert.equal(r.baseSalary, 15000)
  assert.equal(r.aguinaldoProportional, round2((1000 * 15 / 365) * 15))
  assert.equal(r.vacationProportional, round2((1000 * 12 / 365) * 15))
  assert.equal(r.vacationBonus, round2(r.vacationProportional * 0.25))
  assert.equal(r.totalPerceptions, round2(r.baseSalary + r.aguinaldoProportional + r.vacationProportional + r.vacationBonus))

  // IMSS obrero sobre SBC (1100 * 15 = 16500 de base)
  assert.equal(r.imssEnfMat, round2(16500 * 0.0165))
  assert.equal(r.imssInvVida, round2(16500 * 0.00625))
  assert.equal(r.imssCesVejez, round2(16500 * 0.01125))
  assert.equal(r.imssTotal, round2(r.imssEnfMat + r.imssInvVida + r.imssCesVejez))

  // Auditoria: guarda la tabla usada
  assert.equal(r.isrTable, 'QUINCENAL')
})

test('computeReceipt: el neto = percepciones - deducciones', () => {
  const r = computeReceipt({
    dailySalary: 800, sbcDaily: 880, workedDays: 15, absentDays: 0,
    extraPerceptions: 500, infonavit: 200, otherDeductions: 100, applySavingsFund: true, periodType: 'QUINCENAL',
  }, CONFIG, BRACKETS)

  assert.equal(r.savingsFund, round2(r.baseSalary * 0.05))
  assert.equal(r.totalDeductions, round2(r.imssTotal + r.isrWithholding + r.infonavit + r.savingsFund + r.otherDeductions))
  assert.equal(r.netPay, round2(r.totalPerceptions - r.totalDeductions))
  assert.equal(r.extraPerceptions, 500)
  assert.equal(r.infonavit, 200)
})

test('computeReceipt: fondo de ahorro apagado no descuenta', () => {
  const r = computeReceipt({
    dailySalary: 600, sbcDaily: 660, workedDays: 15, absentDays: 0,
    extraPerceptions: 0, infonavit: 0, otherDeductions: 0, applySavingsFund: false, periodType: 'MENSUAL',
  }, CONFIG, BRACKETS)
  assert.equal(r.savingsFund, 0)
})

test('computeReceipt: menos dias trabajados reduce el salario base', () => {
  const full = computeReceipt({ dailySalary: 1000, sbcDaily: 1000, workedDays: 15, applySavingsFund: false, periodType: 'QUINCENAL' }, CONFIG, BRACKETS)
  const partial = computeReceipt({ dailySalary: 1000, sbcDaily: 1000, workedDays: 13, absentDays: 2, applySavingsFund: false, periodType: 'QUINCENAL' }, CONFIG, BRACKETS)
  assert.equal(full.baseSalary, 15000)
  assert.equal(partial.baseSalary, 13000)
  assert.ok(partial.netPay < full.netPay)
})
