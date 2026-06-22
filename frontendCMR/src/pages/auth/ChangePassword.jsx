import { useState } from 'react'
import { useForm } from 'react-hook-form'
import AuthCard from '../../components/auth/AuthCard'
import PasswordField, { passwordRules } from '../../components/auth/PasswordField'
import { useAuth } from '../../context/AuthContext'
import { getApiError } from '../../services/api'

export default function ChangePassword() {
  const { changePassword, user } = useAuth()
  const [error, setError] = useState('')
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm()
  const submit = async ({ currentPassword, newPassword }) => { setError(''); try { await changePassword({ currentPassword, newPassword }) } catch (e) { setError(e.response?.data?.code === 'INVALID_CURRENT_PASSWORD' ? 'La contraseña actual es incorrecta.' : getApiError(e, 'No fue posible cambiar la contraseña.')) } }
  return <AuthCard backToLogin={false} title={user?.mustChangePassword ? 'Debes cambiar tu contraseña' : 'Cambiar contraseña'} description="Por seguridad, al terminar deberás iniciar sesión nuevamente."><form onSubmit={handleSubmit(submit)} className="space-y-4">{error && <p className="p-3 bg-rose-50 text-rose-700 rounded-xl text-sm">{error}</p>}<PasswordField label="Contraseña actual" name="currentPassword" register={register} rules={{ required: 'La contraseña actual es obligatoria' }} error={errors.currentPassword} autoComplete="current-password"/><PasswordField label="Nueva contraseña" name="newPassword" register={register} rules={{ ...passwordRules, validate: (value) => value !== getValues('currentPassword') || 'Debe ser diferente de la contraseña actual' }} error={errors.newPassword}/><PasswordField label="Confirmar contraseña" name="confirmation" register={register} rules={{ validate: (value) => value === getValues('newPassword') || 'Las contraseñas no coinciden' }} error={errors.confirmation}/><button disabled={isSubmitting} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm disabled:bg-slate-400">{isSubmitting ? 'Actualizando...' : 'Cambiar contraseña'}</button></form></AuthCard>
}
