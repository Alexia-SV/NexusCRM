const PAGE = { width: 612, height: 792, margin: 46 }
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
const COLORS = {
  ink: '15 23 42',
  muted: '100 116 139',
  line: '203 213 225',
  panel: '248 250 252',
  navy: '15 23 42',
  sky: '2 132 199',
  skySoft: '224 242 254',
  amberSoft: '254 243 199',
  greenSoft: '220 252 231',
}

function toText(value) {
  if (value == null || value === '') return 'Sin registrar'
  return String(value)
}

function toPdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function escapeFileName(value) {
  return String(value || 'empleado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function wrapLine(text, limit = 72) {
  const words = normalizeText(text).split(/\s+/)
  const lines = []
  let line = ''

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (next.length > limit && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })

  if (line) lines.push(line)
  return lines.length ? lines : ['']
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

function statusColor(status) {
  const normalized = normalizeText(status).toLowerCase()
  if (['activo', 'aprobada', 'cerrada', 'completado'].includes(normalized)) return COLORS.greenSoft
  if (['planificacion', 'en revision', 'enviada'].includes(normalized)) return COLORS.amberSoft
  return COLORS.skySoft
}

function employeeInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NC'
}

function createWriter(employeeName) {
  const pages = []
  let ops = []
  let y = 0

  const addHeader = () => {
    ops.push(fillRect(0, 700, PAGE.width, 92, COLORS.navy))
    ops.push(fillRect(0, 696, PAGE.width, 4, COLORS.sky))
    ops.push(text('Nexus CRM', PAGE.margin, 754, { size: 11, color: '226 232 240', bold: true }))
    ops.push(text('Expediente de empleado', PAGE.margin, 729, { size: 24, color: '255 255 255', bold: true }))
    ops.push(text(employeeName, PAGE.margin, 710, { size: 12, color: '226 232 240' }))
    ops.push(fillRect(502, 725, 54, 54, COLORS.sky))
    ops.push(text(employeeInitials(employeeName), 517, 746, { size: 17, color: '255 255 255', bold: true }))
    y = 664
  }

  const addPage = () => {
    if (ops.length) pages.push(ops)
    ops = []
    addHeader()
  }

  const ensure = (height) => {
    if (y - height < 58) addPage()
  }

  addPage()

  return {
    pages,
    get y() {
      return y
    },
    set y(value) {
      y = value
    },
    ops,
    addPage,
    ensure,
    push(command) {
      ops.push(command)
    },
    finish() {
      pages.push(ops)
      return pages
    },
  }
}

function section(writer, title) {
  writer.ensure(44)
  writer.push(fillRect(PAGE.margin, writer.y - 6, 5, 22, COLORS.sky))
  writer.push(text(title, PAGE.margin + 14, writer.y, { size: 14, bold: true, color: COLORS.ink }))
  writer.push(line(PAGE.margin, writer.y - 14, PAGE.width - PAGE.margin, writer.y - 14, COLORS.line))
  writer.y -= 34
}

function drawField(writer, field, x, y, width) {
  writer.push(text(field.label.toUpperCase(), x, y, { size: 7.5, bold: true, color: COLORS.muted }))
  const valueLines = wrapLine(toText(field.value), Math.floor(width / 5.4))
  valueLines.slice(0, 3).forEach((lineText, index) => {
    writer.push(text(lineText, x, y - 13 - index * 11, { size: 9.5, color: COLORS.ink }))
  })
  return 18 + valueLines.slice(0, 3).length * 11
}

function fieldsGrid(writer, fields) {
  const gap = 18
  const columnWidth = (CONTENT_WIDTH - gap) / 2
  let index = 0

  while (index < fields.length) {
    const first = fields[index]
    const second = first.wide ? null : fields[index + 1]
    const firstHeight = 30 + wrapLine(toText(first.value), first.wide ? 96 : 45).slice(0, 3).length * 11
    const secondHeight = second ? 30 + wrapLine(toText(second.value), 45).slice(0, 3).length * 11 : 0
    const rowHeight = Math.max(firstHeight, secondHeight, 42)

    writer.ensure(rowHeight)
    const x = PAGE.margin
    const width = first.wide ? CONTENT_WIDTH : columnWidth
    drawField(writer, first, x, writer.y, width)
    if (second) drawField(writer, second, x + columnWidth + gap, writer.y, columnWidth)
    writer.y -= rowHeight
    index += first.wide ? 1 : 2
  }
}

