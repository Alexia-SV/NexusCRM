import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { createEmployee, getEmployee, updateEmployee } from '../../services/employees'
import { getApiError } from '../../services/api'
import PasswordField from '../../components/auth/PasswordField'

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5'
const errorClass = 'text-xs text-rose-600 mt-1 block'
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const otherBankValue = '__OTHER__'
const banks = [
  'ABC Capital', 'Actinver', 'Afirme', 'Autofin', 'Banco Azteca', 'Banco Bancrea',
  'Banco Base', 'Banco Covalto', 'Banco del Bajío (BanBajío)', 'Banco Inmobiliario Mexicano',
  'Banco Multiva', 'Banco Sabadell', 'BanCoppel', 'Bank of America', 'Bank of China',
  'Banorte', 'Banregio', 'Bansi', 'Barclays', 'BBVA México', 'CIBanco', 'Citibanamex',
  'Citi México', 'Compartamos Banco', 'Consubanco', 'Deutsche Bank', 'Dondé Banco',
  'Forjadores', 'HSBC México', 'ICBC México', 'Inbursa', 'Intercam Banco', 'Invex',
  'J.P. Morgan', 'KEB Hana México', 'Mifel', 'Mizuho Bank', 'Monex', 'MUFG Bank',
  'Pagatodo', 'Santander México', 'Scotiabank', 'Shinhan México', 'Ualá',
  'Volkswagen Bank',
]

const defaults = {
  firstName: '', paternalLastName: '', maternalLastName: '', curp: '', rfc: '', nss: '',
  birthDate: '', sex: 'MASCULINO', maritalStatus: 'SOLTERO', phone: '', personalEmail: '',
  institutionalEmail: '', address: '', position: '', department: '', hireDate: '',
  contractType: 'BASE', dailySalary: '', integratedImssSalary: '', bankName: '', otherBankName: '', clabe: '', afore: '', active: true,
  systemUser: { enabled: false, email: '', role: 'OPERATIVO', passwordMode: 'auto', password: '' },
}

