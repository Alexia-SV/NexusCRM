import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from '../pages/auth/Login'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import ChangePassword from '../pages/auth/ChangePassword'
import Dashboard from '../pages/dashboard/Dashboard'
import UsuariosList from '../pages/usuarios/UsuariosList'
import UsuarioForm from '../pages/usuarios/UsuarioForm'
import ProyectosList from '../pages/proyectos/ProyectosList'
import ProyectoForm from '../pages/proyectos/ProyectoForm'
import ProyectoDetail from '../pages/proyectos/ProyectoDetail'
import ProveedoresList from '../pages/proveedores/ProveedoresList'
import ProveedorForm from '../pages/proveedores/ProveedorForm'
import InsumosList from '../pages/insumos/InsumosList'
import InsumoForm from '../pages/insumos/InsumoForm'
import NominasList from '../pages/nominas/NominasList'
import NominaForm from '../pages/nominas/NominaForm'
import NominaDetail from '../pages/nominas/NominaDetail'
import NominaConfig from '../pages/nominas/NominaConfig'
import NominaReportes from '../pages/nominas/NominaReportes'
import Reportes from '../pages/reportes/Reportes'
import PrivateLayout from '../components/layout/PrivateLayout'
import { useAuth } from '../context/AuthContext'
import { permissions } from '../auth/permissions'

function LoadingSession() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">Restaurando sesión...</div>
}

function ProtectedRoute({ children, roles, allowPasswordChange = false }) {
  const location = useLocation()
  const { status, user, can } = useAuth()
  if (status === 'loading') return <LoadingSession />
  if (status !== 'authenticated') return <Navigate to="/login" state={{ from: location }} replace />
  if (user.mustChangePassword && !allowPasswordChange) return <Navigate to="/cambiar-contrasena" replace />
  if (!user.mustChangePassword && allowPasswordChange && location.pathname === '/cambiar-contrasena') {
    // El usuario también puede cambiarla voluntariamente desde esta misma ruta.
  }
  if (roles && !can(roles)) return <Navigate to="/sin-permiso" replace />
  return children
}

function PrivatePage({ children, roles }) {
  return <ProtectedRoute roles={roles}><PrivateLayout>{children}</PrivateLayout></ProtectedRoute>
}

function Forbidden() {
  return <PrivateLayout><div className="flex-1 flex flex-col items-center justify-center p-8 text-center"><h1 className="text-2xl font-bold text-slate-900">Acceso no permitido</h1><p className="text-sm text-slate-500 mt-2">Tu rol no tiene permiso para entrar a esta sección.</p></div></PrivateLayout>
}

export default function AppRouter() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
    <Route path="/restablecer-contrasena" element={<ResetPassword />} />
    <Route path="/cambiar-contrasena" element={<ProtectedRoute allowPasswordChange><ChangePassword /></ProtectedRoute>} />
    <Route path="/dashboard" element={<PrivatePage roles={permissions.dashboard}><Dashboard /></PrivatePage>} />
    <Route path="/usuarios" element={<PrivatePage roles={permissions.usuariosRead}><UsuariosList /></PrivatePage>} />
    <Route path="/usuarios/nuevo" element={<PrivatePage roles={permissions.usuariosWrite}><UsuarioForm /></PrivatePage>} />
    <Route path="/usuarios/editar/:id" element={<PrivatePage roles={permissions.usuariosWrite}><UsuarioForm /></PrivatePage>} />
    <Route path="/proyectos" element={<PrivatePage roles={permissions.proyectosRead}><ProyectosList /></PrivatePage>} />
    <Route path="/proyectos/nuevo" element={<PrivatePage roles={permissions.proyectosWrite}><ProyectoForm /></PrivatePage>} />
    <Route path="/proyectos/editar/:id" element={<PrivatePage roles={permissions.proyectosWrite}><ProyectoForm /></PrivatePage>} />
    <Route path="/proyectos/:id" element={<PrivatePage roles={permissions.proyectosRead}><ProyectoDetail /></PrivatePage>} />
    <Route path="/proveedores" element={<PrivatePage roles={permissions.proveedoresRead}><ProveedoresList /></PrivatePage>} />
    <Route path="/proveedores/nuevo" element={<PrivatePage roles={permissions.proveedoresWrite}><ProveedorForm /></PrivatePage>} />
    <Route path="/proveedores/editar/:id" element={<PrivatePage roles={permissions.proveedoresWrite}><ProveedorForm /></PrivatePage>} />
    <Route path="/nominas" element={<PrivatePage roles={permissions.nominasRead}><NominasList /></PrivatePage>} />
    <Route path="/nominas/nueva" element={<PrivatePage roles={permissions.nominasWrite}><NominaForm /></PrivatePage>} />
    <Route path="/nominas/configuracion" element={<PrivatePage roles={permissions.nominasConfig}><NominaConfig /></PrivatePage>} />
    <Route path="/nominas/reportes" element={<PrivatePage roles={permissions.nominasRead}><NominaReportes /></PrivatePage>} />
    <Route path="/nominas/editar/:id" element={<PrivatePage roles={permissions.nominasWrite}><NominaForm /></PrivatePage>} />
    <Route path="/nominas/:id" element={<PrivatePage roles={permissions.nominasRead}><NominaDetail /></PrivatePage>} />
    <Route path="/insumos" element={<PrivatePage roles={permissions.insumosRead}><InsumosList /></PrivatePage>} />
    <Route path="/insumos/nuevo" element={<PrivatePage roles={permissions.insumosWrite}><InsumoForm /></PrivatePage>} />
    <Route path="/insumos/editar/:id" element={<PrivatePage roles={permissions.insumosWrite}><InsumoForm /></PrivatePage>} />
    <Route path="/reportes" element={<PrivatePage roles={permissions.reportesRead}><Reportes /></PrivatePage>} />
    <Route path="/sin-permiso" element={<ProtectedRoute><Forbidden /></ProtectedRoute>} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter>
}
