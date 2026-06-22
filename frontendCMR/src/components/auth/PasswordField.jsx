/* eslint-disable react-refresh/only-export-components */
export const passwordRules = {
  required: 'La contraseña es obligatoria',
  minLength: { value: 10, message: 'Debe tener al menos 10 caracteres' },
  pattern: {
    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    message: 'Incluye mayúscula, minúscula, número y símbolo',
  },
}

export default function PasswordField({ label, name, register, rules, error, autoComplete = 'new-password' }) {
  return <div>
    <label className="text-xs font-semibold text-slate-700 uppercase">{label}</label>
    <input type="password" autoComplete={autoComplete} className="mt-1.5 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-100" {...register(name, rules)} />
    {error && <span className="text-xs text-rose-600 mt-1 block">{error.message}</span>}
  </div>
}
