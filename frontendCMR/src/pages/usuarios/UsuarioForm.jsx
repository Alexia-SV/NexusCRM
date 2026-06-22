import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { createEmployee, getEmployee, updateEmployee } from '../../services/employees'
import { getApiError } from '../../services/api'

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5'
const errorClass = 'text-xs text-rose-600 mt-1 block'
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

const defaults = {
  firstName: '', paternalLastName: '', maternalLastName: '', curp: '', rfc: '', nss: '',
  birthDate: '', sex: 'MASCULINO', maritalStatus: 'SOLTERO', phone: '', personalEmail: '',
  institutionalEmail: '', address: '', position: '', department: '', hireDate: '',
  contractType: 'BASE', dailySalary: '', integratedImssSalary: '', bankName: '', clabe: '', active: true,
  systemUser: { enabled: false, email: '', role: 'OPERATIVO', passwordMode: 'auto', password: '' },
}

function Field({ label, name, register, errors, rules, type = 'text', placeholder, className = '' }) {
  const error = name.split('.').reduce((value, part) => value?.[part], errors)
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} />{error && <span className={errorClass}>{error.message}</span>}</div>
}

function Section({ title, children }) {
  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6"><h2 className="text-sm font-semibold text-slate-800 mb-5 pb-3 border-b border-slate-100">{title}</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div></section>
}

