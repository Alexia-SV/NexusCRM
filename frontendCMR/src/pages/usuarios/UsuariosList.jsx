import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { deactivateEmployee, deleteEmployee, listEmployees } from '../../services/employees'
import { getApiError } from '../../services/api'

function StatusBadge({ active }) {
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Activo' : 'Inactivo'}</span>
}

function initials(employee) {
  return `${employee.firstName?.[0] || ''}${employee.paternalLastName?.[0] || ''}`.toUpperCase()
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

  const remove = async () => {
    try { await deleteEmployee(selected.id); setSelected(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible eliminar al empleado.')) }
  }

  return <div className="flex-1 p-4 md:p-8 overflow-y-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"><div><h1 className="text-2xl font-bold text-slate-900">Empleados</h1><p className="text-sm text-slate-500 mt-1">{employees.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/usuarios/nuevo')} className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl">+ Nuevo empleado</button>}</div>
    {error && <div role="alert" className="mb-5 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, CURP, puesto o área..." className="sm:col-span-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
      <select value={active} onChange={(event) => setActive(event.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select>
      <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Filtrar por área" className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
      <input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Filtrar por puesto" className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando empleados...</p> : employees.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron empleados.</p> : <table className="w-full min-w-[760px]"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="text-left text-xs text-slate-500 px-6 py-3">Empleado</th><th className="text-left text-xs text-slate-500 px-4 py-3">CURP</th><th className="text-left text-xs text-slate-500 px-4 py-3">Puesto / área</th><th className="text-left text-xs text-slate-500 px-4 py-3">Acceso</th><th className="text-left text-xs text-slate-500 px-4 py-3">Estado</th><th className="px-6 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{employees.map((employee) => <tr key={employee.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{initials(employee)}</div><div><p className="text-sm font-semibold text-slate-800">{employee.firstName} {employee.paternalLastName} {employee.maternalLastName}</p><p className="text-xs text-slate-400">{employee.institutionalEmail || employee.personalEmail || 'Sin correo'}</p></div></div></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{employee.curp}</td><td className="px-4 py-4"><p className="text-sm text-slate-700">{employee.position}</p><p className="text-xs text-slate-400">{employee.department}</p></td><td className="px-4 py-4 text-xs text-slate-500">{employee.user ? `${employee.user.role} · ${employee.user.active ? 'activo' : 'inactivo'}` : 'Sin usuario'}</td><td className="px-4 py-4"><StatusBadge active={employee.active} /></td><td className="px-6 py-4 text-right">{canWrite && <div className="flex justify-end gap-2"><button onClick={() => navigate(`/usuarios/editar/${employee.id}`)} className="px-3 py-1.5 text-xs text-sky-700 bg-sky-50 rounded-lg">Editar</button><button onClick={() => setSelected(employee)} className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 rounded-lg">{employee.active ? 'Desactivar' : 'Eliminar'}</button></div>}</td></tr>)}</tbody></table>}
    </div>
    {selected && <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 className="text-lg font-bold text-slate-900">{selected.active ? 'Desactivar empleado' : 'Empleado inactivo'}</h2><p className="text-sm text-slate-500 mt-2">{selected.active ? 'Se conservará el historial y también se desactivará su cuenta de acceso.' : 'La eliminación permanente sólo debe usarse para registros creados por error.'}</p><div className="flex flex-col sm:flex-row gap-2 mt-6"><button onClick={() => setSelected(null)} className="px-4 py-2.5 border rounded-xl text-sm">Cancelar</button>{selected.active && <button onClick={deactivate} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm">Desactivar</button>}<button onClick={remove} className="px-4 py-2.5 text-rose-700 rounded-xl text-xs">Eliminar permanentemente</button></div></div></div>}
  </div>
}
