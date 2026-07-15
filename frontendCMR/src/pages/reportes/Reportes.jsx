import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { listPayrolls } from '../../services/payroll'
import { listProjects } from '../../services/projects'
import { listProviders } from '../../services/providers'
import { listSupplies } from '../../services/supplies'

const formatStyles = {
  PDF: 'bg-rose-50 text-rose-700',
  Excel: 'bg-lime-50 text-lime-700',
  Dashboard: 'bg-sky-50 text-sky-700',
}

const catalogStats = {
  totalReports: 14,
  sourceModules: 6,
  outputFormats: 3,
}

const sections = [
  {
    title: 'Nominas',
    reports: [
      {
        title: 'Recibo de nomina',
        scope: 'por empleado',
        module: 'Nominas',
        route: '/nominas',
        accent: 'border-amber-400/40',
        items: ['Nombre, CURP, periodo y puesto', 'Salario bruto, deducciones IMSS e ISR', 'Percepciones, descuentos y neto a pagar'],
        formats: ['PDF'],
      },
      {
        title: 'Resumen de nomina',
        scope: 'por periodo',
        module: 'Nominas',
        route: '/nominas/reportes',
        accent: 'border-amber-400/40',
        items: ['Total pagado por area o departamento', 'Comparativa entre periodos', 'Empleados con mayor y menor salario'],
        formats: ['PDF', 'Excel', 'Dashboard'],
      },
    ],
  },
  {
    title: 'Proyectos',
    reports: [
      {
        title: 'Avance de proyecto',
        scope: 'por proyecto',
        module: 'Proyectos',
        route: '/proyectos',
        accent: 'border-violet-400/40',
        items: ['% de tareas completadas vs planeadas', 'Tareas retrasadas y responsable', 'Comparativa fechas planeadas vs reales'],
        formats: ['PDF', 'Dashboard'],
      },
      {
        title: 'Costo de proyecto',
        scope: 'por proyecto',
        module: 'Proyectos',
        route: '/proyectos',
        accent: 'border-violet-400/40',
        items: ['Salarios de involucrados por fase', 'Insumos utilizados y su costo total', 'Presupuesto planeado vs ejecutado'],
        formats: ['PDF', 'Excel'],
      },
    ],
  },
  {
    title: 'Proveedores y clientes',
    reports: [
      {
        title: 'Directorio de proveedores',
        scope: 'general',
        module: 'Proveedores',
        route: '/proveedores',
        accent: 'border-emerald-400/40',
        items: ['Listado con RFC, razon social y contacto', 'Productos o servicios que suministran', 'Historial de cotizaciones por proveedor'],
        formats: ['PDF', 'Excel'],
      },
      {
        title: 'Historial de clientes',
        scope: 'general',
        module: 'Clientes',
        route: '/proveedores',
        accent: 'border-emerald-400/40',
        items: ['Proyectos asociados a cada cliente', 'Cotizaciones enviadas y aceptadas', 'Estatus de relacion activa / inactiva'],
        formats: ['PDF', 'Excel'],
      },
    ],
  },
  {
    title: 'Insumos y cotizaciones',
    reports: [
      {
        title: 'Inventario de insumos',
        scope: 'general',
        module: 'Insumos',
        route: '/insumos',
        accent: 'border-orange-400/40',
        items: ['Catalogo completo con cantidades actuales', 'Insumos usados por proyecto', 'Alertas de stock bajo configurable'],
        formats: ['Excel', 'Dashboard'],
      },
      {
        title: 'Cotizacion formal',
        scope: 'por cliente',
        module: 'Cotizaciones',
        route: '/proveedores',
        accent: 'border-orange-400/40',
        items: ['Membrete, datos del cliente y folio', 'Desglose de insumos, servicios y precios', 'Total, vigencia y condiciones de pago'],
        formats: ['PDF'],
      },
    ],
  },
  {
    title: 'Dashboard general',
    wide: true,
    reports: [
      {
        title: 'Pantalla principal del sistema',
        scope: 'en tiempo real',
        module: 'Dashboard',
        route: '/dashboard',
        accent: 'border-sky-400/40',
        items: ['Proyectos activos con % de avance y dias restantes', 'Proxima fecha de pago de nomina y total estimado', 'Cotizaciones pendientes de respuesta por clientes', 'Insumos con stock bajo que necesitan reposicion', 'Ultimas actividades del equipo en el sistema'],
        formats: ['Dashboard interactivo'],
      },
    ],
  },
]

