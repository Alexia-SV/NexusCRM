const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')
const { computeReceipt, resolveDailySbc, round2 } = require('../utils/payroll')
const { getConfigRow, getBracketsByPeriod } = require('./payrollConfig.service')

const PERIOD_DAYS = { SEMANAL: 7, QUINCENAL: 15, MENSUAL: 30 }

const RECEIPT_MONEY = [
  'dailySalary', 'sbc', 'baseSalary', 'aguinaldoProportional', 'vacationProportional', 'vacationBonus',
  'extraPerceptions', 'totalPerceptions', 'imssEnfMat', 'imssInvVida', 'imssCesVejez', 'imssTotal',
  'isrWithholding', 'infonavit', 'savingsFund', 'otherDeductions', 'totalDeductions', 'netPay',
]
const PAYROLL_MONEY = ['totalGross', 'totalDeductions', 'totalNet']

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
  }), { gross: 0, deductions: 0, net: 0 })
  await tx.payroll.update({
    where: { id: payrollId },
    data: { totalGross: round2(totals.gross), totalDeductions: round2(totals.deductions), totalNet: round2(totals.net) },
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
  return serializePayroll(payroll)
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
      const config = await getConfigRow()
      const brackets = await getBracketsByPeriod(input.periodType)
      const receipts = await tx.payrollReceipt.findMany({ where: { payrollId: id } })
      for (const receipt of receipts) {
        const amounts = computeReceipt({
          dailySalary: Number(receipt.dailySalary),
          sbcDaily: Number(receipt.sbc),
          workedDays: receipt.workedDays,
          absentDays: receipt.absentDays,
          extraPerceptions: Number(receipt.extraPerceptions),
          infonavit: Number(receipt.infonavit),
          otherDeductions: Number(receipt.otherDeductions),
          applySavingsFund: Boolean(input.applySavingsFund),
          periodType: input.periodType,
        }, config, brackets)
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

  const [config, brackets, existing] = await Promise.all([
    getConfigRow(),
    getBracketsByPeriod(payroll.periodType),
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
        extraPerceptions: 0, infonavit: 0, otherDeductions: 0, applySavingsFund: payroll.applySavingsFund, periodType: payroll.periodType,
      }, config, brackets)
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

  const config = await getConfigRow()
  const brackets = await getBracketsByPeriod(payroll.periodType)
  // El salario diario y el SBC quedan congelados en el recibo (regla de negocio).
  const amounts = computeReceipt({
    dailySalary: Number(receipt.dailySalary),
    sbcDaily: Number(receipt.sbc),
    workedDays: input.workedDays,
    absentDays: input.absentDays || 0,
    extraPerceptions: input.extraPerceptions || 0,
    infonavit: input.infonavit || 0,
    otherDeductions: input.otherDeductions || 0,
    applySavingsFund: payroll.applySavingsFund,
    periodType: payroll.periodType,
  }, config, brackets)

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

module.exports = {
  list, getById, create, update, changeStatus, remove,
  generateReceipts, updateReceipt, removeReceipt, getReceipt,
}
