const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')
const { computeReceipt, resolveDailySbc, round2 } = require('../utils/payroll')
const { getConfigRow, getBracketsByPeriod, getCesantiaBrackets } = require('./payrollConfig.service')

const PERIOD_DAYS = { SEMANAL: 7, QUINCENAL: 15, MENSUAL: 30 }

const RECEIPT_MONEY = [
  'dailySalary', 'sbc', 'imssSubsidy', 'baseSalary', 'aguinaldoProportional', 'vacationProportional', 'vacationBonus',
  'extraPerceptions', 'totalPerceptions', 'imssEnfMat', 'imssInvVida', 'imssCesVejez', 'imssTotal',
  'isrWithholding', 'infonavit', 'savingsFund', 'otherDeductions', 'totalDeductions', 'netPay',
  'patronImssTotal', 'patronRetiro', 'patronCesantiaVejez', 'patronInfonavit', 'patronTotal', 'rcvAforeTotal',
]
const PAYROLL_MONEY = ['totalGross', 'totalDeductions', 'totalNet', 'totalEmployerCost']

function serializeReceipt(receipt) {
  const data = { ...receipt }
  for (const field of RECEIPT_MONEY) if (data[field] != null) data[field] = Number(data[field])
  return data
}

function serializePayroll(payroll) {
  const data = { ...payroll }
  for (const field of PAYROLL_MONEY) if (data[field] != null) data[field] = Number(data[field])
  if (Array.isArray(data.receipts)) data.receipts = data.receipts.map(serializeReceipt)
  return data
}

function toDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function assertEditable(payroll) {
  if (payroll.status !== 'BORRADOR') {
    throw new AppError('Only draft payrolls can be modified', 409, 'PAYROLL_LOCKED')
  }
}

async function buildFolio(year) {
  const count = await prisma.payroll.count()
  return `NOM-${year}-${String(count + 1).padStart(4, '0')}`
}

// Suma los recibos y persiste los totales de la cabecera.
async function recalcTotals(tx, payrollId) {
  const receipts = await tx.payrollReceipt.findMany({ where: { payrollId } })
  const totals = receipts.reduce((acc, receipt) => ({
    gross: acc.gross + Number(receipt.totalPerceptions),
    deductions: acc.deductions + Number(receipt.totalDeductions),
    net: acc.net + Number(receipt.netPay),
    employer: acc.employer + Number(receipt.patronTotal),
  }), { gross: 0, deductions: 0, net: 0, employer: 0 })
  await tx.payroll.update({
    where: { id: payrollId },
    data: {
      totalGross: round2(totals.gross),
      totalDeductions: round2(totals.deductions),
      totalNet: round2(totals.net),
      totalEmployerCost: round2(totals.employer),
    },
  })
}

// ── Cabeceras ──────────────────────────────────────────────
async function list(filters) {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.periodType && { periodType: filters.periodType }),
    ...((filters.from || filters.to) && {
      paymentDate: { ...(filters.from && { gte: toDate(filters.from) }), ...(filters.to && { lte: toDate(filters.to) }) },
    }),
    ...(filters.search && { folio: { contains: filters.search, mode: 'insensitive' } }),
  }
  const payrolls = await prisma.payroll.findMany({
    where,
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { receipts: true } } },
  })
  return payrolls.map((payroll) => ({ ...serializePayroll(payroll), receiptCount: payroll._count.receipts, _count: undefined }))
}

async function getById(id) {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: { receipts: { orderBy: { employeeName: 'asc' } } },
  })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  // Empleados activos que todavia no tienen recibo en esta nomina.
  const activeEmployees = await prisma.employee.findMany({ where: { active: true }, select: { id: true } })
  const withReceipt = new Set(payroll.receipts.map((receipt) => receipt.employeeId))
  const pendingReceipts = activeEmployees.filter((employee) => !withReceipt.has(employee.id)).length
  return { ...serializePayroll(payroll), pendingReceipts }
}

async function create(input, user) {
  const folio = await buildFolio(new Date(input.periodEnd).getUTCFullYear())
  const payroll = await prisma.payroll.create({
    data: {
      folio,
      periodType: input.periodType,
      periodStart: toDate(input.periodStart),
      periodEnd: toDate(input.periodEnd),
      paymentDate: toDate(input.paymentDate),
      applySavingsFund: Boolean(input.applySavingsFund),
      notes: input.notes,
      createdById: user?.id,
      createdByName: user?.fullName,
    },
  })
  // Genera recibos para todos los empleados activos salvo indicacion contraria.
  if (input.generateForActive !== false) {
    await generateReceipts(payroll.id, {})
    return getById(payroll.id)
  }
  return serializePayroll({ ...payroll, receipts: [] })
}

