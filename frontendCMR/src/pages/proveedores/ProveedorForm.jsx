import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-all placeholder-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const labelClass = 'mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-700'
const errorClass = 'ml-1 mt-1 block text-[11px] font-medium text-red-500'

const defaults = {
  tipo: 'cliente',
  razon_social: '',
  rfc: '',
  tipo_persona: 'moral',
  regimen_fiscal: '',
  curp: '',
  contacto: '',
  email: '',
  telefono: '',
  direccion: '',
  codigo_postal: '',
  ciudad_estado: '',
  status: 'prospecto',
  fecha_registro: new Date().toISOString().slice(0, 10),
  ultima_actualizacion: new Date().toISOString().slice(0, 10),
  notas_internas: '',
  registrado_por: 'Administrador Nexus CRM',
}

function Section({ title, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">{title}</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div></section>
}

function Field({ label, name, register, errors, rules, type = 'text', placeholder, className = '', inputProps = {} }) {
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} {...inputProps}/>{errors[name] && <span className={errorClass}>{errors[name].message}</span>}</div>
}

export default function ProveedorForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { proveedores, crearProveedor, editarProveedor } = useApp()
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })
  const tipoPersona = useWatch({ control, name: 'tipo_persona' })

  useEffect(() => {
    if (!isEditing) return
    const proveedor = proveedores.find((item) => item.id === Number(id))
    if (proveedor) reset({ ...defaults, ...proveedor })
  }, [id, isEditing, proveedores, reset])

  const onSubmit = async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const payload = {
      ...data,
      ultima_actualizacion: new Date().toISOString().slice(0, 10),
      curp: data.tipo_persona === 'fisica' ? data.curp : '',
    }
    if (isEditing) editarProveedor(id, payload)
    else crearProveedor(payload)
    navigate('/proveedores')
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex items-center gap-4"><button onClick={() => navigate('/proveedores')} className="rounded-xl bg-white p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">←</button><div><h1 className="text-xl font-bold text-slate-900 md:text-2xl">{isEditing ? 'Editar cliente / proveedor' : 'Nuevo cliente / proveedor'}</h1><p className="mt-1 text-sm text-slate-500">Captura informacion fiscal, contacto, ubicacion y control interno.</p></div></div>
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-6">
      <Section title="Identificacion fiscal">
        <div><label className={labelClass}>Tipo de registro</label><select className={inputClass} {...register('tipo')}><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option></select></div>
        <div><label className={labelClass}>Tipo de persona</label><select className={inputClass} {...register('tipo_persona')}><option value="fisica">Fisica</option><option value="moral">Moral</option></select></div>
        <Field label="Razon social" name="razon_social" register={register} errors={errors} placeholder="Empresa S.A. de C.V." className="sm:col-span-2" rules={{ required: 'La razon social es obligatoria' }}/>
        <Field label="RFC" name="rfc" register={register} errors={errors} placeholder="AAA000000AAA" inputProps={{ maxLength: 13 }} rules={{ required: 'El RFC es obligatorio', minLength: { value: 12, message: 'Minimo 12 caracteres' }, maxLength: { value: 13, message: 'Maximo 13 caracteres' } }}/>
        <Field label="Regimen fiscal" name="regimen_fiscal" register={register} errors={errors} placeholder="General de Ley Personas Morales"/>
        {tipoPersona === 'fisica' && <Field label="CURP" name="curp" register={register} errors={errors} placeholder="AAAA000000HXXXXXX00" inputProps={{ maxLength: 18 }} rules={{ minLength: { value: 18, message: 'La CURP debe tener 18 caracteres' } }}/>}
      </Section>

      <Section title="Contacto y ubicacion">
        <Field label="Nombre de contacto" name="contacto" register={register} errors={errors} placeholder="Nombre del responsable" rules={{ required: 'El contacto es obligatorio' }}/>
        <Field label="Telefono" name="telefono" register={register} errors={errors} placeholder="2221234567" rules={{ required: 'El telefono es obligatorio' }}/>
        <Field label="Correo electronico" name="email" type="email" register={register} errors={errors} placeholder="contacto@empresa.com" className="sm:col-span-2" rules={{ required: 'El correo es obligatorio' }}/>
        <Field label="Direccion" name="direccion" register={register} errors={errors} placeholder="Calle, numero, colonia" className="sm:col-span-2"/>
        <Field label="Codigo postal" name="codigo_postal" register={register} errors={errors} placeholder="72000" inputProps={{ maxLength: 5 }}/>
        <Field label="Ciudad / Estado" name="ciudad_estado" register={register} errors={errors} placeholder="Puebla, Puebla"/>
      </Section>

      <Section title="Control interno">
        <div><label className={labelClass}>Estado</label><select className={inputClass} {...register('status')}><option value="prospecto">Prospecto</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="bloqueado">Bloqueado</option></select></div>
        <Field label="Registrado por" name="registrado_por" register={register} errors={errors}/>
        <Field label="Fecha de registro" name="fecha_registro" type="date" register={register} errors={errors}/>
        <Field label="Ultima actualizacion" name="ultima_actualizacion" type="date" register={register} errors={errors}/>
        <div className="sm:col-span-2"><label className={labelClass}>Notas internas</label><textarea rows={4} placeholder="Notas comerciales, pagos, restricciones o seguimiento..." className={`${inputClass} resize-none`} {...register('notas_internas')}/></div>
      </Section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm"><h2 className="mb-3 text-sm font-semibold text-slate-800">Estados posibles</h2><div className="flex flex-wrap gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Prospecto</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Activo</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Inactivo</span><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Bloqueado</span></div><div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2"><p>Prospecto: cotizacion enviada, sin proyecto aun.</p><p>Activo: tiene al menos un proyecto en curso.</p><p>Inactivo: sin proyectos activos en 6 meses.</p><p>Bloqueado: problema de pago o conflicto.</p></div></div>

      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row"><button type="button" onClick={() => navigate('/proveedores')} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-600">Cancelar</button><button disabled={isSubmitting} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar registro'}</button></div>
    </form>
  </div>
}
