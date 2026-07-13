import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiError } from '../../services/api'
import { getPayrollReport } from '../../services/payroll'
import { downloadPayrollReportPdf } from '../../utils/payrollReportPdf'
import { formatMoney } from './payrollShared'

const groupByLabels = { month: 'Mensual', bimester: 'Bimestral', year: 'Anual' }
const YEARS = [2027, 2026, 2025, 2024]

export default function NominaReportes() {
  const navigate = useNavigate()
  const [groupBy, setGroupBy] = useState('month')
  const [year, setYear] = useState('2025')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setData(await getPayrollReport({ groupBy, ...(year ? { year } : {}) }))
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible generar el reporte.'))
    } finally {
      setLoading(false)
    }
  }, [groupBy, year])

  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer) }, [load])

  const rows = data?.rows || []
  const totals = data?.totals

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-5xl">
    <div className="mb-8 flex items-center gap-4">
      <button onClick={() => navigate('/nominas')} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes de nómina</h1>
        <p className="text-sm text-slate-500">Consulta los totales por periodo (mensual, bimestral o anual).</p>
      </div>
    </div>

    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

    <div className="mb-6 flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Criterio
        <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal normal-case text-slate-700">
          <option value="month">Mensual</option>
          <option value="bimester">Bimestral</option>
          <option value="year">Anual</option>
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Año
        <select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal normal-case text-slate-700">
          <option value="">Todos</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <button onClick={() => data && downloadPayrollReportPdf(data, groupByLabels[groupBy])} disabled={!rows.length} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        Exportar PDF
      </button>
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Generando reporte...</p>
        : rows.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No hay nóminas para este periodo.</p>
          : <table className="w-full min-w-[720px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-6 py-3">Periodo</th>
              <th className="px-4 py-3 text-center">Nóminas</th>
              <th className="px-4 py-3 text-center">Recibos</th>
              <th className="px-4 py-3 text-right">Percepciones</th>
              <th className="px-4 py-3 text-right">Deducciones</th>
              <th className="px-4 py-3 text-right">Neto</th>
              <th className="px-4 py-3 text-right">Costo patronal</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.key} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm font-medium text-slate-800">{row.label}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{row.payrolls}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{row.receipts}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{formatMoney(row.totalGross)}</td>
                <td className="px-4 py-3 text-right text-sm text-rose-600">{formatMoney(row.totalDeductions)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.totalNet)}</td>
                <td className="px-4 py-3 text-right text-sm text-violet-600">{formatMoney(row.totalEmployerCost)}</td>
              </tr>)}
            </tbody>
            {totals && <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-6 py-3 text-sm text-slate-800">Totales</td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.payrolls}</td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">{totals.receipts}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-800">{formatMoney(totals.totalGross)}</td>
              <td className="px-4 py-3 text-right text-sm text-rose-700">{formatMoney(totals.totalDeductions)}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-900">{formatMoney(totals.totalNet)}</td>
              <td className="px-4 py-3 text-right text-sm text-violet-700">{formatMoney(totals.totalEmployerCost)}</td>
            </tr></tfoot>}
          </table>}
    </div>
  </div></div>
}