async function update(id, input) {
  const payroll = await prisma.payroll.findUnique({ where: { id } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  assertEditable(payroll)

  const periodChanged = input.periodType !== payroll.periodType
  const savingsChanged = Boolean(input.applySavingsFund) !== payroll.applySavingsFund

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: {
        periodType: input.periodType,
        periodStart: toDate(input.periodStart),
        periodEnd: toDate(input.periodEnd),
        paymentDate: toDate(input.paymentDate),
        applySavingsFund: Boolean(input.applySavingsFund),
        notes: input.notes,
      },
    })
    // Si cambia el periodo (tabla ISR) o el fondo de ahorro, recalcula recibos.
    if (periodChanged || savingsChanged) {
      const [config, brackets, cesantiaBrackets] = await Promise.all([getConfigRow(), getBracketsByPeriod(input.periodType), getCesantiaBrackets()])
      const receipts = await tx.payrollReceipt.findMany({ where: { payrollId: id } })
      for (const receipt of receipts) {
        const amounts = computeReceipt({
          dailySalary: Number(receipt.dailySalary),
          sbcDaily: Number(receipt.sbc),
          workedDays: receipt.workedDays,
          absentDays: receipt.absentDays,
          disabilityDays: receipt.disabilityDays,
          disabilityType: receipt.disabilityType,
          extraPerceptions: Number(receipt.extraPerceptions),
          infonavit: Number(receipt.infonavit),
          otherDeductions: Number(receipt.otherDeductions),
          applySavingsFund: Boolean(input.applySavingsFund),
          periodType: input.periodType,
        }, config, brackets, cesantiaBrackets)
        await tx.payrollReceipt.update({ where: { id: receipt.id }, data: amounts })
      }
      await recalcTotals(tx, id)
    }
  })
  return getById(id)
}

async function changeStatus(id, status) {
  const payroll = await prisma.payroll.findUnique({ where: { id } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  if (['PAGADA', 'CANCELADA'].includes(payroll.status)) {
    throw new AppError('A paid or cancelled payroll cannot change state', 409, 'PAYROLL_LOCKED')
  }
  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({ where: { id }, data: { status } })
    // Al marcar como pagada se generan los recibos (PDF disponibles) y se bloquea.
    if (status === 'PAGADA') {
      await tx.payrollReceipt.updateMany({ where: { payrollId: id }, data: { pdfGenerated: true } })
    }
  })
  return getById(id)
}

async function remove(id) {
  const payroll = await prisma.payroll.findUnique({ where: { id } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  await prisma.payroll.delete({ where: { id } }) // cascade elimina los recibos
}

// ── Recibos ────────────────────────────────────────────────
async function generateReceipts(payrollId, { employeeIds } = {}) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  assertEditable(payroll)

  const [config, brackets, cesantiaBrackets, existing] = await Promise.all([
    getConfigRow(),
    getBracketsByPeriod(payroll.periodType),
    getCesantiaBrackets(),
    prisma.payrollReceipt.findMany({ where: { payrollId }, select: { employeeId: true } }),
  ])
  const already = new Set(existing.map((receipt) => receipt.employeeId))

  const employees = await prisma.employee.findMany({
    where: { active: true, ...(employeeIds?.length ? { id: { in: employeeIds } } : {}) },
  })
  const targets = employees.filter((employee) => !already.has(employee.id))
  if (!targets.length) return getById(payrollId)

  const defaultDays = PERIOD_DAYS[payroll.periodType]
  await prisma.$transaction(async (tx) => {
    for (const employee of targets) {
      const sbcDaily = resolveDailySbc({ dailySalary: Number(employee.dailySalary), integratedImssSalary: employee.integratedImssSalary }, config)
      const amounts = computeReceipt({
        dailySalary: Number(employee.dailySalary), sbcDaily, workedDays: defaultDays, absentDays: 0,
        disabilityDays: 0, disabilityType: null,
        extraPerceptions: 0, infonavit: 0, otherDeductions: 0, applySavingsFund: payroll.applySavingsFund, periodType: payroll.periodType,
      }, config, brackets, cesantiaBrackets)
      await tx.payrollReceipt.create({
        data: {
          payrollId,
          employeeId: employee.id,
          employeeName: fullName(employee),
          curp: employee.curp,
          rfc: employee.rfc,
          nss: employee.nss,
          clabe: employee.clabe,
          afore: employee.afore,
          position: employee.position,
          department: employee.department,
          contractType: employee.contractType,
          ...amounts,
        },
      })
    }
    await recalcTotals(tx, payrollId)
  })
  return getById(payrollId)
}

async function updateReceipt(payrollId, receiptId, input) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  assertEditable(payroll)
  const receipt = await prisma.payrollReceipt.findUnique({ where: { id: receiptId } })
  if (!receipt || receipt.payrollId !== payrollId) throw new AppError('Receipt not found', 404, 'RECEIPT_NOT_FOUND')

  const [config, brackets, cesantiaBrackets] = await Promise.all([getConfigRow(), getBracketsByPeriod(payroll.periodType), getCesantiaBrackets()])
  // El salario diario y el SBC quedan congelados en el recibo (regla de negocio).
  const amounts = computeReceipt({
    dailySalary: Number(receipt.dailySalary),
    sbcDaily: Number(receipt.sbc),
    workedDays: input.workedDays,
    absentDays: input.absentDays || 0,
    disabilityDays: input.disabilityDays || 0,
    disabilityType: input.disabilityType || null,
    extraPerceptions: input.extraPerceptions || 0,
    infonavit: input.infonavit || 0,
    otherDeductions: input.otherDeductions || 0,
    applySavingsFund: payroll.applySavingsFund,
    periodType: payroll.periodType,
  }, config, brackets, cesantiaBrackets)

  await prisma.$transaction(async (tx) => {
    await tx.payrollReceipt.update({ where: { id: receiptId }, data: amounts })
    await recalcTotals(tx, payrollId)
  })
  return getById(payrollId)
}

