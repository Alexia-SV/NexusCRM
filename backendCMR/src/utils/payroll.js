// Calculo de nomina para Nexus CRM.
//
// Todos los parametros fiscales/prestaciones vienen de la tabla `payroll_config`
// y las tablas ISR de `isr_brackets` (no hay porcentajes hardcodeados). Es un
// calculo con fines de gestion; no sustituye el timbrado fiscal oficial.
//
// Simplificaciones documentadas para el alcance academico:
// - El ISR se aplica sobre el total de percepciones del periodo, sin restar las
//   exenciones de aguinaldo/prima vacacional (topes en UMA).
// - El SBC se toma del salario integrado del empleado o, si no existe, del
//   salario diario por el factor de integracion configurado.

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

// SBC diario: usa el salario integrado IMSS si esta capturado; si no, lo estima.
function resolveDailySbc({ dailySalary, integratedImssSalary }, config) {
  const integrated = integratedImssSalary == null ? 0 : Number(integratedImssSalary)
  if (integrated > 0) return round2(integrated)
  return round2(Number(dailySalary) * Number(config.integrationFactor))
}

// ISR del periodo con la tabla correspondiente (brackets ya filtrados y ordenados).
function computeIsr(taxableBase, brackets) {
  if (taxableBase <= 0 || !brackets.length) return 0
  const ordered = [...brackets].sort((a, b) => Number(b.lowerLimit) - Number(a.lowerLimit))
  const bracket = ordered.find((item) => taxableBase >= Number(item.lowerLimit))
  if (!bracket) return 0
  return round2(Number(bracket.fixedFee) + (taxableBase - Number(bracket.lowerLimit)) * (Number(bracket.rate) / 100))
}

// Desglose completo de un recibo.
// input: { dailySalary, sbcDaily, workedDays, absentDays, extraPerceptions,
//          infonavit, otherDeductions, applySavingsFund, periodType }
function computeReceipt(input, config, isrBrackets) {
  const dailySalary = round2(input.dailySalary)
  const workedDays = Number(input.workedDays)
  const sbcDaily = round2(input.sbcDaily)

  // Percepciones
  const baseSalary = round2(dailySalary * workedDays)
  const aguinaldoProportional = round2((dailySalary * Number(config.aguinaldoDays) / 365) * workedDays)
  const vacationProportional = round2((dailySalary * Number(config.vacationDays) / 365) * workedDays)
  const vacationBonus = round2(vacationProportional * (Number(config.primaVacacionalRate) / 100))
  const extraPerceptions = round2(input.extraPerceptions || 0)
  const totalPerceptions = round2(baseSalary + aguinaldoProportional + vacationProportional + vacationBonus + extraPerceptions)

  // Deducciones IMSS (obrero) sobre SBC del periodo
  const imssBase = round2(sbcDaily * workedDays)
  const imssEnfMat = round2(imssBase * (Number(config.imssEnfMatRate) / 100))
  const imssInvVida = round2(imssBase * (Number(config.imssInvVidaRate) / 100))
  const imssCesVejez = round2(imssBase * (Number(config.imssCesVejezRate) / 100))
  const imssTotal = round2(imssEnfMat + imssInvVida + imssCesVejez)

  // ISR con la tabla del periodo
  const isrWithholding = computeIsr(totalPerceptions, isrBrackets)

  const infonavit = round2(input.infonavit || 0)
  const savingsFund = input.applySavingsFund ? round2(baseSalary * (Number(config.fondoAhorroRate) / 100)) : 0
  const otherDeductions = round2(input.otherDeductions || 0)
  const totalDeductions = round2(imssTotal + isrWithholding + infonavit + savingsFund + otherDeductions)

  const netPay = round2(totalPerceptions - totalDeductions)

  return {
    dailySalary,
    sbc: sbcDaily,
    workedDays,
    absentDays: Number(input.absentDays || 0),
    baseSalary,
    aguinaldoProportional,
    vacationProportional,
    vacationBonus,
    extraPerceptions,
    totalPerceptions,
    imssEnfMat,
    imssInvVida,
    imssCesVejez,
    imssTotal,
    isrWithholding,
    isrTable: input.periodType,
    infonavit,
    savingsFund,
    otherDeductions,
    totalDeductions,
    netPay,
  }
}

module.exports = { round2, resolveDailySbc, computeIsr, computeReceipt }
