import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { listProviders } from '../../services/providers'
import { createSupply, getSupply, updateSupply } from '../../services/supplies'
import { getApiError } from '../../services/api'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700'
const errorClass = 'mt-1 block text-xs text-rose-600'
const defaults = { name: '', sku: '', description: '', category: 'MATERIAL', unit: 'pza', referenceUnitPrice: '', currentStock: 0, minimumStock: 0, maximumStock: '', preferredProviderId: '', active: true }

function Field({ label, name, register, errors, rules, type = 'text', className = '', inputProps = {}, placeholder = '' }) {
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} {...inputProps} />{errors[name] && <span className={errorClass}>{errors[name].message}</span>}</div>
}

export default function InsumoForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [providers, setProviders] = useState([])
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })

  useEffect(() => { listProviders({ status: 'ACTIVO' }).then(setProviders).catch(() => setProviders([])) }, [])
  useEffect(() => {
    if (!isEditing) return
    getSupply(id).then((supply) => reset({ ...defaults, ...supply, referenceUnitPrice: supply.referenceUnitPrice ?? '', maximumStock: supply.maximumStock ?? '', preferredProviderId: supply.preferredProviderId || '' })).catch((error) => setServerError(getApiError(error, 'No fue posible cargar el insumo.'))).finally(() => setLoading(false))
  }, [id, isEditing, reset])

  const onSubmit = async (form) => {
    setServerError('')
    const payload = { ...form, referenceUnitPrice: form.referenceUnitPrice === '' ? undefined : Number(form.referenceUnitPrice), currentStock: Number(form.currentStock || 0), minimumStock: Number(form.minimumStock || 0), maximumStock: form.maximumStock === '' ? undefined : Number(form.maximumStock), preferredProviderId: form.preferredProviderId || undefined, active: Boolean(form.active) }
    try {
      if (isEditing) await updateSupply(id, payload)
      else await createSupply(payload)
      navigate('/insumos')
    } catch (error) { setServerError(error.response?.data?.errors?.map((item) => item.message).join(' - ') || getApiError(error, 'No fue posible guardar el insumo.')) }
  }

  if (loading) return <div className="flex-1 p-8 text-sm text-slate-500">Cargando insumo...</div>
  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-4xl">
    <div className="mb-8 flex items-center gap-4"><button onClick={() => navigate('/insumos')} className="rounded-xl bg-white p-2 text-slate-500">←</button><div><h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar insumo' : 'Nuevo insumo'}</h1><p className="mt-1 text-sm text-slate-500">Catalogo, proveedor preferido y umbrales de inventario.</p></div></div>
    {serverError && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">Catalogo de insumos</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nombre" name="name" register={register} errors={errors} rules={{ required: 'El nombre es obligatorio' }} />
        <Field label="Codigo / SKU" name="sku" register={register} errors={errors} rules={{ required: 'El SKU es obligatorio' }} />
        <div className="sm:col-span-2"><label className={labelClass}>Descripcion</label><textarea rows={3} className={`${inputClass} resize-none`} {...register('description')} /></div>
        <div><label className={labelClass}>Categoria</label><select className={inputClass} {...register('category')}><option value="MATERIAL">Material</option><option value="HERRAMIENTA">Herramienta</option><option value="CONSUMIBLE">Consumible</option><option value="EQUIPO">Equipo</option></select></div>
        <Field label="Unidad de medida" name="unit" register={register} errors={errors} placeholder="kg / lt / pza / m / caja" rules={{ required: 'La unidad es obligatoria' }} />
        <Field label="Precio unitario ref." name="referenceUnitPrice" type="number" register={register} errors={errors} />
        <Field label="Stock actual" name="currentStock" type="number" register={register} errors={errors} rules={{ min: { value: 0, message: 'No puede ser negativo' } }} />
        <Field label="Stock minimo" name="minimumStock" type="number" register={register} errors={errors} />
        <Field label="Stock maximo" name="maximumStock" type="number" register={register} errors={errors} />
        <div><label className={labelClass}>Proveedor preferido</label><select className={inputClass} {...register('preferredProviderId')}><option value="">Sin proveedor</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.businessName}</option>)}</select></div>
        <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('active')} /> Insumo activo</label>
      </div></section>
      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row"><button type="button" onClick={() => navigate('/insumos')} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-600">Cancelar</button><button disabled={isSubmitting} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar insumo'}</button></div>
    </form>
  </div></div>
}
