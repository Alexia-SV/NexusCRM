import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions, ROLES } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { getApiError } from '../../services/api'
import { deletePayroll, listPayrolls } from '../../services/payroll'
import { statusConfig, periodLabels, formatMoney, formatShortDate } from './payrollShared'

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.BORRADOR
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.class}`}><span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
}

export default function NominasList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWrite = can(permissions.nominasWrite)
  const isAdmin = can([ROLES.ADMIN])
  const [payrolls, setPayrolls] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setPayrolls(await listPayrolls({ search: search || undefined, status: status || undefined, periodType: period || undefined }))
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible cargar las nóminas.'))
    } finally {
      setLoading(false)
    }
  }, [search, status, period])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])

  const confirmDelete = async () => {
    try {
      await deletePayroll(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible eliminar la nómina.'))
      setDeleteTarget(null)
    }
  }

  const totalNet = payrolls.reduce((acc, payroll) => acc + Number(payroll.totalNet || 0), 0)

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nóminas</h1>
        <p className="mt-1 text-sm text-slate-500">{payrolls.length} corrida{payrolls.length !== 1 ? 's' : ''} · neto {formatMoney(totalNet)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isAdmin && <button onClick={() => navigate('/nominas/configuracion')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
          Configuración
        </button>}
        {canWrite && <button onClick={() => navigate('/nominas/nueva')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nueva nómina
        </button>}
      </div>
    </div>

    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por folio..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100" />
      <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
        <option value="">Todos los periodos</option>
        <option value="SEMANAL">Semanal</option>
        <option value="QUINCENAL">Quincenal</option>
        <option value="MENSUAL">Mensual</option>
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
        <option value="">Todos los estados</option>
        <option value="BORRADOR">Borrador</option>
        <option value="EN_PROCESO">En proceso</option>
        <option value="PAGADA">Pagada</option>
        <option value="CANCELADA">Cancelada</option>
      </select>
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando nóminas...</p>
        : payrolls.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No hay nóminas registradas.</p>
          : <table className="w-full min-w-[760px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-6 py-3">Folio</th>
              <th className="px-4 py-3">Periodo</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3 text-center">Recibos</th>
              <th className="px-4 py-3 text-right">Total neto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.map((payroll) => <tr key={payroll.id} className="hover:bg-slate-50">
                <td className="px-6 py-4"><button onClick={() => navigate(`/nominas/${payroll.id}`)} className="font-mono text-xs font-semibold text-sky-700 hover:underline">{payroll.folio}</button></td>
                <td className="px-4 py-4"><p className="text-sm font-medium text-slate-700">{periodLabels[payroll.periodType]}</p><p className="text-xs text-slate-400">{formatShortDate(payroll.periodStart)} – {formatShortDate(payroll.periodEnd)}</p></td>
                <td className="px-4 py-4 text-xs text-slate-500">{formatShortDate(payroll.paymentDate)}</td>
                <td className="px-4 py-4 text-center text-sm text-slate-700">{payroll.receiptCount}</td>
                <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">{formatMoney(payroll.totalNet)}</td>
                <td className="px-4 py-4"><StatusBadge status={payroll.status} /></td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/nominas/${payroll.id}`)} title="Ver" className="rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg></button>
                    {isAdmin && <button onClick={() => setDeleteTarget(payroll)} title="Eliminar" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165" /></svg></button>}
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>}
    </div>

    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        <h3 className="text-center text-base font-bold text-slate-800">¿Eliminar la nómina {deleteTarget.folio}?</h3>
        <p className="mt-1 text-center text-sm text-slate-500">Se eliminarán también sus {deleteTarget.receiptCount} recibo(s). Esta acción es permanente.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={confirmDelete} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white hover:bg-rose-600">Sí, eliminar</button>
        </div>
      </div>
    </div>}
  </div>
}
