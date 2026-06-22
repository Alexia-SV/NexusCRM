import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { permissions } from '../../auth/permissions'

const statusConfig = {
  planificacion: { label: 'Planificación', class: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
  activo:        { label: 'Activo',        class: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  pausado:       { label: 'Pausado',       class: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
  completado:    { label: 'Completado',    class: 'bg-sky-50 text-sky-700',       dot: 'bg-sky-500' },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.pausado
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.class}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function Avatar({ nombre, apellido, size = 'sm' }) {
  const initials = `${nombre[0]}${apellido[0]}`.toUpperCase()
  const colors = [
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  const color = colors[(nombre.charCodeAt(0) + apellido.charCodeAt(0)) % colors.length]
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  )
}

export default function ProyectosList() {
  const navigate  = useNavigate()
  const { proyectos, usuarios, eliminarProyecto } = useApp()
  const { can } = useAuth()
  const canWrite = can(permissions.proyectosWrite)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('todos')
  const [deleteId, setDeleteId]   = useState(null)

  const filtered = proyectos.filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        p.objetivo.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleDelete = (id) => {
    eliminarProyecto(id)
    setDeleteId(null)
  }

  const getInvolucrados = (involucrados) =>
    involucrados
      .slice(0, 3)
      .map((inv) => usuarios.find((u) => u.id === inv.empleado_id))
      .filter(Boolean)

  const diasRestantes = (fecha_fin) => {
    const hoy  = new Date()
    const fin  = new Date(fecha_fin)
    const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyectos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/proyectos/nuevo')}
          className={`${canWrite ? 'flex' : 'hidden'} items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo proyecto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre u objetivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="planificacion">Planificación</option>
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="completado">Completado</option>
        </select>
      </div>

      {/* Cards de proyectos */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">No se encontraron proyectos</p>
          <p className="text-xs text-slate-400 mt-1">Intenta con otro término o crea un nuevo proyecto</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((proyecto) => {
            const involucrados = getInvolucrados(proyecto.involucrados)
            const extras       = proyecto.involucrados.length - 3
            const dias         = diasRestantes(proyecto.fecha_fin)
            const totalNomina  = proyecto.involucrados.reduce((acc, inv) => acc + inv.salario_asignado, 0)

            return (
              <div
                key={proyecto.id}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md hover:border-slate-300 transition-all"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{proyecto.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{proyecto.objetivo}</p>
                  </div>
                  <StatusBadge status={proyecto.status} />
                </div>

                {/* Meta */}
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Meta</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{proyecto.meta}</p>
                </div>

                {/* Involucrados */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Equipo ({proyecto.involucrados.length})
                  </p>
                  <div className="flex items-center gap-1.5">
                    {involucrados.map((u) => (
                      <div key={u.id} title={`${u.nombre} ${u.apellido_paterno}`}>
                        <Avatar nombre={u.nombre} apellido={u.apellido_paterno} />
                      </div>
                    ))}
                    {extras > 0 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-500">
                        +{extras}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Nómina/mes</span>
                    <span className="text-sm font-bold text-slate-700">
                      ${totalNomina.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {proyecto.status === 'completado' ? 'Finalizado' : dias < 0 ? 'Vencido' : 'Días restantes'}
                    </span>
                    <span className={`text-sm font-bold ${
                      proyecto.status === 'completado' ? 'text-sky-600'
                      : dias < 0 ? 'text-rose-500'
                      : dias < 30 ? 'text-amber-500'
                      : 'text-slate-700'
                    }`}>
                      {proyecto.status === 'completado' ? '✓' : Math.abs(dias)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                      title="Ver detalle"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/proyectos/editar/${proyecto.id}`)}
                      className={`${canWrite ? '' : 'hidden'} p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all`}
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteId(proyecto.id)}
                      className={`${canWrite ? '' : 'hidden'} p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all`}
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal eliminar */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">¿Eliminar proyecto?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
