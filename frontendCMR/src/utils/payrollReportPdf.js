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
  { key: 'payrolls', label: 'Nominas', right: 386, int: true },
  { key: 'receipts', label: 'Recibos', right: 452, int: true },
  { key: 'totalGross', label: 'Percepciones', right: 560, money: true },
  { key: 'totalDeductions', label: 'Deducciones', right: 640, money: true },
  { key: 'totalNet', label: 'Neto', right: 700, money: true },
  { key: 'totalEmployerCost', label: 'Costo patronal', right: 746, money: true },
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

function drawHead(ops, y) {
  ops.push(fillRect(PAGE.margin, y - 6, PAGE.width - PAGE.margin * 2, 20, COLORS.head))
  for (const col of COLS) {
    if (col.x != null) ops.push(text(col.label, col.x, y, { size: 8.5, bold: true, color: COLORS.muted }))
    else ops.push(rightText(col.label, col.right, y, { size: 8.5, bold: true, color: COLORS.muted }))
  }
  return y - 22
}

function drawRow(ops, row, y) {
  ops.push(text(clip(row.label, 40), COLS[0].x, y, { size: 9, color: COLORS.ink }))
  for (const col of COLS.slice(1)) {
    const color = col.key === 'totalDeductions' ? COLORS.muted : col.key === 'totalEmployerCost' ? COLORS.violet : COLORS.ink
    ops.push(rightText(cellValue(col, row), col.right, y, { size: 9, bold: col.key === 'totalNet', color }))
  }
  ops.push(line(PAGE.margin, y - 6, PAGE.width - PAGE.margin, y - 6, COLORS.line, 0.4))
}

function header(ops, report, criterio) {
  ops.push(fillRect(0, PAGE.height - 74, PAGE.width, 74, COLORS.navy))
  ops.push(fillRect(0, PAGE.height - 78, PAGE.width, 4, COLORS.sky))
  ops.push(text('Nexus CRM', PAGE.margin, PAGE.height - 30, { size: 11, bold: true, color: '226 232 240' }))
  ops.push(text(`Reporte de nomina - ${criterio}`, PAGE.margin, PAGE.height - 52, { size: 20, bold: true, color: '255 255 255' }))
  ops.push(text(`Anio: ${report.year || 'Todos'}   |   Generado: ${new Date().toLocaleDateString('es-MX')}`, PAGE.width - PAGE.margin - 260, PAGE.height - 52, { size: 9, color: '226 232 240' }))
  return PAGE.height - 96
}

function buildPages(report, criterio) {
  const pages = []
  let ops = []
  let y = header(ops, report, criterio)
  y = drawHead(ops, y)

  for (const row of report.rows) {
    if (y < 70) {
      pages.push(ops); ops = []
      ops.push(fillRect(0, PAGE.height - 30, PAGE.width, 30, COLORS.navy))
      ops.push(text(`Nexus CRM - Reporte ${criterio} (continuacion)`, PAGE.margin, PAGE.height - 20, { size: 9, bold: true, color: '255 255 255' }))
      y = PAGE.height - 48
      y = drawHead(ops, y)
    }
    drawRow(ops, row, y)
    y -= 18
  }

  if (y < 70) { pages.push(ops); ops = []; y = PAGE.height - 60; y = drawHead(ops, y) }
  y -= 4
  ops.push(fillRect(PAGE.margin, y - 8, PAGE.width - PAGE.margin * 2, 24, COLORS.navy))
  ops.push(text('TOTALES', COLS[0].x, y, { size: 9, bold: true, color: '255 255 255' }))
  for (const col of COLS.slice(1)) ops.push(rightText(cellValue(col, report.totals), col.right, y, { size: 9, bold: true, color: col.key === 'totalEmployerCost' ? '221 214 254' : '255 255 255' }))
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
