import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'

const paths = {
  dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25A2.25 2.25 0 0 1 8.25 10.5H6A2.25 2.25 0 0 1 3.75 8.25V6Zm9.75 0a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z',
  users: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 18.72a6 6 0 0 1 12 0A11.944 11.944 0 0 1 12 21a11.944 11.944 0 0 1-6-2.28Z',
  projects: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75M3.75 9.75V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.121 2.12a1.5 1.5 0 0 0 1.061.44H18A2.25 2.25 0 0 1 20.25 9v.75',
  providers: 'M3.75 21V9.349m16.5 11.651V9.349M2.25 21h19.5M6.75 18h3.75v-5.25H6.75V18Zm6.75 3v-7.5h4.5V21',
  payroll: 'M2.25 6.75h19.5v10.5H2.25V6.75Zm3 3h4.5m-4.5 3h7.5m5.25-3h.008v.008H18V9.75Z',
  supplies: 'M4.5 7.5 12 3l7.5 4.5M4.5 7.5 12 12m-7.5-4.5V16.5L12 21m0-9 7.5-4.5v9L12 21m0-9v9',
  reports: 'M4.5 19.5V12m5 7.5V7.5m5 12V10m5 9.5V4.5',
  more: 'M5.25 12h.008v.008H5.25V12Zm6.75 0h.008v.008H12V12Zm6.75 0h.008v.008h-.008V12Z',
  password: 'M16.5 10.5V7.875a4.5 4.5 0 0 0-9 0V10.5m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z',
  logout: 'M10.5 6H6.75A2.25 2.25 0 0 0 4.5 8.25v7.5A2.25 2.25 0 0 0 6.75 18h3.75m3-3 3-3m0 0-3-3m3 3H9',
}

function Icon({ type }) {
  return <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} /></svg>
}

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard', roles: permissions.dashboard, primary: true },
  { label: 'Usuarios', to: '/usuarios', icon: 'users', roles: permissions.usuariosRead, primary: true },
  { label: 'Proyectos', to: '/proyectos', icon: 'projects', roles: permissions.proyectosRead, primary: true },
  { label: 'Proveedores', to: '/proveedores', icon: 'providers', roles: permissions.proveedoresRead, primary: true },
  { label: 'Nóminas', to: '/nominas', icon: 'payroll', roles: permissions.nominasRead },
  { label: 'Insumos', to: '/insumos', icon: 'supplies', roles: permissions.insumosRead },
  { label: 'Reportes', to: '/reportes', icon: 'reports', roles: permissions.reportesRead },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, can, logout } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const visibleItems = navItems.filter((item) => can(item.roles))
  const primaryItems = visibleItems.filter((item) => item.primary)
  const secondaryItems = visibleItems.filter((item) => !item.primary)
  const secondaryActive = secondaryItems.some((item) => location.pathname.startsWith(item.to))

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }
  const desktopClass = ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-sky-500/15 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
  const mobileClass = ({ isActive }) => `min-w-0 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl ${isActive ? 'text-sky-500 bg-sky-50' : 'text-slate-400'}`

  return <>
    <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 flex-col shrink-0">
      <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-sky-400 flex items-center justify-center font-bold text-slate-900 text-lg">N</div><div><p className="text-white text-sm font-semibold">Nexus CRM</p><p className="text-sky-400 text-[10px] uppercase tracking-widest">Sistema de gestión</p></div></div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{visibleItems.map((item) => <NavLink key={item.to} to={item.to} className={desktopClass}><Icon type={item.icon}/><span>{item.label}</span></NavLink>)}</nav>
      <div className="px-4 py-4 border-t border-slate-800"><p className="text-xs font-medium text-white truncate">{user.fullName}</p><p className="text-[11px] text-slate-500 truncate mb-3">{user.email}</p><NavLink to="/cambiar-contrasena" className="block text-xs text-sky-400 hover:text-sky-300 mb-3">Cambiar contraseña</NavLink><button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Icon type="logout"/>Cerrar sesión</button></div>
    </aside>

    {moreOpen && <><button aria-label="Cerrar menú" onClick={() => setMoreOpen(false)} className="md:hidden fixed inset-0 z-40 bg-slate-900/35"/><section className="md:hidden fixed left-3 right-3 bottom-20 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3"><p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Más opciones</p><div className="grid grid-cols-3 gap-2">{secondaryItems.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => `flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-xs ${isActive ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-600'}`}><Icon type={item.icon}/>{item.label}</NavLink>)}</div><div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100"><NavLink to="/cambiar-contrasena" onClick={() => setMoreOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600"><Icon type="password"/>Contraseña</NavLink><button onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-xs text-rose-600"><Icon type="logout"/>Salir</button></div></section></>}

    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur border-t border-slate-200 grid grid-flow-col auto-cols-fr px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{primaryItems.map((item) => <NavLink key={item.to} to={item.to} className={mobileClass}><Icon type={item.icon}/><span className="max-w-full truncate text-[9px] sm:text-[10px]">{item.label}</span></NavLink>)}<button aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)} className={`min-w-0 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl ${moreOpen || secondaryActive ? 'text-sky-500 bg-sky-50' : 'text-slate-400'}`}><Icon type="more"/><span className="text-[9px] sm:text-[10px]">Más</span></button></nav>
  </>
}
