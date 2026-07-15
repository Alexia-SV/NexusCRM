import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { listEmployees } from '../../services/employees'
import { createProject, getProject, updateProject } from '../../services/projects'
import { getApiError } from '../../services/api'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700'
const errorClass = 'mt-1 block text-xs text-rose-600'
const defaults = { name: '', objective: '', clientName: '', leaderId: '', plannedStartDate: '', plannedEndDate: '', realStartDate: '', realEndDate: '', status: 'PLANEACION', estimatedBudget: 0, progress: 0, priority: 'MEDIA' }

function fullName(employee) {
  return [employee.firstName, employee.paternalLastName, employee.maternalLastName].filter(Boolean).join(' ')
}

function Field({ label, name, register, errors, rules, type = 'text', className = '', inputProps = {}, placeholder = '' }) {
  return <div className={className}><label className={labelClass}>{label}</label><input type={type} placeholder={placeholder} className={inputClass} {...register(name, rules)} {...inputProps} />{errors[name] && <span className={errorClass}>{errors[name].message}</span>}</div>
}

export default function ProyectoForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [employees, setEmployees] = useState([])
  const [members, setMembers] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults })

  useEffect(() => { listEmployees({ active: 'true' }).then(setEmployees).catch(() => setEmployees([])) }, [])
  useEffect(() => {
    if (!isEditing) return
    getProject(id).then((project) => {
      reset({ ...defaults, ...project, plannedStartDate: project.plannedStartDate?.slice(0, 10), plannedEndDate: project.plannedEndDate?.slice(0, 10), realStartDate: project.realStartDate?.slice(0, 10) || '', realEndDate: project.realEndDate?.slice(0, 10) || '', leaderId: project.leaderId || '' })
      setMembers((project.members || []).map((member) => ({ employeeId: member.employeeId, role: member.role, assignedDailySalary: member.assignedDailySalary })))
    }).catch((error) => setServerError(getApiError(error, 'No fue posible cargar el proyecto.'))).finally(() => setLoading(false))
  }, [id, isEditing, reset])

  const addMember = () => {
    const employee = employees.find((item) => item.id === employeeId)
    if (!employee || members.some((member) => member.employeeId === employee.id)) return
    setMembers((prev) => [...prev, { employeeId: employee.id, role: 'Colaborador', assignedDailySalary: Number(employee.dailySalary || 0) }])
    setEmployeeId('')
  }

  const updateMember = (memberEmployeeId, patch) => setMembers((prev) => prev.map((member) => member.employeeId === memberEmployeeId ? { ...member, ...patch } : member))
  const removeMember = (memberEmployeeId) => setMembers((prev) => prev.filter((member) => member.employeeId !== memberEmployeeId))

  const onSubmit = async (form) => {
    setServerError('')
    const payload = { ...form, leaderId: form.leaderId || undefined, estimatedBudget: Number(form.estimatedBudget || 0), progress: Number(form.progress || 0), members: members.map((member) => ({ ...member, assignedDailySalary: Number(member.assignedDailySalary || 0) })) }
    try {
      if (isEditing) await updateProject(id, payload)
      else await createProject(payload)
      navigate('/proyectos')
    } catch (error) { setServerError(error.response?.data?.errors?.map((item) => item.message).join(' - ') || getApiError(error, 'No fue posible guardar el proyecto.')) }
  }

  if (loading) return <div className="flex-1 p-8 text-sm text-slate-500">Cargando proyecto...</div>
  return <div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-5xl">
    <div className="mb-8 flex items-center gap-4"><button onClick={() => navigate('/proyectos')} className="rounded-xl bg-white p-2 text-slate-500">←</button><div><h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</h1><p className="mt-1 text-sm text-slate-500">Encabezado, fechas, presupuesto e involucrados.</p></div></div>
    {serverError && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-800">Proyecto</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nombre del proyecto" name="name" register={register} errors={errors} className="sm:col-span-2" rules={{ required: 'El nombre es obligatorio' }} />
        <div className="sm:col-span-2"><label className={labelClass}>Descripcion / objetivo</label><textarea rows={3} className={`${inputClass} resize-none`} {...register('objective', { required: 'El objetivo es obligatorio' })} />{errors.objective && <span className={errorClass}>{errors.objective.message}</span>}</div>
        <Field label="Cliente" name="clientName" register={register} errors={errors} />
        <div><label className={labelClass}>Lider del proyecto</label><select className={inputClass} {...register('leaderId')}><option value="">Sin lider</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee)}</option>)}</select></div>
        <Field label="Fecha inicio planeada" name="plannedStartDate" type="date" register={register} errors={errors} rules={{ required: 'Requerida' }} />
        <Field label="Fecha fin planeada" name="plannedEndDate" type="date" register={register} errors={errors} rules={{ required: 'Requerida' }} />
        <Field label="Fecha inicio real" name="realStartDate" type="date" register={register} errors={errors} />
        <Field label="Fecha fin real" name="realEndDate" type="date" register={register} errors={errors} />
        <div><label className={labelClass}>Estado</label><select className={inputClass} {...register('status')}><option value="PLANEACION">Planeacion</option><option value="ACTIVO">Activo</option><option value="PAUSADO">Pausado</option><option value="COMPLETADO">Completado</option><option value="CANCELADO">Cancelado</option></select></div>
        <div><label className={labelClass}>Prioridad</label><select className={inputClass} {...register('priority')}><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></div>
        <Field label="Presupuesto estimado" name="estimatedBudget" type="number" register={register} errors={errors} />
        <Field label="% avance" name="progress" type="number" register={register} errors={errors} inputProps={{ min: 0, max: 100 }} />
      </div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-sm font-semibold text-slate-800">Involucrados</h2><span className="text-xs font-semibold text-slate-500">{members.length} empleado(s)</span></div><div className="mb-5 flex flex-col gap-3 sm:flex-row"><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={`${inputClass} flex-1`}><option value="">Seleccionar empleado activo...</option>{employees.filter((employee) => !members.some((member) => member.employeeId === employee.id)).map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee)} - {employee.position}</option>)}</select><button type="button" onClick={addMember} disabled={!employeeId} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-300">Agregar</button></div>{members.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Sin involucrados asignados.</p> : <div className="space-y-3">{members.map((member) => { const employee = employees.find((item) => item.id === member.employeeId); return <div key={member.employeeId} className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_160px_140px_auto] sm:items-center"><div><p className="text-sm font-semibold text-slate-800">{employee ? fullName(employee) : member.employeeId}</p><p className="text-xs text-slate-400">{employee?.position}</p></div><input value={member.role} onChange={(event) => updateMember(member.employeeId, { role: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><input value={member.assignedDailySalary} onChange={(event) => updateMember(member.employeeId, { assignedDailySalary: event.target.value })} type="number" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => removeMember(member.employeeId)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Quitar</button></div> })}</div>}</section>
      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row"><button type="button" onClick={() => navigate('/proyectos')} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-600">Cancelar</button><button disabled={isSubmitting} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white disabled:bg-slate-400">{isSubmitting ? 'Guardando...' : 'Guardar proyecto'}</button></div>
    </form>
  </div></div>
}
