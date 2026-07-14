import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiError } from '../../services/api'
import { getPayrollReport } from '../../services/payroll'
import { downloadPayrollReportPdf } from '../../utils/payrollReportPdf'
import { formatMoney, formatShortDate } from './payrollShared'

const YEARS = [2026, 2025, 2024]
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const BIMESTERS = [
  { value: 1, label: 'Enero-Febrero' },
  { value: 2, label: 'Marzo-Abril' },
  { value: 3, label: 'Mayo-Junio' },
  { value: 4, label: 'Julio-Agosto' },
  { value: 5, label: 'Septiembre-Octubre' },
  { value: 6, label: 'Noviembre-Diciembre' },
]

const queries = [
  { id: 'summary', label: 'Resumen por periodo', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'employee', label: 'Gasto por empleado', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0' },
  { id: 'incidents', label: 'Faltas e incidencias', icon: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' },
  { id: 'employer', label: 'Costo empresa', icon: 'M3.75 21h16.5M4.5 21V7.5A2.25 2.25 0 0 1 6.75 5.25h10.5A2.25 2.25 0 0 1 19.5 7.5V21M9 9.75h6M9 13.5h6M9 17.25h3' },
]

const groupByLabels = { month: 'Mensual', bimester: 'Bimestral', year: 'Anual' }
const selectClass = 'mt-1 block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal normal-case text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100'

function QueryButton({ query, active, onClick }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d={query.icon} /></svg>
    {query.label}
  </button>
}

function TotalCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-1 text-lg font-bold ${tones[tone]}`}>{value}</p>
  </div>
}

export default function NominaReportes() {
  const navigate = useNavigate()
  const [queryType, setQueryType] = useState('employee')
  const [groupBy, setGroupBy] = useState('month')
  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('')
  const [bimester, setBimester] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const params = useMemo(() => ({
    groupBy,
    ...(year ? { year } : {}),
    ...(groupBy === 'month' && year && month ? { month } : {}),
    ...(groupBy === 'bimester' && year && bimester ? { bimester } : {}),
  }), [groupBy, year, month, bimester])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setData(await getPayrollReport(params))
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible generar el reporte.'))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer) }, [load])

  const summaryRows = data?.rows || []
  const employeeRows = data?.employeeRows || []
  const incidentRows = data?.incidentRows || []
  const totals = data?.totals
  const employeeTotals = data?.employeeTotals
  const hasRows = queryType === 'summary' ? summaryRows.length : queryType === 'incidents' ? incidentRows.length : employeeRows.length

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-6xl">
    <div className="mb-8 flex items-center gap-4">
      <button onClick={() => navigate('/nominas')} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes de nómina</h1>
        <p className="text-sm text-slate-500">Consultas rápidas por periodo, empleado, incidencias y costo empresa.</p>
      </div>
    </div>

    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {queries.map((query) => <QueryButton key={query.id} query={query} active={queryType === query.id} onClick={() => setQueryType(query.id)} />)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periodo
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} className={selectClass}>
            <option value="month">Mensual</option>
            <option value="bimester">Bimestral</option>
            <option value="year">Anual</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Año
          <select value={year} onChange={(event) => setYear(event.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        {groupBy === 'month' && <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mes
          <select value={month} onChange={(event) => setMonth(event.target.value)} className={selectClass}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            <option value="">Todos</option>
          </select>
        </label>}
        {groupBy === 'bimester' && <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bimestre
          <select value={bimester} onChange={(event) => setBimester(event.target.value)} className={selectClass}>
            {BIMESTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            <option value="">Todos</option>
          </select>
        </label>}
        <button onClick={() => data && downloadPayrollReportPdf(data, `${queries.find((query) => query.id === queryType)?.label || groupByLabels[groupBy]} - ${data.periodLabel}`)} disabled={!hasRows} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          Exportar PDF
        </button>
      </div>
    </section>

    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <TotalCard label="Nóminas" value={totals?.payrolls || 0} />
      <TotalCard label="Empleados" value={employeeTotals?.employees || 0} />
      <TotalCard label="Percepciones" value={formatMoney(employeeTotals?.totalGross || 0)} />
      <TotalCard label="Neto pagado" value={formatMoney(employeeTotals?.totalNet || 0)} tone="emerald" />
      <TotalCard label="Costo empresa" value={formatMoney(employeeTotals?.totalCompanyCost || 0)} tone="violet" />
    </div>

    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-slate-800">{queries.find((query) => query.id === queryType)?.label} · {data?.periodLabel || ''}</h2>
      {employeeTotals?.absentDays > 0 && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{employeeTotals.absentDays} faltas</span>}
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Generando reporte...</p>
        : !hasRows ? <p className="py-16 text-center text-sm text-slate-500">No hay datos para esta consulta.</p>
          : queryType === 'summary' ? <SummaryTable rows={summaryRows} totals={totals} />
            : queryType === 'incidents' ? <IncidentsTable rows={incidentRows} />
              : <EmployeeTable rows={employeeRows} totals={employeeTotals} employerOnly={queryType === 'employer'} />}
    </div>
  </div></div>
}

function SummaryTable({ rows, totals }) {
  return <table className="w-full min-w-[760px]">
    <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
      <th className="px-6 py-3">Periodo</th>
      <th className="px-4 py-3 text-center">Nóminas</th>
      <th className="px-4 py-3 text-center">Recibos</th>
      <th className="px-4 py-3 text-right">Percepciones</th>
      <th className="px-4 py-3 text-right">Deducciones</th>
      <th className="px-4 py-3 text-right">Neto</th>
      <th className="px-4 py-3 text-right">Costo patronal</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.key} className="hover:bg-slate-50">
      <td className="px-6 py-3 text-sm font-medium text-slate-800">{row.label}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-600">{row.payrolls}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-600">{row.receipts}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatMoney(row.totalGross)}</td>
      <td className="px-4 py-3 text-right text-sm text-rose-600">{formatMoney(row.totalDeductions)}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.totalNet)}</td>
      <td className="px-4 py-3 text-right text-sm text-violet-600">{formatMoney(row.totalEmployerCost)}</td>
    </tr>)}</tbody>
    {totals && <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
      <td className="px-6 py-3 text-sm text-slate-800">Totales</td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.payrolls}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.receipts}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-800">{formatMoney(totals.totalGross)}</td>
      <td className="px-4 py-3 text-right text-sm text-rose-700">{formatMoney(totals.totalDeductions)}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-900">{formatMoney(totals.totalNet)}</td>
      <td className="px-4 py-3 text-right text-sm text-violet-700">{formatMoney(totals.totalEmployerCost)}</td>
    </tr></tfoot>}
  </table>
}

function EmployeeTable({ rows, totals, employerOnly }) {
  return <table className="w-full min-w-[980px]">
    <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
      <th className="px-6 py-3">Empleado</th>
      <th className="px-4 py-3 text-center">Recibos</th>
      <th className="px-4 py-3 text-center">Días</th>
      <th className="px-4 py-3 text-center">Faltas</th>
      {!employerOnly && <th className="px-4 py-3 text-right">Percepciones</th>}
      {!employerOnly && <th className="px-4 py-3 text-right">Deducciones</th>}
      <th className="px-4 py-3 text-right">Neto</th>
      <th className="px-4 py-3 text-right">Costo patronal</th>
      <th className="px-4 py-3 text-right">Costo empresa</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.employeeId} className="hover:bg-slate-50">
      <td className="px-6 py-3"><span className="block text-sm font-semibold text-slate-800">{row.employeeName}</span><span className="block text-xs text-slate-400">{row.position} · {row.department}</span></td>
      <td className="px-4 py-3 text-center text-sm text-slate-600">{row.receipts}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-600">{row.workedDays}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-rose-600">{row.absentDays}</td>
      {!employerOnly && <td className="px-4 py-3 text-right text-sm text-slate-700">{formatMoney(row.totalGross)}</td>}
      {!employerOnly && <td className="px-4 py-3 text-right text-sm text-rose-600">{formatMoney(row.totalDeductions)}</td>}
      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.totalNet)}</td>
      <td className="px-4 py-3 text-right text-sm text-violet-600">{formatMoney(row.totalEmployerCost)}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-violet-700">{formatMoney(row.totalCompanyCost)}</td>
    </tr>)}</tbody>
    {totals && <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
      <td className="px-6 py-3 text-sm text-slate-800">Totales</td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.receipts}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.workedDays}</td>
      <td className="px-4 py-3 text-center text-sm text-rose-700">{totals.absentDays}</td>
      {!employerOnly && <td className="px-4 py-3 text-right text-sm text-slate-800">{formatMoney(totals.totalGross)}</td>}
      {!employerOnly && <td className="px-4 py-3 text-right text-sm text-rose-700">{formatMoney(totals.totalDeductions)}</td>}
      <td className="px-4 py-3 text-right text-sm text-slate-900">{formatMoney(totals.totalNet)}</td>
      <td className="px-4 py-3 text-right text-sm text-violet-700">{formatMoney(totals.totalEmployerCost)}</td>
      <td className="px-4 py-3 text-right text-sm text-violet-800">{formatMoney(totals.totalCompanyCost)}</td>
    </tr></tfoot>}
  </table>
}

function IncidentsTable({ rows }) {
  return <table className="w-full min-w-[1040px]">
    <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
      <th className="px-6 py-3">Empleado</th>
      <th className="px-4 py-3">Incidencia</th>
      <th className="px-4 py-3">Detalle</th>
      <th className="px-4 py-3">Nómina</th>
      <th className="px-4 py-3">Pago</th>
      <th className="px-4 py-3 text-center">Faltas</th>
      <th className="px-4 py-3 text-center">Incap.</th>
      <th className="px-4 py-3 text-right">Extras</th>
      <th className="px-4 py-3 text-right">Otros desc.</th>
      <th className="px-4 py-3 text-right">Neto</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={`${row.folio}-${row.employeeName}`} className="hover:bg-slate-50">
      <td className="px-6 py-3"><span className="block text-sm font-semibold text-slate-800">{row.employeeName}</span><span className="block text-xs text-slate-400">{row.department}</span></td>
      <td className="px-4 py-3 text-sm font-semibold text-sky-700">{row.incidentType}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{row.incidentDetail}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.folio}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{formatShortDate(row.paymentDate)}</td>
      <td className="px-4 py-3 text-center text-sm font-semibold text-rose-600">{row.absentDays}</td>
      <td className="px-4 py-3 text-center text-sm text-amber-700">{row.disabilityDays}</td>
      <td className="px-4 py-3 text-right text-sm text-emerald-600">{formatMoney(row.extraPerceptions)}</td>
      <td className="px-4 py-3 text-right text-sm text-rose-600">{formatMoney(row.otherDeductions)}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.netPay)}</td>
    </tr>)}</tbody>
  </table>
}
