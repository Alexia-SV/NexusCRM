/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'

export const passwordRules = {
  required: 'La contraseña es obligatoria',
  minLength: { value: 10, message: 'Debe tener al menos 10 caracteres' },
  pattern: {
    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    message: 'Incluye mayúscula, minúscula, número y símbolo',
  },
}

export default function PasswordField({ label, name, register, rules, error, autoComplete = 'new-password' }) {
  const [visible, setVisible] = useState(false)
  return <div>
    <label className="text-xs font-semibold text-slate-700 uppercase">{label}</label>
    <div className="relative mt-1.5">
      <input type={visible ? 'text' : 'password'} aria-label={label || 'Contraseña'} autoComplete={autoComplete} className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" {...register(name, rules)} />
      <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-sky-600 focus:outline-none focus:text-sky-600">
        {visible ? <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.2 0 9 4.4 10 8a11.8 11.8 0 0 1-2.2 4.2M6.2 6.2A11.5 11.5 0 0 0 2 12c1 3.6 4.8 8 10 8 1.4 0 2.7-.3 3.8-.8" /></svg> : <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1-3.6 4.8-8 10-8s9 4.4 10 8c-1 3.6-4.8 8-10 8S3 15.6 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>}
      </button>
    </div>
    {error && <span className="text-xs text-rose-600 mt-1 block">{error.message}</span>}
  </div>
}
