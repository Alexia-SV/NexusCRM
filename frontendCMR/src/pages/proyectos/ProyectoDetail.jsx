import { useNavigate, useParams } from 'react-router-dom'
import { proyectosMock, usuariosMock } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { permissions } from '../../auth/permissions'

const statusConfig = {
  planificacion: { label: 'Planificación', class: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
  activo:        { label: 'Activo',        class: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  pausado:       { label: 'Pausado',       class: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
  completado:    { label: 'Completado',    class: 'bg-sky-50 text-sky-700',         dot: 'bg-sky-500' },
}

const rolColors = {
  supervisor:    'bg-violet-50 text-violet-700',
  desarrollador: 'bg-sky-50 text-sky-700',
  diseñador:     'bg-pink-50 text-pink-700',
  colaborador:   'bg-slate-100 text-slate-600',
  lider:         'bg-amber-50 text-amber-700',
}

export default function ProyectoDetail() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const { id }   = useParams()
  const proyecto = proyectosMock.find((p) => p.id === Number(id))

  if (!proyecto) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-500 text-sm">Proyecto no encontrado</p>
          <button onClick={() => navigate('/proyectos')} className="mt-4 text-sky-600 text-sm underline">
            Volver a proyectos
          </button>
        </div>
      </div>
    )
  }

  const cfg          = statusConfig[proyecto.status] || statusConfig.pausado
  const totalNomina  = proyecto.involucrados.reduce((acc, i) => acc + i.salario_asignado, 0)
  const diasRestantes = Math.ceil((new Date(proyecto.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24))

  const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="flex-1 p-8 overflow-y-auto">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/proyectos')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all mt-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{proyecto.nombre}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.class}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{proyecto.objetivo}</p>
        </div>
        <button
          onClick={() => navigate(`/proyectos/editar/${proyecto.id}`)}
          className={`${can(permissions.proyectosWrite) ? 'flex' : 'hidden'} items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
          Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info general */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
              Información general
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Meta</p>
                <p className="text-sm text-slate-700">{proyecto.meta}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Fecha inicio</p>
                  <p className="text-sm text-slate-700">{formatFecha(proyecto.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Fecha fin</p>
                  <p className="text-sm text-slate-700">{formatFecha(proyecto.fecha_fin)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
              Equipo involucrado
            </h2>
            <div className="space-y-3">
              {proyecto.involucrados.map((inv) => {
                const emp = usuariosMock.find((u) => u.id === inv.empleado_id)
                if (!emp) return null
                const initials = `${emp.nombre[0]}${emp.apellido_paterno[0]}`.toUpperCase()
                const colors   = ['bg-sky-100 text-sky-700','bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700']
                const color    = colors[(emp.nombre.charCodeAt(0) + emp.apellido_paterno.charCodeAt(0)) % colors.length]
                const rolClass = rolColors[inv.rol] || rolColors.colaborador

                return (
                  <div key={inv.empleado_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${color}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {emp.nombre} {emp.apellido_paterno} {emp.apellido_materno}
                      </p>
                      <p className="text-xs text-slate-400">{emp.puesto} · {emp.email}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${rolClass}`}>
                      {inv.rol}
                    </span>
                    <span className="text-sm font-bold text-slate-700 min-w-[80px] text-right">
                      ${inv.salario_asignado.toLocaleString('es-MX')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Columna derecha — resumen */}
        <div className="space-y-5">

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">
              Resumen
            </h2>

            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Nómina mensual</p>
              <p className="text-2xl font-bold text-slate-900">${totalNomina.toLocaleString('es-MX')}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                {proyecto.status === 'completado' ? 'Estado' : diasRestantes < 0 ? 'Vencido hace' : 'Días restantes'}
              </p>
              <p className={`text-2xl font-bold ${
                proyecto.status === 'completado' ? 'text-sky-600'
                : diasRestantes < 0 ? 'text-rose-500'
                : diasRestantes < 30 ? 'text-amber-500'
                : 'text-slate-900'
              }`}>
                {proyecto.status === 'completado' ? '✓ Listo' : Math.abs(diasRestantes)}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Integrantes</p>
              <p className="text-2xl font-bold text-slate-900">{proyecto.involucrados.length}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
