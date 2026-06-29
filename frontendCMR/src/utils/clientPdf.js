function clean(value) {
  return String(value ?? 'Sin registrar')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function fileName(value) {
  return clean(value)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function wrap(text, limit = 88) {
  const words = clean(text).split(/\s+/)
  const lines = []
  let line = ''
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (next.length > limit && line) {
      lines.push(line)
      line = word
    } else line = next
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function text(value, x, y, size = 10, bold = false, color = '15 23 42') {
  const rgb = color.split(' ').map((part) => Number(part) / 255).join(' ')
  return `q ${rgb} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${clean(value)}) Tj ET Q`
}

function rect(x, y, w, h, color) {
  const rgb = color.split(' ').map((part) => Number(part) / 255).join(' ')
  return `q ${rgb} rg ${x} ${y} ${w} ${h} re f Q`
}

function line(x1, y1, x2, y2) {
  return `q 0.8 w 0.796 0.835 0.882 RG ${x1} ${y1} m ${x2} ${y2} l S Q`
}

function addSection(commands, state, title) {
  if (state.y < 110) newPage(commands, state)
  commands[state.page].push(rect(46, state.y - 5, 5, 20, '2 132 199'))
  commands[state.page].push(text(title, 60, state.y, 14, true))
  commands[state.page].push(line(46, state.y - 14, 566, state.y - 14))
  state.y -= 34
}

function addPair(commands, state, label, value, x, width) {
  commands[state.page].push(text(label.toUpperCase(), x, state.y, 7.5, true, '100 116 139'))
  wrap(value, Math.floor(width / 5.5)).slice(0, 2).forEach((row, index) => {
    commands[state.page].push(text(row, x, state.y - 13 - index * 11, 9.5))
  })
}

function addGrid(commands, state, fields) {
  for (let index = 0; index < fields.length; index += 2) {
    if (state.y < 88) newPage(commands, state)
    addPair(commands, state, fields[index].label, fields[index].value, 46, 240)
    if (fields[index + 1]) addPair(commands, state, fields[index + 1].label, fields[index + 1].value, 310, 240)
    state.y -= 46
  }
}

function addRecord(commands, state, record, formatDate, formatMoney) {
  if (state.y < 128) newPage(commands, state)
  commands[state.page].push(rect(46, state.y - 70, 520, 82, '248 250 252'))
  commands[state.page].push(text(record.title, 60, state.y - 10, 11, true))
  commands[state.page].push(text(record.category, 450, state.y - 10, 8, true, '2 132 199'))
  commands[state.page].push(text(`${formatDate(record.date)} | ${record.status}`, 60, state.y - 27, 8.5, false, '100 116 139'))
  wrap(record.summary, 82).slice(0, 2).forEach((row, index) => commands[state.page].push(text(row, 60, state.y - 44 - index * 11, 9)))
  if (record.amount != null) commands[state.page].push(text(formatMoney(record.amount), 450, state.y - 27, 9.5, true))
  state.y -= 96
}

function newPage(commands, state) {
  state.page += 1
  commands[state.page] = []
  commands[state.page].push(rect(0, 700, 612, 92, '15 23 42'))
  commands[state.page].push(rect(0, 696, 612, 4, '2 132 199'))
  commands[state.page].push(text('Nexus CRM', 46, 754, 11, true, '226 232 240'))
  commands[state.page].push(text('Expediente de cliente', 46, 729, 24, true, '255 255 255'))
  state.y = 664
}

function buildPdf(commands) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${commands.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${commands.length} >>`,
  ]
  commands.forEach((page, index) => {
    const stream = [
      ...page,
      line(46, 40, 566, 40),
      text('Nexus CRM | Expediente de cliente', 46, 24, 8, false, '100 116 139'),
      text(`Pagina ${index + 1} de ${commands.length}`, 508, 24, 8, false, '100 116 139'),
    ].join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${4 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadClientPdf(client, records, helpers) {
  const commands = []
  const state = { page: -1, y: 0 }
  newPage(commands, state)
  commands[0].push(text(client.razon_social, 46, 710, 12, false, '226 232 240'))
  commands[0].push(text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 46, state.y, 9, false, '100 116 139'))
  state.y -= 34

  addSection(commands, state, 'Identificacion fiscal')
  addGrid(commands, state, [
    { label: 'ID cliente', value: client.id },
    { label: 'Razon social', value: client.razon_social },
    { label: 'RFC', value: client.rfc },
    { label: 'Tipo de persona', value: client.tipo_persona },
    { label: 'Regimen fiscal', value: client.regimen_fiscal },
    { label: 'Apellido paterno', value: client.tipo_persona === 'fisica' ? client.apellido_paterno : 'No aplica' },
    { label: 'Apellido materno', value: client.tipo_persona === 'fisica' ? client.apellido_materno : 'No aplica' },
    { label: 'CURP', value: client.curp || 'Solo persona fisica' },
  ])
  addSection(commands, state, 'Contacto y ubicacion')
  addGrid(commands, state, [
    { label: 'Contacto', value: client.contacto },
    { label: 'Telefono', value: client.telefono },
    { label: 'Correo', value: client.email },
    { label: 'Direccion / calle', value: client.direccion },
    { label: 'Colonia', value: client.colonia },
    { label: 'Codigo postal', value: client.codigo_postal },
    { label: 'Ciudad', value: client.ciudad },
    { label: 'Estado', value: client.estado_ubicacion },
  ])
  addSection(commands, state, 'Control interno')
  addGrid(commands, state, [
    { label: 'Estado', value: client.status },
    { label: 'Fecha de registro', value: helpers.formatDate(client.fecha_registro) },
    { label: 'Ultima actualizacion', value: helpers.formatDate(client.ultima_actualizacion) },
    { label: 'Registrado por', value: client.registrado_por },
    { label: 'Notas internas', value: client.notas_internas },
  ])
  addSection(commands, state, 'Propuesta del equipo')
  addGrid(commands, state, [
    { label: 'Segmento', value: client.segmento },
    { label: 'Origen', value: client.origen_cliente },
    { label: 'Prioridad', value: client.prioridad },
    { label: 'Ejecutivo asignado', value: client.ejecutivo_asignado },
    { label: 'Limite de credito', value: client.limite_credito ? helpers.formatMoney(client.limite_credito) : 'Sin registrar' },
    { label: 'Condiciones de pago', value: client.condiciones_pago },
  ])
  addSection(commands, state, 'Consultas relacionadas')
  records.forEach((record) => addRecord(commands, state, record, helpers.formatDate, helpers.formatMoney))

  const url = URL.createObjectURL(buildPdf(commands))
  const link = document.createElement('a')
  link.href = url
  link.download = `expediente-cliente-${fileName(client.rfc || client.razon_social)}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