function Field({ label, name, register, errors, rules, type = 'text', placeholder, className = '', inputProps = {} }) {
  const error = name.split('.').reduce((value, part) => value?.[part], errors)
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} {...inputProps} />{error && <span className={errorClass}>{error.message}</span>}</div>
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
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [hasExistingUser, setHasExistingUser] = useState(false)
  const { register, handleSubmit, reset, control, trigger, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaults,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })
  const systemAccess = useWatch({ control, name: 'systemUser.enabled' })
  const passwordMode = useWatch({ control, name: 'systemUser.passwordMode' })
  const curp = useWatch({ control, name: 'curp' })
  const rfc = useWatch({ control, name: 'rfc' })
  const nss = useWatch({ control, name: 'nss' })
  const clabe = useWatch({ control, name: 'clabe' })
  const personalEmail = useWatch({ control, name: 'personalEmail' })
  const institutionalEmail = useWatch({ control, name: 'institutionalEmail' })
  const systemEmail = useWatch({ control, name: 'systemUser.email' })
  const selectedBank = useWatch({ control, name: 'bankName' })

  useEffect(() => {
    const fieldsToValidate = [
      ['curp', curp],
      ['rfc', rfc],
      ['nss', nss],
      ['clabe', clabe],
      ['personalEmail', personalEmail],
      ['institutionalEmail', institutionalEmail],
      ['systemUser.email', systemEmail],
    ].filter(([, value]) => value).map(([name]) => name)

    if (!fieldsToValidate.length) return undefined

    const validationTimer = window.setTimeout(() => {
      void trigger(fieldsToValidate)
    }, 600)

    return () => window.clearTimeout(validationTimer)
  }, [clabe, curp, institutionalEmail, nss, personalEmail, rfc, systemEmail, trigger])

  useEffect(() => {
    if (!isEditing) return
    getEmployee(id).then((employee) => {
      setHasExistingUser(Boolean(employee.user))
      const savedBank = employee.bankName || ''
      reset({ ...employee, birthDate: employee.birthDate.slice(0, 10), hireDate: employee.hireDate.slice(0, 10), maternalLastName: employee.maternalLastName || '', rfc: employee.rfc || '', nss: employee.nss || '', phone: employee.phone || '', personalEmail: employee.personalEmail || '', institutionalEmail: employee.institutionalEmail || '', address: employee.address || '', integratedImssSalary: employee.integratedImssSalary ?? '', bankName: banks.includes(savedBank) ? savedBank : savedBank ? otherBankValue : '', otherBankName: banks.includes(savedBank) ? '' : savedBank, clabe: employee.clabe || '', afore: employee.afore || '', systemUser: { enabled: Boolean(employee.user?.active), email: employee.user?.email || employee.institutionalEmail || '', role: employee.user?.role || 'OPERATIVO', passwordMode: 'auto', password: '' } })
    }).catch((error) => setServerError(getApiError(error, 'No fue posible cargar el empleado.'))).finally(() => setLoading(false))
  }, [id, isEditing, reset])

  const onSubmit = async (form) => {
    setServerError('')
    const { otherBankName, ...employeeForm } = form
    const payload = { ...employeeForm, bankName: form.bankName === otherBankValue ? (otherBankName || '').trim() : form.bankName, active: Boolean(form.active), systemUser: { ...form.systemUser, enabled: Boolean(form.systemUser.enabled), email: form.systemUser.email || undefined, password: form.systemUser.password || undefined } }
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

  const copyTemporaryPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword)
    } catch {
      const field = document.createElement('textarea')
      field.value = temporaryPassword
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      document.execCommand('copy')
      field.remove()
    }
    setPasswordCopied(true)
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
        <Field label="CURP" name="curp" register={register} errors={errors} placeholder="AAAA000000HXXXXXX00" inputProps={{ maxLength: 18, autoCapitalize: 'characters', spellCheck: false }} rules={{ required: 'La CURP es obligatoria', pattern: { value: /^[A-Za-z][AEIOUXaeioux][A-Za-z]{2}\d{6}[HMhm][A-Za-z]{5}[A-Za-z0-9]\d$/, message: 'Debe tener 18 caracteres y respetar el formato oficial de CURP' } }} />
        <Field label="RFC" name="rfc" register={register} errors={errors} placeholder="AAAA000000AAA" inputProps={{ maxLength: 13, autoCapitalize: 'characters', spellCheck: false }} rules={{ pattern: { value: /^[A-Za-z&Ññ]{3,4}\d{6}[A-Za-z0-9]{3}$/, message: 'Debe tener 12 o 13 caracteres con un formato de RFC válido' } }} />
        <Field label="NSS / IMSS" name="nss" register={register} errors={errors} inputProps={{ maxLength: 11, inputMode: 'numeric' }} rules={{ pattern: { value: /^\d{11}$/, message: 'El NSS debe contener exactamente 11 dígitos' } }} />
        <Field label="Fecha de nacimiento" name="birthDate" type="date" register={register} errors={errors} rules={{ required: 'La fecha es obligatoria' }} />
        <div><label className={labelClass}>Sexo</label><select className={inputClass} {...register('sex')}><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option></select></div>
        <div><label className={labelClass}>Estado civil</label><select className={inputClass} {...register('maritalStatus')}><option value="SOLTERO">Soltero(a)</option><option value="CASADO">Casado(a)</option><option value="UNION_LIBRE">Unión libre</option><option value="DIVORCIADO">Divorciado(a)</option><option value="VIUDO">Viudo(a)</option><option value="OTRO">Otro</option></select></div>
        <Field label="Teléfono" name="phone" register={register} errors={errors} />
        <Field label="Correo personal" name="personalEmail" type="email" register={register} errors={errors} inputProps={{ autoCapitalize: 'none', autoComplete: 'email', spellCheck: false }} rules={{ pattern: { value: emailPattern, message: 'Ingresa un correo válido, por ejemplo: nombre@dominio.com' } }} />
        <Field label="Correo institucional" name="institutionalEmail" type="email" register={register} errors={errors} inputProps={{ autoCapitalize: 'none', autoComplete: 'email', spellCheck: false }} rules={{ pattern: { value: emailPattern, message: 'Ingresa un correo válido, por ejemplo: nombre@empresa.com' } }} />
        <Field label="Dirección" name="address" register={register} errors={errors} className="sm:col-span-2" />
      </Section>
      <Section title="Datos laborales y bancarios">
        <Field label="Puesto / cargo" name="position" register={register} errors={errors} rules={{ required: 'El puesto es obligatorio' }} />
        <Field label="Área / departamento" name="department" register={register} errors={errors} rules={{ required: 'El área es obligatoria' }} />
        <Field label="Fecha de ingreso" name="hireDate" type="date" register={register} errors={errors} rules={{ required: 'La fecha es obligatoria' }} />
        <div><label className={labelClass}>Tipo de contrato</label><select className={inputClass} {...register('contractType')}><option value="BASE">Base</option><option value="TEMPORAL">Temporal</option><option value="HONORARIOS">Honorarios</option></select></div>
        <Field label="Salario diario" name="dailySalary" type="number" register={register} errors={errors} rules={{ required: 'El salario es obligatorio', min: { value: 0.01, message: 'Debe ser mayor a cero' } }} />
        <Field label="Salario integrado IMSS" name="integratedImssSalary" type="number" register={register} errors={errors} />
        <div><label className={labelClass}>Banco</label><select className={inputClass} {...register('bankName')}><option value="">Selecciona un banco</option>{banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}<option value={otherBankValue}>Otro</option></select></div>
        {selectedBank === otherBankValue && <Field label="Nombre del otro banco" name="otherBankName" register={register} errors={errors} inputProps={{ maxLength: 100 }} rules={{ validate: (value) => selectedBank !== otherBankValue || value.trim().length > 0 || 'Escribe el nombre del banco' }} />}
        <Field label="CLABE" name="clabe" register={register} errors={errors} inputProps={{ maxLength: 18, inputMode: 'numeric' }} rules={{ pattern: { value: /^\d{18}$/, message: 'La CLABE debe contener exactamente 18 dígitos' } }} />
        <Field label="AFORE" name="afore" register={register} errors={errors} placeholder="Ej. XXI Banorte, Profuturo..." inputProps={{ maxLength: 100 }} />
        <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('active')} /> Empleado activo</label>
      </Section>
      <Section title="Acceso al sistema (opcional)">
        <label className="sm:col-span-2 flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...register('systemUser.enabled')} /> Crear o mantener una cuenta para este empleado</label>
        {systemAccess && <><Field label="Correo para iniciar sesión" name="systemUser.email" type="email" register={register} errors={errors} inputProps={{ autoCapitalize: 'none', autoComplete: 'email', spellCheck: false }} rules={{ required: 'El correo de acceso es obligatorio', pattern: { value: emailPattern, message: 'Ingresa un correo de acceso válido' } }} /><div><label className={labelClass}>Rol</label><select className={inputClass} {...register('systemUser.role')}><option value="ADMIN">Admin</option><option value="LIDER">Líder</option><option value="OPERATIVO">Operativo</option><option value="CONTADOR">Contador</option></select></div>{(!isEditing || !hasExistingUser) && <><div><label className={labelClass}>Asignación de contraseña</label><select className={inputClass} {...register('systemUser.passwordMode')}><option value="auto">Generar temporal automáticamente</option><option value="manual">Capturar manualmente</option></select></div>{passwordMode === 'manual' && <PasswordField label="Contraseña temporal" name="systemUser.password" register={register} error={errors.systemUser?.password} rules={{ required: 'La contraseña es obligatoria', minLength: { value: 10, message: 'Mínimo 10 caracteres' }, pattern: { value: passwordPattern, message: 'Incluye mayúscula, minúscula, número y símbolo' } }} />}</>}</>}
      </Section>
      <div className="flex flex-col-reverse sm:flex-row gap-3 pb-6"><button type="button" onClick={() => navigate('/usuarios')} className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 rounded-xl text-sm">Cancelar</button><button disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar empleado'}</button></div>
    </form>
  </div>{temporaryPassword && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><h2 className="text-lg font-bold text-slate-900">Cuenta creada</h2><p className="mt-2 text-sm text-slate-500">Copia esta contraseña temporal. Sólo se mostrará una vez.</p><code className="mt-4 block select-all break-all rounded-xl bg-slate-100 p-4 text-sm">{temporaryPassword}</code><button type="button" onClick={copyTemporaryPassword} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${passwordCopied ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75V5.625A2.625 2.625 0 0 1 10.875 3h7.5A2.625 2.625 0 0 1 21 5.625v7.5a2.625 2.625 0 0 1-2.625 2.625H17.25m-9-9h-2.625A2.625 2.625 0 0 0 3 9.375v9A2.625 2.625 0 0 0 5.625 21h9a2.625 2.625 0 0 0 2.625-2.625v-2.625m-9-9h6.375a2.625 2.625 0 0 1 2.625 2.625v6.375"/></svg>{passwordCopied ? 'Contraseña copiada' : 'Copiar contraseña'}</button><button onClick={() => navigate('/usuarios')} className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-sm text-white">Entendido</button></div></div>}</div>
}
