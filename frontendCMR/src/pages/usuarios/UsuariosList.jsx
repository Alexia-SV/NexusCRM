import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { deactivateEmployee, listEmployees } from '../../services/employees'
import { getApiError } from '../../services/api'
import { downloadEmployeePdf } from '../../utils/employeePdf'

function StatusBadge({ active }) {
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Activo' : 'Inactivo'}</span>
}

function initials(employee) {
  return `${employee.firstName?.[0] || ''}${employee.paternalLastName?.[0] || ''}`.toUpperCase()
}

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return 'Sin registrar'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatMoney(value) {
  if (value == null || value === '') return 'Sin registrar'
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function Info({ label, value, wide = false }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function resolveMockUser(employee, usuarios) {
  const employeeEmails = [employee.institutionalEmail, employee.personalEmail, employee.user?.email].map(normalize).filter(Boolean)
  const byEmail = usuarios.find((user) => employeeEmails.includes(normalize(user.email)))
  if (byEmail) return byEmail

  const position = normalize(employee.position)
  const byPosition = usuarios.find((user) => position && position.includes(normalize(user.puesto)))
  if (byPosition) return byPosition

  const seed = String(employee.curp || employee.id || fullName(employee))
  const index = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0) % usuarios.length
  return usuarios[index] || usuarios[0]
}

function projectNameById(projects, projectId) {
  return projects.find((project) => project.id === Number(projectId))?.nombre || 'Sin proyecto'
}

const periodOptions = {
  '2weeks': { label: 'Ultimas 2 semanas', days: 14 },
  '5months': { label: 'Ultimos 5 meses', months: 5 },
  '1year': { label: 'Ultimo año', months: 12 },
  '3years': { label: 'Ultimos 3 años', months: 36 },
  all: { label: 'Todo el historial' },
}

function dateFromPeriod(period) {
  if (period === 'all') return null
  const option = periodOptions[period]
  const date = new Date()
  if (option.days) date.setDate(date.getDate() - option.days)
  if (option.months) date.setMonth(date.getMonth() - option.months)
  date.setHours(0, 0, 0, 0)
  return date
}

function inPeriod(value, period) {
  const cutoff = dateFromPeriod(period)
  if (!cutoff) return true
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date >= cutoff
}

function buildConsultationRecords({ employeeProjects, employeeQuotes, employeeNotes, flexibleRecords, formatMoney }) {
  const projectRecords = employeeProjects.map(({ project, involvement }) => ({
    id: `project-${project.id}`,
    category: 'proyectos',
    entity: 'proyecto',
    model: 'proyectos',
    title: project.nombre,
    date: project.fecha_inicio,
    status: project.status,
    amount: involvement.salario_asignado,
    summary: `Participo como ${involvement.rol}. Asignacion mensual: ${formatMoney(involvement.salario_asignado)}.`,
  }))

  const quoteRecords = employeeQuotes.map(({ quote, projectName }) => ({
    id: `quote-${quote.id}`,
    category: 'cotizaciones',
    entity: 'cotizacion',
    model: 'proyectos',
    title: quote.folio,
    date: quote.fecha,
    status: quote.status,
    amount: quote.monto,
    summary: `${projectName} - ${quote.cliente}. ${quote.concepto}.`,
  }))

  const noteRecords = employeeNotes.map(({ note, projectName }) => ({
    id: `note-${note.id}`,
    category: 'notas',
    entity: 'nota interna',
    model: 'proyectos',
    title: note.tipo,
    date: note.fecha,
    status: 'registrada',
    amount: null,
    summary: `${projectName} - ${note.contenido}`,
  }))

  const genericRecords = flexibleRecords.map((item) => ({
    id: `flex-${item.id}`,
    category: 'productos',
    entity: item.entidad,
    model: 'productos',
    title: item.entidad_nombre,
    date: item.fecha,
    status: item.estado,
    amount: item.monto,
    summary: item.descripcion,
  }))

  return [...projectRecords, ...quoteRecords, ...noteRecords, ...genericRecords]
}

function ConsultationPanel({ records }) {
  const [period, setPeriod] = useState('5months')
  const [category, setCategory] = useState('todos')
  const [model, setModel] = useState('todos')

  const filtered = records
    .filter((record) => category === 'todos' || record.category === category)
    .filter((record) => model === 'todos' || record.model === model)
    .filter((record) => inPeriod(record.date, period))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const total = filtered.reduce((acc, record) => acc + (Number(record.amount) || 0), 0)
  const models = [...new Set(filtered.map((record) => record.model))]

  return <section className="border-t border-slate-100 pt-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Consultas flexibles</h3>
        <p className="mt-1 text-sm text-slate-500">Filtra la actividad del usuario por rango de tiempo y tipo de entidad.</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Demo adaptable</span>
    </div>

    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periodo<select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="2weeks">Ultimas 2 semanas</option><option value="5months">Ultimos 5 meses</option><option value="1year">Ultimo año</option><option value="3years">Ultimos 3 años</option><option value="all">Todo el historial</option></select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de consulta<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="todos">Todo</option><option value="proyectos">Proyectos</option><option value="cotizaciones">Cotizaciones</option><option value="notas">Notas internas</option><option value="productos">Productos / servicios demo</option></select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modelo usado<select value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="todos">Cualquier modelo</option><option value="proyectos">Gestion por proyectos</option><option value="productos">Gestion por productos/servicios</option></select></label>
    </div>

    <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resultados</p><p className="mt-1 text-2xl font-bold text-slate-900">{filtered.length}</p></div>
      <div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monto relacionado</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(total)}</p></div>
      <div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modelos</p><p className="mt-1 text-sm font-semibold text-slate-700">{models.length ? models.join(', ') : 'Sin resultados'}</p></div>
    </div>

    {filtered.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No hay resultados para esta combinacion de filtros.</p> : <div className="space-y-3">{filtered.map((record) => <article key={record.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-800">{record.title}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{record.entity}</span></div><p className="mt-1 text-xs text-slate-500">{record.summary}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-400">{formatDate(record.date)}</p><p className="text-xs font-semibold text-slate-600">{record.status}</p>{record.amount != null && <p className="text-sm font-bold text-slate-800">{formatMoney(record.amount)}</p>}</div></div></article>)}</div>}
  </section>
}

function EmployeeModal({ employee, canWrite, onClose, onEdit, onDeactivate, usuarios, proyectos, cotizaciones, notasInternas, consultasFlexibles, crearNotaInterna }) {
  const [confirming, setConfirming] = useState(false)
  const [noteProjectId, setNoteProjectId] = useState('')
  const [noteType, setNoteType] = useState('Seguimiento')
  const [noteContent, setNoteContent] = useState('')

  const mockUser = resolveMockUser(employee, usuarios)
  const employeeProjects = proyectos
    .map((project) => ({
      project,
      involvement: project.involucrados.find((item) => item.empleado_id === mockUser?.id),
    }))
    .filter((item) => item.involvement)
  const projectIds = employeeProjects.map(({ project }) => project.id)
  const employeeQuotes = cotizaciones
    .filter((quote) => projectIds.includes(quote.proyecto_id))
    .map((quote) => ({ quote, projectName: projectNameById(proyectos, quote.proyecto_id) }))
  const employeeNotes = notasInternas
    .filter((note) => note.empleado_id === mockUser?.id)
    .map((note) => ({ note, projectName: projectNameById(proyectos, note.proyecto_id) }))
  const flexibleRecords = consultasFlexibles.filter((record) => record.empleado_id === mockUser?.id)
  const consultationRecords = buildConsultationRecords({
    employeeProjects,
    employeeQuotes,
    employeeNotes,
    flexibleRecords,
    formatMoney,
  })

  const downloadFile = () => {
    downloadEmployeePdf(employee, {
      employeeName: fullName(employee),
      formatDate,
      formatMoney,
      projects: employeeProjects,
      quotes: employeeQuotes,
      notes: employeeNotes,
    })
  }

  const addInternalNote = () => {
    const content = noteContent.trim()
    if (!content || !mockUser) return
    crearNotaInterna({
      empleado_id: mockUser.id,
      proyecto_id: noteProjectId ? Number(noteProjectId) : projectIds[0],
      tipo: noteType,
      contenido: content,
    })
    setNoteContent('')
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{initials(employee)}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 id="employee-modal-title" className="text-lg font-bold text-slate-900 sm:text-xl">{fullName(employee)}</h2><StatusBadge active={employee.active}/></div><p className="mt-1 text-sm text-slate-500">{employee.position} - {employee.department}</p></div>
        <button onClick={onClose} aria-label="Cerrar expediente" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Datos personales</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="CURP" value={employee.curp}/><Info label="RFC" value={employee.rfc}/><Info label="NSS / IMSS" value={employee.nss}/><Info label="Fecha de nacimiento" value={formatDate(employee.birthDate)}/><Info label="Sexo" value={employee.sex}/><Info label="Estado civil" value={employee.maritalStatus}/><Info label="Telefono" value={employee.phone}/><Info label="Correo personal" value={employee.personalEmail}/><Info label="Correo institucional" value={employee.institutionalEmail}/><Info label="Direccion" value={employee.address} wide/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Datos laborales y bancarios</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Puesto" value={employee.position}/><Info label="Area / departamento" value={employee.department}/><Info label="Fecha de ingreso" value={formatDate(employee.hireDate)}/><Info label="Tipo de contrato" value={employee.contractType}/><Info label="Salario diario" value={formatMoney(employee.dailySalary)}/><Info label="Salario integrado IMSS" value={formatMoney(employee.integratedImssSalary)}/><Info label="Banco" value={employee.bankName}/><Info label="CLABE" value={employee.clabe}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Acceso al sistema</h3>{employee.user ? <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Correo de acceso" value={employee.user.email}/><Info label="Rol" value={employee.user.role}/><Info label="Estado de cuenta" value={employee.user.active ? 'Activa' : 'Inactiva'}/><Info label="Cambio de contrasena" value={employee.user.mustChangePassword ? 'Pendiente' : 'Completado'}/></dl> : <p className="text-sm text-slate-500">Este empleado no tiene una cuenta de acceso.</p>}</section>

        <ConsultationPanel records={consultationRecords} />

        <section className="border-t border-slate-100 pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Proyectos relacionados</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Datos de prueba</span></div>{employeeProjects.length === 0 ? <p className="text-sm text-slate-500">Sin proyectos relacionados en los datos mock.</p> : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{employeeProjects.map(({ project, involvement }) => <article key={project.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-800">{project.nombre}</h4><p className="mt-1 text-xs text-slate-500">{project.objetivo}</p></div><span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">{project.status}</span></div><dl className="mt-3 grid grid-cols-2 gap-3"><Info label="Rol" value={involvement.rol}/><Info label="Asignado" value={formatMoney(involvement.salario_asignado)}/><Info label="Inicio" value={formatDate(project.fecha_inicio)}/><Info label="Fin" value={formatDate(project.fecha_fin)}/></dl></article>)}</div>}</section>

        <section className="border-t border-slate-100 pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Cotizaciones de esos proyectos</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Mockup temporal</span></div>{employeeQuotes.length === 0 ? <p className="text-sm text-slate-500">Sin cotizaciones mock relacionadas.</p> : <div className="space-y-3">{employeeQuotes.map(({ quote, projectName }) => <article key={quote.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="text-sm font-semibold text-slate-800">{quote.folio}</h4><p className="text-xs text-slate-500">{quote.concepto}</p></div><span className="text-sm font-bold text-slate-700">{formatMoney(quote.monto)}</span></div><p className="mt-2 text-xs text-slate-400">{projectName} - {quote.cliente} - {formatDate(quote.fecha)} - {quote.status}</p></article>)}</div>}</section>

        <section className="border-t border-slate-100 pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Notas internas hechas por el empleado</h3><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">Alta local de prueba</span></div><div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"><select value={noteProjectId} onChange={(event) => setNoteProjectId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Proyecto relacionado</option>{employeeProjects.map(({ project }) => <option key={project.id} value={project.id}>{project.nombre}</option>)}</select><select value={noteType} onChange={(event) => setNoteType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option>Seguimiento</option><option>Tecnica</option><option>Diseno</option><option>Direccion</option><option>Administrativa</option></select><button type="button" onClick={addInternalNote} disabled={!noteContent.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">Agregar</button></div><textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} rows={3} placeholder="Escribe una nota interna de prueba..." className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"/></div>{employeeNotes.length === 0 ? <p className="text-sm text-slate-500">Sin notas internas en los datos mock.</p> : <div className="space-y-3">{employeeNotes.map(({ note, projectName }) => <article key={note.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-700">{note.tipo}</span><span className="text-xs text-slate-400">{formatDate(note.fecha)}</span><span className="text-xs text-slate-400">{projectName}</span></div><p className="mt-2 text-sm text-slate-600">{note.contenido}</p></article>)}</div>}</section>
      </div>

      <footer className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
        {confirming ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Se desactivara el empleado, su usuario y sus sesiones. Continuar?</p><div className="flex gap-2"><button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={onDeactivate} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white">Confirmar</button></div></div> : <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end"><button onClick={downloadFile} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15v-15h-9l-6 6v9Zm6-15v6h-6"/></svg>Descargar PDF</button>{canWrite && !employee.isDemo && <button onClick={onEdit} className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">Editar</button>}{canWrite && employee.active && !employee.isDemo && <button onClick={() => setConfirming(true)} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">Desactivar</button>}</div>}
      </footer>
    </div>
  </div>
}

