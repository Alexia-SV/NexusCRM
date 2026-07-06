import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getApiError } from '../../services/api'
import { getPayrollConfig, updatePayrollConfig } from '../../services/payroll'
import { periodLabels, formatMoney } from './payrollShared'

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5'

const fields = [
  { name: 'umaDaily', label: 'UMA diaria', suffix: '$' },
  { name: 'integrationFactor', label: 'Factor de integración SBC', suffix: '×' },
  { name: 'imssEnfMatRate', label: 'IMSS Enfermedad y Maternidad', suffix: '%' },
  { name: 'imssInvVidaRate', label: 'IMSS Invalidez y Vida', suffix: '%' },
  { name: 'imssCesVejezRate', label: 'IMSS Cesantía y Vejez', suffix: '%' },
  { name: 'infonavitEmployerRate', label: 'INFONAVIT (aportación patronal)', suffix: '%' },
  { name: 'aguinaldoDays', label: 'Días de aguinaldo', suffix: 'días' },
  { name: 'vacationDays', label: 'Días de vacaciones', suffix: 'días' },
  { name: 'primaVacacionalRate', label: 'Prima vacacional', suffix: '%' },
  { name: 'fondoAhorroRate', label: 'Fondo de ahorro (empleado)', suffix: '%' },
]

export default function NominaConfig() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [brackets, setBrackets] = useState([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    let active = true
    getPayrollConfig()
      .then((data) => {
        if (!active) return
        reset(data.config)
        setBrackets(data.isrBrackets)
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError, 'No fue posible cargar la configuración.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reset])

  const onSubmit = async (form) => {
    setError(''); setSaved(false)
    try {
      await updatePayrollConfig(form)
      setSaved(true)
    } catch (requestError) {
      setError(getApiError(requestError, 'No fue posible guardar la configuración.'))
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Cargando configuración...</div>

  const byPeriod = ['SEMANAL', 'QUINCENAL', 'MENSUAL'].map((period) => ({
    period,
    rows: brackets.filter((bracket) => bracket.period === period),
  }))

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-3xl">
    <div className="mb-8 flex items-center gap-4">
      <button onClick={() => navigate('/nominas')} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración de nómina</h1>
        <p className="text-sm text-slate-500">Porcentajes y prestaciones aplicados al calcular cada recibo.</p>
      </div>
    </div>

    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {saved && <div className="mb-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Configuración guardada. Aplica a las nóminas que se calculen a partir de ahora.</div>}

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">Parámetros de cálculo</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {fields.map((field) => <div key={field.name}>
            <label className={labelClass}>{field.label} <span className="text-slate-400">({field.suffix})</span></label>
            <input type="number" step="0.0001" className={inputClass} {...register(field.name)} />
          </div>)}
        </div>
        <button disabled={isSubmitting} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar configuración'}</button>
      </section>
    </form>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Tablas del ISR (SAT) por periodo</h2>
      <p className="mb-4 text-xs text-slate-400">Almacenadas en base de datos. La corrida guarda qué tabla usó cada recibo.</p>
      <div className="space-y-5">
        {byPeriod.map(({ period, rows }) => <div key={period}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{periodLabels[period]} · {rows.length} tramos</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs text-slate-500"><th className="px-3 py-2">Límite inferior</th><th className="px-3 py-2 text-right">Cuota fija</th><th className="px-3 py-2 text-right">% excedente</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((bracket) => <tr key={bracket.id}><td className="px-3 py-1.5 text-slate-600">{formatMoney(bracket.lowerLimit)}</td><td className="px-3 py-1.5 text-right text-slate-600">{formatMoney(bracket.fixedFee)}</td><td className="px-3 py-1.5 text-right text-slate-600">{bracket.rate}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>)}
      </div>
    </section>
  </div></div>
}
