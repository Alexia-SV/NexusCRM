// Calculo de nomina para Nexus CRM.
//
// Todos los parametros fiscales/prestaciones vienen de la tabla `payroll_config`,
// las tablas ISR de `isr_brackets` y la tabla patronal de Cesantia y Vejez de
// `cesantia_vejez_patron_brackets` (no hay porcentajes hardcodeados). Es un
// calculo con fines de gestion; no sustituye el timbrado fiscal oficial.
//
// Simplificaciones documentadas (alcance academico):
// - El ISR se aplica sobre el total de percepciones del periodo, sin restar
//   exenciones (aguinaldo/prima) por topes de UMA.
// - Las cuotas (obreras y patronales) se prorratean por los dias trabajados del
//   periodo; se aplica el tope del SBC a 25 UMA (Art. 28 LSS).
// - Las aportaciones PATRONALES (IMSS, INFONAVIT 5%, Retiro, Cesantia patronal)
//   son informativas: son costo del empleador y NO afectan el neto del trabajador.
// - El subsidio por incapacidad lo paga el IMSS: es informativo, no lo cubre la
//   empresa ni entra al neto del recibo.

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

// SBC diario: salario integrado del empleado (o estimado por factor), topado a 25 UMA.
function resolveDailySbc({ dailySalary, integratedImssSalary }, config) {
  const integrated = integratedImssSalary == null ? 0 : Number(integratedImssSalary)
  const raw = integrated > 0 ? round2(integrated) : round2(Number(dailySalary) * Number(config.integrationFactor))
  const cap = round2(Number(config.sbcCapUma) * Number(config.umaDaily))
  return Math.min(raw, cap)
}

// ISR del periodo con la tabla correspondiente (brackets ya filtrados por periodo).
function computeIsr(taxableBase, brackets) {
  if (taxableBase <= 0 || !brackets.length) return 0
  const ordered = [...brackets].sort((a, b) => Number(b.lowerLimit) - Number(a.lowerLimit))
  const bracket = ordered.find((item) => taxableBase >= Number(item.lowerLimit))
  if (!bracket) return 0
  return round2(Number(bracket.fixedFee) + (taxableBase - Number(bracket.lowerLimit)) * (Number(bracket.rate) / 100))
}

// Tasa patronal de Cesantia y Vejez segun el SBC expresado en multiplos de UMA.
function cesantiaPatronRate(sbcDaily, config, cesantiaBrackets) {
  if (!cesantiaBrackets || !cesantiaBrackets.length) return 0
  const uma = Number(config.umaDaily)
  const sbcInUma = uma > 0 ? sbcDaily / uma : 0
  const ordered = [...cesantiaBrackets].sort((a, b) => Number(b.lowerUma) - Number(a.lowerUma))
  const bracket = ordered.find((item) => sbcInUma >= Number(item.lowerUma))
  return Number((bracket || ordered[ordered.length - 1]).rate)
}

// Subsidio del IMSS por incapacidad (informativo). Enfermedad general: % desde el
// dia (waitingDays+1); riesgo de trabajo y maternidad: 100% desde el dia 1.
function disabilitySubsidy(input, sbcDaily, config) {
  const days = Number(input.disabilityDays || 0)
  if (days <= 0 || !input.disabilityType) return 0
  if (input.disabilityType === 'ENFERMEDAD_GENERAL') {
    const payable = Math.max(0, days - Number(config.disabilityWaitingDays))
    return round2(sbcDaily * (Number(config.disabilityGeneralRate) / 100) * payable)
  }
  if (input.disabilityType === 'RIESGO_TRABAJO') return round2(sbcDaily * (Number(config.disabilityRiskRate) / 100) * days)
  if (input.disabilityType === 'MATERNIDAD') return round2(sbcDaily * (Number(config.disabilityMaternityRate) / 100) * days)
  return 0
}

