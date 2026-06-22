import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/auth/AuthCard'
import PasswordField, { passwordRules } from '../../components/auth/PasswordField'
import { api, getApiError } from '../../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm()
  if (!token) return <Navigate to="/recuperar-contrasena" replace />
  const submit = async ({ newPassword }) => { setError(''); try { await api.post('/auth/reset-password', { token, newPassword }, { skipAuthRefresh: true }); setDone(true) } catch (e) { setError(getApiError(e, 'El enlace no es válido o ya expiró.')) } }
  return <AuthCard title="Restablecer contraseña" description="Crea una contraseña segura para volver a ingresar.">{done ? <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm">Contraseña actualizada. Ya puedes iniciar sesión.</div> : <form onSubmit={handleSubmit(submit)} className="space-y-4">{error && <p className="p-3 bg-rose-50 text-rose-700 rounded-xl text-sm">{error}</p>}<PasswordField label="Nueva contraseña" name="newPassword" register={register} rules={passwordRules} error={errors.newPassword}/><PasswordField label="Confirmar contraseña" name="confirmation" register={register} rules={{ validate: (value) => value === getValues('newPassword') || 'Las contraseñas no coinciden' }} error={errors.confirmation}/><button disabled={isSubmitting} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm disabled:bg-slate-400">{isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}</button></form>}</AuthCard>
}
