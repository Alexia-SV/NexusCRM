import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { createProvider, getProvider, updateProvider } from '../../services/providers'
import { getApiError } from '../../services/api'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700'
const errorClass = 'mt-1 block text-xs text-rose-600'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const defaults = {
  businessName: '', rfc: '', personType: 'MORAL', taxRegime: '', curp: '', category: 'MATERIALES', status: 'EVALUACION',
  contactName: '', contactPosition: '', phone: '', email: '', website: '', address: '', postalCode: '', cityState: '',
  bankName: '', clabe: '', accountNumber: '', currency: 'MXN', paymentTerms: 'Contado', authorizedCredit: '',
  lastPurchaseAt: '', totalHistoricalPurchases: 0, rating: '', internalNotes: '',
}

function Section({ title, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">{title}</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div></section>
}

function Field({ label, name, register, errors, rules, type = 'text', className = '', inputProps = {}, placeholder = '' }) {
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} {...inputProps} />{errors[name] && <span className={errorClass}>{errors[name].message}</span>}</div>
}

export default function ProveedorForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [loading, setLoading] = useState(isEditing)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })
  const personType = useWatch({ control, name: 'personType' })

  useEffect(() => {
    if (!isEditing) return
    getProvider(id).then((provider) => reset({
      ...defaults,
      ...provider,
      lastPurchaseAt: provider.lastPurchaseAt ? provider.lastPurchaseAt.slice(0, 10) : '',
      authorizedCredit: provider.authorizedCredit ?? '',
      rating: provider.rating ?? '',
    })).catch((error) => setServerError(getApiError(error, 'No fue posible cargar el proveedor.'))).finally(() => setLoading(false))
  }, [id, isEditing, reset])

  const onSubmit = async (form) => {
    setServerError('')
    const payload = { ...form, curp: form.personType === 'FISICA' ? form.curp : '', website: form.website || undefined, authorizedCredit: form.authorizedCredit === '' ? undefined : Number(form.authorizedCredit), rating: form.rating === '' ? undefined : Number(form.rating), totalHistoricalPurchases: Number(form.totalHistoricalPurchases || 0) }
    try {
      if (isEditing) await updateProvider(id, payload)
      else await createProvider(payload)
      navigate('/proveedores')
    } catch (error) {
      setServerError(error.response?.data?.errors?.map((item) => item.message).join(' - ') || getApiError(error, 'No fue posible guardar el proveedor.'))
    }
  }

  if (loading) return <div className="flex-1 p-8 text-sm text-slate-500">Cargando proveedor...</div>

  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-5xl">
    <div className="mb-8 flex items-center gap-4"><button onClick={() => navigate('/proveedores')} className="rounded-xl bg-white p-2 text-slate-500">←</button><div><h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</h1><p className="mt-1 text-sm text-slate-500">Identificacion fiscal, contacto, pagos y control interno.</p></div></div>
    {serverError && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Section title="Identificacion fiscal">
        <Field label="Razon social" name="businessName" register={register} errors={errors} className="sm:col-span-2" rules={{ required: 'La razon social es obligatoria' }} />
        <Field label="RFC" name="rfc" register={register} errors={errors} inputProps={{ maxLength: 13 }} rules={{ required: 'El RFC es obligatorio', pattern: { value: /^[A-Za-z&Ññ]{3,4}\d{6}[A-Za-z0-9]{3}$/, message: 'Formato RFC invalido' } }} />
        <div><label className={labelClass}>Tipo de persona</label><select className={inputClass} {...register('personType')}><option value="FISICA">Fisica</option><option value="MORAL">Moral</option></select></div>
        <Field label="Regimen fiscal" name="taxRegime" register={register} errors={errors} rules={{ required: 'El regimen fiscal es obligatorio' }} />
        {personType === 'FISICA' && <Field label="CURP" name="curp" register={register} errors={errors} inputProps={{ maxLength: 18 }} rules={{ required: 'La CURP es obligatoria para persona fisica', pattern: { value: /^[A-Za-z][AEIOUXaeioux][A-Za-z]{2}\d{6}[HMhm][A-Za-z]{5}[A-Za-z0-9]\d$/, message: 'Formato CURP invalido' } }} />}
        <div><label className={labelClass}>Giro / categoria</label><select className={inputClass} {...register('category')}><option value="MATERIALES">Materiales</option><option value="SERVICIOS">Servicios</option><option value="EQUIPO">Equipo</option><option value="OTRO">Otro</option></select></div>
        <div><label className={labelClass}>Estado</label><select className={inputClass} {...register('status')}><option value="EVALUACION">En evaluacion</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option><option value="BLOQUEADO">Bloqueado</option></select></div>
      </Section>
      <Section title="Contacto y ubicacion">
        <Field label="Nombre de contacto" name="contactName" register={register} errors={errors} rules={{ required: 'El contacto es obligatorio' }} />
        <Field label="Puesto del contacto" name="contactPosition" register={register} errors={errors} />
        <Field label="Telefono" name="phone" register={register} errors={errors} rules={{ required: 'El telefono es obligatorio' }} />
        <Field label="Correo electronico" name="email" type="email" register={register} errors={errors} rules={{ required: 'El correo es obligatorio', pattern: { value: emailPattern, message: 'Correo invalido' } }} />
        <Field label="Sitio web" name="website" register={register} errors={errors} placeholder="https://empresa.com" />
        <Field label="Codigo postal" name="postalCode" register={register} errors={errors} inputProps={{ maxLength: 10 }} />
        <Field label="Ciudad / Estado" name="cityState" register={register} errors={errors} />
        <Field label="Direccion" name="address" register={register} errors={errors} className="sm:col-span-2" />
      </Section>
      <Section title="Datos de pago">
        <Field label="Banco" name="bankName" register={register} errors={errors} />
        <Field label="CLABE interbancaria" name="clabe" register={register} errors={errors} inputProps={{ maxLength: 18, inputMode: 'numeric' }} rules={{ pattern: { value: /^\d{18}$/, message: 'La CLABE debe tener 18 digitos' } }} />
        <Field label="Numero de cuenta" name="accountNumber" register={register} errors={errors} />
        <div><label className={labelClass}>Moneda</label><select className={inputClass} {...register('currency')}><option value="MXN">MXN</option><option value="USD">USD</option></select></div>
        <Field label="Condiciones de pago" name="paymentTerms" register={register} errors={errors} placeholder="Contado / 15 dias / 30 dias" />
        <Field label="Credito autorizado" name="authorizedCredit" type="number" register={register} errors={errors} />
      </Section>
      <Section title="Control interno">
        <Field label="Ultima compra" name="lastPurchaseAt" type="date" register={register} errors={errors} />
        <Field label="Total compras historicas" name="totalHistoricalPurchases" type="number" register={register} errors={errors} />
        <Field label="Calificacion (1-5)" name="rating" type="number" register={register} errors={errors} inputProps={{ min: 1, max: 5 }} />
        <div className="sm:col-span-2"><label className={labelClass}>Notas internas</label><textarea rows={4} className={`${inputClass} resize-none`} {...register('internalNotes')} /></div>
      </Section>
      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row"><button type="button" onClick={() => navigate('/proveedores')} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-600">Cancelar</button><button disabled={isSubmitting} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar proveedor'}</button></div>
    </form>
  </div></div>
}
