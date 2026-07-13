// Recibo de nomina imprimible (PDF de una pagina) generado en el navegador,
// sin dependencias externas. Sigue el mismo enfoque que utils/employeePdf.js.

const PAGE = { width: 612, height: 792, margin: 46 }
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
const COLORS = {
  ink: '15 23 42',
  muted: '100 116 139',
  line: '203 213 225',
  panel: '248 250 252',
  navy: '15 23 42',
  sky: '2 132 199',
  rose: '190 18 60',
  green: '5 150 105',
}

const statusLabels = { BORRADOR: 'Borrador', EN_PROCESO: 'En proceso', PAGADA: 'Pagada', CANCELADA: 'Cancelada' }
const periodLabels = { SEMANAL: 'Semanal', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual' }
const contractLabels = { BASE: 'Base', TEMPORAL: 'Temporal', HONORARIOS: 'Honorarios' }

function toPdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function escapeFileName(value) {
  return String(value || 'recibo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function dateText(value) {
  if (!value) return 'Sin registrar'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function rgb(color) {
  return color.split(' ').map((part) => Number(part) / 255).join(' ')
}

function fillRect(x, y, width, height, color) {
  return `q ${rgb(color)} rg ${x} ${y} ${width} ${height} re f Q`
}

function strokeRect(x, y, width, height, color = COLORS.line, lineWidth = 0.8) {
  return `q ${lineWidth} w ${rgb(color)} RG ${x} ${y} ${width} ${height} re S Q`
}

function line(x1, y1, x2, y2, color = COLORS.line, lineWidth = 0.8) {
  return `q ${lineWidth} w ${rgb(color)} RG ${x1} ${y1} m ${x2} ${y2} l S Q`
}

function text(content, x, y, options = {}) {
  const font = options.bold ? 'F2' : 'F1'
  const size = options.size || 10
  const color = rgb(options.color || COLORS.ink)
  return `q ${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${toPdfText(content)}) Tj ET Q`
}

function field(ops, label, value, x, y) {
  ops.push(text(String(label).toUpperCase(), x, y, { size: 7, bold: true, color: COLORS.muted }))
  ops.push(text(value, x, y - 12, { size: 9.5, color: COLORS.ink }))
}

function amountRow(ops, label, value, x, width, y, options = {}) {
  ops.push(text(label, x, y, { size: 9, color: options.strong ? COLORS.ink : COLORS.muted, bold: options.strong }))
  const amount = `${options.negative ? '-' : ''}${money(value)}`
  ops.push(text(amount, x + width - 4 - amount.length * 5.1, y, { size: 9, bold: options.strong, color: options.negative ? COLORS.rose : COLORS.ink }))
}

function buildReceipt(receipt, payroll) {
  const ops = []

  ops.push(fillRect(0, 700, PAGE.width, 92, COLORS.navy))
  ops.push(fillRect(0, 696, PAGE.width, 4, COLORS.sky))
  ops.push(text('Nexus CRM', PAGE.margin, 754, { size: 11, bold: true, color: '226 232 240' }))
  ops.push(text('Recibo de nomina', PAGE.margin, 729, { size: 23, bold: true, color: '255 255 255' }))
  ops.push(text(`${payroll.folio}  -  ${receipt.employeeName}`, PAGE.margin, 710, { size: 11, color: '226 232 240' }))
  ops.push(text(`${periodLabels[payroll.periodType] || ''} - ${statusLabels[payroll.status] || ''}`, PAGE.width - PAGE.margin - 160, 710, { size: 10, bold: true, color: '186 230 253' }))

  let y = 664
  ops.push(text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, PAGE.margin, y, { size: 8.5, color: COLORS.muted }))
  y -= 24

  // Empleado
  ops.push(fillRect(PAGE.margin, y - 4, 5, 18, COLORS.sky))
  ops.push(text('Empleado', PAGE.margin + 12, y, { size: 12, bold: true }))
  ops.push(line(PAGE.margin, y - 11, PAGE.width - PAGE.margin, y - 11, COLORS.line))
  y -= 30
  const c2 = PAGE.margin + CONTENT_WIDTH / 3
  const c3 = PAGE.margin + (CONTENT_WIDTH / 3) * 2
  field(ops, 'CURP', receipt.curp, PAGE.margin, y)
  field(ops, 'RFC', receipt.rfc || 'Sin registrar', c2, y)
  field(ops, 'NSS / IMSS', receipt.nss || 'Sin registrar', c3, y)
  y -= 30
  field(ops, 'CLABE', receipt.clabe || 'Sin registrar', PAGE.margin, y)
  field(ops, 'AFORE', receipt.afore || 'Sin registrar', c2, y)
  field(ops, 'Contrato', contractLabels[receipt.contractType] || receipt.contractType, c3, y)
  y -= 34

  // Periodo
  ops.push(fillRect(PAGE.margin, y - 4, 5, 18, COLORS.sky))
  ops.push(text('Periodo', PAGE.margin + 12, y, { size: 12, bold: true }))
  ops.push(line(PAGE.margin, y - 11, PAGE.width - PAGE.margin, y - 11, COLORS.line))
  y -= 30
  const q = CONTENT_WIDTH / 4
  field(ops, 'Del - al', `${dateText(payroll.periodStart)} - ${dateText(payroll.periodEnd)}`, PAGE.margin, y)
  field(ops, 'Pago', dateText(payroll.paymentDate), PAGE.margin + q * 2, y)
  field(ops, 'Dias / faltas', `${receipt.workedDays} / ${receipt.absentDays}`, PAGE.margin + q * 3, y)
  y -= 30
  field(ops, 'Salario diario', money(receipt.dailySalary), PAGE.margin, y)
  field(ops, 'SBC diario', money(receipt.sbc), PAGE.margin + q, y)
  field(ops, 'Tabla ISR', periodLabels[receipt.isrTable] || receipt.isrTable, PAGE.margin + q * 2, y)
  y -= 34

  // Percepciones / deducciones
  const gap = 18
  const colWidth = (CONTENT_WIDTH - gap) / 2
  const boxHeight = 168
  const boxTop = y
  ops.push(fillRect(PAGE.margin, boxTop - boxHeight, colWidth, boxHeight, COLORS.panel))
  ops.push(strokeRect(PAGE.margin, boxTop - boxHeight, colWidth, boxHeight, COLORS.line))
  ops.push(fillRect(PAGE.margin + colWidth + gap, boxTop - boxHeight, colWidth, boxHeight, COLORS.panel))
  ops.push(strokeRect(PAGE.margin + colWidth + gap, boxTop - boxHeight, colWidth, boxHeight, COLORS.line))

  const leftX = PAGE.margin + 14
  const rightX = PAGE.margin + colWidth + gap + 14
  const innerWidth = colWidth - 28
  ops.push(text('Percepciones', leftX, boxTop - 20, { size: 11, bold: true, color: COLORS.green }))
  ops.push(text('Deducciones', rightX, boxTop - 20, { size: 11, bold: true, color: COLORS.rose }))

  const ly = boxTop - 42
  const step = 19
  amountRow(ops, `Salario (${receipt.workedDays} dias)`, receipt.baseSalary, leftX, innerWidth, ly)
  amountRow(ops, 'Aguinaldo prop.', receipt.aguinaldoProportional, leftX, innerWidth, ly - step)
  amountRow(ops, 'Vacaciones prop.', receipt.vacationProportional, leftX, innerWidth, ly - step * 2)
  amountRow(ops, 'Prima vacacional', receipt.vacationBonus, leftX, innerWidth, ly - step * 3)
  amountRow(ops, 'Percepciones extra', receipt.extraPerceptions, leftX, innerWidth, ly - step * 4)
  ops.push(line(leftX, ly - step * 5 + 12, leftX + innerWidth, ly - step * 5 + 12, COLORS.line))
  amountRow(ops, 'Total percepciones', receipt.totalPerceptions, leftX, innerWidth, ly - step * 5 - 2, { strong: true })

  amountRow(ops, 'IMSS Enf. y Mat.', receipt.imssEnfMat, rightX, innerWidth, ly, { negative: true })
  amountRow(ops, 'IMSS Inv. y Vida', receipt.imssInvVida, rightX, innerWidth, ly - step, { negative: true })
  amountRow(ops, 'Ces. y Vejez -> AFORE', receipt.imssCesVejez, rightX, innerWidth, ly - step * 2, { negative: true })
  amountRow(ops, 'ISR retenido', receipt.isrWithholding, rightX, innerWidth, ly - step * 3, { negative: true })
  amountRow(ops, 'INFONAVIT', receipt.infonavit, rightX, innerWidth, ly - step * 4, { negative: true })
  amountRow(ops, 'Fondo de ahorro', receipt.savingsFund, rightX, innerWidth, ly - step * 5, { negative: true })
  amountRow(ops, 'Otros descuentos', receipt.otherDeductions, rightX, innerWidth, ly - step * 6, { negative: true })
  ops.push(line(rightX, ly - step * 7 + 12, rightX + innerWidth, ly - step * 7 + 12, COLORS.line))
  amountRow(ops, 'Total deducciones', receipt.totalDeductions, rightX, innerWidth, ly - step * 7 - 2, { strong: true })

  y = boxTop - boxHeight - 22

  ops.push(fillRect(PAGE.margin, y - 34, CONTENT_WIDTH, 44, COLORS.navy))
  ops.push(text('NETO A PAGAR', PAGE.margin + 16, y - 12, { size: 12, bold: true, color: '255 255 255' }))
  const net = money(receipt.netPay)
  ops.push(text(net, PAGE.width - PAGE.margin - 16 - net.length * 8.5, y - 14, { size: 16, bold: true, color: '255 255 255' }))

  // Bloque informativo: aportaciones patronales + AFORE (RCV). No afectan el neto.
  const bTop = y - 52
  const bH = 100
  const bColW = (CONTENT_WIDTH - gap) / 2
  const bLeftX = PAGE.margin + 14
  const bRightX = PAGE.margin + bColW + gap + 14
  const bInner = bColW - 28
  ops.push(fillRect(PAGE.margin, bTop - bH, bColW, bH, COLORS.panel))
  ops.push(strokeRect(PAGE.margin, bTop - bH, bColW, bH, COLORS.line))
  ops.push(fillRect(PAGE.margin + bColW + gap, bTop - bH, bColW, bH, COLORS.panel))
  ops.push(strokeRect(PAGE.margin + bColW + gap, bTop - bH, bColW, bH, COLORS.line))
  ops.push(text('Aportaciones patronales (costo empresa)', bLeftX, bTop - 16, { size: 9, bold: true, color: COLORS.ink }))
  ops.push(text(`AFORE: ${receipt.afore || 'Sin registrar'} (RCV)`, bRightX, bTop - 16, { size: 9, bold: true, color: COLORS.sky }))
  const bly = bTop - 34
  const bstep = 15
  amountRow(ops, 'IMSS patronal', receipt.patronImssTotal, bLeftX, bInner, bly, { size: 8.5 })
  amountRow(ops, 'Retiro (2%)', receipt.patronRetiro, bLeftX, bInner, bly - bstep, { size: 8.5 })
  amountRow(ops, 'Cesantia patronal', receipt.patronCesantiaVejez, bLeftX, bInner, bly - bstep * 2, { size: 8.5 })
  amountRow(ops, 'INFONAVIT (5%)', receipt.patronInfonavit, bLeftX, bInner, bly - bstep * 3, { size: 8.5 })
  amountRow(ops, 'Costo patronal total', receipt.patronTotal, bLeftX, bInner, bly - bstep * 4 - 2, { strong: true, size: 8.5 })
  amountRow(ops, 'Trabajador (Ces. y Vejez)', receipt.imssCesVejez, bRightX, bInner, bly, { size: 8.5 })
  amountRow(ops, 'Retiro (patron)', receipt.patronRetiro, bRightX, bInner, bly - bstep, { size: 8.5 })
  amountRow(ops, 'Cesantia (patron)', receipt.patronCesantiaVejez, bRightX, bInner, bly - bstep * 2, { size: 8.5 })
  amountRow(ops, 'Total a la AFORE (RCV)', receipt.rcvAforeTotal, bRightX, bInner, bly - bstep * 4 - 2, { strong: true, size: 8.5 })

  if (receipt.disabilityType) {
    const dLabel = { ENFERMEDAD_GENERAL: 'Enfermedad general', RIESGO_TRABAJO: 'Riesgo de trabajo', MATERNIDAD: 'Maternidad' }[receipt.disabilityType] || receipt.disabilityType
    ops.push(text(`Incapacidad (${dLabel}, ${receipt.disabilityDays} dia(s)) - Subsidio IMSS: ${money(receipt.imssSubsidy)} (lo paga el IMSS, informativo)`, PAGE.margin, bTop - bH - 14, { size: 8, color: COLORS.muted }))
  }

  ops.push(line(PAGE.margin, 40, PAGE.width - PAGE.margin, 40, COLORS.line))
  ops.push(text('Nexus CRM | Recibo generado automaticamente. Calculo aproximado, no sustituye el timbrado fiscal oficial.', PAGE.margin, 24, { size: 7.5, color: COLORS.muted }))

  return ops
}

function buildPdf(ops) {
  const stream = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadPayrollPdf(receipt, payroll) {
  const url = URL.createObjectURL(buildPdf(buildReceipt(receipt, payroll)))
  const link = document.createElement('a')
  link.href = url
  link.download = `recibo-${escapeFileName(payroll.folio)}-${escapeFileName(receipt.employeeName)}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
