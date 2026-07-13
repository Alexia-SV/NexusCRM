// Pruebas unitarias del calculo de nomina (funciones puras, sin base de datos).
// Ejecutar con: npm test

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { round2, resolveDailySbc, computeIsr, cesantiaPatronRate, computeReceipt } = require('../src/utils/payroll')

// Configuracion de referencia (equivale a la sembrada por el seed).
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
  infonavitMaxDiscountRate: 20,
  sbcCapUma: 25,
  excedenteUmaThreshold: 3,
  imssEnfMatFixedRate: 20.40,
  imssEnfMatExcedentePatronRate: 1.10,
  imssPrestDineroPatronRate: 0.70,
  imssGastosMedPatronRate: 1.05,
  imssInvVidaPatronRate: 1.75,
  imssGuarderiasPatronRate: 1.00,
  imssRiesgoTrabajoRate: 0.54,
  retiroPatronRate: 2.00,
  disabilityGeneralRate: 60,
  disabilityRiskRate: 100,
  disabilityMaternityRate: 100,
  disabilityWaitingDays: 3,
}

const BRACKETS = [
  { lowerLimit: 0.01, fixedFee: 0, rate: 1.92 },
  { lowerLimit: 100, fixedFee: 1.88, rate: 6.4 },
  { lowerLimit: 1000, fixedFee: 59.5, rate: 10.88 },
]

const CESANTIA = [
  { lowerUma: 0.0, rate: 3.15 },
  { lowerUma: 4.01, rate: 6.422 },
]

function base(overrides = {}) {
  return {
    dailySalary: 1000, sbcDaily: 1100, workedDays: 15, absentDays: 0,
    disabilityDays: 0, disabilityType: null, extraPerceptions: 0, infonavit: 0,
    otherDeductions: 0, applySavingsFund: false, periodType: 'QUINCENAL', ...overrides,
  }
}

// ── funciones base ────────────────────────────────────────
test('round2 redondea a dos decimales', () => {
  assert.equal(round2(103.125), 103.13)
  assert.equal(round2(0.1 + 0.2), 0.3)
})

test('resolveDailySbc usa el salario integrado cuando existe', () => {
  assert.equal(resolveDailySbc({ dailySalary: 1000, integratedImssSalary: 1100 }, CONFIG), 1100)
})

test('resolveDailySbc estima el SBC con el factor cuando no hay integrado', () => {
  assert.equal(resolveDailySbc({ dailySalary: 1000, integratedImssSalary: null }, CONFIG), round2(1000 * 1.0452))
})

test('resolveDailySbc topa el SBC a 25 UMA', () => {
  // Salario muy alto: el SBC no puede exceder 25 * UMA
  const cap = round2(25 * 108.57)
  assert.equal(resolveDailySbc({ dailySalary: 99999, integratedImssSalary: 99999 }, CONFIG), cap)
})

test('computeIsr aplica el tramo correcto', () => {
  assert.equal(computeIsr(200, BRACKETS), 8.28) // 1.88 + (200-100)*6.4%
  assert.equal(computeIsr(0, BRACKETS), 0)
})

test('cesantiaPatronRate escoge el tramo por SBC en UMA', () => {
  assert.equal(cesantiaPatronRate(108.57, CONFIG, CESANTIA), 3.15) // 1 UMA
  assert.equal(cesantiaPatronRate(1100, CONFIG, CESANTIA), 6.422) // ~10 UMA
})

// ── percepciones y deducciones obreras ────────────────────
test('computeReceipt: percepciones de ley y desglose IMSS obrero', () => {
  const r = computeReceipt(base(), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.baseSalary, 15000)
  assert.equal(r.aguinaldoProportional, round2((1000 * 15 / 365) * 15))
  assert.equal(r.vacationProportional, round2((1000 * 12 / 365) * 15))
  assert.equal(r.vacationBonus, round2(r.vacationProportional * 0.25))
  assert.equal(r.imssEnfMat, round2(16500 * 0.0165))
  assert.equal(r.imssInvVida, round2(16500 * 0.00625))
  assert.equal(r.imssCesVejez, round2(16500 * 0.01125))
  assert.equal(r.imssTotal, round2(r.imssEnfMat + r.imssInvVida + r.imssCesVejez))
  assert.equal(r.isrTable, 'QUINCENAL')
})

