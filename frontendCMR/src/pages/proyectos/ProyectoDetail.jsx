import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { getProject } from '../../services/projects'
import { getApiError } from '../../services/api'

const statusLabels = { PLANEACION: 'Planeacion', ACTIVO: 'Activo', PAUSADO: 'Pausado', COMPLETADO: 'Completado', CANCELADO: 'Cancelado' }
const statusClass = { PLANEACION: 'bg-amber-50 text-amber-700', ACTIVO: 'bg-emerald-50 text-emerald-700', PAUSADO: 'bg-slate-100 text-slate-500', COMPLETADO: 'bg-sky-50 text-sky-700', CANCELADO: 'bg-rose-50 text-rose-700' }

function money(value) {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function date(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function fullName(employee) {
  return [employee?.firstName, employee?.paternalLastName, employee?.maternalLastName].filter(Boolean).join(' ')
}

function Field({ label, value }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

export default function ProyectoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getProject(id).then(setProject).catch((requestError) => setError(getApiError(requestError, 'No fue posible cargar el proyecto.'))).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex-1 p-8 text-sm text-slate-500">Cargando proyecto...</div>
  if (error || !project) return <div className="flex-1 p-8"><p className="text-sm text-rose-600">{error || 'Proyecto no encontrado'}</p><button onClick={() => navigate('/proyectos')} className="mt-4 text-sm text-sky-700 underline">Volver a proyectos</button></div>

  const memberCost = project.members.reduce((acc, member) => acc + Number(member.assignedDailySalary || 0), 0)
  const inventoryCost = project.inventoryMovements.reduce((acc, movement) => acc + Number(movement.totalCost || 0), 0)

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-wrap items-start gap-3 sm:gap-4"><button onClick={() => navigate('/proyectos')} className="mt-1 rounded-xl bg-white p-2 text-slate-500">←</button><div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{project.name}</h1><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[project.status]}`}>{statusLabels[project.status]}</span></div><p className="mt-1 text-sm text-slate-500">{project.objective}</p></div>{can(permissions.proyectosWrite) && <button onClick={() => navigate(`/proyectos/editar/${project.id}`)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600">Editar</button>}</div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">Informacion general</h2><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Cliente" value={project.clientName} /><Field label="Lider" value={fullName(project.leader)} /><Field label="Inicio planeado" value={date(project.plannedStartDate)} /><Field label="Fin planeado" value={date(project.plannedEndDate)} /><Field label="Inicio real" value={date(project.realStartDate)} /><Field label="Fin real" value={date(project.realEndDate)} /><Field label="Prioridad" value={project.priority} /><Field label="Avance" value={`${project.progress}%`} /></dl></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">Involucrados</h2>{project.members.length === 0 ? <p className="text-sm text-slate-500">Sin involucrados.</p> : <div className="space-y-3">{project.members.map((member) => <article key={member.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{fullName(member.employee)}</p><p className="text-xs text-slate-400">{member.employee?.position} - {member.role}</p></div><p className="text-sm font-bold text-slate-700">{money(member.assignedDailySalary)} diario</p></article>)}</div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">Insumos usados</h2>{project.inventoryMovements.length === 0 ? <p className="text-sm text-slate-500">Sin salidas de inventario relacionadas.</p> : <div className="space-y-3">{project.inventoryMovements.map((movement) => <article key={movement.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{movement.supply?.name}</p><p className="text-xs text-slate-400">{movement.type} - {movement.quantity}</p></div><p className="text-sm font-bold text-slate-700">{money(movement.totalCost)}</p></article>)}</div>}</section>
    </div><aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">Resumen</h2><div className="space-y-3"><div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Presupuesto</p><p className="mt-1 text-xl font-bold text-slate-900">{money(project.estimatedBudget)}</p></div><div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Costo insumos</p><p className="mt-1 text-xl font-bold text-slate-900">{money(inventoryCost)}</p></div><div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Equipo diario</p><p className="mt-1 text-xl font-bold text-slate-900">{money(memberCost)}</p></div></div></section></aside></div>
  </div>
}
