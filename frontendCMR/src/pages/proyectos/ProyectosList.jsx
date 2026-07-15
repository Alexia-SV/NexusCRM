import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { deleteProject, listProjects } from '../../services/projects'
import { getApiError } from '../../services/api'

const statusConfig = {
  PLANEACION: { label: 'Planeacion', className: 'bg-amber-50 text-amber-700' },
  ACTIVO: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700' },
  PAUSADO: { label: 'Pausado', className: 'bg-slate-100 text-slate-500' },
  COMPLETADO: { label: 'Completado', className: 'bg-sky-50 text-sky-700' },
  CANCELADO: { label: 'Cancelado', className: 'bg-rose-50 text-rose-700' },
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.PAUSADO
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>{config.label}</span>
}

function money(value) {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default function ProyectosList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWrite = can(permissions.proyectosWrite)
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setProjects(await listProjects({ search: search || undefined, status: status || undefined })) }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible cargar proyectos.')) }
    finally { setLoading(false) }
  }, [search, status])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])

  const remove = async () => {
    try { await deleteProject(deleteId); setDeleteId(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible eliminar. Si tiene historial, cancela el proyecto.')) }
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-slate-900">Proyectos</h1><p className="mt-1 text-sm text-slate-500">{projects.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/proyectos/nuevo')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">+ Nuevo proyecto</button>}</div>
    {error && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, objetivo o cliente..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="">Todos los estados</option><option value="PLANEACION">Planeacion</option><option value="ACTIVO">Activo</option><option value="PAUSADO">Pausado</option><option value="COMPLETADO">Completado</option><option value="CANCELADO">Cancelado</option></select></div>
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">Cargando proyectos...</div> : projects.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">No se encontraron proyectos.</div> : <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">{projects.map((project) => {
      const membersCost = project.members?.reduce((acc, member) => acc + Number(member.assignedDailySalary || 0), 0) || 0
      return <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-800">{project.name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.objective}</p></div><StatusBadge status={project.status} /></div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cliente</p><p className="mt-1 truncate text-sm text-slate-700">{project.clientName || 'Sin cliente'}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lider</p><p className="mt-1 truncate text-sm text-slate-700">{project.leader ? `${project.leader.firstName} ${project.leader.paternalLastName}` : 'Sin lider'}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fechas</p><p className="mt-1 text-sm text-slate-700">{formatDate(project.plannedStartDate)} - {formatDate(project.plannedEndDate)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Avance</p><p className="mt-1 text-sm font-bold text-slate-700">{project.progress}%</p></div></div>
        <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-4"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Presupuesto</p><p className="text-sm font-bold text-slate-800">{money(project.estimatedBudget)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Equipo diario</p><p className="text-sm font-bold text-slate-800">{money(membersCost)}</p></div><div className="flex gap-1"><button onClick={() => navigate(`/proyectos/${project.id}`)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">Ver</button>{canWrite && <button onClick={() => navigate(`/proyectos/editar/${project.id}`)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Editar</button>}{can(permissions.usuariosWrite) && <button onClick={() => setDeleteId(project.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Eliminar</button>}</div></div>
      </article>
    })}</div>}
    {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-base font-bold text-slate-800">Eliminar proyecto</h3><p className="mt-2 text-sm text-slate-500">Si tiene movimientos de inventario, el backend lo bloqueara.</p><div className="mt-6 flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={remove} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white">Eliminar</button></div></div></div>}
  </div>
}
