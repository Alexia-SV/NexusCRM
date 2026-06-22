import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getApiError } from '../../services/api'
import PasswordField from '../../components/auth/PasswordField'

const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, user } = useAuth()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  if (isAuthenticated) {
    return <Navigate to={user.mustChangePassword ? '/cambiar-contrasena' : '/dashboard'} replace />
  }

  const onSubmit = async (data) => {
    setServerError('')
    try {
      const loggedUser = await login(data)
      const destination = loggedUser.mustChangePassword
        ? '/cambiar-contrasena'
        : location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      const messages = {
        INVALID_CREDENTIALS: 'El correo o la contraseña son incorrectos.',
        ACCOUNT_LOCKED: 'La cuenta está bloqueada temporalmente. Intenta de nuevo en 15 minutos.',
        ACCOUNT_INACTIVE: 'Esta cuenta está inactiva. Contacta al administrador.',
      }
      setServerError(messages[error.response?.data?.code] || getApiError(error, 'No fue posible iniciar sesión.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-5xl w-full flex flex-col md:flex-row bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100">
        <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-12 flex flex-col justify-center md:min-h-[580px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido de nuevo</h2>
            <p className="text-xs text-slate-500 mt-1">Inicia sesión para acceder al sistema.</p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{serverError}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Correo electrónico</label>
              <input autoComplete="email" type="email" className={inputClass} placeholder="correo@empresa.com"
                {...register('email', { required: 'El correo es obligatorio', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Escribe un correo válido' } })} />
              {errors.email && <span className="text-xs text-rose-600 mt-1 block">{errors.email.message}</span>}
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Contraseña</label>
                <Link to="/recuperar-contrasena" className="text-xs text-sky-600 hover:text-sky-700 font-medium">¿Olvidaste tu contraseña?</Link>
              </div>
              <PasswordField label="" name="password" register={register} rules={{ required: 'La contraseña es obligatoria' }} error={errors.password} autoComplete="current-password" />
            </div>
            <button disabled={isSubmitting} className="w-full py-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-xl transition-all text-sm">
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
        <div className="w-full md:w-5/12 bg-slate-900 p-6 sm:p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="flex items-center space-x-2"><div className="h-8 w-8 rounded-lg bg-sky-400 flex items-center justify-center font-bold text-slate-900 text-lg">N</div><span className="text-xs uppercase tracking-widest font-semibold text-sky-400">Nexus CRM</span></div>
          <div className="my-8 md:my-12 space-y-4"><h1 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-tight">Gestiona tu equipo con <span className="italic text-sky-300">precisión</span>.</h1><p className="text-sm text-slate-400 leading-relaxed">Control total de empleados, proyectos y recursos desde un solo lugar.</p></div>
          <p className="pt-4 border-t border-slate-800 text-xs text-slate-400">Acceso exclusivo para personal autorizado.</p>
        </div>
      </div>
    </div>
  )
}
