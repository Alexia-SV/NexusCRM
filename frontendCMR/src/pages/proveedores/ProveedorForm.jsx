import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const inputClass = "w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder-slate-400"
const labelClass = "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 ml-1"
const errorClass = "text-[11px] text-red-500 font-medium mt-1 block ml-1"

export default function ProveedorForm() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEditing = Boolean(id)
  const { proveedores, crearProveedor, editarProveedor } = useApp()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      tipo: 'proveedor', razon_social: '', rfc: '',
      contacto: '', email: '', telefono: '',
      direccion: '', status: 'activo',
    },
  })

  useEffect(() => {
    if (isEditing) {
      const proveedor = proveedores.find((p) => p.id === Number(id))
      if (proveedor) reset(proveedor)
    }
  }, [id, isEditing, proveedores, reset])

  const onSubmit = async (data) => {
    await new Promise((r) => setTimeout(r, 400))
    if (isEditing) {
      editarProveedor(id, data)
    } else {
      crearProveedor(data)
    }
    navigate('/proveedores')
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <button
          onClick={() => navigate('/proveedores')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar registro' : 'Nuevo proveedor / cliente'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Modifica los datos del registro.' : 'Completa el formulario para agregar un nuevo registro.'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Tipo y estado */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Clasificación
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Tipo</label>
                <select className={inputClass} {...register('tipo')}>
                  <option value="proveedor">Proveedor</option>
                  <option value="cliente">Cliente</option>
                </select>
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

          {/* Datos fiscales */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Datos fiscales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={labelClass}>Razón Social</label>
                <input type="text" placeholder="Empresa S.A. de C.V." className={inputClass}
                  {...register('razon_social', { required: 'La razón social es obligatoria' })} />
                {errors.razon_social && <span className={errorClass}>⚠ {errors.razon_social.message}</span>}
              </div>
              <div>
                <label className={labelClass}>RFC</label>
                <input type="text" placeholder="AAA000000AAA" maxLength={13}
                  className={`${inputClass} uppercase`}
                  {...register('rfc', {
                    required: 'El RFC es obligatorio',
                    minLength: { value: 12, message: 'Mínimo 12 caracteres' },
                    maxLength: { value: 13, message: 'Máximo 13 caracteres' },
                  })} />
                {errors.rfc && <span className={errorClass}>⚠ {errors.rfc.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input type="text" placeholder="Av. Reforma 123, Ciudad" className={inputClass}
                  {...register('direccion')} />
              </div>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
              Datos de contacto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Nombre del contacto</label>
                <input type="text" placeholder="Juan Pérez" className={inputClass}
                  {...register('contacto', { required: 'El contacto es obligatorio' })} />
                {errors.contacto && <span className={errorClass}>⚠ {errors.contacto.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input type="tel" placeholder="2221234567" className={inputClass}
                  {...register('telefono', { required: 'El teléfono es obligatorio' })} />
                {errors.telefono && <span className={errorClass}>⚠ {errors.telefono.message}</span>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Correo electrónico</label>
                <input type="email" placeholder="contacto@empresa.com" className={inputClass}
                  {...register('email', { required: 'El correo es obligatorio' })} />
                {errors.email && <span className={errorClass}>⚠ {errors.email.message}</span>}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/proveedores')}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear registro'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}