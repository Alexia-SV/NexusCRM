import { NavLink, useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ type }) => {
  const paths = {
    dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25A2.25 2.25 0 0 1 8.25 10.5H6A2.25 2.25 0 0 1 3.75 8.25V6Zm9.75 0a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z',
    users: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 18.72a6 6 0 0 1 12 0A11.944 11.944 0 0 1 12 21a11.944 11.944 0 0 1-6-2.28Z',
    projects: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75M3.75 9.75V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.121 2.12a1.5 1.5 0 0 0 1.061.44H18A2.25 2.25 0 0 1 20.25 9v.75',
    providers: 'M3.75 21V9.349m16.5 11.651V9.349M2.25 21h19.5M6.75 18h3.75v-5.25H6.75V18Zm6.75 3v-7.5h4.5V21',
  }
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} /></svg>
}

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard', roles: permissions.dashboard },
  { label: 'Usuarios', to: '/usuarios', icon: 'users', roles: permissions.usuariosRead },
  { label: 'Proyectos', to: '/proyectos', icon: 'projects', roles: permissions.proyectosRead },
  { label: 'Proveedores', to: '/proveedores', icon: 'providers', roles: permissions.proveedoresRead },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, can, logout } = useAuth()
  const visibleItems = navItems.filter((item) => can(item.roles))
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }
  const linkClass = ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-sky-500/15 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`

  return <>
    <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-sky-400 flex items-center justify-center font-bold text-slate-900 text-lg">N</div><div><p className="text-white text-sm font-semibold">Nexus CRM</p><p className="text-sky-400 text-[10px] uppercase tracking-widest">Sistema de gestión</p></div></div>
      <nav className="flex-1 px-3 py-4 space-y-1">{visibleItems.map((item) => <NavLink key={item.to} to={item.to} className={linkClass}><Icon type={item.icon}/><span>{item.label}</span></NavLink>)}</nav>
      <div className="px-4 py-4 border-t border-slate-800"><p className="text-xs font-medium text-white truncate">{user.fullName}</p><p className="text-[11px] text-slate-500 truncate mb-3">{user.email}</p><NavLink to="/cambiar-contrasena" className="block text-xs text-sky-400 hover:text-sky-300 mb-3">Cambiar contraseña</NavLink><button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">Cerrar sesión</button></div>
    </aside>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-2">{visibleItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl ${isActive ? 'text-sky-500' : 'text-slate-400'}`}><Icon type={item.icon}/><span className="text-[10px]">{item.label}</span></NavLink>)}<button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-rose-500"><span className="text-lg leading-5">↪</span><span className="text-[10px]">Salir</span></button></nav>
  </>
}