export default function UsuariosList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { usuarios, proyectos, cotizaciones, notasInternas, consultasFlexibles, crearNotaInterna } = useApp()
  const canWrite = can(permissions.usuariosWrite)
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const filters = { search: search || undefined, active: active || undefined }
      const apiEmployees = await listEmployees(filters)
      setEmployees(apiEmployees)
    }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible cargar los empleados.')) }
    finally { setLoading(false) }
  }, [search, active])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])

  const deactivate = async () => {
    try { await deactivateEmployee(selected.id); setSelected(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible desactivar al empleado.')) }
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-slate-900">Empleados</h1><p className="mt-1 text-sm text-slate-500">{employees.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/usuarios/nuevo')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">+ Nuevo empleado</button>}</div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, CURP, puesto o area..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"/><select value={active} onChange={(event) => setActive(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando empleados...</p> : employees.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron empleados.</p> : <table className="w-full min-w-[700px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-6 py-3 text-left text-xs text-slate-500">Empleado</th><th className="px-4 py-3 text-left text-xs text-slate-500">CURP</th><th className="px-4 py-3 text-left text-xs text-slate-500">Puesto / area</th><th className="px-4 py-3 text-left text-xs text-slate-500">Acceso</th><th className="px-4 py-3 text-left text-xs text-slate-500">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{employees.map((employee) => <tr key={employee.id} className="hover:bg-slate-50"><td className="px-6 py-4"><button onClick={() => setSelected(employee)} aria-label={`Ver expediente de ${fullName(employee)}`} className="group flex items-center gap-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 ring-sky-200 transition group-hover:ring-4">{initials(employee)}</span><span><span className="block text-sm font-semibold text-slate-800 group-hover:text-sky-700">{fullName(employee)}</span><span className="block text-xs text-slate-400">{employee.institutionalEmail || employee.personalEmail || 'Sin correo'}</span></span></button></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{employee.curp}</td><td className="px-4 py-4"><p className="text-sm text-slate-700">{employee.position}</p><p className="text-xs text-slate-400">{employee.department}</p></td><td className="px-4 py-4 text-xs text-slate-500">{employee.user ? `${employee.user.role} - ${employee.user.active ? 'activo' : 'inactivo'}` : 'Sin usuario'}</td><td className="px-4 py-4"><StatusBadge active={employee.active}/></td></tr>)}</tbody></table>}</div>
    {selected && <EmployeeModal employee={selected} canWrite={canWrite} onClose={() => setSelected(null)} onEdit={() => navigate(`/usuarios/editar/${selected.id}`)} onDeactivate={deactivate} usuarios={usuarios} proyectos={proyectos} cotizaciones={cotizaciones} notasInternas={notasInternas} consultasFlexibles={consultasFlexibles} crearNotaInterna={crearNotaInterna}/>}
  </div>
}