test('computeReceipt: neto = percepciones - deducciones (aportaciones patronales no afectan)', () => {
  const r = computeReceipt(base({ extraPerceptions: 500, otherDeductions: 100, applySavingsFund: true }), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.savingsFund, round2(r.baseSalary * 0.05))
  assert.equal(r.totalDeductions, round2(r.imssTotal + r.isrWithholding + r.infonavit + r.savingsFund + r.otherDeductions))
  assert.equal(r.netPay, round2(r.totalPerceptions - r.totalDeductions))
  // Las aportaciones patronales NO estan en totalDeductions
  assert.ok(r.patronTotal > 0)
  assert.equal(r.totalDeductions, round2(r.imssTotal + r.isrWithholding + r.infonavit + r.savingsFund + r.otherDeductions))
})

// ── tope INFONAVIT ────────────────────────────────────────
test('computeReceipt: el descuento INFONAVIT se topa al % del salario percibido', () => {
  const r = computeReceipt(base({ infonavit: 999999 }), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.infonavit, round2(r.totalPerceptions * 0.20)) // tope 20%
})

test('computeReceipt: un INFONAVIT bajo no se topa', () => {
  const r = computeReceipt(base({ infonavit: 200 }), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.infonavit, 200)
})

// ── aportaciones patronales ───────────────────────────────
test('computeReceipt: aportaciones patronales (Retiro, INFONAVIT, Cesantia) e importe a la AFORE', () => {
  const r = computeReceipt(base(), CONFIG, BRACKETS, CESANTIA)
  const imssBase = 16500
  assert.equal(r.patronRetiro, round2(imssBase * 0.02))
  assert.equal(r.patronInfonavit, round2(imssBase * 0.05))
  assert.equal(r.patronCesantiaVejez, round2(imssBase * 6.422 / 100)) // SBC ~10 UMA
  assert.ok(r.patronImssTotal > 0)
  assert.equal(r.patronTotal, round2(r.patronImssTotal + r.patronRetiro + r.patronCesantiaVejez + r.patronInfonavit))
  // Total a la AFORE (RCV): obrero Ces.Vejez + Retiro + Cesantia patronal
  assert.equal(r.rcvAforeTotal, round2(r.imssCesVejez + r.patronRetiro + r.patronCesantiaVejez))
})

// ── incapacidad ───────────────────────────────────────────
test('computeReceipt: subsidio IMSS por enfermedad general (60% desde el 4o dia)', () => {
  const r = computeReceipt(base({ workedDays: 10, disabilityDays: 5, disabilityType: 'ENFERMEDAD_GENERAL' }), CONFIG, BRACKETS, CESANTIA)
  // 5 dias de incapacidad, 3 de espera => 2 dias pagados al 60% del SBC
  assert.equal(r.imssSubsidy, round2(1100 * 0.60 * 2))
  assert.equal(r.disabilityDays, 5)
  assert.equal(r.disabilityType, 'ENFERMEDAD_GENERAL')
  // El subsidio NO entra al neto (lo paga el IMSS)
  assert.equal(r.netPay, round2(r.totalPerceptions - r.totalDeductions))
})

test('computeReceipt: riesgo de trabajo paga 100% desde el dia 1', () => {
  const r = computeReceipt(base({ workedDays: 10, disabilityDays: 5, disabilityType: 'RIESGO_TRABAJO' }), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.imssSubsidy, round2(1100 * 1.0 * 5))
})

test('computeReceipt: sin incapacidad no hay subsidio', () => {
  const r = computeReceipt(base(), CONFIG, BRACKETS, CESANTIA)
  assert.equal(r.imssSubsidy, 0)
})
