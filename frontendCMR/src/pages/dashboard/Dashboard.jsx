import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { listEmployees } from '../../services/employees'
import { listPayrolls } from '../../services/payroll'
import { listProjects } from '../../services/projects'

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function initials(employee) {
  return `${employee.firstName?.[0] || ''}${employee.paternalLastName?.[0] || ''}`.toUpperCase()
}

function projectStatus(status) {
  const config = {
    PLANEACION: { label: 'Planeacion', className: 'bg-amber-50 text-amber-700' },
    ACTIVO: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700' },
    PAUSADO: { label: 'Pausado', className: 'bg-slate-100 text-slate-500' },
    COMPLETADO: { label: 'Completado', className: 'bg-sky-50 text-sky-700' },
    CANCELADO: { label: 'Cancelado', className: 'bg-rose-50 text-rose-700' },
  }
  return config[status] || config.PAUSADO
}

function StatIcon({ children, color }) {
  return <div className={`rounded-xl p-3 ${color}`}>{children}</div>
}

function Icon({ type }) {
  const paths = {
    users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
    project: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75M3.75 9.75V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.121 2.12a1.5 1.5 0 0 0 1.061.44H18A2.25 2.25 0 0 1 20.25 9v.75',
    money: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 0 1 2.25 15.375V5.625c0-.621.504-1.125 1.125-1.125H20.25M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75Zm0-7.5h18',
  }
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} /></svg>
}

export default function Dashboard() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const canReadUsers = can(permissions.usuariosRead)
  const canWriteUsers = can(permissions.usuariosWrite)
  const canReadProjects = can(permissions.proyectosRead)
  const canWriteProjects = can(permissions.proyectosWrite)
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [nextPayroll, setNextPayroll] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const [employeeList, projectList, payrollList] = await Promise.all([
        canReadUsers ? listEmployees().catch(() => []) : [],
        canReadProjects ? listProjects().catch(() => []) : [],
        listPayrolls().catch(() => []),
      ])
      if (!active) return
      setEmployees(employeeList)
      setProjects(projectList)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const usable = payrollList.filter((payroll) => payroll.status !== 'CANCELADA')
      const upcoming = usable.filter((payroll) => new Date(payroll.paymentDate) >= today).sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
      setNextPayroll(upcoming[0] || usable[0] || null)
    }
    void load()
    return () => { active = false }
  }, [canReadProjects, canReadUsers])

  const todayLabel = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const activeEmployees = employees.filter((employee) => employee.active)
  const activeProjects = projects.filter((project) => project.status === 'ACTIVO')
  const payrollEstimate = nextPayroll ? Number(nextPayroll.totalNet) : activeEmployees.reduce((total, employee) => total + Number(employee.dailySalary || 0) * 30, 0)
  const recentEmployees = [...employees].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3)
  const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3)

  const statCards = [
    { label: 'Empleados activos', visible: canReadUsers, value: activeEmployees.length, color: 'text-sky-600 bg-sky-50', icon: 'users' },
    { label: 'Proyectos activos', visible: canReadProjects, value: activeProjects.length, color: 'text-violet-600 bg-violet-50', icon: 'project' },
    { label: 'Total empleados', visible: canReadUsers, value: employees.length, color: 'text-amber-600 bg-amber-50', icon: 'users' },
    { label: 'Nomina del mes', visible: true, value: `$${payrollEstimate.toLocaleString('es-MX')}`, color: 'text-emerald-600 bg-emerald-50', icon: 'money' },
  ]

  const formatPayDate = (value) => new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <header className="mb-8">
      <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
      <p className="mt-1 text-sm capitalize text-slate-500">{todayLabel}</p>
    </header>

    <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.filter((stat) => stat.visible).map((stat) => <article key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <StatIcon color={stat.color}><Icon type={stat.icon} /></StatIcon>
        <div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
        </div>
      </article>)}
    </section>

    {nextPayroll && <button type="button" onClick={() => navigate(`/nominas/${nextPayroll.id}`)} className="mb-8 flex w-full flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-5 text-left shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-sky-50 p-3 text-sky-600"><Icon type="calendar" /></div>
        <div>
          <p className="text-xs text-slate-500">Proxima nomina · <span className="font-mono">{nextPayroll.folio}</span></p>
          <p className="text-lg font-bold text-slate-900">Pago el {formatPayDate(nextPayroll.paymentDate)}</p>
        </div>
      </div>
      <div className="sm:text-right">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">Monto total estimado</p>
        <p className="text-2xl font-bold text-emerald-600">${Number(nextPayroll.totalNet).toLocaleString('es-MX')}</p>
      </div>
    </button>}

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className={`${canReadUsers ? '' : 'hidden'} rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Empleados recientes</h2>
          <button onClick={() => navigate('/usuarios')} className="text-xs font-medium text-sky-600 hover:text-sky-700">Ver todos →</button>
        </div>
        {recentEmployees.length === 0 ? <div className="py-10 text-center">
          <p className="text-sm text-slate-500">Sin empleados registrados aun</p>
          <button onClick={() => navigate('/usuarios/nuevo')} className={`${canWriteUsers ? '' : 'hidden'} mt-2 text-xs font-medium text-sky-600 hover:text-sky-700`}>+ Agregar empleado</button>
        </div> : <div className="space-y-3">{recentEmployees.map((employee) => {
          const colors = ['bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
          const color = colors[((employee.firstName || 'A').charCodeAt(0) + (employee.paternalLastName || 'A').charCodeAt(0)) % colors.length]
          return <div key={employee.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>{initials(employee)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{fullName(employee)}</p>
              <p className="text-xs text-slate-400">{employee.position}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${employee.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{employee.active ? 'Activo' : 'Inactivo'}</span>
          </div>
        })}</div>}
      </section>

      <section className={`${canReadProjects ? '' : 'hidden'} rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Proyectos recientes</h2>
          <button onClick={() => navigate('/proyectos')} className="text-xs font-medium text-sky-600 hover:text-sky-700">Ver todos →</button>
        </div>
        {recentProjects.length === 0 ? <div className="py-10 text-center">
          <p className="text-sm text-slate-500">Sin proyectos registrados aun</p>
          <button onClick={() => navigate('/proyectos/nuevo')} className={`${canWriteProjects ? '' : 'hidden'} mt-2 text-xs font-medium text-sky-600 hover:text-sky-700`}>+ Crear proyecto</button>
        </div> : <div className="space-y-3">{recentProjects.map((project) => {
          const status = projectStatus(project.status)
          return <button key={project.id} type="button" onClick={() => navigate(`/proyectos/${project.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><Icon type="project" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{project.name}</p>
              <p className="truncate text-xs text-slate-400">{project.objective}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
          </button>
        })}</div>}
      </section>
    </div>
  </div>
}