function card(writer, height, draw) {
  writer.ensure(height + 12)
  writer.push(fillRect(PAGE.margin, writer.y - height + 10, CONTENT_WIDTH, height, COLORS.panel))
  writer.push(strokeRect(PAGE.margin, writer.y - height + 10, CONTENT_WIDTH, height, COLORS.line))
  draw(PAGE.margin + 16, writer.y - 10)
  writer.y -= height + 12
}

function projectCard(writer, item, formatDate, formatMoney) {
  const { project, involvement } = item
  const objectiveLines = wrapLine(project.objetivo, 78).slice(0, 2)
  const height = 84 + objectiveLines.length * 11
  card(writer, height, (x, top) => {
    writer.push(text(project.nombre, x, top, { size: 12, bold: true }))
    writer.push(fillRect(PAGE.width - PAGE.margin - 82, top - 5, 66, 18, statusColor(project.status)))
    writer.push(text(project.status, PAGE.width - PAGE.margin - 74, top, { size: 8, bold: true, color: COLORS.ink }))
    objectiveLines.forEach((lineText, index) => writer.push(text(lineText, x, top - 18 - index * 11, { size: 9, color: COLORS.muted })))
    const metaY = top - 47
    writer.push(text('ROL', x, metaY, { size: 7.5, bold: true, color: COLORS.muted }))
    writer.push(text(involvement.rol, x, metaY - 13, { size: 9.5 }))
    writer.push(text('ASIGNADO', x + 130, metaY, { size: 7.5, bold: true, color: COLORS.muted }))
    writer.push(text(formatMoney(involvement.salario_asignado), x + 130, metaY - 13, { size: 9.5 }))
    writer.push(text('PERIODO', x + 290, metaY, { size: 7.5, bold: true, color: COLORS.muted }))
    writer.push(text(`${formatDate(project.fecha_inicio)} - ${formatDate(project.fecha_fin)}`, x + 290, metaY - 13, { size: 9.5 }))
  })
}

function quoteCard(writer, item, formatDate, formatMoney) {
  const { quote, projectName } = item
  const conceptLines = wrapLine(`${quote.cliente} | ${quote.concepto}`, 78).slice(0, 2)
  const height = 70 + conceptLines.length * 11
  card(writer, height, (x, top) => {
    writer.push(text(quote.folio, x, top, { size: 11.5, bold: true }))
    writer.push(text(formatMoney(quote.monto), PAGE.width - PAGE.margin - 120, top, { size: 11, bold: true, color: COLORS.sky }))
    writer.push(text(projectName, x, top - 17, { size: 9, color: COLORS.muted }))
    conceptLines.forEach((lineText, index) => writer.push(text(lineText, x, top - 32 - index * 11, { size: 9.2 })))
    writer.push(text(`${formatDate(quote.fecha)} | ${quote.status}`, x, top - 58, { size: 8.5, color: COLORS.muted }))
  })
}

function noteCard(writer, item, formatDate) {
  const { note, projectName } = item
  const noteLines = wrapLine(note.contenido, 82).slice(0, 4)
  const height = 58 + noteLines.length * 11
  card(writer, height, (x, top) => {
    writer.push(text(`${formatDate(note.fecha)} | ${note.tipo}`, x, top, { size: 10, bold: true }))
    writer.push(text(projectName, x, top - 15, { size: 8.8, color: COLORS.muted }))
    noteLines.forEach((lineText, index) => writer.push(text(lineText, x, top - 32 - index * 11, { size: 9.2 })))
  })
}

function emptyState(writer, message) {
  card(writer, 48, (x, top) => {
    writer.push(text(message, x, top - 5, { size: 9.5, color: COLORS.muted }))
  })
}

