import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { getApiError } from '../../services/api'
import { changePayrollStatus, deleteReceipt, generateReceipts, getPayroll, updateReceipt } from '../../services/payroll'
import { downloadPayrollPdf } from '../../utils/payrollPdf'
import { downloadPayrollSummaryPdf } from '../../utils/payrollSummaryPdf'
import { statusConfig, periodLabels, contractTypeLabels, disabilityTypeLabels, formatMoney, formatDate } from './payrollShared'

const transitions = {
  BORRADOR: [
    { to: 'EN_PROCESO', label: 'Pasar a proceso', class: 'bg-sky-600 hover:bg-sky-700 text-white' },
    { to: 'CANCELADA', label: 'Cancelar', class: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
  ],
  EN_PROCESO: [
    { to: 'PAGADA', label: 'Marcar como pagada', class: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { to: 'BORRADOR', label: 'Volver a borrador', class: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600' },
    { to: 'CANCELADA', label: 'Cancelar', class: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
  ],
  PAGADA: [],
  CANCELADA: [],
}

const numberInput = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100'
const periodDays = { SEMANAL: 7, QUINCENAL: 15, MENSUAL: 30 }

function Line({ label, value, negative = false, strong = false }) {
  return <div className="flex items-center justify-between py-1.5">
    <span className={`text-sm ${strong ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>{label}</span>
    <span className={`text-sm tabular-nums ${strong ? 'font-bold text-slate-900' : negative ? 'text-rose-600' : 'text-slate-700'}`}>{negative && value ? '-' : ''}{formatMoney(value)}</span>
  </div>
}

function Snap({ label, value }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-0.5 text-sm text-slate-700">{value || '—'}</dd></div>
}

function ReceiptModal({ receipt, payroll, editable, onClose, onSaved }) {
  const defaultDays = periodDays[payroll.periodType] || receipt.workedDays
  const [form, setForm] = useState({
    workedDays: receipt.workedDays,
    absentDays: receipt.absentDays,
    disabilityDays: receipt.disabilityDays || 0,
    disabilityType: receipt.disabilityType || '',
    extraPerceptions: receipt.extraPerceptions || '',
    infonavit: receipt.infonavit || '',
    otherDeductions: receipt.otherDeductions || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  const clampDays = (value) => Math.max(0, Math.min(defaultDays, Number(value || 0)))
  const setIncidentDays = (field) => (event) => {
    const value = clampDays(event.target.value)
    setForm((prev) => {
      const absentDays = field === 'absentDays' ? value : clampDays(prev.absentDays)
      const disabilityDays = field === 'disabilityDays' ? value : clampDays(prev.disabilityDays)
      return {
        ...prev,
        [field]: value,
        workedDays: Math.max(0, defaultDays - absentDays - disabilityDays),
      }
    })
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const updated = await updateReceipt(payroll.id, receipt.id, {
        workedDays: Number(form.workedDays),
        absentDays: Number(form.absentDays || 0),
        disabilityDays: Number(form.disabilityDays || 0),
        disabilityType: form.disabilityType || undefined,
        extraPerceptions: form.extraPerceptions === '' ? 0 : Number(form.extraPerceptions),
        infonavit: form.infonavit === '' ? 0 : Number(form.infonavit),
        otherDeductions: form.otherDeductions === '' ? 0 : Number(form.otherDeductions),
      })
      onSaved(updated)
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible recalcular el recibo.'))
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{receipt.employeeName}</h2>
          <p className="text-sm text-slate-500">{receipt.position} · {receipt.department}</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg></button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Datos del empleado</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Snap label="CURP" value={receipt.curp} />
            <Snap label="RFC" value={receipt.rfc} />
            <Snap label="NSS / IMSS" value={receipt.nss} />
            <Snap label="CLABE" value={receipt.clabe} />
            <Snap label="AFORE" value={receipt.afore} />
            <Snap label="Contrato" value={contractTypeLabels[receipt.contractType] || receipt.contractType} />
            <Snap label="Salario diario" value={formatMoney(receipt.dailySalary)} />
            <Snap label="SBC diario" value={formatMoney(receipt.sbc)} />
            <Snap label="Tabla ISR" value={periodLabels[receipt.isrTable]} />
          </dl>
        </section>

        {editable && <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Captura (recalcula al guardar)</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Días pagados<input type="number" value={form.workedDays} onChange={set('workedDays')} className={`mt-1 ${numberInput}`} /></label>
            <label className="text-[11px] font-semibold uppercase text-slate-500">Faltas<input type="number" value={form.absentDays} onChange={setIncidentDays('absentDays')} className={`mt-1 ${numberInput}`} /></label>
            <label className="text-[11px] font-semibold uppercase text-slate-500">Extras<input type="number" step="0.01" value={form.extraPerceptions} onChange={set('extraPerceptions')} className={`mt-1 ${numberInput}`} /></label>
            <label className="text-[11px] font-semibold uppercase text-slate-500">INFONAVIT<input type="number" step="0.01" value={form.infonavit} onChange={set('infonavit')} className={`mt-1 ${numberInput}`} /></label>
            <label className="text-[11px] font-semibold uppercase text-slate-500">Otros desc.<input type="number" step="0.01" value={form.otherDeductions} onChange={set('otherDeductions')} className={`mt-1 ${numberInput}`} /></label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Días de incapacidad<input type="number" value={form.disabilityDays} onChange={setIncidentDays('disabilityDays')} className={`mt-1 ${numberInput}`} /></label>
            <label className="text-[11px] font-semibold uppercase text-slate-500 sm:col-span-2">Tipo de incapacidad<select value={form.disabilityType} onChange={set('disabilityType')} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"><option value="">Sin incapacidad</option><option value="ENFERMEDAD_GENERAL">Enfermedad general (subsidio 60% desde día 4)</option><option value="RIESGO_TRABAJO">Riesgo de trabajo (100% desde día 1)</option><option value="MATERNIDAD">Maternidad (100%)</option></select></label>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Periodo: {defaultDays} días. Faltas e incapacidad reducen automáticamente los días pagados; el subsidio IMSS por incapacidad es informativo.</p>
          <button onClick={save} disabled={saving} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400">{saving ? 'Recalculando...' : 'Recalcular y guardar'}</button>
        </section>}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Percepciones</h3>
            <div className="divide-y divide-slate-100">
              <div className="pb-1"><Line label={`Salario (${receipt.workedDays} días)`} value={receipt.baseSalary} /><Line label="Aguinaldo prop." value={receipt.aguinaldoProportional} /><Line label="Vacaciones prop." value={receipt.vacationProportional} /><Line label="Prima vacacional" value={receipt.vacationBonus} /><Line label="Percepciones extra" value={receipt.extraPerceptions} /></div>
              <div className="pt-1"><Line label="Total percepciones" value={receipt.totalPerceptions} strong /></div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-700">Deducciones</h3>
            <div className="divide-y divide-slate-100">
              <div className="pb-1"><Line label="IMSS Enf. y Maternidad" value={receipt.imssEnfMat} negative /><Line label="IMSS Invalidez y Vida" value={receipt.imssInvVida} negative /><Line label="Cesantía y Vejez → AFORE" value={receipt.imssCesVejez} negative /><Line label="ISR retenido" value={receipt.isrWithholding} negative /><Line label="INFONAVIT (crédito)" value={receipt.infonavit} negative /><Line label="Fondo de ahorro" value={receipt.savingsFund} negative /><Line label="Otros descuentos" value={receipt.otherDeductions} negative /></div>
              <div className="pt-1"><Line label="Total deducciones" value={receipt.totalDeductions} strong /></div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
          <span className="text-sm font-semibold text-white">Neto a pagar</span>
          <span className="text-xl font-bold text-white tabular-nums">{formatMoney(receipt.netPay)}</span>
        </div>

        {receipt.disabilityType && <section className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">Incapacidad ({disabilityTypeLabels[receipt.disabilityType]})</h3>
          <Line label={`Subsidio IMSS · ${receipt.disabilityDays} día(s) (lo paga el IMSS, no la empresa)`} value={receipt.imssSubsidy} />
        </section>}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-700">Aportaciones patronales (no afectan tu neto)</h3>
            <div className="divide-y divide-slate-100">
              <div className="pb-1"><Line label="IMSS patronal (todos los ramos)" value={receipt.patronImssTotal} /><Line label="Retiro (2%)" value={receipt.patronRetiro} /><Line label="Cesantía y Vejez patronal" value={receipt.patronCesantiaVejez} /><Line label="INFONAVIT (5%)" value={receipt.patronInfonavit} /></div>
              <div className="pt-1"><Line label="Costo patronal del recibo" value={receipt.patronTotal} strong /></div>
            </div>
          </section>
          <section className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-700">AFORE · {receipt.afore || 'Sin registrar'}</h3>
            <div className="divide-y divide-slate-100">
              <div className="pb-1"><Line label="Aportación del trabajador (Ces. y Vejez)" value={receipt.imssCesVejez} /><Line label="Retiro (patrón)" value={receipt.patronRetiro} /><Line label="Cesantía y Vejez (patrón)" value={receipt.patronCesantiaVejez} /></div>
              <div className="pt-1"><Line label="Total depositado en tu AFORE (RCV)" value={receipt.rcvAforeTotal} strong /></div>
            </div>
          </section>
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
        <button onClick={() => downloadPayrollPdf(receipt, payroll)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15v-15h-9l-6 6v9Zm6-15v6h-6" /></svg>Descargar recibo PDF</button>
      </footer>
    </div>
  </div>
}

export default function NominaDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { can } = useAuth()
  const canWrite = can(permissions.nominasWrite)
  const [payroll, setPayroll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await getPayroll(id)
        if (active) setPayroll(data)
      } catch (requestError) {
        if (active) setError(getApiError(requestError, 'No fue posible cargar la nómina.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  const run = async (action) => {
    setBusy(true); setError('')
    try {
      setPayroll(await action())
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible completar la acción.'))
    } finally {
      setBusy(false)
    }
  }

  const removeReceipt = async (receiptId) => run(() => deleteReceipt(id, receiptId))
  const generate = async () => run(() => generateReceipts(id))
  const changeStatus = async (status) => run(() => changePayrollStatus(id, status))

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Cargando nómina...</div>
  if (error && !payroll) return <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"><p className="text-sm text-slate-500">{error}</p><button onClick={() => navigate('/nominas')} className="text-sm text-sky-600 underline">Volver a nóminas</button></div>
  if (!payroll) return null

  const cfg = statusConfig[payroll.status] || statusConfig.BORRADOR
  const editable = payroll.status === 'BORRADOR' && canWrite
  const selected = payroll.receipts.find((receipt) => receipt.id === selectedId)

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-5xl">
    <div className="mb-6 flex flex-wrap items-start gap-3 sm:gap-4">
      <button onClick={() => navigate('/nominas')} className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </button>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-slate-900">{payroll.folio}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.class}`}><span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">Nómina {periodLabels[payroll.periodType]?.toLowerCase()} · {formatDate(payroll.periodStart)} al {formatDate(payroll.periodEnd)} · pago {formatDate(payroll.paymentDate)}</p>
      </div>
    </div>

    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recibos</p><p className="mt-1 text-2xl font-bold text-slate-900">{payroll.receipts.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Percepciones</p><p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(payroll.totalGross)}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deducciones</p><p className="mt-1 text-lg font-bold text-rose-600">{formatMoney(payroll.totalDeductions)}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total neto</p><p className="mt-1 text-lg font-bold text-emerald-600">{formatMoney(payroll.totalNet)}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo patronal</p><p className="mt-1 text-lg font-bold text-violet-600">{formatMoney(payroll.totalEmployerCost)}</p></div>
    </div>

    <div className="mb-6 flex flex-wrap gap-2">
      <button onClick={() => downloadPayrollSummaryPdf(payroll)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>Exportar PDF</button>
      {editable && payroll.pendingReceipts > 0 && <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Generar recibos faltantes ({payroll.pendingReceipts})</button>}
      {editable && <button onClick={() => navigate(`/nominas/editar/${payroll.id}`)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Editar periodo</button>}
      {canWrite && transitions[payroll.status].map((action) => <button key={action.to} onClick={() => changeStatus(action.to)} disabled={busy} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${action.class}`}>{action.label}</button>)}
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {payroll.receipts.length === 0 ? <p className="py-14 text-center text-sm text-slate-500">Sin recibos.{editable && payroll.pendingReceipts > 0 ? ' Usa "Generar recibos faltantes".' : ''}</p>
        : <table className="w-full min-w-[720px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-6 py-3">Empleado</th>
            <th className="px-4 py-3 text-center">Días</th>
            <th className="px-4 py-3 text-right">Percepciones</th>
            <th className="px-4 py-3 text-right">IMSS</th>
            <th className="px-4 py-3 text-right">ISR</th>
            <th className="px-4 py-3 text-right">Neto</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {payroll.receipts.map((receipt) => <tr key={receipt.id} className="hover:bg-slate-50">
              <td className="px-6 py-4"><button onClick={() => setSelectedId(receipt.id)} className="text-left"><span className="block text-sm font-semibold text-slate-800 hover:text-sky-700">{receipt.employeeName}</span><span className="block text-xs text-slate-400">{receipt.position}</span></button></td>
              <td className="px-4 py-4 text-center text-sm text-slate-600">{receipt.workedDays}{receipt.absentDays ? <span className="text-rose-500"> (−{receipt.absentDays})</span> : ''}</td>
              <td className="px-4 py-4 text-right text-sm text-slate-700">{formatMoney(receipt.totalPerceptions)}</td>
              <td className="px-4 py-4 text-right text-xs text-rose-600">-{formatMoney(receipt.imssTotal)}</td>
              <td className="px-4 py-4 text-right text-xs text-rose-600">-{formatMoney(receipt.isrWithholding)}</td>
              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">{formatMoney(receipt.netPay)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setSelectedId(receipt.id)} title="Ver recibo" className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg></button>
                  <button onClick={() => downloadPayrollPdf(receipt, payroll)} title="PDF" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15v-15h-9l-6 6v9Zm6-15v6h-6" /></svg></button>
                  {editable && <button onClick={() => removeReceipt(receipt.id)} disabled={busy} title="Quitar" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>}
    </div>

    {payroll.notes && <p className="mt-4 text-sm text-slate-500"><span className="font-semibold text-slate-600">Notas:</span> {payroll.notes}</p>}

    {selected && <ReceiptModal receipt={selected} payroll={payroll} editable={editable} onClose={() => setSelectedId(null)} onSaved={setPayroll} />}
  </div></div>
}