function StatCard({ value, label }) {
  return <div className="rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-slate-300">{label}</p></div>
}

function FormatBadge({ format }) {
  const normalized = format === 'Dashboard interactivo' ? 'Dashboard' : format
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${formatStyles[normalized] || formatStyles.Dashboard}`}>{format}</span>
}

function ReportCard({ report, onOpen }) {
  return <article className={`flex h-full flex-col rounded-xl border ${report.accent} bg-slate-900 p-5 text-slate-200 shadow-sm`}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-current opacity-70" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{report.title}</h3>
          <p className="mt-1 text-xs text-slate-400">{report.module}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-slate-400">{report.scope}</span>
    </header>
    <ul className="space-y-2 text-sm text-slate-300">
      {report.items.map((item) => <li key={item} className="flex gap-2"><span className="text-slate-500">-</span><span>{item}</span></li>)}
    </ul>
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
      <div className="flex flex-wrap gap-2">{report.formats.map((format) => <FormatBadge key={format} format={format} />)}</div>
      <button onClick={() => onOpen(report.route)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15">Abrir</button>
    </footer>
  </article>
}

function exportCatalogCsv() {
  const rows = [['Modulo', 'Reporte', 'Alcance', 'Formatos', 'Contenido']]
  for (const section of sections) {
    for (const report of section.reports) rows.push([section.title, report.title, report.scope, report.formats.join(' / '), report.items.join(' | ')])
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'catalogo-reportes-nexus-crm.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [summary, setSummary] = useState({ payrolls: 0, projects: 0, providers: 0, lowStock: 0 })

  useEffect(() => {
    let active = true
    async function load() {
      const [payrolls, projects, providers, supplies] = await Promise.all([
        can(permissions.nominasRead) ? listPayrolls().catch(() => []) : [],
        can(permissions.proyectosRead) ? listProjects().catch(() => []) : [],
        can(permissions.proveedoresRead) ? listProviders().catch(() => []) : [],
        can(permissions.insumosRead) ? listSupplies().catch(() => []) : [],
      ])
      if (!active) return
      setSummary({
        payrolls: payrolls.filter((item) => item.status !== 'CANCELADA').length,
        projects: projects.filter((item) => item.status === 'ACTIVO').length,
        providers: providers.filter((item) => item.status === 'ACTIVO').length,
        lowStock: supplies.filter((item) => ['STOCK_BAJO', 'AGOTADO'].includes(item.status)).length,
      })
    }
    void load()
    return () => { active = false }
  }, [can])

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <header className="mb-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">El modulo de Reportes consolida informacion de todos los demas modulos y concentra los documentos formales, salidas de analisis y vistas vivas del sistema.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Imprimir / PDF</button>
          <button onClick={exportCatalogCsv} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Exportar Excel</button>
        </div>
      </div>
    </header>

    <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard value={catalogStats.totalReports} label="Reportes totales" />
      <StatCard value={catalogStats.sourceModules} label="Modulos fuente" />
      <StatCard value={catalogStats.outputFormats} label="Formatos de salida" />
    </section>

    <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nominas abiertas</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.payrolls}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Proyectos activos</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.projects}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Proveedores activos</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.providers}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alertas de stock</p><p className="mt-1 text-2xl font-bold text-slate-900">{summary.lowStock}</p></div>
    </section>

    <div className="space-y-7">
      {sections.map((section) => <section key={section.title}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{section.title}</h2>
        <div className={`grid grid-cols-1 gap-3 ${section.wide ? '' : 'lg:grid-cols-2'}`}>
          {section.reports.map((report) => <ReportCard key={report.title} report={report} onOpen={navigate} />)}
        </div>
      </section>)}
    </div>

    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
      <p>En resumen, el modulo genera tres tipos de salida: <strong>PDF</strong> para documentos formales, <strong>Excel</strong> para analisis y <strong>Dashboard</strong> como vista en vivo del sistema.</p>
    </section>
  </div>
}
