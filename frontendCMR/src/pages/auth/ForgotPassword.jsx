import { useState } from 'react'
import { useForm } from 'react-hook-form'
import AuthCard from '../../components/auth/AuthCard'
import { api, getApiError } from '../../services/api'

export default function ForgotPassword() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const submit = async ({ email }) => {
    setError('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email }, { skipAuthRefresh: true })
      setResult(data)
    } catch (requestError) { setError(getApiError(requestError, 'No fue posible procesar la solicitud.')) }
  }
  return <AuthCard title="Recuperar contraseña" description="Escribe el correo asociado a tu cuenta. Si existe, recibirás instrucciones para restablecerla.">
    {result ? <div className="space-y-4"><div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm">Solicitud procesada. Revisa tu correo.</div>{result.developmentResetToken && <a className="block text-center py-2.5 rounded-xl bg-sky-50 text-sky-700 text-sm font-medium" href={`/restablecer-contrasena?token=${encodeURIComponent(result.developmentResetToken)}`}>Continuar con el token de desarrollo</a>}</div> :
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>{error && <p className="p-3 bg-rose-50 text-rose-700 rounded-xl text-sm">{error}</p>}<div><label className="text-xs font-semibold text-slate-700 uppercase">Correo electrónico</label><input type="email" autoComplete="email" className="mt-1.5 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-100" {...register('email', { required: 'El correo es obligatorio' })}/>{errors.email && <span className="text-xs text-rose-600">{errors.email.message}</span>}</div><button disabled={isSubmitting} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm disabled:bg-slate-400">{isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}</button></form>}
  </AuthCard>
}