// Desglose completo de un recibo (percepciones, deducciones obreras, subsidio y
// aportaciones patronales). input incluye periodType, dailySalary, sbcDaily,
// workedDays, absentDays, disabilityDays, disabilityType, extraPerceptions,
// infonavit, otherDeductions, applySavingsFund.
function computeReceipt(input, config, isrBrackets, cesantiaBrackets) {
  const dailySalary = round2(input.dailySalary)
  const workedDays = Number(input.workedDays)
  const sbcDaily = round2(input.sbcDaily)
  const uma = Number(config.umaDaily)

  // ── Percepciones ──
  const baseSalary = round2(dailySalary * workedDays)
  const aguinaldoProportional = round2((dailySalary * Number(config.aguinaldoDays) / 365) * workedDays)
  const vacationProportional = round2((dailySalary * Number(config.vacationDays) / 365) * workedDays)
  const vacationBonus = round2(vacationProportional * (Number(config.primaVacacionalRate) / 100))
  const extraPerceptions = round2(input.extraPerceptions || 0)
  const totalPerceptions = round2(baseSalary + aguinaldoProportional + vacationProportional + vacationBonus + extraPerceptions)

  // ── Deducciones OBRERAS (a cargo del trabajador) ──
  const imssBase = round2(sbcDaily * workedDays)
  const imssEnfMat = round2(imssBase * (Number(config.imssEnfMatRate) / 100))
  const imssInvVida = round2(imssBase * (Number(config.imssInvVidaRate) / 100))
  const imssCesVejez = round2(imssBase * (Number(config.imssCesVejezRate) / 100))
  const imssTotal = round2(imssEnfMat + imssInvVida + imssCesVejez)

  const isrWithholding = computeIsr(totalPerceptions, isrBrackets)

  // INFONAVIT: topado al % configurable del salario percibido del periodo.
  const infonavitInput = round2(input.infonavit || 0)
  const infonavitCap = round2(totalPerceptions * (Number(config.infonavitMaxDiscountRate) / 100))
  const infonavit = Math.min(infonavitInput, infonavitCap)

  const savingsFund = input.applySavingsFund ? round2(baseSalary * (Number(config.fondoAhorroRate) / 100)) : 0
  const otherDeductions = round2(input.otherDeductions || 0)
  const totalDeductions = round2(imssTotal + isrWithholding + infonavit + savingsFund + otherDeductions)
  const netPay = round2(totalPerceptions - totalDeductions)

  // ── Subsidio IMSS por incapacidad (informativo) ──
  const imssSubsidy = disabilitySubsidy(input, sbcDaily, config)

  // ── Aportaciones PATRONALES (informativas, no afectan el neto) ──
  const excedenteBase = round2(Math.max(0, sbcDaily - Number(config.excedenteUmaThreshold) * uma) * workedDays)
  const patronEnfMatFija = round2(uma * workedDays * (Number(config.imssEnfMatFixedRate) / 100))
  const patronEnfMatExced = round2(excedenteBase * (Number(config.imssEnfMatExcedentePatronRate) / 100))
  const patronPrestDinero = round2(imssBase * (Number(config.imssPrestDineroPatronRate) / 100))
  const patronGastosMed = round2(imssBase * (Number(config.imssGastosMedPatronRate) / 100))
  const patronInvVida = round2(imssBase * (Number(config.imssInvVidaPatronRate) / 100))
  const patronGuarderias = round2(imssBase * (Number(config.imssGuarderiasPatronRate) / 100))
  const patronRiesgo = round2(imssBase * (Number(config.imssRiesgoTrabajoRate) / 100))
  const patronImssTotal = round2(patronEnfMatFija + patronEnfMatExced + patronPrestDinero + patronGastosMed + patronInvVida + patronGuarderias + patronRiesgo)

  const patronRetiro = round2(imssBase * (Number(config.retiroPatronRate) / 100))
  const patronCesantiaVejez = round2(imssBase * (cesantiaPatronRate(sbcDaily, config, cesantiaBrackets) / 100))
  const patronInfonavit = round2(imssBase * (Number(config.infonavitEmployerRate) / 100))
  const patronTotal = round2(patronImssTotal + patronRetiro + patronCesantiaVejez + patronInfonavit)

  // Total depositado en la AFORE (RCV): obrero Ces. y Vejez + Retiro patronal + Cesantia patronal.
  const rcvAforeTotal = round2(imssCesVejez + patronRetiro + patronCesantiaVejez)

  return {
    dailySalary,
    sbc: sbcDaily,
    workedDays,
    absentDays: Number(input.absentDays || 0),
    disabilityDays: Number(input.disabilityDays || 0),
    disabilityType: input.disabilityType || null,
    imssSubsidy,
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
    patronImssTotal,
    patronRetiro,
    patronCesantiaVejez,
    patronInfonavit,
    patronTotal,
    rcvAforeTotal,
  }
}

module.exports = { round2, resolveDailySbc, computeIsr, cesantiaPatronRate, disabilitySubsidy, computeReceipt }
