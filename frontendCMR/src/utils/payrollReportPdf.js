// Reporte de nomina (mensual/bimestral/anual) en PDF horizontal, multipagina,
// generado en el navegador sin dependencias externas.

const PAGE = { width: 792, height: 612, margin: 46 }
const COLORS = {
  ink: '15 23 42',
  muted: '100 116 139',
  line: '203 213 225',
  head: '241 245 249',
  navy: '15 23 42',
  sky: '2 132 199',
  violet: '124 58 237',
}

const COLS = [
  { key: 'label', label: 'Periodo', x: 52 },
  { key: 'payrolls', label: 'Nominas', right: 310, int: true },
  { key: 'receipts', label: 'Recibos', right: 360, int: true },
  { key: 'totalGross', label: 'Percepciones', right: 470, money: true },
  { key: 'totalDeductions', label: 'Deducciones', right: 570, money: true },
  { key: 'totalNet', label: 'Neto', right: 650, money: true },
  { key: 'totalEmployerCost', label: 'Costo patronal', right: 746, money: true },
]

const EMPLOYEE_COLS = [
  { key: 'employeeName', label: 'Empleado', x: 52 },
  { key: 'receipts', label: 'Recibos', right: 300, int: true },
  { key: 'workedDays', label: 'Dias', right: 356, int: true },
  { key: 'absentDays', label: 'Faltas', right: 410, int: true },
  { key: 'totalGross', label: 'Percepciones', right: 510, money: true },
  { key: 'totalDeductions', label: 'Deducciones', right: 604, money: true },
  { key: 'totalNet', label: 'Neto', right: 674, money: true },
  { key: 'totalCompanyCost', label: 'Costo empresa', right: 746, money: true },
]

