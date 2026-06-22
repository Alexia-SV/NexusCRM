import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { deactivateEmployee, listEmployees } from '../../services/employees'
import { getApiError } from '../../services/api'

function StatusBadge({ active }) {
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Activo' : 'Inactivo'}</span>
}

function initials(employee) {
  return `${employee.firstName?.[0] || ''}${employee.paternalLastName?.[0] || ''}`.toUpperCase()
}

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return 'Sin registrar'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatMoney(value) {
  if (value == null || value === '') return 'Sin registrar'
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function Info({ label, value, wide = false }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

function EmployeeModal({ employee, canWrite, onClose, onEdit, onDeactivate }) {
  const [confirming, setConfirming] = useState(false)

  const downloadFile = () => {
    const file = {
      employeeId: employee.id,
      name: fullName(employee),
      curp: employee.curp,
      rfc: employee.rfc,
      nss: employee.nss,
      birthDate: employee.birthDate,
      sex: employee.sex,
      maritalStatus: employee.maritalStatus,
      phone: employee.phone,
      personalEmail: employee.personalEmail,
      institutionalEmail: employee.institutionalEmail,
      address: employee.address,
      position: employee.position,
      department: employee.department,
      hireDate: employee.hireDate,
      contractType: employee.contractType,
      dailySalary: employee.dailySalary,
      integratedImssSalary: employee.integratedImssSalary,
      bankName: employee.bankName,
      clabe: employee.clabe,
      active: employee.active,
      systemUser: employee.user,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `expediente-${employee.curp}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{initials(employee)}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 id="employee-modal-title" className="text-lg font-bold text-slate-900 sm:text-xl">{fullName(employee)}</h2><StatusBadge active={employee.active}/></div><p className="mt-1 text-sm text-slate-500">{employee.position} · {employee.department}</p></div>
        <button onClick={onClose} aria-label="Cerrar expediente" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Datos personales</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="CURP" value={employee.curp}/><Info label="RFC" value={employee.rfc}/><Info label="NSS / IMSS" value={employee.nss}/><Info label="Fecha de nacimiento" value={formatDate(employee.birthDate)}/><Info label="Sexo" value={employee.sex}/><Info label="Estado civil" value={employee.maritalStatus}/><Info label="Teléfono" value={employee.phone}/><Info label="Correo personal" value={employee.personalEmail}/><Info label="Correo institucional" value={employee.institutionalEmail}/><Info label="Dirección" value={employee.address} wide/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Datos laborales y bancarios</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Puesto" value={employee.position}/><Info label="Área / departamento" value={employee.department}/><Info label="Fecha de ingreso" value={formatDate(employee.hireDate)}/><Info label="Tipo de contrato" value={employee.contractType}/><Info label="Salario diario" value={formatMoney(employee.dailySalary)}/><Info label="Salario integrado IMSS" value={formatMoney(employee.integratedImssSalary)}/><Info label="Banco" value={employee.bankName}/><Info label="CLABE" value={employee.clabe}/></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Acceso al sistema</h3>{employee.user ? <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Correo de acceso" value={employee.user.email}/><Info label="Rol" value={employee.user.role}/><Info label="Estado de cuenta" value={employee.user.active ? 'Activa' : 'Inactiva'}/><Info label="Cambio de contraseña" value={employee.user.mustChangePassword ? 'Pendiente' : 'Completado'}/></dl> : <p className="text-sm text-slate-500">Este empleado no tiene una cuenta de acceso.</p>}</section>
      </div>

      <footer className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
        {confirming ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Se desactivará el empleado, su usuario y sus sesiones. ¿Continuar?</p><div className="flex gap-2"><button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={onDeactivate} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white">Confirmar</button></div></div> : <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end"><button onClick={downloadFile} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15v-15h-9l-6 6v9Zm6-15v6h-6"/></svg>Archivo</button>{canWrite && <button onClick={onEdit} className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">Editar</button>}{canWrite && employee.active && <button onClick={() => setConfirming(true)} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">Desactivar</button>}</div>}
      </footer>
    </div>
  </div>
}

export default function UsuariosList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWrite = can(permissions.usuariosWrite)
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setEmployees(await listEmployees({ search: search || undefined, active: active || undefined, department: department || undefined, position: position || undefined })) }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible cargar los empleados.')) }
    finally { setLoading(false) }
  }, [search, active, department, position])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])

  const deactivate = async () => {
    try { await deactivateEmployee(selected.id); setSelected(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible desactivar al empleado.')) }
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-slate-900">Empleados</h1><p className="mt-1 text-sm text-slate-500">{employees.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/usuarios/nuevo')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">+ Nuevo empleado</button>}</div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, CURP, puesto o área..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"/><select value={active} onChange={(event) => setActive(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select><input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Filtrar por área" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"/><input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Filtrar por puesto" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"/></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando empleados...</p> : employees.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron empleados.</p> : <table className="w-full min-w-[700px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-6 py-3 text-left text-xs text-slate-500">Empleado</th><th className="px-4 py-3 text-left text-xs text-slate-500">CURP</th><th className="px-4 py-3 text-left text-xs text-slate-500">Puesto / área</th><th className="px-4 py-3 text-left text-xs text-slate-500">Acceso</th><th className="px-4 py-3 text-left text-xs text-slate-500">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{employees.map((employee) => <tr key={employee.id} className="hover:bg-slate-50"><td className="px-6 py-4"><button onClick={() => setSelected(employee)} aria-label={`Ver expediente de ${fullName(employee)}`} className="group flex items-center gap-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 ring-sky-200 transition group-hover:ring-4">{initials(employee)}</span><span><span className="block text-sm font-semibold text-slate-800 group-hover:text-sky-700">{fullName(employee)}</span><span className="block text-xs text-slate-400">{employee.institutionalEmail || employee.personalEmail || 'Sin correo'}</span></span></button></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{employee.curp}</td><td className="px-4 py-4"><p className="text-sm text-slate-700">{employee.position}</p><p className="text-xs text-slate-400">{employee.department}</p></td><td className="px-4 py-4 text-xs text-slate-500">{employee.user ? `${employee.user.role} · ${employee.user.active ? 'activo' : 'inactivo'}` : 'Sin usuario'}</td><td className="px-4 py-4"><StatusBadge active={employee.active}/></td></tr>)}</tbody></table>}</div>
    {selected && <EmployeeModal employee={selected} canWrite={canWrite} onClose={() => setSelected(null)} onEdit={() => navigate(`/usuarios/editar/${selected.id}`)} onDeactivate={deactivate}/>}
  </div>
}
