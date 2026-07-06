import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../services/api'
import { createPayroll, getPayroll, updatePayroll } from '../../services/payroll'

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5'
const errorClass = 'text-xs text-rose-600 mt-1 block'

const defaults = { periodType: 'QUINCENAL', periodStart: '', periodEnd: '', paymentDate: '', applySavingsFund: false, notes: '' }

export default function NominaForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [loading, setLoading] = useState(isEditing)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults, mode: 'onBlur' })

  useEffect(() => {
    if (!isEditing) return
    let active = true
    getPayroll(id)
      .then((payroll) => {
        if (!active) return
        if (payroll.status !== 'BORRADOR') { navigate(`/nominas/${id}`, { replace: true }); return }
        reset({
          periodType: payroll.periodType,
          periodStart: payroll.periodStart.slice(0, 10),
          periodEnd: payroll.periodEnd.slice(0, 10),
          paymentDate: payroll.paymentDate.slice(0, 10),
          applySavingsFund: payroll.applySavingsFund,
          notes: payroll.notes || '',
        })
      })
      .catch((error) => { if (active) setServerError(getApiError(error, 'No fue posible cargar la nómina.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, isEditing, navigate, reset])

  const onSubmit = async (form) => {
    setServerError('')
    const payload = {
      periodType: form.periodType,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      paymentDate: form.paymentDate,
      applySavingsFund: Boolean(form.applySavingsFund),
      notes: form.notes || undefined,
    }
    try {
      const payroll = isEditing ? await updatePayroll(id, payload) : await createPayroll(payload)
      navigate(`/nominas/${payroll.id}`)
    } catch (error) {
      if (error.response?.data?.code === 'VALIDATION_ERROR') {
        setServerError(error.response.data.errors.map((item) => item.message).join(' · '))
      } else setServerError(getApiError(error, 'No fue posible guardar la nómina.'))
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Cargando...</div>

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-2xl">
    <div className="mb-8 flex items-center gap-4">
      <button onClick={() => navigate('/nominas')} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar nómina' : 'Nueva nómina'}</h1>
        <p className="text-sm text-slate-500">{isEditing ? 'Ajusta el periodo de la corrida.' : 'Se generará un recibo por cada empleado activo.'}</p>
      </div>
    </div>

    {serverError && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>}

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">Periodo de nómina</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Tipo de periodo</label>
            <select className={inputClass} {...register('periodType')}>
              <option value="SEMANAL">Semanal (7 días)</option>
              <option value="QUINCENAL">Quincenal (15 días)</option>
              <option value="MENSUAL">Mensual (30 días)</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">Define qué tabla del ISR (SAT) se aplica.</p>
          </div>
          <div>
            <label className={labelClass}>Inicio del periodo</label>
            <input type="date" className={inputClass} {...register('periodStart', { required: 'Requerido' })} />
            {errors.periodStart && <span className={errorClass}>{errors.periodStart.message}</span>}
          </div>
          <div>
            <label className={labelClass}>Fin del periodo</label>
            <input type="date" className={inputClass} {...register('periodEnd', { required: 'Requerido' })} />
            {errors.periodEnd && <span className={errorClass}>{errors.periodEnd.message}</span>}
          </div>
          <div>
            <label className={labelClass}>Fecha de pago</label>
            <input type="date" className={inputClass} {...register('paymentDate', { required: 'Requerido' })} />
            {errors.paymentDate && <span className={errorClass}>{errors.paymentDate.message}</span>}
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('applySavingsFund')} /> Aplicar fondo de ahorro</label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notas</label>
            <textarea rows={2} placeholder="Comentarios de la corrida (opcional)" className={`${inputClass} resize-none`} {...register('notes')} />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row">
        <button type="button" onClick={() => navigate('/nominas')} className="w-full rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto">Cancelar</button>
        <button disabled={isSubmitting} className="w-full rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-400 sm:w-auto">{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear y generar recibos'}</button>
      </div>
    </form>
  </div></div>
}
