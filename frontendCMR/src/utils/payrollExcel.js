// Exporta el resumen de una nomina por periodo a un archivo CSV que Excel abre
// directamente (con BOM UTF-8 para respetar acentos).

const periodLabels = { SEMANAL: 'Semanal', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual' }
const statusLabels = { BORRADOR: 'Borrador', EN_PROCESO: 'En proceso', PAGADA: 'Pagada', CANCELADA: 'Cancelada' }

function money(value) {
  return Number(value || 0).toFixed(2)
}

function csvDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function cell(value) {
  const text = value == null ? '' : String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function row(values) {
  return values.map(cell).join(',')
}

function escapeFileName(value) {
  return String(value || 'nomina')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function downloadPayrollExcel(payroll) {
  const lines = []
  lines.push(row(['Nomina', payroll.folio]))
  lines.push(row(['Periodo', periodLabels[payroll.periodType] || payroll.periodType]))
  lines.push(row(['Del', csvDate(payroll.periodStart), 'al', csvDate(payroll.periodEnd)]))
  lines.push(row(['Fecha de pago', csvDate(payroll.paymentDate)]))
  lines.push(row(['Estado', statusLabels[payroll.status] || payroll.status]))
  lines.push('')

  lines.push(row([
    'Empleado', 'CURP', 'NSS', 'Dias', 'Faltas',
    'Salario base', 'Aguinaldo prop.', 'Vacaciones prop.', 'Prima vacacional', 'Percepciones extra', 'Total percepciones',
    'IMSS Enf. y Mat.', 'IMSS Inv. y Vida', 'IMSS Ces. y Vejez', 'IMSS total', 'ISR', 'INFONAVIT', 'Fondo de ahorro', 'Otros descuentos', 'Total deducciones',
    'Neto a pagar',
  ]))

  for (const r of payroll.receipts) {
    lines.push(row([
      r.employeeName, r.curp, r.nss || '', r.workedDays, r.absentDays,
      money(r.baseSalary), money(r.aguinaldoProportional), money(r.vacationProportional), money(r.vacationBonus), money(r.extraPerceptions), money(r.totalPerceptions),
      money(r.imssEnfMat), money(r.imssInvVida), money(r.imssCesVejez), money(r.imssTotal), money(r.isrWithholding), money(r.infonavit), money(r.savingsFund), money(r.otherDeductions), money(r.totalDeductions),
      money(r.netPay),
    ]))
  }

  lines.push('')
  lines.push(row(['', '', '', '', '', '', '', '', '', 'TOTALES', money(payroll.totalGross), '', '', '', '', '', '', '', '', money(payroll.totalDeductions), money(payroll.totalNet)]))

  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nomina-${escapeFileName(payroll.folio)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