const INCIDENT_COLS = [
  { key: 'employeeName', label: 'Empleado', x: 52 },
  { key: 'incidentType', label: 'Incidencia', x: 205 },
  { key: 'incidentDetail', label: 'Detalle', x: 300 },
  { key: 'folio', label: 'Nomina', x: 470 },
  { key: 'absentDays', label: 'Faltas', right: 585, int: true },
  { key: 'disabilityDays', label: 'Incap.', right: 625, int: true },
  { key: 'extraPerceptions', label: 'Extras', right: 685, money: true },
  { key: 'netPay', label: 'Neto', right: 746, money: true },
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

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function rightText(content, right, y, options = {}) {
  const size = options.size || 9
  const width = String(content).length * size * 0.52
  return text(content, right - width, y, options)
}

function cellValue(col, row) {
  if (col.money) return money(row[col.key])
  return String(row[col.key])
}

function drawHead(ops, y, cols) {
  ops.push(fillRect(PAGE.margin, y - 6, PAGE.width - PAGE.margin * 2, 20, COLORS.head))
  for (const col of cols) {
    if (col.x != null) ops.push(text(col.label, col.x, y, { size: 8.5, bold: true, color: COLORS.muted }))
    else ops.push(rightText(col.label, col.right, y, { size: 8.5, bold: true, color: COLORS.muted }))
  }
  return y - 22
}

function drawRow(ops, row, y, cols) {
  const first = cols[0]
  ops.push(text(clip(row[first.key], 30), first.x, y, { size: 8.4, color: COLORS.ink }))
  if (row.position || row.department) ops.push(text(clip(`${row.position || ''} / ${row.department || ''}`, 36), first.x, y - 9, { size: 6.5, color: COLORS.muted }))
  for (const col of cols.slice(1)) {
    const color = col.key === 'totalDeductions' || col.key === 'otherDeductions' ? COLORS.muted : col.key === 'totalEmployerCost' || col.key === 'totalCompanyCost' ? COLORS.violet : COLORS.ink
    if (col.x != null) ops.push(text(clip(cellValue(col, row), col.key === 'incidentDetail' ? 28 : 18), col.x, y, { size: 7.8, color }))
    else ops.push(rightText(cellValue(col, row), col.right, y, { size: 8, bold: col.key === 'totalNet' || col.key === 'netPay' || col.key === 'totalCompanyCost', color }))
  }
  ops.push(line(PAGE.margin, y - 12, PAGE.width - PAGE.margin, y - 12, COLORS.line, 0.4))
}

function header(ops, report, criterio) {
  ops.push(fillRect(0, PAGE.height - 96, PAGE.width, 96, COLORS.navy))
  ops.push(fillRect(0, PAGE.height - 100, PAGE.width, 4, COLORS.sky))
  ops.push(text('Nexus CRM', PAGE.margin, PAGE.height - 28, { size: 11, bold: true, color: '226 232 240' }))
  ops.push(text('Reporte de nomina', PAGE.margin, PAGE.height - 52, { size: 19, bold: true, color: '255 255 255' }))
  ops.push(text(clip(criterio, 74), PAGE.margin, PAGE.height - 75, { size: 10, bold: true, color: '226 232 240' }))
  ops.push(text(`Anio: ${report.year || 'Todos'} | Generado: ${new Date().toLocaleDateString('es-MX')}`, PAGE.width - PAGE.margin - 210, PAGE.height - 28, { size: 8.5, color: '226 232 240' }))
  return PAGE.height - 122
}

function reportView(report, criterio) {
  if (String(criterio).includes('Faltas')) {
    return { cols: INCIDENT_COLS, rows: report.incidentRows || [], totals: null }
  }
  if (String(criterio).includes('empleado') || String(criterio).includes('empresa')) {
    return { cols: EMPLOYEE_COLS, rows: report.employeeRows || [], totals: report.employeeTotals }
  }
  return { cols: COLS, rows: report.rows || [], totals: report.totals }
}

function buildPages(report, criterio) {
  const view = reportView(report, criterio)
  const pages = []
  let ops = []
  let y = header(ops, report, criterio)
  y = drawHead(ops, y, view.cols)

  for (const row of view.rows) {
    if (y < 70) {
      pages.push(ops); ops = []
      ops.push(fillRect(0, PAGE.height - 30, PAGE.width, 30, COLORS.navy))
      ops.push(text(`Nexus CRM - Reporte ${criterio} (continuacion)`, PAGE.margin, PAGE.height - 20, { size: 9, bold: true, color: '255 255 255' }))
      y = PAGE.height - 48
      y = drawHead(ops, y, view.cols)
    }
    drawRow(ops, row, y, view.cols)
    y -= row.position || row.department ? 25 : 18
  }

  if (view.totals) {
    if (y < 70) { pages.push(ops); ops = []; y = PAGE.height - 60; y = drawHead(ops, y, view.cols) }
    y -= 4
    ops.push(fillRect(PAGE.margin, y - 8, PAGE.width - PAGE.margin * 2, 24, COLORS.navy))
    ops.push(text('TOTALES', view.cols[0].x, y, { size: 9, bold: true, color: '255 255 255' }))
    for (const col of view.cols.slice(1)) {
      if (col.x == null) ops.push(rightText(cellValue(col, view.totals), col.right, y, { size: 9, bold: true, color: col.key === 'totalEmployerCost' || col.key === 'totalCompanyCost' ? '221 214 254' : '255 255 255' }))
    }
  }
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
      line(PAGE.margin, 34, PAGE.width - PAGE.margin, 34, COLORS.line),
      text('Nexus CRM | Reporte generado automaticamente. Los importes de costo patronal son informativos.', PAGE.margin, 20, { size: 7.5, color: COLORS.muted }),
      text(`Pagina ${index + 1} de ${pages.length}`, PAGE.width - PAGE.margin - 58, 20, { size: 7.5, color: COLORS.muted }),
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

export function downloadPayrollReportPdf(report, criterio) {
  const url = URL.createObjectURL(buildPdf(buildPages(report, criterio)))
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-nomina-${String(criterio).toLowerCase()}-${report.year || 'todos'}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
