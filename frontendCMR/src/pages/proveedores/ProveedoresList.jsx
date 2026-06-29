import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { permissions } from '../../auth/permissions'
import { downloadClientPdf } from '../../utils/clientPdf'

const statusConfig = {
  prospecto: { label: 'Prospecto', className: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-400' },
  activo: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  inactivo: { label: 'Inactivo', className: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  bloqueado: { label: 'Bloqueado', className: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
}

const periodOptions = {
  '2weeks': { days: 14 },
  '5months': { months: 5 },
  '1year': { months: 12 },
  '3years': { months: 36 },
  all: {},
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function statusLabel(status) {
  return statusConfig[status]?.label || statusConfig.inactivo.label
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.inactivo
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.className}`}><span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />{config.label}</span>
}

function TipoBadge({ tipo }) {
  return tipo === 'proveedor'
    ? <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Proveedor</span>
    : <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Cliente</span>
}

function Avatar({ nombre }) {
  const initials = nombre.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  const colors = ['bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700']
  const color = colors[nombre.charCodeAt(0) % colors.length]
  return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>{initials}</div>
}

function formatDate(value) {
  if (!value) return 'Sin registrar'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatMoney(value) {
  if (value == null || value === '') return 'Sin monto'
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
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

function enrichClient(client) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    tipo_persona: client.tipo_persona || 'moral',
    regimen_fiscal: client.regimen_fiscal || 'General de Ley Personas Morales',
    curp: client.curp || '',
    apellido_paterno: client.apellido_paterno || '',
    apellido_materno: client.apellido_materno || '',
    colonia: client.colonia || '',
    codigo_postal: client.codigo_postal || '',
    ciudad: client.ciudad || '',
    estado_ubicacion: client.estado_ubicacion || '',
    ciudad_estado: client.ciudad_estado || [client.ciudad, client.estado_ubicacion].filter(Boolean).join(', '),
    fecha_registro: client.fecha_registro || '2024-01-15',
    ultima_actualizacion: client.ultima_actualizacion || today,
    notas_internas: client.notas_internas || 'Sin notas internas registradas.',
    registrado_por: client.registrado_por || 'Administrador Nexus CRM',
    segmento: client.segmento || 'Sin clasificar',
    origen_cliente: client.origen_cliente || 'Sin registrar',
    prioridad: client.prioridad || 'media',
    ejecutivo_asignado: client.ejecutivo_asignado || 'Sin asignar',
    limite_credito: client.limite_credito || '',
    condiciones_pago: client.condiciones_pago || 'Sin definir',
    ...client,
  }
}

function buildClientRecords({ client, proyectos, cotizaciones }) {
  const clientName = normalize(client.razon_social)
  const quoteRecords = cotizaciones
    .filter((quote) => normalize(quote.cliente) === clientName)
    .map((quote) => {
      const project = proyectos.find((item) => item.id === quote.proyecto_id)
      return {
        id: `quote-${quote.id}`,
        category: 'cotizaciones',
        model: 'proyectos',
        title: quote.folio,
        date: quote.fecha,
        status: quote.status,
        amount: quote.monto,
        summary: `${project?.nombre || 'Sin proyecto'} - ${quote.concepto}`,
      }
    })

  const projectIds = new Set(quoteRecords.map((record) => {
    const quote = cotizaciones.find((item) => `quote-${item.id}` === record.id)
    return quote?.proyecto_id
  }))

  const projectRecords = proyectos
    .filter((project) => projectIds.has(project.id))
    .map((project) => ({
      id: `project-${project.id}`,
      category: 'proyectos',
      model: 'proyectos',
      title: project.nombre,
      date: project.fecha_inicio,
      status: project.status,
      amount: project.involucrados.reduce((acc, item) => acc + Number(item.salario_asignado || 0), 0),
      summary: project.objetivo,
    }))

  const genericRecords = [
    {
      id: `client-product-${client.id}`,
      category: 'productos',
      model: 'productos',
      title: client.tipo === 'cliente' ? 'Paquete comercial configurable' : 'Catalogo de proveedor',
      date: '2026-05-08',
      status: 'activo',
      amount: client.tipo === 'cliente' ? 54000 : 28500,
      summary: 'Registro demo para mostrar consultas por productos o servicios sin depender de proyectos.',
    },
    {
      id: `client-note-${client.id}`,
      category: 'notas',
      model: 'clientes',
      title: 'Seguimiento comercial',
      date: client.ultima_actualizacion || client.fecha_registro,
      status: 'registrada',
      amount: null,
      summary: client.notas_internas || 'Revision interna de relacion comercial y estado actual.',
    },
  ]

  return [...quoteRecords, ...projectRecords, ...genericRecords]
}

function Field({ label, value }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

function ClientConsultations({ records }) {
  const [period, setPeriod] = useState('5months')
  const [category, setCategory] = useState('todos')
  const [model, setModel] = useState('todos')
  const filtered = records
    .filter((record) => category === 'todos' || record.category === category)
    .filter((record) => model === 'todos' || record.model === model)
    .filter((record) => inPeriod(record.date, period))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const total = filtered.reduce((acc, record) => acc + (Number(record.amount) || 0), 0)

  return <section className="border-t border-slate-100 pt-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Consultas flexibles del cliente</h3><p className="mt-1 text-sm text-slate-500">Filtra proyectos, cotizaciones, productos o notas asociadas al cliente.</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Demo adaptable</span></div>
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periodo<select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="2weeks">Ultimas 2 semanas</option><option value="5months">Ultimos 5 meses</option><option value="1year">Ultimo año</option><option value="3years">Ultimos 3 años</option><option value="all">Todo el historial</option></select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de consulta<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="todos">Todo</option><option value="proyectos">Proyectos</option><option value="cotizaciones">Cotizaciones</option><option value="productos">Productos / servicios</option><option value="notas">Notas internas</option></select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modelo usado<select value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"><option value="todos">Cualquier modelo</option><option value="proyectos">Gestion por proyectos</option><option value="productos">Gestion por productos/servicios</option><option value="clientes">Control interno de cliente</option></select></label>
    </div>
    <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resultados</p><p className="mt-1 text-2xl font-bold text-slate-900">{filtered.length}</p></div><div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monto relacionado</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(total)}</p></div><div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Periodo</p><p className="mt-1 text-sm font-semibold text-slate-700">{period === 'all' ? 'Todo el historial' : period === '3years' ? 'Ultimos 3 años' : period === '1year' ? 'Ultimo año' : period === '5months' ? 'Ultimos 5 meses' : 'Ultimas 2 semanas'}</p></div></div>
    {filtered.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No hay resultados para esta combinacion.</p> : <div className="space-y-3">{filtered.map((record) => <article key={record.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-800">{record.title}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{record.category}</span></div><p className="mt-1 text-xs text-slate-500">{record.summary}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-400">{formatDate(record.date)}</p><p className="text-xs font-semibold text-slate-600">{record.status}</p>{record.amount != null && <p className="text-sm font-bold text-slate-800">{formatMoney(record.amount)}</p>}</div></div></article>)}</div>}
  </section>
}

function ClientModal({ rawClient, proyectos, cotizaciones, canWrite, onClose, onEdit, onSuspend }) {
  const client = enrichClient(rawClient)
  const records = useMemo(() => buildClientRecords({ client, proyectos, cotizaciones }), [client, proyectos, cotizaciones])
  const downloadFile = () => downloadClientPdf(client, records, { formatDate, formatMoney })

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6"><Avatar nombre={client.razon_social}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900 sm:text-xl">{client.razon_social}</h2><TipoBadge tipo={client.tipo}/><StatusBadge status={client.status}/></div><p className="mt-1 text-sm text-slate-500">{client.rfc} - {client.ciudad_estado || 'Ubicacion sin registrar'}</p></div><button onClick={onClose} aria-label="Cerrar expediente" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Identificacion fiscal</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="ID cliente" value={client.id}/><Field label="Razon social" value={client.razon_social}/><Field label="RFC" value={client.rfc}/><Field label="Tipo de persona" value={client.tipo_persona === 'fisica' ? 'Fisica' : 'Moral'}/><Field label="Regimen fiscal" value={client.regimen_fiscal}/><Field label="Apellido paterno" value={client.tipo_persona === 'fisica' ? client.apellido_paterno : 'No aplica'}/><Field label="Apellido materno" value={client.tipo_persona === 'fisica' ? client.apellido_materno : 'No aplica'}/><Field label="CURP" value={client.curp || (client.tipo_persona === 'fisica' ? '' : 'Solo persona fisica')}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Contacto y ubicacion</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Nombre de contacto" value={client.contacto}/><Field label="Telefono" value={client.telefono}/><Field label="Correo electronico" value={client.email}/><Field label="Direccion / calle" value={client.direccion}/><Field label="Colonia" value={client.colonia}/><Field label="Codigo postal" value={client.codigo_postal}/><Field label="Ciudad" value={client.ciudad}/><Field label="Estado" value={client.estado_ubicacion}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Control interno</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Estado" value={statusLabel(client.status)}/><Field label="Fecha de registro" value={formatDate(client.fecha_registro)}/><Field label="Ultima actualizacion" value={formatDate(client.ultima_actualizacion)}/><Field label="Registrado por" value={client.registrado_por}/><Field label="Notas internas" value={client.notas_internas}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Propuesta del equipo</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Segmento" value={client.segmento}/><Field label="Origen" value={client.origen_cliente}/><Field label="Prioridad" value={client.prioridad}/><Field label="Ejecutivo asignado" value={client.ejecutivo_asignado}/><Field label="Limite de credito" value={client.limite_credito ? formatMoney(client.limite_credito) : 'Sin registrar'}/><Field label="Condiciones de pago" value={client.condiciones_pago}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Estados posibles</h3><div className="flex flex-wrap gap-2"><StatusBadge status="prospecto"/><StatusBadge status="activo"/><StatusBadge status="inactivo"/><StatusBadge status="bloqueado"/></div><div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2"><p>Prospecto: cotizacion enviada, sin proyecto aun.</p><p>Activo: tiene al menos un proyecto en curso.</p><p>Inactivo: sin proyectos activos en 6 meses.</p><p>Bloqueado: problema de pago o conflicto.</p></div></section>
        <ClientConsultations records={records}/>
      </div>
      <footer className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          <button onClick={downloadFile} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15v-15h-9l-6 6v9Zm6-15v6h-6"/></svg>Descargar PDF</button>
          {canWrite && <button onClick={onEdit} className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">Editar</button>}
          {canWrite && client.status !== 'inactivo' && <button onClick={onSuspend} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">Suspender</button>}
        </div>
      </footer>
    </div>
  </div>
}

export default function ProveedoresList() {
  const navigate = useNavigate()
  const { proveedores, proyectos, cotizaciones, editarProveedor, eliminarProveedor } = useApp()
  const { can } = useAuth()
  const canWrite = can(permissions.proveedoresWrite)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('cliente')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [deleteId, setDeleteId] = useState(null)
  const [selected, setSelected] = useState(null)

  const filtered = proveedores.map(enrichClient).filter((client) => {
    const term = normalize(search)
    const matchSearch = !term || [client.razon_social, client.rfc, client.contacto, client.email, client.colonia, client.ciudad, client.estado_ubicacion].some((value) => normalize(value).includes(term))
    const matchTipo = filterTipo === 'todos' || client.tipo === filterTipo
    const matchStatus = filterStatus === 'todos' || client.status === filterStatus
    return matchSearch && matchTipo && matchStatus
  })

  const handleDelete = (id) => {
    eliminarProveedor(id)
    setDeleteId(null)
  }

  const suspendClient = (client) => {
    const updated = { ...client, status: 'inactivo', ultima_actualizacion: new Date().toISOString().slice(0, 10) }
    editarProveedor(client.id, updated)
    setSelected(updated)
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center md:mb-8"><div><h1 className="text-xl font-bold text-slate-900 md:text-2xl">Clientes / Proveedores</h1><p className="mt-1 text-sm text-slate-500">{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p></div><button onClick={() => navigate('/proveedores/nuevo')} className={`${canWrite ? 'flex' : 'hidden'} w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 sm:w-auto`}>+ Nuevo cliente</button></div>
    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]"><input type="text" placeholder="Buscar por razon social, RFC, contacto o ciudad..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"/><select value={filterTipo} onChange={(event) => setFilterTipo(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"><option value="todos">Todos los tipos</option><option value="cliente">Clientes</option><option value="proveedor">Proveedores</option></select><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"><option value="todos">Todos los estados</option><option value="prospecto">Prospectos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option><option value="bloqueado">Bloqueados</option></select></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron clientes.</p> : <table className="w-full min-w-[980px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-6 py-3 text-left text-xs text-slate-500">Cliente</th><th className="px-4 py-3 text-left text-xs text-slate-500">RFC</th><th className="px-4 py-3 text-left text-xs text-slate-500">Contacto</th><th className="px-4 py-3 text-left text-xs text-slate-500">Telefono</th><th className="px-4 py-3 text-left text-xs text-slate-500">Colonia</th><th className="px-4 py-3 text-left text-xs text-slate-500">Ciudad / Estado</th><th className="px-4 py-3 text-left text-xs text-slate-500">Tipo</th><th className="px-4 py-3 text-left text-xs text-slate-500">Estado</th><th className="px-6 py-3 text-right text-xs text-slate-500">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((client) => <tr key={client.id} className="hover:bg-slate-50"><td className="px-6 py-4"><button onClick={() => setSelected(client)} className="flex items-center gap-3 text-left"><Avatar nombre={client.razon_social}/><span><span className="block text-sm font-semibold text-slate-800">{client.razon_social}</span><span className="block text-xs text-slate-400">{client.email}</span></span></button></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{client.rfc}</td><td className="px-4 py-4 text-sm text-slate-700">{client.contacto}</td><td className="px-4 py-4 text-sm text-slate-600">{client.telefono}</td><td className="px-4 py-4 text-sm text-slate-600">{client.colonia || 'Sin colonia'}</td><td className="px-4 py-4"><p className="text-sm text-slate-700">{[client.ciudad, client.estado_ubicacion].filter(Boolean).join(', ') || 'Sin ubicacion'}</p><p className="text-xs text-slate-400">{client.codigo_postal || 'Sin CP'}</p></td><td className="px-4 py-4"><TipoBadge tipo={client.tipo}/></td><td className="px-4 py-4"><StatusBadge status={client.status}/></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelected(client)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">Ver</button>{canWrite && <button onClick={() => navigate(`/proveedores/editar/${client.id}`)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Editar</button>}{canWrite && <button onClick={() => setDeleteId(client.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Eliminar</button>}</div></td></tr>)}</tbody></table>}</div>
    {selected && <ClientModal rawClient={selected} proyectos={proyectos} cotizaciones={cotizaciones} canWrite={canWrite} onClose={() => setSelected(null)} onEdit={() => navigate(`/proveedores/editar/${selected.id}`)} onSuspend={() => suspendClient(selected)}/>}
    {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-base font-bold text-slate-800">Eliminar registro</h3><p className="mt-2 text-sm text-slate-500">Esta accion no se puede deshacer.</p><div className="mt-6 flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white">Eliminar</button></div></div></div>}
  </div>
}