function buildDocument(employee, details) {
  const { employeeName, formatDate, formatMoney, projects, quotes, notes } = details
  const writer = createWriter(employeeName)

  writer.push(text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, PAGE.margin, writer.y, { size: 9, color: COLORS.muted }))
  writer.push(text(`Estatus: ${employee.active ? 'Activo' : 'Inactivo'}`, PAGE.width - PAGE.margin - 100, writer.y, { size: 9, bold: true, color: COLORS.sky }))
  writer.y -= 34

  section(writer, 'Datos personales')
  fieldsGrid(writer, [
    { label: 'CURP', value: employee.curp },
    { label: 'RFC', value: employee.rfc },
    { label: 'NSS / IMSS', value: employee.nss },
    { label: 'Fecha de nacimiento', value: formatDate(employee.birthDate) },
    { label: 'Sexo', value: employee.sex },
    { label: 'Estado civil', value: employee.maritalStatus },
    { label: 'Telefono', value: employee.phone },
    { label: 'Correo personal', value: employee.personalEmail },
    { label: 'Correo institucional', value: employee.institutionalEmail },
    { label: 'Direccion', value: employee.address, wide: true },
  ])

  section(writer, 'Datos laborales y bancarios')
  fieldsGrid(writer, [
    { label: 'Puesto', value: employee.position },
    { label: 'Area / departamento', value: employee.department },
    { label: 'Fecha de ingreso', value: formatDate(employee.hireDate) },
    { label: 'Tipo de contrato', value: employee.contractType },
    { label: 'Salario diario', value: formatMoney(employee.dailySalary) },
    { label: 'Salario integrado IMSS', value: formatMoney(employee.integratedImssSalary) },
    { label: 'Banco', value: employee.bankName },
    { label: 'CLABE', value: employee.clabe },
  ])

  section(writer, 'Acceso al sistema')
  fieldsGrid(writer, employee.user ? [
    { label: 'Correo de acceso', value: employee.user.email },
    { label: 'Rol', value: employee.user.role },
    { label: 'Estado de cuenta', value: employee.user.active ? 'Activa' : 'Inactiva' },
    { label: 'Cambio de contrasena', value: employee.user.mustChangePassword ? 'Pendiente' : 'Completado' },
  ] : [{ label: 'Cuenta', value: 'Este empleado no tiene una cuenta de acceso.', wide: true }])

  section(writer, 'Proyectos relacionados')
  if (!projects.length) emptyState(writer, 'Sin proyectos relacionados en los datos de prueba.')
  projects.forEach((item) => projectCard(writer, item, formatDate, formatMoney))

  section(writer, 'Cotizaciones de los proyectos')
  if (!quotes.length) emptyState(writer, 'Sin cotizaciones mock relacionadas.')
  quotes.forEach((item) => quoteCard(writer, item, formatDate, formatMoney))

  section(writer, 'Notas internas hechas por el empleado')
  if (!notes.length) emptyState(writer, 'Sin notas internas en los datos de prueba.')
  notes.forEach((item) => noteCard(writer, item, formatDate))

  return writer.finish()
}

function buildPdf(pages) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 2
    const contentObjectNumber = pageObjectNumber + 1
    const footer = [
      line(PAGE.margin, 40, PAGE.width - PAGE.margin, 40, COLORS.line),
      text('Nexus CRM | Expediente generado automaticamente', PAGE.margin, 24, { size: 8, color: COLORS.muted }),
      text(`Pagina ${index + 1} de ${pages.length}`, PAGE.width - PAGE.margin - 58, 24, { size: 8, color: COLORS.muted }),
    ]
    const stream = [...page, ...footer].join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function buildEmployeePdfBlob(employee, details) {
  return buildPdf(buildDocument(employee, details))
}

export function downloadEmployeePdf(employee, details) {
  const url = URL.createObjectURL(buildEmployeePdfBlob(employee, details))
  const link = document.createElement('a')
  link.href = url
  link.download = `expediente-${escapeFileName(employee.curp || details.employeeName)}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
