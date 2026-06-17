import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/auth/Login'
import Dashboard from '../pages/dashboard/Dashboard'
import UsuariosList from '../pages/usuarios/UsuariosList'
import UsuarioForm from '../pages/usuarios/UsuarioForm'
import ProyectosList from '../pages/proyectos/ProyectosList'
import ProyectoForm from '../pages/proyectos/ProyectoForm'
import ProyectoDetail from '../pages/proyectos/ProyectoDetail'
import ProveedoresList from '../pages/proveedores/ProveedoresList'
import ProveedorForm from '../pages/proveedores/ProveedorForm'
import PrivateLayout from '../components/layout/PrivateLayout'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token_crm')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PrivatePage({ children }) {
  return (
    <PrivateRoute>
      <PrivateLayout>{children}</PrivateLayout>
    </PrivateRoute>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard"             element={<PrivatePage><Dashboard /></PrivatePage>} />
        <Route path="/usuarios"              element={<PrivatePage><UsuariosList /></PrivatePage>} />
        <Route path="/usuarios/nuevo"        element={<PrivatePage><UsuarioForm /></PrivatePage>} />
        <Route path="/usuarios/editar/:id"   element={<PrivatePage><UsuarioForm /></PrivatePage>} />

        <Route path="/proyectos"             element={<PrivatePage><ProyectosList /></PrivatePage>} />
        <Route path="/proyectos/nuevo"       element={<PrivatePage><ProyectoForm /></PrivatePage>} />
        <Route path="/proyectos/editar/:id"  element={<PrivatePage><ProyectoForm /></PrivatePage>} />
        <Route path="/proyectos/:id"         element={<PrivatePage><ProyectoDetail /></PrivatePage>} />

        <Route path="/proveedores"           element={<PrivatePage><ProveedoresList /></PrivatePage>} />
        <Route path="/proveedores/nuevo"     element={<PrivatePage><ProveedorForm /></PrivatePage>} />
        <Route path="/proveedores/editar/:id" element={<PrivatePage><ProveedorForm /></PrivatePage>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}