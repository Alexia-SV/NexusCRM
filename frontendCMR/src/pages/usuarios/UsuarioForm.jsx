import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const inputClass = "w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder-slate-400"
const labelClass = "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
const errorClass = "text-[11px] text-red-500 font-medium mt-1 block ml-1"

export default function UsuarioForm() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEditing = Boolean(id)
  const { usuarios, crearUsuario, editarUsuario } = useApp()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre: '', apellido_paterno: '', apellido_materno: '',
      curp: '', email: '', puesto: '', salario: '', status: 'activo',
    },
  })

  useEffect(() => {
    if (isEditing) {
      const usuario = usuarios.find((u) => u.id === Number(id))
      if (usuario) reset(usuario)
    }
  }, [id, isEditing, usuarios, reset])

  const onSubmit = async (data) => {
    await new Promise((r) => setTimeout(r, 400))
    if (isEditing) {
      editarUsuario(id, data)
    } else {
      crearUsuario(data)
    }
    navigate('/usuarios')
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/usuarios')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar empleado' : 'Nuevo empleado'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Modifica los datos del empleado.' : 'Completa el formulario para registrar un nuevo empleado.'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Datos personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Nombre</label>
                <input type="text" placeholder="John" className={inputClass}
                  {...register('nombre', { required: 'El nombre es obligatorio' })} />
                {errors.nombre && <span className={errorClass}>⚠ {errors.nombre.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Apellido paterno</label>
                <input type="text" placeholder="Doe" className={inputClass}
                  {...register('apellido_paterno', { required: 'El apellido paterno es obligatorio' })} />
                {errors.apellido_paterno && <span className={errorClass}>⚠ {errors.apellido_paterno.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Apellido materno</label>
                <input type="text" placeholder="Smith" className={inputClass}
                  {...register('apellido_materno')} />
              </div>
              <div>
                <label className={labelClass}>CURP</label>
                <input type="text" placeholder="AAAA000000HXXXXXX00" maxLength={18}
                  className={`${inputClass} uppercase`}
                  {...register('curp', {
                    required: 'La CURP es obligatoria',
                    minLength: { value: 18, message: 'Debe tener 18 caracteres' },
                    maxLength: { value: 18, message: 'Debe tener 18 caracteres' },
                  })} />
                {errors.curp && <span className={errorClass}>⚠ {errors.curp.message}</span>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Correo electrónico</label>
                <input type="email" placeholder="correo@empresa.com" className={inputClass}
                  {...register('email', { required: 'El correo es obligatorio' })} />
                {errors.email && <span className={errorClass}>⚠ {errors.email.message}</span>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Datos laborales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Puesto</label>
                <input type="text" placeholder="Desarrollador, Diseñador..." className={inputClass}
                  {...register('puesto', { required: 'El puesto es obligatorio' })} />
                {errors.puesto && <span className={errorClass}>⚠ {errors.puesto.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Salario mensual (MXN)</label>
                <input type="number" placeholder="15000" className={inputClass}
                  {...register('salario', {
                    required: 'El salario es obligatorio',
                    min: { value: 1, message: 'Debe ser mayor a 0' },
                  })} />
                {errors.salario && <span className={errorClass}>⚠ {errors.salario.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select className={inputClass} {...register('status')}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear empleado'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}