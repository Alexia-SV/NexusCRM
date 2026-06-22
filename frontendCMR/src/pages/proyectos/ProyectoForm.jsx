import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const inputClass = "w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder-slate-400"
const labelClass = "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
const errorClass = "text-[11px] text-red-500 font-medium mt-1 block ml-1"

export default function ProyectoForm() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEditing = Boolean(id)
  const { usuarios, proyectos, crearProyecto, editarProyecto } = useApp()

  const [involucrados, setInvolucrados] = useState([])
  const [empleadoSel, setEmpleadoSel]   = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre: '', objetivo: '', meta: '',
      fecha_inicio: '', fecha_fin: '', status: 'planificacion',
    },
  })

  useEffect(() => {
    if (isEditing) {
      const proyecto = proyectos.find((p) => p.id === Number(id))
      if (proyecto) {
        reset(proyecto)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInvolucrados(proyecto.involucrados)
      }
    }
  }, [id, isEditing, proyectos, reset])

  const disponibles = usuarios.filter(
    (u) => u.status === 'activo' && !involucrados.find((i) => i.empleado_id === u.id)
  )

  const agregarInvolucrado = () => {
    if (!empleadoSel) return
    const emp = usuarios.find((u) => u.id === Number(empleadoSel))
    if (!emp) return
    setInvolucrados((prev) => [
      ...prev,
      { empleado_id: emp.id, rol: 'colaborador', salario_asignado: emp.salario },
    ])
    setEmpleadoSel('')
  }

  const quitarInvolucrado = (empleado_id) => {
    setInvolucrados((prev) => prev.filter((i) => i.empleado_id !== empleado_id))
  }

  const actualizarRol = (empleado_id, rol) => {
    setInvolucrados((prev) =>
      prev.map((i) => i.empleado_id === empleado_id ? { ...i, rol } : i)
    )
  }

  const actualizarSalario = (empleado_id, salario_asignado) => {
    setInvolucrados((prev) =>
      prev.map((i) => i.empleado_id === empleado_id ? { ...i, salario_asignado: Number(salario_asignado) } : i)
    )
  }

  const totalNomina = involucrados.reduce((acc, i) => acc + (i.salario_asignado || 0), 0)

  const onSubmit = async (data) => {
    await new Promise((r) => setTimeout(r, 400))
    if (isEditing) {
      editarProyecto(id, data, involucrados)
    } else {
      crearProyecto(data, involucrados)
    }
    navigate('/proyectos')
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/proyectos')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Modifica los datos del proyecto.' : 'Completa el formulario para registrar un nuevo proyecto.'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Datos generales */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Datos generales
            </h2>
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Nombre del proyecto</label>
                <input type="text" placeholder="Sistema de Nómina..." className={inputClass}
                  {...register('nombre', { required: 'El nombre es obligatorio' })} />
                {errors.nombre && <span className={errorClass}>⚠ {errors.nombre.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Objetivo</label>
                <textarea rows={2} placeholder="¿Qué se busca lograr?" className={`${inputClass} resize-none`}
                  {...register('objetivo', { required: 'El objetivo es obligatorio' })} />
                {errors.objetivo && <span className={errorClass}>⚠ {errors.objetivo.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Meta</label>
                <textarea rows={2} placeholder="¿Cómo se medirá el éxito?" className={`${inputClass} resize-none`}
                  {...register('meta', { required: 'La meta es obligatoria' })} />
                {errors.meta && <span className={errorClass}>⚠ {errors.meta.message}</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Fecha inicio</label>
                  <input type="date" className={inputClass}
                    {...register('fecha_inicio', { required: 'Requerido' })} />
                  {errors.fecha_inicio && <span className={errorClass}>⚠ {errors.fecha_inicio.message}</span>}
                </div>
                <div>
                  <label className={labelClass}>Fecha fin</label>
                  <input type="date" className={inputClass}
                    {...register('fecha_fin', { required: 'Requerido' })} />
                  {errors.fecha_fin && <span className={errorClass}>⚠ {errors.fecha_fin.message}</span>}
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select className={inputClass} {...register('status')}>
                    <option value="planificacion">Planificación</option>
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Equipo involucrado */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Equipo involucrado</h2>
              {involucrados.length > 0 && (
                <span className="text-xs font-semibold text-slate-500">
                  Nómina total: <span className="text-slate-800">${totalNomina.toLocaleString('es-MX')}/mes</span>
                </span>
              )}
            </div>

            <div className="flex gap-3 mb-5">
              <select
                value={empleadoSel}
                onChange={(e) => setEmpleadoSel(e.target.value)}
                className={`${inputClass} flex-1`}
              >
                <option value="">Seleccionar empleado activo...</option>
                {disponibles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido_paterno} — {u.puesto}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={agregarInvolucrado}
                disabled={!empleadoSel}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
              >
                Agregar
              </button>
            </div>

            {involucrados.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Sin equipo asignado aún</p>
                <p className="text-xs mt-1">Selecciona empleados activos para agregarlos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {involucrados.map((inv) => {
                  const emp = usuarios.find((u) => u.id === inv.empleado_id)
                  if (!emp) return null
                  const initials = `${emp.nombre[0]}${emp.apellido_paterno[0]}`.toUpperCase()
                  const colors = ['bg-sky-100 text-sky-700','bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700']
                  const color  = colors[(emp.nombre.charCodeAt(0) + emp.apellido_paterno.charCodeAt(0)) % colors.length]
                  return (
                    <div key={inv.empleado_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${color}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {emp.nombre} {emp.apellido_paterno}
                        </p>
                        <p className="text-xs text-slate-400">{emp.puesto}</p>
                      </div>
                      <select
                        value={inv.rol}
                        onChange={(e) => actualizarRol(inv.empleado_id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="colaborador">Colaborador</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="desarrollador">Desarrollador</option>
                        <option value="diseñador">Diseñador</option>
                        <option value="lider">Líder</option>
                      </select>
                      <input
                        type="number"
                        value={inv.salario_asignado}
                        onChange={(e) => actualizarSalario(inv.empleado_id, e.target.value)}
                        className="w-28 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-sky-400 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => quitarInvolucrado(inv.empleado_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