async function removeReceipt(payrollId, receiptId) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } })
  if (!payroll) throw new AppError('Payroll not found', 404, 'PAYROLL_NOT_FOUND')
  assertEditable(payroll)
  const receipt = await prisma.payrollReceipt.findUnique({ where: { id: receiptId } })
  if (!receipt || receipt.payrollId !== payrollId) throw new AppError('Receipt not found', 404, 'RECEIPT_NOT_FOUND')
  await prisma.$transaction(async (tx) => {
    await tx.payrollReceipt.delete({ where: { id: receiptId } })
    await recalcTotals(tx, payrollId)
  })
  return getById(payrollId)
}

async function getReceipt(receiptId) {
  const receipt = await prisma.payrollReceipt.findUnique({ where: { id: receiptId }, include: { payroll: true } })
  if (!receipt) throw new AppError('Receipt not found', 404, 'RECEIPT_NOT_FOUND')
  return { ...serializeReceipt(receipt), payroll: serializePayroll(receipt.payroll) }
}

// ── Reportes ───────────────────────────────────────────────
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Agrupa por año, mes o bimestre a partir de la fecha de pago (bimestre 1 = Ene-Feb).
function groupInfo(groupBy, date) {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  if (groupBy === 'year') return { key: String(y), label: String(y), sort: y * 100 }
  if (groupBy === 'bimester') {
    const bim = Math.floor(m / 2) + 1
    return { key: `${y}-B${bim}`, label: `Bimestre ${bim} · ${MONTHS[(bim - 1) * 2]}-${MONTHS[(bim - 1) * 2 + 1]} ${y}`, sort: y * 100 + bim }
  }
  return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS[m]} ${y}`, sort: y * 100 + (m + 1) }
}

async function report({ groupBy = 'month', year, includeCancelled = false } = {}) {
  const where = {
    ...(year && { paymentDate: { gte: toDate(`${year}-01-01`), lte: toDate(`${year}-12-31`) } }),
    ...(!includeCancelled && { status: { not: 'CANCELADA' } }),
  }
  const payrolls = await prisma.payroll.findMany({
    where,
    select: { paymentDate: true, totalGross: true, totalDeductions: true, totalNet: true, totalEmployerCost: true, receipts: { select: { id: true } } },
  })
  const groups = new Map()
  for (const payroll of payrolls) {
    const info = groupInfo(groupBy, new Date(payroll.paymentDate))
    const group = groups.get(info.key) || { key: info.key, label: info.label, sort: info.sort, payrolls: 0, receipts: 0, totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerCost: 0 }
    group.payrolls += 1
    group.receipts += payroll.receipts.length
    group.totalGross += Number(payroll.totalGross)
    group.totalDeductions += Number(payroll.totalDeductions)
    group.totalNet += Number(payroll.totalNet)
    group.totalEmployerCost += Number(payroll.totalEmployerCost)
    groups.set(info.key, group)
  }
  const rows = [...groups.values()].sort((a, b) => a.sort - b.sort).map((group) => ({
    key: group.key,
    label: group.label,
    payrolls: group.payrolls,
    receipts: group.receipts,
    totalGross: round2(group.totalGross),
    totalDeductions: round2(group.totalDeductions),
    totalNet: round2(group.totalNet),
    totalEmployerCost: round2(group.totalEmployerCost),
  }))
  const totals = rows.reduce((acc, row) => ({
    payrolls: acc.payrolls + row.payrolls,
    receipts: acc.receipts + row.receipts,
    totalGross: acc.totalGross + row.totalGross,
    totalDeductions: acc.totalDeductions + row.totalDeductions,
    totalNet: acc.totalNet + row.totalNet,
    totalEmployerCost: acc.totalEmployerCost + row.totalEmployerCost,
  }), { payrolls: 0, receipts: 0, totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerCost: 0 })
  for (const key of ['totalGross', 'totalDeductions', 'totalNet', 'totalEmployerCost']) totals[key] = round2(totals[key])
  return { groupBy, year: year || null, rows, totals }
}

module.exports = {
  list, getById, create, update, changeStatus, remove,
  generateReceipts, updateReceipt, removeReceipt, getReceipt, report,
}
