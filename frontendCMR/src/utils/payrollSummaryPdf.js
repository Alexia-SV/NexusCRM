// Resumen de una nomina por periodo en PDF (tabla de recibos + totales),
// generado en el navegador sin dependencias externas. Soporta varias paginas.

const PAGE = { width: 612, height: 792, margin: 46 }
const COLORS = {
  ink: '15 23 42',
  muted: '100 116 139',
  line: '203 213 225',
  head: '241 245 249',
  navy: '15 23 42',
  sky: '2 132 199',
  rose: '190 18 60',
  green: '5 150 105',
}

const statusLabels = { BORRADOR: 'Borrador', EN_PROCESO: 'En proceso', PAGADA: 'Pagada', CANCELADA: 'Cancelada' }
const periodLabels = { SEMANAL: 'Semanal', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual' }

// Columnas: right = borde derecho para montos alineados a la derecha.
const COLS = [
  { key: 'employeeName', label: 'Empleado', x: 52 },
  { key: 'days', label: 'Dias/Faltas', right: 232 },
  { key: 'baseSalary', label: 'Salario', right: 292, money: true },
  { key: 'extraPerceptions', label: 'Extras', right: 350, money: true },
  { key: 'totalDeductions', label: 'Deducc.', right: 414, money: true },
  { key: 'netPay', label: 'Neto', right: 486, money: true },
  { key: 'patronTotal', label: 'Costo pat.', right: 566, money: true },
]

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
  return String(value || 'nomina')
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
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function clip(value, max) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}.` : text
}

function rgb(color) {
  return color.split(' ').map((part) => Number(part) / 255).join(' ')
}

function fillRect(x, y, width, height, color) {
  return `q ${rgb(color)} rg ${x} ${y} ${width} ${height} re f Q`
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

// Texto alineado a la derecha respecto de `right`.
function rightText(content, right, y, options = {}) {
  const size = options.size || 9
  const width = String(content).length * size * 0.52
  return text(content, right - width, y, options)
}

function drawTableHead(ops, y) {
  ops.push(fillRect(PAGE.margin, y - 6, PAGE.width - PAGE.margin * 2, 20, COLORS.head))
  for (const col of COLS) {
    if (col.x != null) ops.push(text(col.label, col.x, y, { size: 8, bold: true, color: COLORS.muted }))
    else ops.push(rightText(col.label, col.right, y, { size: 8, bold: true, color: COLORS.muted }))
  }
  return y - 22
}

function drawRow(ops, receipt, y) {
  ops.push(text(clip(receipt.employeeName, 27), COLS[0].x, y, { size: 8.5, color: COLORS.ink }))
  ops.push(text(clip(`${receipt.position || ''} / ${receipt.department || ''}`, 34), COLS[0].x, y - 9, { size: 6.8, color: COLORS.muted }))
  ops.push(rightText(`${receipt.workedDays}/${receipt.absentDays || 0}`, COLS[1].right, y, { size: 8.5, color: receipt.absentDays ? COLORS.rose : COLORS.ink }))
  for (const col of COLS.slice(2)) {
    const color = col.key === 'netPay' ? COLORS.ink : col.key === 'totalDeductions' ? COLORS.rose : col.key === 'patronTotal' ? COLORS.sky : COLORS.ink
    ops.push(rightText(money(receipt[col.key]), col.right, y, { size: 8.5, bold: col.key === 'netPay', color }))
  }
  const detail = `IMSS ${money(receipt.imssTotal)} | ISR ${money(receipt.isrWithholding)} | INFONAVIT ${money(receipt.infonavit)} | AFORE RCV ${money(receipt.rcvAforeTotal)}`
  ops.push(text(detail, COLS[1].right + 12, y - 9, { size: 6.8, color: COLORS.muted }))
  ops.push(line(PAGE.margin, y - 14, PAGE.width - PAGE.margin, y - 14, COLORS.line, 0.4))
}

function firstHeader(ops, payroll) {
  ops.push(fillRect(0, 700, PAGE.width, 92, COLORS.navy))
  ops.push(fillRect(0, 696, PAGE.width, 4, COLORS.sky))
  ops.push(text('Nexus CRM', PAGE.margin, 754, { size: 11, bold: true, color: '226 232 240' }))
  ops.push(text('Resumen de nomina', PAGE.margin, 729, { size: 23, bold: true, color: '255 255 255' }))
  ops.push(text(`${payroll.folio}  -  ${periodLabels[payroll.periodType] || ''}  -  ${statusLabels[payroll.status] || ''}`, PAGE.margin, 710, { size: 11, color: '226 232 240' }))

  let y = 666
  ops.push(text(`Periodo: ${dateText(payroll.periodStart)} al ${dateText(payroll.periodEnd)}   |   Pago: ${dateText(payroll.paymentDate)}   |   Recibos: ${payroll.receipts.length}`, PAGE.margin, y, { size: 9, color: COLORS.muted }))
  y -= 14
  ops.push(text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, PAGE.margin, y, { size: 9, color: COLORS.muted }))
  return y - 22
}

function continuationHeader(ops, payroll) {
  ops.push(fillRect(0, 752, PAGE.width, 40, COLORS.navy))
  ops.push(text(`Nexus CRM  -  Resumen de nomina ${payroll.folio} (continuacion)`, PAGE.margin, 766, { size: 10, bold: true, color: '255 255 255' }))
  return 726
}

function buildSummaryPages(payroll) {
  const pages = []
  let ops = []

  let y = firstHeader(ops, payroll)
  y = drawTableHead(ops, y)

  for (const receipt of payroll.receipts) {
    if (y < 96) {
      pages.push(ops)
      ops = []
      y = continuationHeader(ops, payroll)
      y = drawTableHead(ops, y)
    }
    drawRow(ops, receipt, y)
    y -= 27
  }

  if (y < 96) { pages.push(ops); ops = []; y = continuationHeader(ops, payroll); y = drawTableHead(ops, y) }

  // Totales
  y -= 6
  ops.push(fillRect(PAGE.margin, y - 8, PAGE.width - PAGE.margin * 2, 24, COLORS.navy))
  ops.push(text('TOTALES', COLS[0].x, y, { size: 9, bold: true, color: '255 255 255' }))
  ops.push(rightText(money(payroll.totalGross), COLS[2].right, y, { size: 9, bold: true, color: '255 255 255' }))
  ops.push(rightText(money(payroll.totalDeductions), COLS[4].right, y, { size: 9, bold: true, color: '186 230 253' }))
  ops.push(rightText(money(payroll.totalNet), COLS[5].right, y, { size: 9, bold: true, color: '255 255 255' }))
  ops.push(rightText(money(payroll.totalEmployerCost), COLS[6].right, y, { size: 9, bold: true, color: '186 230 253' }))

  y -= 26
  ops.push(text(`Costo patronal de la corrida (aportaciones del empleador, no afectan el neto): ${money(payroll.totalEmployerCost)}`, PAGE.margin, y, { size: 8.5, color: COLORS.muted }))

  pages.push(ops)
  return pages
}

function buildPdf(pages) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((page, index) => {
    const footer = [
      line(PAGE.margin, 40, PAGE.width - PAGE.margin, 40, COLORS.line),
      text('Nexus CRM | Resumen generado automaticamente. Calculo aproximado, no sustituye el timbrado fiscal oficial.', PAGE.margin, 24, { size: 7.5, color: COLORS.muted }),
      text(`Pagina ${index + 1} de ${pages.length}`, PAGE.width - PAGE.margin - 58, 24, { size: 7.5, color: COLORS.muted }),
    ]
    const stream = [...page, ...footer].join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${4 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

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

export function downloadPayrollSummaryPdf(payroll) {
  const url = URL.createObjectURL(buildPdf(buildSummaryPages(payroll)))
  const link = document.createElement('a')
  link.href = url
  link.download = `nomina-${escapeFileName(payroll.folio)}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
