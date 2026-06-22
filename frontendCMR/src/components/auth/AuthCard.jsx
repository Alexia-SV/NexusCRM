import { Link } from 'react-router-dom'

export default function AuthCard({ title, description, children, backToLogin = true }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl p-8">
        <div className="h-10 w-10 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center font-bold mb-6">N</div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">{description}</p>
        {children}
        {backToLogin && <Link to="/login" className="block text-center text-sm text-sky-600 hover:text-sky-700 mt-6">Volver al inicio de sesión</Link>}
      </div>
    </div>
  )
}
