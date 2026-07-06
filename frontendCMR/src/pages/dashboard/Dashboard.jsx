import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { permissions } from '../../auth/permissions'
import { listPayrolls } from '../../services/payroll'

export default function Dashboard() {
  const { stats, usuarios, proyectos } = useApp()
  const { can } = useAuth()
  const navigate = useNavigate()
  const canReadUsers = can(permissions.usuariosRead)
  const canWriteUsers = can(permissions.usuariosWrite)
  const canReadProjects = can(permissions.proyectosRead)
  const canWriteProjects = can(permissions.proyectosWrite)

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const [nextPayroll, setNextPayroll] = useState(null)
  useEffect(() => {
    let active = true
    listPayrolls().then((list) => {
      if (!active) return
      const now = new Date(); now.setHours(0, 0, 0, 0)
      const usable = list.filter((payroll) => payroll.status !== 'CANCELADA')
      const upcoming = usable.filter((payroll) => new Date(payroll.paymentDate) >= now).sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
      setNextPayroll(upcoming[0] || usable[0] || null)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const formatPayDate = (value) => new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

  const statCards = [
    {
      label: 'Empleados activos',
      visible: canReadUsers,
      value: stats.empleadosActivos,
      color: 'text-sky-600 bg-sky-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
    },
    {
      label: 'Proyectos activos',
      visible: canReadProjects,
      value: stats.proyectosActivos,
      color: 'text-violet-600 bg-violet-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      ),
    },
    {
      label: 'Total empleados',
      visible: canReadUsers,
      value: usuarios.length,
      color: 'text-amber-600 bg-amber-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
    },
    {
      label: 'Nómina del mes',
      visible: true,
      value: `$${stats.totalNominasMes.toLocaleString('es-MX')}`,
      color: 'text-emerald-600 bg-emerald-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      ),
    },
  ]

  // Últimos 3 empleados agregados
  const empleadosRecientes = [...usuarios].slice(-3).reverse()

  // Últimos 3 proyectos
  const proyectosRecientes = [...proyectos].slice(-3).reverse()

  const statusConfig = {
    planificacion: { label: 'Planificación', class: 'bg-amber-50 text-amber-700' },
    activo:        { label: 'Activo',        class: 'bg-emerald-50 text-emerald-700' },
    pausado:       { label: 'Pausado',       class: 'bg-slate-100 text-slate-500' },
    completado:    { label: 'Completado',    class: 'bg-sky-50 text-sky-700' },
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.filter((stat) => stat.visible).map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center space-x-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Próxima nómina */}
      {nextPayroll && (
        <div onClick={() => navigate(`/nominas/${nextPayroll.id}`)} className="mb-8 flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Próxima nómina · <span className="font-mono">{nextPayroll.folio}</span></p>
              <p className="text-lg font-bold text-slate-900">Pago el {formatPayDate(nextPayroll.paymentDate)}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Monto total estimado</p>
            <p className="text-2xl font-bold text-emerald-600">${Number(nextPayroll.totalNet).toLocaleString('es-MX')}</p>
          </div>
        </div>
      )}

      {/* Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Empleados recientes */}
        <div className={`${canReadUsers ? '' : 'hidden'} bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Empleados recientes</h2>
            <button
              onClick={() => navigate('/usuarios')}
              className={`${canReadUsers ? '' : 'hidden'} text-xs text-sky-600 hover:text-sky-700 font-medium transition`}
            >
              Ver todos →
            </button>
          </div>

          {empleadosRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Sin empleados registrados aún</p>
              <button
                onClick={() => navigate('/usuarios/nuevo')}
                className={`${canWriteUsers ? '' : 'hidden'} text-xs text-sky-600 hover:text-sky-700 font-medium mt-2 transition`}
              >
                + Agregar empleado
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {empleadosRecientes.map((u) => {
                const initials = `${u.nombre[0]}${u.apellido_paterno[0]}`.toUpperCase()
                const colors   = ['bg-sky-100 text-sky-700','bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700']
                const color    = colors[(u.nombre.charCodeAt(0) + u.apellido_paterno.charCodeAt(0)) % colors.length]
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${color}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {u.nombre} {u.apellido_paterno}
                      </p>
                      <p className="text-xs text-slate-400">{u.puesto}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Proyectos recientes */}
        <div className={`${canReadProjects ? '' : 'hidden'} bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Proyectos recientes</h2>
            <button
              onClick={() => navigate('/proyectos')}
              className={`${canReadProjects ? '' : 'hidden'} text-xs text-sky-600 hover:text-sky-700 font-medium transition`}
            >
              Ver todos →
            </button>
          </div>

          {proyectosRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Sin proyectos registrados aún</p>
              <button
                onClick={() => navigate('/proyectos/nuevo')}
                className={`${canWriteProjects ? '' : 'hidden'} text-xs text-sky-600 hover:text-sky-700 font-medium mt-2 transition`}
              >
                + Crear proyecto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {proyectosRecientes.map((p) => {
                const cfg = statusConfig[p.status] || statusConfig.pausado
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-400 truncate">{p.objetivo}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.class}`}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
