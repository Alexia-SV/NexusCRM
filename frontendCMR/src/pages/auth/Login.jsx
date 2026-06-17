import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { email: '', password: '' }
  })

  const onSubmit = async (data) => {
    // Por ahora simulado — después conecta con Laravel
    console.log('Login data:', data)
    localStorage.setItem('token_crm', 'token_simulado_123')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 selection:bg-sky-500 selection:text-white">
      <div className="max-w-5xl w-full flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100">

        {/* Formulario - izquierda */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center min-h-[580px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inicia sesión para acceder al sistema.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="correo@empresa.com"
                className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder-slate-400"
                {...register('email', { required: 'El correo es obligatorio' })}
              />
              {errors.email && (
                <span className="text-[11px] text-red-500 font-medium mt-1 block ml-1">
                  ⚠ {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium transition"
                  onClick={() => alert('Recuperación de contraseña — próximamente')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder-slate-400"
                {...register('password', { required: 'La contraseña es obligatoria' })}
              />
              {errors.password && (
                <span className="text-[11px] text-red-500 font-medium mt-1 block ml-1">
                  ⚠ {errors.password.message}
                </span>
              )}
            </div>

            {/* Botón */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-xl shadow-lg shadow-slate-950/10 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all text-sm cursor-pointer"
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>

          </form>
        </div>

        {/* Branding - derecha */}
        <div className="w-full md:w-5/12 bg-slate-900 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20" />

          <div className="flex items-center space-x-2 relative z-10">
            <div className="h-8 w-8 rounded-lg bg-sky-400 flex items-center justify-center font-bold text-slate-900 text-lg">
              N
            </div>
            <span className="text-xs uppercase tracking-widest font-semibold text-sky-400">
              Nexus CRM
            </span>
          </div>

          <div className="my-12 md:my-0 relative z-10 space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-normal leading-tight">
              Gestiona tu equipo con{' '}
              <span className="italic text-sky-300">precisión</span>.
            </h1>
            <p className="text-sm text-slate-400 font-light leading-relaxed max-w-sm">
              Control total de empleados, proyectos y recursos desde un solo lugar.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <p>Acceso exclusivo para personal autorizado.</p>
          </div>
        </div>

      </div>
    </div>
  )
}