export default function UsuarioForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [loading, setLoading] = useState(isEditing)
  const [serverError, setServerError] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [hasExistingUser, setHasExistingUser] = useState(false)
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })
  const systemAccess = useWatch({ control, name: 'systemUser.enabled' })
  const passwordMode = useWatch({ control, name: 'systemUser.passwordMode' })

  useEffect(() => {
    if (!isEditing) return
    getEmployee(id).then((employee) => {
      setHasExistingUser(Boolean(employee.user))
      reset({ ...employee, birthDate: employee.birthDate.slice(0, 10), hireDate: employee.hireDate.slice(0, 10), maternalLastName: employee.maternalLastName || '', rfc: employee.rfc || '', nss: employee.nss || '', phone: employee.phone || '', personalEmail: employee.personalEmail || '', institutionalEmail: employee.institutionalEmail || '', address: employee.address || '', integratedImssSalary: employee.integratedImssSalary ?? '', bankName: employee.bankName || '', clabe: employee.clabe || '', systemUser: { enabled: Boolean(employee.user?.active), email: employee.user?.email || employee.institutionalEmail || '', role: employee.user?.role || 'OPERATIVO', passwordMode: 'auto', password: '' } })
    }).catch((error) => setServerError(getApiError(error, 'No fue posible cargar el empleado.'))).finally(() => setLoading(false))
  }, [id, isEditing, reset])

  const onSubmit = async (form) => {
    setServerError('')
    const payload = { ...form, active: Boolean(form.active), systemUser: { ...form.systemUser, enabled: Boolean(form.systemUser.enabled), email: form.systemUser.email || undefined, password: form.systemUser.password || undefined } }
    try {
      const result = isEditing ? await updateEmployee(id, payload) : await createEmployee(payload)
      if (result.temporaryPassword) setTemporaryPassword(result.temporaryPassword)
      else navigate('/usuarios')
    } catch (error) {
      if (error.response?.data?.code === 'VALIDATION_ERROR') {
        setServerError(error.response.data.errors.map((item) => item.message).join(' · '))
      } else setServerError(getApiError(error, 'No fue posible guardar el empleado.'))
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Cargando empleado...</div>

  return <div className="flex-1 p-4 md:p-8 overflow-y-auto"><div className="max-w-4xl">
    <div className="flex items-center gap-4 mb-8"><button onClick={() => navigate('/usuarios')} className="p-2 rounded-xl bg-white border border-slate-200">←</button><div><h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar empleado' : 'Nuevo empleado'}</h1><p className="text-sm text-slate-500">Completa la información laboral, personal y de acceso.</p></div></div>
    {serverError && <div role="alert" className="mb-5 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{serverError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Section title="Datos personales">
        <Field label="Nombre" name="firstName" register={register} errors={errors} rules={{ required: 'El nombre es obligatorio' }} />
        <Field label="Apellido paterno" name="paternalLastName" register={register} errors={errors} rules={{ required: 'El apellido paterno es obligatorio' }} />
        <Field label="Apellido materno" name="maternalLastName" register={register} errors={errors} />
        <Field label="CURP" name="curp" register={register} errors={errors} placeholder="AAAA000000HXXXXXX00" rules={{ required: 'La CURP es obligatoria', pattern: { value: /^[A-Za-z][AEIOUXaeioux][A-Za-z]{2}\d{6}[HMhm][A-Za-z]{5}[A-Za-z0-9]\d$/, message: 'La CURP no tiene un formato válido' } }} />
        <Field label="RFC" name="rfc" register={register} errors={errors} placeholder="AAAA000000AAA" rules={{ pattern: { value: /^[A-Za-z&Ññ]{3,4}\d{6}[A-Za-z0-9]{3}$/, message: 'RFC no válido' } }} />
        <Field label="NSS / IMSS" name="nss" register={register} errors={errors} rules={{ pattern: { value: /^\d{11}$/, message: 'Debe contener 11 dígitos' } }} />
        <Field label="Fecha de nacimiento" name="birthDate" type="date" register={register} errors={errors} rules={{ required: 'La fecha es obligatoria' }} />
        <div><label className={labelClass}>Sexo</label><select className={inputClass} {...register('sex')}><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option></select></div>
        <div><label className={labelClass}>Estado civil</label><select className={inputClass} {...register('maritalStatus')}><option value="SOLTERO">Soltero(a)</option><option value="CASADO">Casado(a)</option><option value="UNION_LIBRE">Unión libre</option><option value="DIVORCIADO">Divorciado(a)</option><option value="VIUDO">Viudo(a)</option><option value="OTRO">Otro</option></select></div>
        <Field label="Teléfono" name="phone" register={register} errors={errors} />
        <Field label="Correo personal" name="personalEmail" type="email" register={register} errors={errors} />
        <Field label="Correo institucional" name="institutionalEmail" type="email" register={register} errors={errors} />
        <Field label="Dirección" name="address" register={register} errors={errors} className="sm:col-span-2" />
      </Section>
      <Section title="Datos laborales y bancarios">
        <Field label="Puesto / cargo" name="position" register={register} errors={errors} rules={{ required: 'El puesto es obligatorio' }} />
        <Field label="Área / departamento" name="department" register={register} errors={errors} rules={{ required: 'El área es obligatoria' }} />
        <Field label="Fecha de ingreso" name="hireDate" type="date" register={register} errors={errors} rules={{ required: 'La fecha es obligatoria' }} />
        <div><label className={labelClass}>Tipo de contrato</label><select className={inputClass} {...register('contractType')}><option value="BASE">Base</option><option value="TEMPORAL">Temporal</option><option value="HONORARIOS">Honorarios</option></select></div>
        <Field label="Salario diario" name="dailySalary" type="number" register={register} errors={errors} rules={{ required: 'El salario es obligatorio', min: { value: 0.01, message: 'Debe ser mayor a cero' } }} />
        <Field label="Salario integrado IMSS" name="integratedImssSalary" type="number" register={register} errors={errors} />
        <Field label="Banco" name="bankName" register={register} errors={errors} />
        <Field label="CLABE" name="clabe" register={register} errors={errors} rules={{ pattern: { value: /^\d{18}$/, message: 'Debe contener 18 dígitos' } }} />
        <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('active')} /> Empleado activo</label>
      </Section>
      <Section title="Acceso al sistema (opcional)">
        <label className="sm:col-span-2 flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('systemUser.enabled')} /> Crear o mantener una cuenta para este empleado</label>
        {systemAccess && <><Field label="Correo para iniciar sesión" name="systemUser.email" type="email" register={register} errors={errors} rules={{ required: 'El correo de acceso es obligatorio' }} /><div><label className={labelClass}>Rol</label><select className={inputClass} {...register('systemUser.role')}><option value="ADMIN">Admin</option><option value="LIDER">Líder</option><option value="OPERATIVO">Operativo</option><option value="CONTADOR">Contador</option></select></div>{(!isEditing || !hasExistingUser) && <><div><label className={labelClass}>Asignación de contraseña</label><select className={inputClass} {...register('systemUser.passwordMode')}><option value="auto">Generar temporal automáticamente</option><option value="manual">Capturar manualmente</option></select></div>{passwordMode === 'manual' && <Field label="Contraseña temporal" name="systemUser.password" type="password" register={register} errors={errors} rules={{ required: 'La contraseña es obligatoria', minLength: { value: 10, message: 'Mínimo 10 caracteres' }, pattern: { value: passwordPattern, message: 'Incluye mayúscula, minúscula, número y símbolo' } }} />}</>}</>}
      </Section>
      <div className="flex gap-3 pb-6"><button type="button" onClick={() => navigate('/usuarios')} className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm">Cancelar</button><button disabled={isSubmitting} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar empleado'}</button></div>
    </form>
  </div>{temporaryPassword && <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 className="text-lg font-bold text-slate-900">Cuenta creada</h2><p className="text-sm text-slate-500 mt-2">Copia esta contraseña temporal. Sólo se mostrará una vez.</p><code className="block mt-4 p-4 bg-slate-100 rounded-xl text-sm break-all select-all">{temporaryPassword}</code><button onClick={() => navigate('/usuarios')} className="w-full mt-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm">Entendido</button></div></div>}</div>
}
